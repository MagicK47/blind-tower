import { BOSS_BY_FLOOR, ITEMS, MONSTERS, NPCS } from "../src/game/content.ts";
import { FLOORS, validateFloors } from "../src/game/floors.ts";
import type { FloorData, ItemEntity, MonsterEntity } from "../src/game/types.ts";
import { BALANCE } from "../src/game/balance.ts";

type Upgrade = "attack" | "defense" | "health";

type Player = {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  gold: number;
  exp: number;
  level: number;
  insight: number;
  shopPurchases: number;
  bombs: number;
  holyWater: number;
  smallPotions: number;
  largePotions: number;
  discoveredShops: number[];
  shopPurchasesByLevel: Record<number, number>;
};

type Strategy = {
  name: string;
  itemRate: number;
  monsterRate: number;
  maxShopPurchases: number;
  useConsumables: boolean;
};

type SegmentReport = {
  strategy: string;
  floors: string;
  hp: string;
  attack: number;
  defense: number;
  level: number;
  gold: number;
  damage: number;
  fights: number;
  status: string;
  reserves: string;
};

type FloorReport = {
  strategy: string;
  floor: number;
  hp: string;
  attack: number;
  defense: number;
  damage: number;
  guardianDamage: number;
  reserves: string;
};

const floorReports: FloorReport[] = [];

const strategies: Strategy[] = [
  { name: "main-path", itemRate: 0, monsterRate: 0, maxShopPurchases: 0, useConsumables: false },
  { name: "casual-explore", itemRate: 0.68, monsterRate: 0.68, maxShopPurchases: 3, useConsumables: true },
  { name: "planned-route", itemRate: 0.82, monsterRate: 0.45, maxShopPurchases: 3, useConsumables: true },
  { name: "clear-map", itemRate: 1, monsterRate: 1, maxShopPurchases: 5, useConsumables: true },
];

function initialPlayer(): Player {
  return {
    hp: BALANCE.player.initialHp,
    maxHp: BALANCE.player.initialHp,
    attack: BALANCE.player.initialAttack,
    defense: BALANCE.player.initialDefense,
    gold: 0,
    exp: 0,
    level: 1,
    insight: 0,
    shopPurchases: 0,
    bombs: 0,
    holyWater: 0,
    smallPotions: 0,
    largePotions: 0,
    discoveredShops: [],
    shopPurchasesByLevel: {},
  };
}

function forecast(player: Player, monsterId: string): { canFight: boolean; damage: number; rounds: number } {
  const monster = MONSTERS[monsterId];
  const heroDamage = player.attack - monster.defense;
  if (heroDamage <= 0) return { canFight: false, damage: Number.POSITIVE_INFINITY, rounds: 0 };
  const rounds = Math.ceil(monster.hp / heroDamage);
  const enemyDamage = Math.max(0, monster.attack - player.defense);
  const damage = Math.max(0, rounds - 1) * enemyDamage;
  return { canFight: damage < player.hp, damage, rounds };
}

function gainExp(player: Player, amount: number): void {
  player.exp += amount;
  let threshold = player.level * 45;
  while (player.exp >= threshold) {
    player.exp -= threshold;
    player.level += 1;
    player.maxHp += BALANCE.levelUp.maxHp;
    player.hp += BALANCE.levelUp.maxHp;
    player.attack += BALANCE.levelUp.attack;
    player.defense += BALANCE.levelUp.defense;
    if (player.level % BALANCE.levelUp.insightEvery === 0) player.insight += 1;
    threshold = player.level * 45;
  }
}

