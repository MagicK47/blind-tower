import type { DoorColor, FloorData, FloorEntity, Point } from "./types";

const pointKey = ({ x, y }: Point): string => `${x},${y}`;

const KEY_FIELDS: Record<DoorColor, keyof KeyInventory> = {
  yellow: "yellow",
  blue: "blue",
  red: "red",
};

type KeyInventory = Record<DoorColor, number>;

type ProgressState = Point & {
  keys: KeyInventory;
  openedDoors: number;
  collectedKeys: number;
};

export interface FloorAudit {
  floor: number;
  walkableCells: number;
  shortestRoute: number;
  doors: number;
  meaningfulDoors: number;
  permanentActors: number;
  issues: string[];
}

function walkableNeighbors(floor: FloorData, point: Point): Point[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter(({ x, y }) => floor.grid[y]?.[x] !== undefined && floor.grid[y][x] !== "#");
}

function reachablePoints(floor: FloorData, blocked: ReadonlySet<string> = new Set()): Map<string, number> {
  const startKey = pointKey(floor.start);
  if (blocked.has(startKey)) return new Map();
  const queue: Point[] = [floor.start];
  const distances = new Map<string, number>([[startKey, 0]]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const distance = distances.get(pointKey(current))!;
    for (const next of walkableNeighbors(floor, current)) {
      const nextKey = pointKey(next);
      if (blocked.has(nextKey) || distances.has(nextKey)) continue;
      distances.set(nextKey, distance + 1);
      queue.push(next);
    }
  }

  return distances;
}

function hasRoute(floor: FloorData, blocked: ReadonlySet<string> = new Set()): boolean {
  return reachablePoints(floor, blocked).has(pointKey(floor.exit));
}

function isPermanentActor(entity: FloorEntity): boolean {
  return entity.kind === "npc" || entity.kind === "shop";
}

function isDoorway(floor: FloorData, point: Point): boolean {
  const neighbors = walkableNeighbors(floor, point);
  if (neighbors.length !== 2) return false;
  const [first, second] = neighbors;
  return first.x === second.x || first.y === second.y;
}

function progressionCanReachExit(floor: FloorData, permanentActors: ReadonlySet<string>): boolean {
  const entitiesByPosition = new Map(floor.entities.map((entity) => [pointKey(entity), entity]));
  const doors = floor.entities.filter((entity) => entity.kind === "door");
  const doorIndexes = new Map(doors.map((door, index) => [door.id, index]));
  const keyItems = floor.entities.filter(
    (entity) => entity.kind === "item" && (entity.itemId === "yellowKey" || entity.itemId === "blueKey" || entity.itemId === "redKey"),
  );
  const keyIndexes = new Map(keyItems.map((item, index) => [item.id, index]));

  const applyEntity = (state: ProgressState, entity: FloorEntity | undefined): ProgressState | null => {
    if (!entity) return state;
    if (isPermanentActor(entity)) return null;

    let next = state;
    if (entity.kind === "door") {
      const index = doorIndexes.get(entity.id)!;
      const mask = 1 << index;
      if ((state.openedDoors & mask) === 0) {
        const field = KEY_FIELDS[entity.color];
        if (state.keys[field] <= 0) return null;
        next = {
          ...state,
          keys: { ...state.keys, [field]: state.keys[field] - 1 },
          openedDoors: state.openedDoors | mask,
        };
      }
    }

    if (entity.kind === "item" && (entity.itemId === "yellowKey" || entity.itemId === "blueKey" || entity.itemId === "redKey")) {
      const index = keyIndexes.get(entity.id)!;
      const mask = 1 << index;
      if ((next.collectedKeys & mask) === 0) {
        const color = entity.itemId.replace("Key", "") as DoorColor;
        next = {
          ...next,
          keys: { ...next.keys, [color]: next.keys[color] + (entity.amount ?? 1) },
          collectedKeys: next.collectedKeys | mask,
        };
      }
    }
    return next;
  };

  const initial: ProgressState = {
    ...floor.start,
    keys: { yellow: 0, blue: 0, red: 0 },
    openedDoors: 0,
    collectedKeys: 0,
  };
  const queue: ProgressState[] = [applyEntity(initial, entitiesByPosition.get(pointKey(initial))) ?? initial];
  const visited = new Set<string>();

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const stateKey = `${current.x},${current.y}|${current.keys.yellow},${current.keys.blue},${current.keys.red}|${current.openedDoors}|${current.collectedKeys}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);
    if (current.x === floor.exit.x && current.y === floor.exit.y) return true;

    for (const point of walkableNeighbors(floor, current)) {
      if (permanentActors.has(pointKey(point))) continue;
      const entered = applyEntity({ ...current, ...point }, entitiesByPosition.get(pointKey(point)));
      if (entered) queue.push(entered);
    }
  }

  return false;
}

export function auditFloor(floor: FloorData): FloorAudit {
  const issues: string[] = [];
  const walkableCells = floor.grid.reduce((sum, row) => sum + [...row].filter((cell) => cell !== "#").length, 0);
  const rawDistances = reachablePoints(floor);
  const shortestRoute = rawDistances.get(pointKey(floor.exit)) ?? -1;
  const permanentEntities = floor.entities.filter(isPermanentActor);
  const permanentActors = new Set(permanentEntities.map(pointKey));
  const doors = floor.entities.filter((entity) => entity.kind === "door");
  const guardian = floor.entities.find((entity) => entity.kind === "monster" && entity.id.endsWith("-guardian"));
  let meaningfulDoors = 0;

  if (shortestRoute < 0) issues.push("base grid has no route from entrance to exit");

  if (!hasRoute(floor, permanentActors)) {
    issues.push("NPC/shop placement blocks every route from entrance to exit");
  }
  for (const entity of permanentEntities) {
    if (!hasRoute(floor, new Set([pointKey(entity)]))) {
      issues.push(`${entity.id} permanently occupies the only route`);
    }
  }

  const permanentReachable = reachablePoints(floor, permanentActors);
  for (const entity of permanentEntities) {
    if (!walkableNeighbors(floor, entity).some((point) => permanentReachable.has(pointKey(point)))) {
      issues.push(`${entity.id} cannot be approached for interaction`);
    }
  }

  for (const door of doors) {
    if (hasRoute(floor, new Set([pointKey(door)]))) {
      issues.push(`${door.id} can be bypassed without opening it`);
    } else {
      meaningfulDoors += 1;
    }
    if (!isDoorway(floor, door)) issues.push(`${door.id} is not placed in a two-wall corridor doorway`);
  }

  if (!guardian) {
    issues.push("missing guardian");
  } else if (hasRoute(floor, new Set([pointKey(guardian)]))) {
    issues.push(`${guardian.id} can be bypassed on the route to the exit`);
  }

  if (!progressionCanReachExit(floor, permanentActors)) {
    issues.push("zero-key progression cannot collect keys, open doors, and reach the exit");
  }

  return {
    floor: floor.number,
    walkableCells,
    shortestRoute,
    doors: doors.length,
    meaningfulDoors,
    permanentActors: permanentEntities.length,
    issues,
  };
}

export function auditFloors(floors: FloorData[]): FloorAudit[] {
  return floors.map(auditFloor);
}
