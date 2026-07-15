export const MAP_SIZE = 11;

export type DoorColor = "yellow" | "blue" | "red";
export type MotionPattern = "drift" | "hop" | "dash" | "orbit" | "feint" | "teleport" | "spiral";
export type ShapeType = "circle" | "line" | "arc" | "ring";

export interface Point {
  x: number;
  y: number;
}

export interface ThemeDef {
  id: string;
  name: string;
  subtitle: string;
  floorTint: number;
  wallTint: number;
  accent: string;
  fog: string;
}

export interface MonsterDef {
  id: string;
  name: string;
  sprite: number;
  tint: number;
  hp: number;
  attack: number;
  defense: number;
  gold: number;
  exp: number;
  size: number;
  speed: number;
  motion: MotionPattern;
  movementScale?: number;
  trait: "none" | "armored" | "agile" | "thorns" | "regen" | "mirror" | "enraged";
  note: string;
  boss?: boolean;
}

export interface AbilityDef {
  id: string;
  name: string;
  shortName: string;
  sprite: number;
  shape: ShapeType;
  radius?: number;
  length?: number;
  width?: number;
  angle?: number;
  power: number;
  armorPen: number;
  focusCost: number;
  combat: boolean;
  description: string;
}

export interface ItemDef {
  id: string;
  name: string;
  sprite: number;
  tint?: number;
  description: string;
}

export interface TrialDef {
  id: string;
  name: string;
  sprite: number;
  tint: number;
  size: number;
  speed: number;
  motion: MotionPattern;
  movementScale?: number;
  abilityId: string;
  description: string;
  successText: string;
  failureText: string;
}

export interface NpcDef {
  id: string;
  name: string;
  sprite: number;
  lines: string[];
  gift?: { itemId: string; amount?: number };
}

interface BaseEntity extends Point {
  id: string;
}

export interface MonsterEntity extends BaseEntity {
  kind: "monster";
  monsterId: string;
}

export interface ItemEntity extends BaseEntity {
  kind: "item";
  itemId: string;
  amount?: number;
}

export interface DoorEntity extends BaseEntity {
  kind: "door";
  color: DoorColor;
}

export interface StairsEntity extends BaseEntity {
  kind: "stairs";
  direction: "up" | "down";
}

export interface NpcEntity extends BaseEntity {
  kind: "npc";
  npcId: string;
}

export interface ShopEntity extends BaseEntity {
  kind: "shop";
  level: number;
}

export interface TrialEntity extends BaseEntity {
  kind: "trial";
  trialId: string;
  rewardId: string;
  amount?: number;
}

export type FloorEntity = MonsterEntity | ItemEntity | DoorEntity | StairsEntity | NpcEntity | ShopEntity | TrialEntity;

export interface FloorData {
  number: number;
  name: string;
  theme: ThemeDef;
  grid: string[];
  start: Point;
  exit: Point;
  entities: FloorEntity[];
  objective: string;
}

export interface PlayerState extends Point {
  floor: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  gold: number;
  exp: number;
  level: number;
  yellowKeys: number;
  blueKeys: number;
  redKeys: number;
  insight: number;
  focusMax: number;
  unlockedAbilities: string[];
  inventory: Record<string, number>;
}

export interface SaveData {
  version: 1;
  player: PlayerState;
  consumed: Record<string, string[]>;
  visitedFloors: number[];
  npcFlags: string[];
  defeatedMonsters: Record<string, number>;
  log: string[];
  playSeconds: number;
  ending: boolean;
}

export type EncounterSource = MonsterEntity | TrialEntity;

export interface CombatSession {
  mode: "combat" | "trial";
  source: EncounterSource;
  monster?: MonsterDef;
  trial?: TrialDef;
  hp: number;
  maxHp: number;
  focus: number;
  turn: number;
}
