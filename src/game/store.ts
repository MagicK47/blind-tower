import { ITEMS, MONSTERS, NPCS, TRIALS } from "./content";
import { FLOORS } from "./floors";
import type {
  CombatSession,
  CombatForecast,
  FloorData,
  FloorEntity,
  MonsterEntity,
  NpcEntity,
  PlayerState,
  SaveData,
  ShopEntity,
  TrialEntity,
} from "./types";

const SAVE_KEY = "blind-tower-save-v1";

export type GameEvent =
  | { type: "state" }
  | { type: "encounter"; session: CombatSession }
  | { type: "shop"; entity: ShopEntity }
  | { type: "dialog"; entity: NpcEntity }
  | { type: "toast"; message: string; tone?: "normal" | "danger" | "reward" }
  | { type: "defeat" }
  | { type: "ending" };

type Listener = (event: GameEvent) => void;

function initialPlayer(): PlayerState {
  return {
    floor: 1,
    x: FLOORS[0].start.x,
    y: FLOORS[0].start.y,
    hp: 1000,
    maxHp: 1000,
    attack: 18,
    defense: 10,
    gold: 0,
    exp: 0,
    level: 1,
    yellowKeys: 0,
    blueKeys: 0,
    redKeys: 0,
    insight: 0,
    unlockedAbilities: ["sword", "spear"],
    inventory: { bomb: 0, holyWater: 0, shopPurchases: 0 },
  };
}

function initialSave(): SaveData {
  return {
    version: 1,
    player: initialPlayer(),
    consumed: {},
    visitedFloors: [1],
    npcFlags: [],
    defeatedMonsters: {},
    log: ["你在遗忘墓道醒来。按格探索，先核对战损，再决定路线。"],
    playSeconds: 0,
    ending: false,
  };
}

function cloneSave(data: SaveData): SaveData {
  return structuredClone(data);
}

export class GameStore {
  private listeners = new Set<Listener>();
  private data: SaveData = initialSave();
  private activeEncounter: CombatSession | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  get saveData(): SaveData {
    return this.data;
  }

  get player(): PlayerState {
    return this.data.player;
  }

  get floor(): FloorData {
    return FLOORS[this.player.floor - 1];
  }

  get encounter(): CombatSession | null {
    return this.activeEncounter;
  }

  hasSave(): boolean {
    try {
      return Boolean(localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }

  newGame(): void {
    this.data = initialSave();
    this.activeEncounter = null;
    this.save();
    this.emit({ type: "state" });
  }

  continueGame(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== 1 || !parsed.player) return false;
      this.data = parsed;
      this.activeEncounter = null;
      this.emit({ type: "state" });
      return true;
    } catch {
      return false;
    }
  }

