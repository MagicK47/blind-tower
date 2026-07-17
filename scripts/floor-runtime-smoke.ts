import { FLOORS } from "../src/game/floors.ts";
import { GameStore } from "../src/game/store.ts";
import type { FloorData, Point } from "../src/game/types.ts";

const pointKey = ({ x, y }: Point): string => `${x},${y}`;
const savedValues = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => savedValues.get(key) ?? null,
    setItem: (key: string, value: string) => savedValues.set(key, value),
    removeItem: (key: string) => savedValues.delete(key),
    clear: () => savedValues.clear(),
  },
});

function routeAroundPermanentActors(floor: FloorData): Point[] {
  const blocked = new Set(
    floor.entities
      .filter((entity) => entity.kind === "npc" || entity.kind === "shop")
      .map(pointKey),
  );
  const queue: Point[] = [floor.start];
  const previous = new Map<string, Point | null>([[pointKey(floor.start), null]]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.x === floor.exit.x && current.y === floor.exit.y) break;
    for (const next of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      const nextKey = pointKey(next);
      if (floor.grid[next.y]?.[next.x] === undefined || floor.grid[next.y][next.x] === "#" || blocked.has(nextKey) || previous.has(nextKey)) continue;
      previous.set(nextKey, current);
      queue.push(next);
    }
  }

  if (!previous.has(pointKey(floor.exit))) return [];
  const route: Point[] = [];
  let current: Point | null | undefined = floor.exit;
  while (current) {
    route.push(current);
    current = previous.get(pointKey(current));
  }
  return route.reverse();
}

const store = new GameStore();
store.newGame();
store.debugGrant();

const reports: Array<{ floor: number; steps: number; doors: number; fights: number; result: string }> = [];
for (const floor of FLOORS) {
  store.debugJump(floor.number);
  const route = routeAroundPermanentActors(floor);
  if (route.length === 0) throw new Error(`F${floor.number}: runtime route solver found no exit route`);

  let doors = 0;
  let fights = 0;
  for (const next of route.slice(1)) {
    const entity = store.entityAt(next.x, next.y);
    if (entity?.kind === "door") doors += 1;
    const dx = next.x - store.player.x;
    const dy = next.y - store.player.y;
    let moved = store.tryMove(dx, dy);

    if (!moved && store.encounter?.mode === "combat") {
      fights += 1;
      store.resolveClassicCombat();
      if (floor.number === 50 && store.saveData.ending) break;
      moved = store.tryMove(dx, dy);
    } else if (!moved && store.encounter?.mode === "trial") {
      store.resolveTrial();
      moved = store.tryMove(dx, dy);
    }

    if (!moved && !(floor.number < 50 && store.player.floor === floor.number + 1)) {
      throw new Error(`F${floor.number}: real movement stopped at ${next.x},${next.y} on ${entity?.id ?? "empty floor"}`);
    }
  }

  const cleared = floor.number === 50 ? store.saveData.ending : store.player.floor === floor.number + 1;
  if (!cleared) throw new Error(`F${floor.number}: real movement did not complete the floor`);
  reports.push({ floor: floor.number, steps: route.length - 1, doors, fights, result: "PASS" });
}

console.table(reports);

const staleSave = store.snapshot();
staleSave.ending = false;
staleSave.player.floor = 11;
staleSave.player.x = 0;
staleSave.player.y = 0;
localStorage.setItem("blind-tower-save-v2", JSON.stringify(staleSave));
const migratedStore = new GameStore();
if (!migratedStore.continueGame()) throw new Error("Legacy v2 save could not be loaded");
const floor11Start = FLOORS[10].start;
if (migratedStore.player.x !== floor11Start.x || migratedStore.player.y !== floor11Start.y) {
  throw new Error("Legacy save position inside a regenerated wall was not moved to the floor entrance");
}

console.log(`Floor runtime smoke test: PASS (${reports.length} floors traversed through real GameStore actions; legacy save position recovered).`);