function healOnce(player: Player, allowHolyWater = true): boolean {
  const deficit = player.maxHp - player.hp;
  if (player.smallPotions > 0 && (deficit <= BALANCE.items.smallPotion * 1.5 || player.largePotions <= 0)) {
    player.smallPotions -= 1;
    player.hp = Math.min(player.maxHp, player.hp + BALANCE.items.smallPotion);
    return true;
  }
  if (player.largePotions > 0) {
    player.largePotions -= 1;
    const healing = Math.max(BALANCE.items.largePotion, Math.round(player.maxHp * BALANCE.items.largePotionRatio));
    player.hp = Math.min(player.maxHp, player.hp + healing);
    return true;
  }
  if (player.smallPotions > 0) {
    player.smallPotions -= 1;
    player.hp = Math.min(player.maxHp, player.hp + BALANCE.items.smallPotion);
    return true;
  }
  if (allowHolyWater && player.holyWater > 0) {
    player.holyWater -= 1;
    player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * BALANCE.items.holyWaterRatio));
    return true;
  }
  return false;
}

function prepareForFight(player: Player, monsterId: string, strategy: Strategy): void {
  if (!strategy.useConsumables) return;
  let result = forecast(player, monsterId);
  while (Number.isFinite(result.damage) && result.damage >= player.hp && healOnce(player, true)) result = forecast(player, monsterId);
}

function fight(player: Player, monsterId: string, strategy: Strategy): { ok: boolean; damage: number; reason: string } {
  prepareForFight(player, monsterId, strategy);
  const result = forecast(player, monsterId);
  if (!result.canFight) return { ok: false, damage: result.damage, reason: "blocked" };
  const monster = MONSTERS[monsterId];
  player.hp -= result.damage;
  player.gold += monster.gold;
  gainExp(player, monster.exp);
  return { ok: true, damage: result.damage, reason: "" };
}

function applyItem(player: Player, item: ItemEntity): void {
  const amount = item.amount ?? 1;
  switch (item.itemId) {
    case "smallPotion": player.smallPotions += amount; break;
    case "largePotion": player.largePotions += amount; break;
    case "ruby": player.attack += BALANCE.items.ruby * amount; break;
    case "sapphire": player.defense += BALANCE.items.sapphire * amount; break;
    case "coinBag": player.gold += amount; break;
    case "insight": player.insight += amount; break;
    case "axeRelic": player.attack += BALANCE.items.axeRelic * amount; break;
    case "hammerRelic": player.defense += BALANCE.items.hammerRelic * amount; break;
    case "flameRelic":
      player.attack += BALANCE.items.flameAttack * amount;
      player.maxHp += BALANCE.items.flameHp * amount;
      player.hp += BALANCE.items.flameHp * amount;
      break;
    case "bomb": player.bombs += amount; break;
    case "holyWater": player.holyWater += amount; break;
  }
}

function itemPriority(item: ItemEntity): number {
  const priorities: Record<string, number> = {
    axeRelic: 100,
    hammerRelic: 100,
    flameRelic: 100,
    ruby: 90,
    sapphire: 88,
    largePotion: 78,
    smallPotion: 72,
    coinBag: 68,
    insight: 62,
    holyWater: 58,
    bomb: 54,
    redKey: 30,
    blueKey: 24,
    yellowKey: 20,
  };
  return priorities[item.itemId] ?? 0;
}

function shopPrice(player: Player, shopLevel: number): number {
  return BALANCE.shop.basePrice + shopLevel * BALANCE.shop.levelPrice + player.shopPurchases * BALANCE.shop.purchasePrice;
}

function upcomingCombatIds(floorNumber: number, player: Player, strategy: Strategy): string[] {
  return FLOORS.slice(floorNumber - 1, Math.min(50, floorNumber + 5)).flatMap((floor) => {
    const guardian = floor.entities.find((entity): entity is MonsterEntity => entity.kind === "monster" && entity.id.endsWith("-guardian"));
    const sideIds = selectedSideMonsters(floor, player, strategy).map((entity) => entity.monsterId);
    return guardian ? [...sideIds, guardian.monsterId] : sideIds;
  });
}

function damageBudget(player: Player, monsterIds: string[]): number {
  return monsterIds.reduce((sum, id) => {
    const result = forecast(player, id);
    return sum + (Number.isFinite(result.damage) ? result.damage : 1_000_000);
  }, 0);
}

