import { BOSS_BY_FLOOR, MONSTER_POOLS, THEMES } from "./content";
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

function makeMaze(floor: number, start: Point): string[] {
  const rng = mulberry32(0x51a7 + floor * 7919);
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
  const roomCount = 1 + (floor % 3);
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

function neighbors(point: Point, grid: string[]): Point[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter(({ x, y }) => x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE && grid[y][x] !== "#");
}

function findPath(grid: string[], start: Point, exit: Point): Point[] {
  const queue: Point[] = [start];
  const previous = new Map<string, Point | null>([[key(start), null]]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.x === exit.x && current.y === exit.y) break;
    for (const next of neighbors(current, grid)) {
      if (previous.has(key(next))) continue;
      previous.set(key(next), current);
      queue.push(next);
    }
  }

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

function chooseAt(path: Point[], ratio: number): Point {
  return path[Math.max(1, Math.min(path.length - 2, Math.floor((path.length - 1) * ratio)))];
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
  const grid = makeMaze(floor, start);
  const path = findPath(grid, start, exit);
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

  const floorCells: Point[] = [];
  const branchCells: Point[] = [];
  const deadEnds: Point[] = [];
  for (let y = 1; y < MAP_SIZE - 1; y += 1) {
    for (let x = 1; x < MAP_SIZE - 1; x += 1) {
      if (grid[y][x] === "#") continue;
      const point = { x, y };
      floorCells.push(point);
      if (!pathSet.has(key(point))) branchCells.push(point);
      if (!pathSet.has(key(point)) && neighbors(point, grid).length <= 1) deadEnds.push(point);
    }
  }

  const candidates = shuffle([...deadEnds, ...branchCells, ...floorCells], rng);
  const takeFree = (): Point | null => {
    while (candidates.length) {
      const point = candidates.shift()!;
      if (!occupied.has(key(point)) && key(point) !== key(start) && key(point) !== key(exit)) return point;
    }
    return null;
  };
  const addAtFree = (make: (point: Point) => FloorEntity) => {
    const point = takeFree();
    if (point) add(make(point));
  };

  // The mandatory door keys always appear earlier on the shortest route than their doors.
  add({ id: `f${floor}-yellow-key-main`, kind: "item", itemId: "yellowKey", ...chooseAt(path, 0.15) });
  add({ id: `f${floor}-yellow-door-main`, kind: "door", color: "yellow", ...chooseAt(path, 0.38) });
  if (floor >= 3 && floor % 3 === 0) {
    add({ id: `f${floor}-blue-key-main`, kind: "item", itemId: "blueKey", ...chooseAt(path, 0.24) });
    add({ id: `f${floor}-blue-door-main`, kind: "door", color: "blue", ...chooseAt(path, 0.58) });
  }
  if (floor % 10 === 0) {
    add({ id: `f${floor}-red-key-main`, kind: "item", itemId: "redKey", ...chooseAt(path, 0.3) });
    add({ id: `f${floor}-red-door-main`, kind: "door", color: "red", ...chooseAt(path, 0.7) });
  }

  const pool = MONSTER_POOLS[themeIndex];
  const guardianPoint = chooseAt(path, floor % 10 === 0 ? 0.9 : 0.78);
  add({
    id: `f${floor}-guardian`,
    kind: "monster",
    monsterId: BOSS_BY_FLOOR[floor] ?? pool[(floor + 1) % pool.length],
    ...guardianPoint,
  });

  const sideMonsterCount = 3 + (floor % 3);
  for (let i = 0; i < sideMonsterCount; i += 1) {
    addAtFree((point) => ({ id: `f${floor}-monster-${i}`, kind: "monster", monsterId: pool[(floor + i) % pool.length], ...point }));
  }

  const itemCycle = ["smallPotion", "ruby", "yellowKey", "sapphire", "coinBag", "smallPotion", "blueKey"];
  const itemCount = 4 + (floor % 2);
  for (let i = 0; i < itemCount; i += 1) {
    const itemId = itemCycle[(floor + i * 2) % itemCycle.length];
    const amount = itemId === "coinBag" ? 12 + floor * 2 : undefined;
    addAtFree((point) => ({ id: `f${floor}-item-${i}`, kind: "item", itemId, amount, ...point }));
  }

  if (floor % 7 === 0 || floor % 10 === 0) {
    addAtFree((point) => ({ id: `f${floor}-large-potion`, kind: "item", itemId: "largePotion", ...point }));
  }

  const rareItem = rareItemForFloor(floor);
  if (rareItem) addAtFree((point) => ({ id: `f${floor}-rare`, kind: "item", itemId: rareItem, ...point }));

  if (floor % 5 === 0 && floor < 50) {
    addAtFree((point) => ({ id: `f${floor}-shop`, kind: "shop", level: Math.ceil(floor / 5), ...point }));
  }

  const npcId = npcForFloor(floor);
  if (npcId) addAtFree((point) => ({ id: `f${floor}-npc-${npcId}`, kind: "npc", npcId, ...point }));

  if (floor >= 2 && floor % 4 === 2) {
    const trialId = floor % 12 === 2 ? "sealedChest" : floor % 12 === 6 ? "memoryAltar" : "moonWell";
    const rewardId = trialId === "sealedChest" ? (floor > 25 ? "redKey" : "coinBag") : trialId === "memoryAltar" ? "insight" : "largePotion";
    addAtFree((point) => ({
      id: `f${floor}-trial`,
      kind: "trial",
      trialId,
      rewardId,
      amount: rewardId === "coinBag" ? 35 + floor * 3 : 1,
      ...point,
    }));
  }

  const chapterFloor = ((floor - 1) % 5) + 1;
  const objective = floor === 50
    ? "击败失明之王，夺回被抹去的名字。"
    : floor % 10 === 0
      ? "取得猩红钥匙，开启王门并击败本段守主。"
      : chapterFloor === 5
        ? "寻找商人整备，然后前往下一段塔层。"
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
  return problems;
}
