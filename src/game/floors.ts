import { BOSS_BY_FLOOR, MONSTER_POOLS, THEMES } from "./content";
import { auditFloors } from "./floorAudit";
import { MAP_SIZE, type FloorData, type FloorEntity, type Point } from "./types";

type Rng = () => number;

const key = ({ x, y }: Point) => `${x},${y}`;

function mulberry32(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: T[], rng: Rng): T[] {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function makeMaze(floor: number, start: Point, attempt: number, roomCount: number): string[] {
  const rng = mulberry32(0x51a7 + floor * 7919 + attempt * 104729);
  const cells = Array.from({ length: MAP_SIZE }, () => Array<string>(MAP_SIZE).fill("#"));
  const stack: Point[] = [start];
  cells[start.y][start.x] = ".";

  while (stack.length) {
    const current = stack[stack.length - 1];
    const directions = shuffle(
      [
        { x: 2, y: 0 },
        { x: -2, y: 0 },
        { x: 0, y: 2 },
        { x: 0, y: -2 },
      ],
      rng,
    );
    const next = directions
      .map((dir) => ({ x: current.x + dir.x, y: current.y + dir.y, dir }))
      .find(({ x, y }) => x > 0 && y > 0 && x < MAP_SIZE - 1 && y < MAP_SIZE - 1 && cells[y][x] === "#");

    if (!next) {
      stack.pop();
      continue;
    }

    cells[current.y + next.dir.y / 2][current.x + next.dir.x / 2] = ".";
    cells[next.y][next.x] = ".";
    stack.push({ x: next.x, y: next.y });
  }

  // Small rooms prevent every floor from reading as a one-tile corridor maze.
  for (let room = 0; room < roomCount; room += 1) {
    const cx = 2 + Math.floor(rng() * 7);
    const cy = 2 + Math.floor(rng() * 7);
    for (let y = cy - 1; y <= cy + 1; y += 1) {
      for (let x = cx - 1; x <= cx + 1; x += 1) {
        if (x > 0 && y > 0 && x < MAP_SIZE - 1 && y < MAP_SIZE - 1) cells[y][x] = ".";
      }
    }
  }

  return cells.map((row) => row.join(""));
}

function neighbors(point: Point, grid: string[], blocked: ReadonlySet<string> = new Set()): Point[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter(({ x, y }) => x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE && grid[y][x] !== "#" && !blocked.has(`${x},${y}`));
}

function findPath(grid: string[], start: Point, exit: Point, blocked: ReadonlySet<string> = new Set()): Point[] {
  if (blocked.has(key(start)) || blocked.has(key(exit))) return [];
  const queue: Point[] = [start];
  const previous = new Map<string, Point | null>([[key(start), null]]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.x === exit.x && current.y === exit.y) break;
    for (const next of neighbors(current, grid, blocked)) {
      if (previous.has(key(next))) continue;
      previous.set(key(next), current);
      queue.push(next);
    }
  }

  if (!previous.has(key(exit))) return [];

  const path: Point[] = [];
  let current: Point | null | undefined = exit;
  while (current) {
    path.push(current);
    current = previous.get(key(current));
  }
  return path.reverse();
}

function cornersForFloor(floor: number): { start: Point; exit: Point } {
  const corners = [
    { x: 1, y: 9 },
    { x: 9, y: 9 },
    { x: 9, y: 1 },
    { x: 1, y: 1 },
  ];
  const index = (floor - 1) % corners.length;
  return { start: corners[index], exit: corners[(index + 2) % corners.length] };
}