function clonePlayer(player: Player): Player {
  return {
    ...player,
    discoveredShops: [...player.discoveredShops],
    shopPurchasesByLevel: { ...player.shopPurchasesByLevel },
  };
}

function applyUpgrade(player: Player, upgrade: Upgrade): void {
  if (upgrade === "attack") player.attack += BALANCE.shop.attack;
  if (upgrade === "defense") player.defense += BALANCE.shop.defense;
  if (upgrade === "health") {
    player.maxHp += BALANCE.shop.maxHp;
    player.hp += BALANCE.shop.maxHp;
  }
}

function chooseUpgrade(player: Player, floorNumber: number, strategy: Strategy): Upgrade {
  const targets = upcomingCombatIds(floorNumber, player, strategy);
  const before = damageBudget(player, targets);
  const candidates: Upgrade[] = ["attack", "defense", "health"];
  let best: Upgrade = "health";
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    const copy = clonePlayer(player);
    applyUpgrade(copy, candidate);
    const damageSaved = before - damageBudget(copy, targets);
    const immediateHp = candidate === "health" ? BALANCE.shop.maxHp : 0;
    const value = damageSaved + immediateHp;
    if (value > bestValue) {
      best = candidate;
      bestValue = value;
    }
  }
  return best;
}

function buyAtShops(player: Player, floor: FloorData, strategy: Strategy): void {
  const shop = floor.entities.find((entity) => entity.kind === "shop");
  if (shop?.kind === "shop" && !player.discoveredShops.includes(shop.level)) player.discoveredShops.push(shop.level);
  const stockLimit = Math.min(strategy.maxShopPurchases, BALANCE.shop.stockPerShop);
  for (const level of [...player.discoveredShops].sort((a, b) => a - b)) {
    while ((player.shopPurchasesByLevel[level] ?? 0) < stockLimit) {
      const price = shopPrice(player, level);
      if (player.gold < price) break;
      player.gold -= price;
      player.shopPurchases += 1;
      player.shopPurchasesByLevel[level] = (player.shopPurchasesByLevel[level] ?? 0) + 1;
      applyUpgrade(player, chooseUpgrade(player, floor.number, strategy));
    }
  }
}

function useRecovery(player: Player, strategy: Strategy): void {
  if (!strategy.useConsumables) return;
  while (player.hp < player.maxHp * 0.42 && healOnce(player, false)) {
    // Leave a meaningful wound unless the next fight requires more recovery.
  }
}

function selectedOptionalItems(floor: FloorData, strategy: Strategy): ItemEntity[] {
  const optional = floor.entities.filter((entity): entity is ItemEntity => entity.kind === "item" && !entity.id.includes("-main"));
  const count = Math.ceil(optional.length * strategy.itemRate);
  return [...optional].sort((a, b) => itemPriority(b) - itemPriority(a)).slice(0, count);
}

function selectedSideMonsters(floor: FloorData, player: Player, strategy: Strategy): MonsterEntity[] {
  const side = floor.entities.filter((entity): entity is MonsterEntity => entity.kind === "monster" && !entity.id.endsWith("-guardian"));
  const count = Math.ceil(side.length * strategy.monsterRate);
  return [...side].sort((a, b) => forecast(player, a.monsterId).damage - forecast(player, b.monsterId).damage).slice(0, count);
}

function useBombOnDangerousSideFight(player: Player, entity: MonsterEntity, strategy: Strategy): boolean {
  if (!strategy.useConsumables || player.bombs <= 0 || MONSTERS[entity.monsterId].boss) return false;
  const damage = forecast(player, entity.monsterId).damage;
  if (!Number.isFinite(damage) || damage < Math.max(180, player.maxHp * 0.18)) return false;
  player.bombs -= 1;
  return true;
}