  save(showToast = false): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      if (showToast) this.emit({ type: "toast", message: "进度已写入塔之记忆。", tone: "reward" });
    } catch {
      this.emit({ type: "toast", message: "浏览器拒绝写入存档。", tone: "danger" });
    }
  }

  restoreLastSave(): void {
    if (!this.continueGame()) this.newGame();
  }

  addPlaySecond(): void {
    this.data.playSeconds += 1;
  }

  isConsumed(floor: number, entityId: string): boolean {
    return this.data.consumed[String(floor)]?.includes(entityId) ?? false;
  }

  visibleEntities(floor = this.floor): FloorEntity[] {
    return floor.entities.filter((entity) => !this.isConsumed(floor.number, entity.id));
  }

  entityAt(x: number, y: number): FloorEntity | undefined {
    return this.visibleEntities().find((entity) => entity.x === x && entity.y === y);
  }

  private consume(entity: FloorEntity, floor = this.player.floor): void {
    const floorKey = String(floor);
    const list = this.data.consumed[floorKey] ?? (this.data.consumed[floorKey] = []);
    if (!list.includes(entity.id)) list.push(entity.id);
  }

  private log(message: string): void {
    this.data.log.unshift(message);
    this.data.log = this.data.log.slice(0, 8);
  }

  private toast(message: string, tone: "normal" | "danger" | "reward" = "normal"): void {
    this.log(message);
    this.emit({ type: "toast", message, tone });
  }

  tryMove(dx: number, dy: number): boolean {
    if (this.activeEncounter || this.data.ending) return false;
    const x = this.player.x + dx;
    const y = this.player.y + dy;
    if (x < 0 || y < 0 || x >= this.floor.grid.length || y >= this.floor.grid.length) return false;
    if (this.floor.grid[y][x] === "#") return false;

    const entity = this.entityAt(x, y);
    if (entity) {
      if (entity.kind === "door") {
        const keyField = `${entity.color}Keys` as "yellowKeys" | "blueKeys" | "redKeys";
        if (this.player[keyField] <= 0) {
          this.toast(`${entity.color === "yellow" ? "黄" : entity.color === "blue" ? "蓝" : "红"}门紧锁，你没有对应钥匙。`, "danger");
          return false;
        }
        this.player[keyField] -= 1;
        this.consume(entity);
        this.toast("钥匙转动，门锁化作一阵尘光。", "reward");
      } else if (entity.kind === "monster" || entity.kind === "trial") {
        this.openEncounter(entity);
        return false;
      } else if (entity.kind === "npc") {
        this.emit({ type: "dialog", entity });
        return false;
      } else if (entity.kind === "shop") {
        this.emit({ type: "shop", entity });
        return false;
      } else if (entity.kind === "stairs") {
        this.changeFloor(entity.direction === "up" ? 1 : -1);
        return true;
      } else if (entity.kind === "item") {
        this.consume(entity);
        this.applyItem(entity.itemId, entity.amount ?? 1);
      }
    }

    this.player.x = x;
    this.player.y = y;
    this.emit({ type: "state" });
    return true;
  }

  moveTowardTile(x: number, y: number): boolean {
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    return this.tryMove(dx, dy);
  }

  private changeFloor(delta: number): void {
    const target = Math.max(1, Math.min(50, this.player.floor + delta));
    if (target === this.player.floor) return;
    this.player.floor = target;
    const floor = FLOORS[target - 1];
    const spawn = delta > 0 ? floor.start : floor.exit;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    if (!this.data.visitedFloors.includes(target)) this.data.visitedFloors.push(target);
    this.data.visitedFloors.sort((a, b) => a - b);
    this.log(`抵达第 ${target} 层：${floor.name}。`);
    this.save();
    this.emit({ type: "state" });
    this.emit({ type: "toast", message: `第 ${target} 层 · ${floor.theme.name}`, tone: "reward" });
  }

  jumpToVisitedFloor(floorNumber: number): boolean {
    if (!this.data.visitedFloors.includes(floorNumber) || this.activeEncounter) return false;
    this.player.floor = floorNumber;
    const floor = FLOORS[floorNumber - 1];
    this.player.x = floor.start.x;
    this.player.y = floor.start.y;
    this.log(`塔之罗盘将你送回第 ${floorNumber} 层。`);
    this.emit({ type: "state" });
    return true;
  }

  openEncounter(source: MonsterEntity | TrialEntity): void {
    if (source.kind === "monster") {
      const monster = MONSTERS[source.monsterId];
      const forecast = this.fightForecast(monster.id);
      if (!forecast.canDamage) {
        this.toast(`${monster.name} 的防御高于你的攻击，当前无法破防。`, "danger");
        return;
      }
      if (!forecast.canSurvive) {
        this.toast(`预计损失 ${forecast.totalDamage} 生命，当前生命不足。`, "danger");
        return;
      }
      this.activeEncounter = {
        mode: "combat",
        source,
        monster,
        forecast,
      };
    } else {
      const trial = TRIALS[source.trialId];
      const trialCost = this.trialCost();
      if (trialCost >= this.player.hp) {
        this.toast(`机关需要承受 ${trialCost} 点代价，当前生命不足。`, "danger");
        return;
      }
      this.activeEncounter = {
        mode: "trial",
        source,
        trial,
        trialCost,
      };
    }
    this.emit({ type: "encounter", session: this.activeEncounter });
  }

  closeEncounter(): void {
    this.activeEncounter = null;
    this.emit({ type: "state" });
  }

  resolveClassicCombat(): void {
    const session = this.activeEncounter;
    if (!session?.monster || session.source.kind !== "monster") return;
    const forecast = this.fightForecast(session.monster.id);
    if (!forecast.canDamage || !forecast.canSurvive) {
      this.closeEncounter();
      return;
    }

    const source = session.source;
    this.consume(source);
    const monster = session.monster;
    this.player.hp -= forecast.totalDamage;
    this.player.gold += monster.gold;
    this.gainExp(monster.exp);
    this.data.defeatedMonsters[monster.id] = (this.data.defeatedMonsters[monster.id] ?? 0) + 1;
    this.log(`击败 ${monster.name}，损失 ${forecast.totalDamage} 生命，获得 ${monster.gold} 金币与 ${monster.exp} 经验。`);
    this.activeEncounter = null;
    if (source.monsterId === "boss_50") {
      this.data.ending = true;
      this.save();
      this.emit({ type: "ending" });
      return;
    }
    this.save();
    this.emit({ type: "state" });
  }

  resolveTrial(): void {
    const session = this.activeEncounter;
    if (!session?.trial || session.source.kind !== "trial") return;
    const cost = session.trialCost ?? this.trialCost();
    if (cost >= this.player.hp) {
      this.closeEncounter();
      return;
    }
    const source = session.source;
    this.player.hp -= cost;
    this.consume(source);
    this.activeEncounter = null;
    this.applyItem(source.rewardId, source.amount ?? 1);
    this.log(`${session.trial.successText}${cost ? ` 付出 ${cost} 点生命。` : " 洞察让你避开了全部代价。"}`);
    this.save();
    this.emit({ type: "state" });
  }

  private gainExp(amount: number): void {
    this.player.exp += amount;
    let threshold = this.player.level * 45;
    while (this.player.exp >= threshold) {
      this.player.exp -= threshold;
      this.player.level += 1;
      this.player.maxHp += 120;
      this.player.hp += 120;
      this.player.attack += 3;
      this.player.defense += 2;
      if (this.player.level % 3 === 0) this.player.insight += 1;
      this.toast(`等级提升至 ${this.player.level}：生命、攻击与防御永久提升。`, "reward");
      threshold = this.player.level * 45;
    }
  }

  applyItem(itemId: string, amount = 1): void {
    const item = ITEMS[itemId];
    if (!item) return;
    switch (itemId) {
      case "yellowKey": this.player.yellowKeys += amount; break;
      case "blueKey": this.player.blueKeys += amount; break;
      case "redKey": this.player.redKeys += amount; break;
      case "smallPotion": this.player.hp = Math.min(this.player.maxHp, this.player.hp + 160 * amount); break;
      case "largePotion": this.player.hp = Math.min(this.player.maxHp, this.player.hp + 520 * amount); break;
      case "ruby": this.player.attack += 3 * amount; break;
      case "sapphire": this.player.defense += 3 * amount; break;
      case "coinBag": this.player.gold += amount; break;
      case "insight": this.player.insight += amount; break;
      case "axeRelic":
        this.player.attack += 8 * amount;
        this.unlockAbility("axe");
        break;
      case "hammerRelic":
        this.player.defense += 8 * amount;
        this.unlockAbility("hammer");
        break;
      case "flameRelic":
        this.unlockAbility("flame");
        this.player.attack += 6 * amount;
        this.player.maxHp += 180 * amount;
        this.player.hp += 180 * amount;
        break;
      case "bomb":
      case "holyWater":
        this.player.inventory[itemId] = (this.player.inventory[itemId] ?? 0) + amount;
        break;
    }
    this.toast(`获得 ${item.name}${amount > 1 ? ` ×${amount}` : ""}。`, "reward");
    this.emit({ type: "state" });
  }

  private unlockAbility(abilityId: string): void {
    if (!this.player.unlockedAbilities.includes(abilityId)) this.player.unlockedAbilities.push(abilityId);
  }

  useInventory(itemId: "bomb" | "holyWater"): boolean {
    if ((this.player.inventory[itemId] ?? 0) <= 0) {
      this.toast("背包里没有这件物品。", "danger");
      return false;
    }

    if (itemId === "holyWater") {
      if (this.player.hp >= this.player.maxHp) {
        this.toast("生命已满，圣水没有被消耗。", "normal");
        return false;
      }
      this.player.inventory.holyWater -= 1;
      const heal = Math.round(this.player.maxHp * 0.35);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.toast(`圣水恢复 ${heal} 点生命。`, "reward");
    } else {
      const monster = this.visibleEntities().find((entity): entity is MonsterEntity =>
        entity.kind === "monster"
        && !MONSTERS[entity.monsterId].boss
        && Math.abs(entity.x - this.player.x) + Math.abs(entity.y - this.player.y) === 1,
      );
      if (!monster) {
        this.toast("火药只能清除相邻的普通怪物。", "normal");
        return false;
      }
      this.player.inventory.bomb -= 1;
      this.consume(monster);
      this.toast(`裂墙火药吞没了 ${MONSTERS[monster.monsterId].name}。`, "reward");
    }

    this.save();
    this.emit({ type: "state" });
    return true;
  }

  acceptNpcGift(npcId: string): boolean {
    if (this.data.npcFlags.includes(npcId)) return false;
    const npc = NPCS[npcId];
    if (!npc?.gift) return false;
    this.data.npcFlags.push(npcId);
    this.applyItem(npc.gift.itemId, npc.gift.amount ?? 1);
    this.save();
    return true;
  }

  shopPrice(level: number): number {
    return 26 + level * 16 + (this.player.inventory.shopPurchases ?? 0) * 9;
  }

  buyUpgrade(level: number, upgrade: "attack" | "defense" | "health" | "insight"): boolean {
    const price = this.shopPrice(level);
    if (this.player.gold < price) {
      this.toast(`需要 ${price} 金币。`, "danger");
      return false;
    }
    this.player.gold -= price;
    this.player.inventory.shopPurchases = (this.player.inventory.shopPurchases ?? 0) + 1;
    if (upgrade === "attack") this.player.attack += 5;
    if (upgrade === "defense") this.player.defense += 5;
    if (upgrade === "health") {
      this.player.maxHp += 260;
      this.player.hp += 260;
    }
    if (upgrade === "insight") this.player.insight += 1;
    this.toast(`商人完成了${upgrade === "attack" ? "武器淬炼" : upgrade === "defense" ? "护甲加固" : upgrade === "health" ? "生命祝福" : "机关研习"}。`, "reward");
    this.save();
    this.emit({ type: "state" });
    return true;
  }

  fightForecast(monsterId: string): CombatForecast {
    const monster = MONSTERS[monsterId];
    const heroDamage = this.player.attack - monster.defense;
    const canDamage = heroDamage > 0;
    const rounds = canDamage ? Math.ceil(monster.hp / heroDamage) : 0;
    const enemyDamage = Math.max(0, monster.attack - this.player.defense);
    const totalDamage = canDamage ? Math.max(0, rounds - 1) * enemyDamage : 0;
    return {
      canDamage,
      canSurvive: canDamage && totalDamage < this.player.hp,
      heroDamage: Math.max(0, heroDamage),
      enemyDamage,
      rounds,
      totalDamage,
    };
  }

  trialCost(): number {
    return Math.max(0, 10 + this.player.floor * 2 - this.player.insight * 8);
  }

  debugJump(floorNumber: number): void {
    const target = Math.max(1, Math.min(50, Math.round(floorNumber)));
    if (!this.data.visitedFloors.includes(target)) this.data.visitedFloors.push(target);
    this.player.floor = target;
    this.player.x = FLOORS[target - 1].start.x;
    this.player.y = FLOORS[target - 1].start.y;
    this.player.hp = Math.max(this.player.hp, this.player.maxHp);
    this.emit({ type: "state" });
  }

  debugGrant(): void {
    this.player.attack += 200;
    this.player.defense += 200;
    this.player.maxHp += 5000;
    this.player.hp = this.player.maxHp;
    this.player.gold += 5000;
    this.player.yellowKeys += 99;
    this.player.blueKeys += 99;
    this.player.redKeys += 99;
    this.player.unlockedAbilities = ["sword", "spear", "axe", "hammer", "flame"];
    this.emit({ type: "state" });
  }

  snapshot(): SaveData {
    return cloneSave(this.data);
  }
}

export const store = new GameStore();
