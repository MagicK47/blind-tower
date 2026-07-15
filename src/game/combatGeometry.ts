import type { AbilityDef, MotionPattern, MonsterDef, TrialDef } from "./types";

export const ARENA_WIDTH = 900;
export const ARENA_HEIGHT = 500;
export const COMMIT_Y = 448;

export interface TargetLike {
  id: string;
  size: number;
  speed: number;
  motion: MotionPattern;
  movementScale: number;
  trait?: MonsterDef["trait"];
}

export interface DragPoint {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function triangle(value: number): number {
  const phase = ((value % 1) + 1) % 1;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

export function targetPosition(
  elapsed: number,
  target: TargetLike,
  committed: boolean,
  commitTime: number,
  insight: number,
): DragPoint {
  let time = elapsed;
  if (committed) {
    const hiddenScale = Math.max(0.56, 1 - insight * 0.035);
    const hiddenElapsed = (elapsed - commitTime) * hiddenScale;
    time = commitTime + hiddenElapsed;
    if (target.trait === "mirror") time = commitTime - hiddenElapsed;
  }

  const seed = hash(target.id);
  const phaseSeed = (seed % 997) / 997;
  const t = time * target.speed + phaseSeed * 4.7;
  const cx = ARENA_WIDTH * 0.52;
  const cy = ARENA_HEIGHT * 0.43;
  let x = cx;
  let y = cy;

  if (target.motion === "drift") {
    x += Math.sin(t * 1.25) * 178 + Math.sin(t * 0.39) * 44;
    y += Math.cos(t * 0.82) * 72;
  } else if (target.motion === "hop") {
    const step = Math.floor(t * 1.1);
    const progress = (t * 1.1) % 1;
    const slots = [-220, -112, 26, 168, 72, -158];
    const from = slots[((step % slots.length) + slots.length) % slots.length];
    const to = slots[(((step + 1) % slots.length) + slots.length) % slots.length];
    x += lerp(from, to, Math.min(1, progress * 1.65));
    y += Math.sin(progress * Math.PI) * -92 + Math.sin(step * 1.7) * 35;
  } else if (target.motion === "dash") {
    const phase = ((t * 0.62) % 1 + 1) % 1;
    const charge = phase < 0.32 ? 0 : Math.pow((phase - 0.32) / 0.68, 1.6);
    const direction = Math.floor(t * 0.62) % 2 === 0 ? 1 : -1;
    x += direction * lerp(-245, 245, charge);
    y += Math.sin(t * 4.2) * 24;
  } else if (target.motion === "orbit") {
    x += Math.cos(t * 1.18) * 205;
    y += Math.sin(t * 1.18) * 108;
  } else if (target.motion === "feint") {
    const main = triangle(t * 0.42);
    const feint = triangle(t * 0.84 + 0.18);
    x += (main * 2 - 1) * 225 + (feint - 0.5) * 62;
    y += Math.sin(t * 1.9) * 68;
  } else if (target.motion === "teleport") {
    const slots = [
      { x: -222, y: -70 },
      { x: 168, y: -102 },
      { x: 228, y: 82 },
      { x: -86, y: 112 },
      { x: -188, y: 42 },
    ];
    const index = ((Math.floor(t * 0.76) % slots.length) + slots.length) % slots.length;
    const pulse = ((t * 0.76) % 1 + 1) % 1;
    x += slots[index].x + Math.sin(pulse * Math.PI * 2) * 13;
    y += slots[index].y + Math.cos(pulse * Math.PI * 2) * 9;
  } else if (target.motion === "spiral") {
    const radius = 72 + triangle(t * 0.24) * 170;
    x += Math.cos(t * 1.62) * radius;
    y += Math.sin(t * 1.62) * radius * 0.53;
  }

  x = cx + (x - cx) * target.movementScale;
  y = cy + (y - cy) * target.movementScale;

  const margin = target.size * 0.55 + 28;
  return {
    x: clamp(x, margin, ARENA_WIDTH - margin),
    y: clamp(y, margin, COMMIT_Y - margin),
  };
}

function distance(a: DragPoint, b: DragPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: DragPoint, a: DragPoint, b: DragPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(point, a);
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1);
  return distance(point, { x: a.x + dx * t, y: a.y + dy * t });
}

export function evaluateHit(ability: AbilityDef, center: DragPoint, target: DragPoint, targetSize: number): { hit: boolean; weakpoint: boolean } {
  const targetRadius = targetSize * 0.46;
  let hit = false;
  let weakpoint = false;

  if (ability.shape === "circle") {
    const d = distance(center, target);
    const radius = ability.radius ?? 40;
    hit = d <= radius + targetRadius;
    weakpoint = d <= Math.min(radius * 0.35, targetRadius * 0.58);
  } else if (ability.shape === "line") {
    const length = ability.length ?? 150;
    const width = ability.width ?? 20;
    const a = { x: center.x, y: center.y + length * 0.48 };
    const b = { x: center.x, y: center.y - length * 0.52 };
    const d = distanceToSegment(target, a, b);
    hit = d <= width / 2 + targetRadius;
    weakpoint = d <= width * 0.22 && target.y <= a.y && target.y >= b.y;
  } else if (ability.shape === "ring") {
    const radius = ability.radius ?? 80;
    const width = ability.width ?? 22;
    const radialDistance = Math.abs(distance(center, target) - radius);
    hit = radialDistance <= width / 2 + targetRadius;
    weakpoint = radialDistance <= width * 0.2;
  } else if (ability.shape === "arc") {
    const radius = ability.radius ?? 90;
    const arcAngle = ability.angle ?? 1.8;
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const d = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const facing = -Math.PI / 2;
    const delta = Math.atan2(Math.sin(angle - facing), Math.cos(angle - facing));
    const angularAllowance = d > targetRadius ? Math.asin(Math.min(1, targetRadius / d)) : Math.PI;
    hit = d <= radius + targetRadius && Math.abs(delta) <= arcAngle / 2 + angularAllowance;
    weakpoint = d > radius * 0.35 && d < radius * 0.75 && Math.abs(delta) <= arcAngle * 0.18;
  }

  return { hit, weakpoint: hit && weakpoint };
}

export function asTargetLike(def: MonsterDef | TrialDef): TargetLike {
  const isTrial = "description" in def;
  const defaultMovementScale = isTrial
    ? 0.3
    : def.boss
      ? 0.28
      : def.trait === "agile"
        ? 0.1
        : def.trait === "mirror" || def.trait === "enraged"
          ? 0.08
          : def.trait === "regen" || def.trait === "thorns"
            ? 0.06
            : 0.03;
  return {
    id: def.id,
    size: def.size,
    speed: isTrial ? def.speed : def.speed * (def.boss ? 0.8 : 0.58),
    motion: def.motion,
    movementScale: def.movementScale ?? defaultMovementScale,
    trait: "trait" in def ? def.trait : "none",
  };
}