function runStrategy(strategy: Strategy): SegmentReport[] {
  const player = initialPlayer();
  const reports: SegmentReport[] = [];
  let failedAt = 0;
  let failureReason = "";
  let segmentDamage = 0;
  let segmentFights = 0;

  for (const floor of FLOORS) {
    let floorDamage = 0;
    let guardianDamage = 0;
    const sideMonsters = selectedSideMonsters(floor, player, strategy);
    const earlyCount = Math.floor(sideMonsters.length / 2);
    const earlyMonsters = sideMonsters.slice(0, earlyCount);
    const lateMonsters = sideMonsters.slice(earlyCount);

    for (const entity of earlyMonsters) {
      if (useBombOnDangerousSideFight(player, entity, strategy)) continue;
      const result = fight(player, entity.monsterId, strategy);
      if (!result.ok) {
        failedAt = floor.number;
        failureReason = `${MONSTERS[entity.monsterId].name} (${Number.isFinite(result.damage) ? Math.round(result.damage) : "no break"})`;
        break;
      }
      segmentDamage += result.damage;
      floorDamage += result.damage;
      segmentFights += 1;
      useRecovery(player, strategy);
    }
    if (failedAt) break;

    for (const item of selectedOptionalItems(floor, strategy)) applyItem(player, item);

    if (strategy.itemRate >= 0.65) {
      const npcEntity = floor.entities.find((entity) => entity.kind === "npc");
      if (npcEntity?.kind === "npc") {
        const gift = NPCS[npcEntity.npcId]?.gift;
        if (gift) applyItem(player, { ...npcEntity, kind: "item", itemId: gift.itemId, amount: gift.amount ?? 1 });
      }
    }

    if (strategy.itemRate >= 0.8) {
      const trial = floor.entities.find((entity) => entity.kind === "trial");
      if (trial?.kind === "trial") {
        const cost = Math.max(0, BALANCE.trial.baseCost + floor.number * BALANCE.trial.floorCost - player.insight * BALANCE.trial.insightReduction);
        if (cost < player.hp) {
          player.hp -= cost;
          segmentDamage += cost;
          floorDamage += cost;
          applyItem(player, { ...trial, kind: "item", itemId: trial.rewardId, amount: trial.amount ?? 1 });
        }
      }
    }

    buyAtShops(player, floor, strategy);

    for (const entity of lateMonsters) {
      if (useBombOnDangerousSideFight(player, entity, strategy)) continue;
      const result = fight(player, entity.monsterId, strategy);
      if (!result.ok) {
        failedAt = floor.number;
        failureReason = `${MONSTERS[entity.monsterId].name} (${Number.isFinite(result.damage) ? Math.round(result.damage) : "no break"})`;
        break;
      }
      segmentDamage += result.damage;
      floorDamage += result.damage;
      segmentFights += 1;
      useRecovery(player, strategy);
    }
    if (failedAt) break;

    const guardian = floor.entities.find((entity): entity is MonsterEntity => entity.kind === "monster" && entity.id.endsWith("-guardian"));
    if (!guardian) throw new Error(`Floor ${floor.number} has no guardian`);
    const result = fight(player, guardian.monsterId, strategy);
    if (!result.ok) {
      failedAt = floor.number;
      failureReason = `${MONSTERS[guardian.monsterId].name} (${Number.isFinite(result.damage) ? Math.round(result.damage) : "no break"})`;
      break;
    }
    segmentDamage += result.damage;
    floorDamage += result.damage;
    guardianDamage = result.damage;
    segmentFights += 1;
    useRecovery(player, strategy);
    buyAtShops(player, floor, strategy);
    floorReports.push({
      strategy: strategy.name,
      floor: floor.number,
      hp: `${Math.round(player.hp)}/${player.maxHp}`,
      attack: player.attack,
      defense: player.defense,
      damage: Math.round(floorDamage),
      guardianDamage: Math.round(guardianDamage),
      reserves: `${player.smallPotions}s/${player.largePotions}L/${player.holyWater}W`,
    });

    if (floor.number % 5 === 0) {
      reports.push({
        strategy: strategy.name,
        floors: `${floor.number - 4}-${floor.number}`,
        hp: `${Math.round(player.hp)}/${player.maxHp}`,
        attack: player.attack,
        defense: player.defense,
        level: player.level,
        gold: player.gold,
        damage: Math.round(segmentDamage),
        fights: segmentFights,
        status: "ok",
        reserves: `${player.smallPotions}s/${player.largePotions}L/${player.holyWater}W`,
      });
      segmentDamage = 0;
      segmentFights = 0;
    }
  }

  if (failedAt) {
    reports.push({
      strategy: strategy.name,
      floors: `failed@${failedAt}`,
      hp: `${Math.max(0, Math.round(player.hp))}/${player.maxHp}`,
      attack: player.attack,
      defense: player.defense,
      level: player.level,
      gold: player.gold,
      damage: Math.round(segmentDamage),
      fights: segmentFights,
      status: `blocked by F${failedAt}: ${failureReason}`,
      reserves: `${player.smallPotions}s/${player.largePotions}L/${player.holyWater}W`,
    });
  }
  return reports;
}