function reachableKeys(grid: string[], start: Point, blocked: ReadonlySet<string>): Set<string> {
  if (blocked.has(key(start))) return new Set();
  const queue: Point[] = [start];
  const reached = new Set<string>([key(start)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    for (const next of neighbors(queue[cursor], grid, blocked)) {
      const nextKey = key(next);
      if (reached.has(nextKey)) continue;
      reached.add(nextKey);
      queue.push(next);
    }
  }
  return reached;
}

function isStraightCorridor(grid: string[], point: Point): boolean {
  const adjacent = neighbors(point, grid);
  if (adjacent.length !== 2) return false;
  return adjacent[0].x === adjacent[1].x || adjacent[0].y === adjacent[1].y;
}

type GateId = "yellow" | "blue" | "red" | "guardian";

interface GateSpec {
  id: GateId;
  ratio: number;
}

interface GateSlot extends GateSpec {
  pathIndex: number;
  point: Point;
}

interface FloorLayout {
  grid: string[];
  path: Point[];
  gates: GateSlot[];
}

function gateSpecsForFloor(floor: number, chapterFloor: number): GateSpec[] {
  const specs: GateSpec[] = [{ id: "yellow", ratio: 0.36 }];
  if (floor >= 3 && floor % 3 === 0) specs.push({ id: "blue", ratio: 0.57 });
  if (floor % 10 === 0) specs.push({ id: "red", ratio: 0.72 });
  specs.push({ id: "guardian", ratio: chapterFloor === 5 ? 0.9 : 0.82 });
  return specs;
}

function selectGateSlots(path: Point[], candidateIndexes: number[], specs: GateSpec[]): GateSlot[] | null {
  const assign = (specIndex: number, previousIndex: number): GateSlot[] | null => {
    if (specIndex >= specs.length) return [];
    const spec = specs[specIndex];
    const minimumIndex = previousIndex < 0 ? 2 : previousIndex + 2;
    const options = candidateIndexes
      .filter((index) => index >= minimumIndex && index < path.length - 1)
      .sort((a, b) => Math.abs(a / (path.length - 1) - spec.ratio) - Math.abs(b / (path.length - 1) - spec.ratio));

    for (const pathIndex of options) {
      const rest = assign(specIndex + 1, pathIndex);
      if (rest) return [{ ...spec, pathIndex, point: path[pathIndex] }, ...rest];
    }
    return null;
  };

  return assign(0, -1);
}

function sideMonsterCountForFloor(floor: number, chapterFloor: number): number {
  return floor === 50 ? 2 : 3 + Math.floor((chapterFloor - 1) / 2);
}

function branchBlockerCountForFloor(floor: number, chapterFloor: number): number {
  return sideMonsterCountForFloor(floor, chapterFloor)
    + (floor % 5 === 0 && floor < 50 ? 1 : 0)
    + (npcForFloor(floor) ? 1 : 0)
    + (floor >= 2 && floor % 4 === 2 ? 1 : 0);
}

function createFloorLayout(floor: number, start: Point, exit: Point, chapterFloor: number): FloorLayout {
  const specs = gateSpecsForFloor(floor, chapterFloor);
  const requiredBranchCells = branchBlockerCountForFloor(floor, chapterFloor);
  const preferredRoomCount = 1 + (floor % 3);

  for (let roomCount = preferredRoomCount; roomCount >= 0; roomCount -= 1) {
    for (let attempt = 0; attempt < 96; attempt += 1) {
      const grid = makeMaze(floor, start, attempt, roomCount);
      const path = findPath(grid, start, exit);
      if (path.length === 0) continue;
      const pathSet = new Set(path.map(key));
      let branchCells = 0;
      for (let y = 1; y < MAP_SIZE - 1; y += 1) {
        for (let x = 1; x < MAP_SIZE - 1; x += 1) {
          if (grid[y][x] !== "#" && !pathSet.has(`${x},${y}`)) branchCells += 1;
        }
      }
      if (branchCells < requiredBranchCells) continue;

      const candidateIndexes = path
        .map((point, pathIndex) => ({ point, pathIndex }))
        .filter(({ point }) => isStraightCorridor(grid, point) && findPath(grid, start, exit, new Set([key(point)])).length === 0)
        .map(({ pathIndex }) => pathIndex);
      const gates = selectGateSlots(path, candidateIndexes, specs);
      if (gates) return { grid, path, gates };
    }
  }

  throw new Error(`Unable to generate a valid topology for floor ${floor}`);
}

function choosePathPoint(
  path: Point[],
  startIndex: number,
  endIndex: number,
  targetRatio: number,
  occupied: ReadonlySet<string>,
): Point | null {
  const options = path
    .map((point, pathIndex) => ({ point, pathIndex }))
    .filter(({ point, pathIndex }) => pathIndex >= startIndex && pathIndex <= endIndex && !occupied.has(key(point)))
    .sort((a, b) => Math.abs(a.pathIndex / (path.length - 1) - targetRatio) - Math.abs(b.pathIndex / (path.length - 1) - targetRatio));
  return options[0]?.point ?? null;
}

function choosePermanentPoints(grid: string[], start: Point, exit: Point, candidates: Point[], count: number): Point[] | null {
  if (count === 0) return [];

  const search = (cursor: number, chosen: Point[]): Point[] | null => {
    if (chosen.length === count) {
      const blocked = new Set(chosen.map(key));
      const reached = reachableKeys(grid, start, blocked);
      if (!reached.has(key(exit))) return null;
      return chosen.every((point) => neighbors(point, grid, blocked).some((neighbor) => reached.has(key(neighbor)))) ? chosen : null;
    }

    for (let index = cursor; index < candidates.length; index += 1) {
      const result = search(index + 1, [...chosen, candidates[index]]);
      if (result) return result;
    }
    return null;
  };

  return search(0, []);
}

function npcForFloor(floor: number): string | null {
  const map: Record<number, string> = {
    1: "elder",
    6: "smith",
    11: "cartographer",
    20: "healer",
    31: "prisoner",
    41: "princess",
  };
  return map[floor] ?? null;
}

function rareItemForFloor(floor: number): string | null {
  const map: Record<number, string> = {
    4: "axeRelic",
    9: "hammerRelic",
    15: "flameRelic",
    18: "bomb",
    28: "holyWater",
    37: "bomb",
    46: "holyWater",
  };
  return map[floor] ?? null;
}

export function generateFloor(floor: number): FloorData {
  const { start, exit } = cornersForFloor(floor);
  const chapterFloor = ((floor - 1) % 5) + 1;
  const { grid, path, gates } = createFloorLayout(floor, start, exit, chapterFloor);
  const pathSet = new Set(path.map(key));
  const rng = mulberry32(0x8f13 + floor * 104729);
  const themeIndex = Math.floor((floor - 1) / 5);
  const theme = THEMES[themeIndex];
  const entities: FloorEntity[] = [];
  const occupied = new Set<string>();

  const add = (entity: FloorEntity): boolean => {
    const positionKey = key(entity);
    if (occupied.has(positionKey)) return false;
    occupied.add(positionKey);
    entities.push(entity);
    return true;
  };

  if (floor > 1) add({ id: `f${floor}-down`, kind: "stairs", direction: "down", ...start });
  if (floor < 50) add({ id: `f${floor}-up`, kind: "stairs", direction: "up", ...exit });

  const branchCells: Point[] = [];
  const deadEnds: Point[] = [];
  for (let y = 1; y < MAP_SIZE - 1; y += 1) {
    for (let x = 1; x < MAP_SIZE - 1; x += 1) {
      if (grid[y][x] === "#") continue;
      const point = { x, y };
      if (!pathSet.has(key(point))) branchCells.push(point);
      if (!pathSet.has(key(point)) && neighbors(point, grid).length <= 1) deadEnds.push(point);
    }
  }

  const deadEndKeys = new Set(deadEnds.map(key));
  const orderedBranchCells = [
    ...shuffle([...deadEnds], rng),
    ...shuffle(branchCells.filter((point) => !deadEndKeys.has(key(point))), rng),
  ];
  const branchCandidates = [...orderedBranchCells];
  const pathCandidates = shuffle(path.filter((point) => key(point) !== key(start) && key(point) !== key(exit)), rng);
  const candidates = [...shuffle([...branchCells], rng), ...pathCandidates];

  const takeBranchFree = (): Point | null => {
    while (branchCandidates.length) {
      const point = branchCandidates.shift()!;
      if (!occupied.has(key(point))) return point;
    }
    return null;
  };
  const takeFree = (): Point | null => {
    while (candidates.length) {
      const point = candidates.shift()!;
      if (!occupied.has(key(point)) && key(point) !== key(start) && key(point) !== key(exit)) return point;
    }
    return null;
  };
  const addAtFree = (make: (point: Point) => FloorEntity) => {
    const point = takeFree();
    if (!point) throw new Error(`Floor ${floor} ran out of free content cells`);
    add(make(point));
  };
  const addAtBranch = (make: (point: Point) => FloorEntity) => {
    const point = takeBranchFree();
    if (!point) throw new Error(`Floor ${floor} ran out of safe branch cells`);
    add(make(point));
  };

  const pool = MONSTER_POOLS[themeIndex];
  const guardianTier = chapterFloor <= 2 ? 0 : chapterFloor === 3 ? 1 : 2;
  const gateById = new Map(gates.map((gate) => [gate.id, gate]));
  const yellowGate = gateById.get("yellow")!;
  const guardianGate = gateById.get("guardian")!;

  add({ id: `f${floor}-yellow-door-main`, kind: "door", color: "yellow", ...yellowGate.point });
  const blueGate = gateById.get("blue");
  if (blueGate) add({ id: `f${floor}-blue-door-main`, kind: "door", color: "blue", ...blueGate.point });
  const redGate = gateById.get("red");
  if (redGate) add({ id: `f${floor}-red-door-main`, kind: "door", color: "red", ...redGate.point });
  add({
    id: `f${floor}-guardian`,
    kind: "monster",
    monsterId: BOSS_BY_FLOOR[floor] ?? pool[guardianTier],
    ...guardianGate.point,
  });

  const addMainKey = (color: "yellow" | "blue" | "red", afterIndex: number, gate: GateSlot, targetRatio: number) => {
    const point = choosePathPoint(path, afterIndex + 1, gate.pathIndex - 1, targetRatio, occupied);
    if (!point) throw new Error(`Floor ${floor} has no route cell for its ${color} key`);
    add({ id: `f${floor}-${color}-key-main`, kind: "item", itemId: `${color}Key`, ...point });
  };

  addMainKey("yellow", 0, yellowGate, 0.14);
  if (blueGate) addMainKey("blue", yellowGate.pathIndex, blueGate, (yellowGate.ratio + blueGate.ratio) / 2);
  if (redGate) {
    const previousGate = blueGate ?? yellowGate;
    addMainKey("red", previousGate.pathIndex, redGate, (previousGate.ratio + redGate.ratio) / 2);
  }

  const permanentFactories: Array<(point: Point) => FloorEntity> = [];
  if (floor % 5 === 0 && floor < 50) {
    permanentFactories.push((point) => ({ id: `f${floor}-shop`, kind: "shop", level: Math.ceil(floor / 5), ...point }));
  }
  const npcId = npcForFloor(floor);
  if (npcId) permanentFactories.push((point) => ({ id: `f${floor}-npc-${npcId}`, kind: "npc", npcId, ...point }));

  const permanentPoints = choosePermanentPoints(grid, start, exit, orderedBranchCells, permanentFactories.length);
  if (!permanentPoints) throw new Error(`Floor ${floor} has no approachable branch placement for permanent actors`);
  permanentFactories.forEach((make, index) => add(make(permanentPoints[index])));

  const sideMonsterCount = sideMonsterCountForFloor(floor, chapterFloor);
  for (let i = 0; i < sideMonsterCount; i += 1) {
    const sideTier = Math.min(2, Math.max(0, guardianTier - 1 + (i % 2)));
    addAtBranch((point) => ({ id: `f${floor}-monster-${i}`, kind: "monster", monsterId: pool[sideTier], ...point }));
  }

  if (floor >= 2 && floor % 4 === 2) {
    const trialId = floor % 12 === 2 ? "sealedChest" : floor % 12 === 6 ? "memoryAltar" : "moonWell";
    const rewardId = trialId === "sealedChest" ? (floor > 25 ? "redKey" : "coinBag") : trialId === "memoryAltar" ? "insight" : "largePotion";
    addAtBranch((point) => ({
      id: `f${floor}-trial`,
      kind: "trial",
      trialId,
      rewardId,
      amount: rewardId === "coinBag" ? 35 + floor * 3 : 1,
      ...point,
    }));
  }

  const itemCycle = ["smallPotion", "ruby", "yellowKey", "sapphire", "coinBag", "smallPotion", "blueKey"];
  const itemCount = 3 + (floor % 2);
  for (let i = 0; i < itemCount; i += 1) {
    const itemId = itemCycle[(floor + i * 2) % itemCycle.length];
    const amount = itemId === "coinBag" ? 12 + floor * 2 : undefined;
    addAtFree((point) => ({ id: `f${floor}-item-${i}`, kind: "item", itemId, amount, ...point }));
  }

  if (floor % 7 === 0 || chapterFloor === 5) {
    addAtFree((point) => ({ id: `f${floor}-large-potion`, kind: "item", itemId: "largePotion", ...point }));
  }

  const rareItem = rareItemForFloor(floor);
  if (rareItem) addAtFree((point) => ({ id: `f${floor}-rare`, kind: "item", itemId: rareItem, ...point }));

  const objective = floor === 50
    ? "击败失明之王，夺回被抹去的名字。"
    : floor % 10 === 0
      ? "取得猩红钥匙，开启王门并击败本段守主。"
      : chapterFloor === 5
        ? "寻找商人完成本段整备，并击败通往下一段的封印守卫。"
        : "收集资源，权衡支路消耗，并找到上行阶梯。";

  return {
    number: floor,
    name: `${theme.name} · ${String(chapterFloor).padStart(2, "0")}`,
    theme,
    grid,
    start,
    exit,
    entities,
    objective,
  };
}

export const FLOORS: FloorData[] = Array.from({ length: 50 }, (_, index) => generateFloor(index + 1));

export function validateFloors(): string[] {
  const problems: string[] = [];
  for (const floor of FLOORS) {
    const positions = new Set<string>();
    for (const entity of floor.entities) {
      if (floor.grid[entity.y]?.[entity.x] === "#") problems.push(`F${floor.number}: ${entity.id} is inside a wall`);
      const positionKey = key(entity);
      if (positions.has(positionKey)) problems.push(`F${floor.number}: duplicate entity position ${positionKey}`);
      positions.add(positionKey);
    }
    if (floor.grid.length !== MAP_SIZE || floor.grid.some((row) => row.length !== MAP_SIZE)) problems.push(`F${floor.number}: invalid grid size`);
    if (floor.number < 50 && !floor.entities.some((entity) => entity.kind === "stairs" && entity.direction === "up")) problems.push(`F${floor.number}: missing up stairs`);
    if (floor.number > 1 && !floor.entities.some((entity) => entity.kind === "stairs" && entity.direction === "down")) problems.push(`F${floor.number}: missing down stairs`);
  }
  for (const report of auditFloors(FLOORS)) {
    problems.push(...report.issues.map((issue) => `F${report.floor}: ${issue}`));
  }
  return problems;
}