function assertBalance(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Balance gate failed: ${message}`);
}

const floorProblems = validateFloors();
assertBalance(floorProblems.length === 0, floorProblems.join("; "));

const reports = strategies.flatMap(runStrategy);
console.table(reports);
console.log("Late-game floor detail:");
console.table(floorReports.filter((entry) => entry.floor >= 21 && (entry.strategy === "planned-route" || entry.strategy === "clear-map")));
console.log("Planned-route checkpoints:");
const plannedCheckpoints = floorReports.filter((entry) => entry.strategy === "planned-route" && entry.floor % 5 === 0);
console.table(plannedCheckpoints);
console.log("Boss checkpoints:");
console.table(Object.entries(BOSS_BY_FLOOR).map(([floor, id]) => ({
  floor,
  monster: MONSTERS[id].name,
  hp: MONSTERS[id].hp,
  attack: MONSTERS[id].attack,
  defense: MONSTERS[id].defense,
})));
console.log(`Loaded ${Object.keys(ITEMS).length} item definitions.`);

const mainPathReports = reports.filter((entry) => entry.strategy === "main-path");
const plannedReports = reports.filter((entry) => entry.strategy === "planned-route");
const mainFailure = mainPathReports.at(-1)?.floors.match(/^failed@(\d+)$/);
const plannedFinal = plannedReports.at(-1);
assertBalance(Boolean(mainFailure), "the resource-free route should eventually be blocked");
const mainFailureFloor = Number(mainFailure?.[1]);
assertBalance(mainFailureFloor >= 6 && mainFailureFloor <= 10, `resource-free route should fail on F6-F10, got F${mainFailureFloor}`);
assertBalance(plannedReports.length === 10 && plannedFinal?.floors === "46-50" && plannedFinal.status === "ok", "planned route must clear all 50 floors");

const [plannedHp, plannedMaxHp] = plannedFinal.hp.split("/").map(Number);
const plannedHpRatio = plannedHp / plannedMaxHp;
assertBalance(plannedHpRatio >= 0.05 && plannedHpRatio <= 0.35, `planned route final HP should be 5%-35%, got ${(plannedHpRatio * 100).toFixed(1)}%`);
for (let index = 1; index < plannedReports.length; index += 1) {
  assertBalance(plannedReports[index].damage > plannedReports[index - 1].damage, `${plannedReports[index].floors} total damage must exceed the previous segment`);
}
assertBalance(plannedCheckpoints.length === 10, `expected 10 checkpoint battles, got ${plannedCheckpoints.length}`);
for (let index = 1; index < plannedCheckpoints.length; index += 1) {
  assertBalance(plannedCheckpoints[index].guardianDamage > plannedCheckpoints[index - 1].guardianDamage, `F${plannedCheckpoints[index].floor} guardian damage must exceed F${plannedCheckpoints[index - 1].floor}`);
}

console.log(`Balance gates: PASS · main path blocked at F${mainFailureFloor} · planned route cleared with ${plannedHp}/${plannedMaxHp} HP (${(plannedHpRatio * 100).toFixed(1)}%).`);
