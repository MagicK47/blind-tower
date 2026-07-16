import Phaser from "phaser";
import { ITEMS, MONSTERS, NPCS, TRIALS } from "./content";
import { MAP_SIZE, type FloorEntity } from "./types";
import { store } from "./store";
import { assetUrl } from "./assetUrl";

export const SCENE_SIZE = 660;
const TILE_SIZE = 52;
const MAP_PIXELS = TILE_SIZE * MAP_SIZE;
const ORIGIN = (SCENE_SIZE - MAP_PIXELS) / 2;

const doorTint = {
  yellow: 0xffd267,
  blue: 0x78c8ff,
  red: 0xff6b6b,
};

export class TowerScene extends Phaser.Scene {
  private worldLayer?: Phaser.GameObjects.Container;
  private unsubscribe?: () => void;
  private lastFloor = 0;
  private moveReady = true;

  constructor() {
    super("tower");
  }

  preload(): void {
    this.load.spritesheet("tiny", assetUrl("assets/tiny-dungeon.png"), {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0a0b10");
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.repeat || document.body.classList.contains("modal-open")) return;
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") this.move(0, -1);
      if (key === "s" || key === "arrowdown") this.move(0, 1);
      if (key === "a" || key === "arrowleft") this.move(-1, 0);
      if (key === "d" || key === "arrowright") this.move(1, 0);
    });
    this.input.setDefaultCursor("pointer");
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handleMapPointer(pointer));
    this.unsubscribe = store.subscribe((event) => {
      if (event.type === "state") this.renderFloor();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
    this.renderFloor();
  }

  private move(dx: number, dy: number): void {
    if (!this.moveReady) return;
    this.moveReady = false;
    const moved = store.tryMove(dx, dy);
    this.time.delayedCall(moved ? 90 : 55, () => { this.moveReady = true; });
  }

  private handleMapPointer(pointer: Phaser.Input.Pointer): void {
    if (document.body.classList.contains("modal-open")) return;
    const targetX = Math.floor((pointer.x - ORIGIN) / TILE_SIZE);
    const targetY = Math.floor((pointer.y - ORIGIN) / TILE_SIZE);
    if (targetX < 0 || targetY < 0 || targetX >= MAP_SIZE || targetY >= MAP_SIZE) return;

    const dx = targetX - store.player.x;
    const dy = targetY - store.player.y;
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) this.move(Math.sign(dx), 0);
    else this.move(0, Math.sign(dy));
  }

  private renderFloor(): void {
    if (!this.textures.exists("tiny")) return;
    this.worldLayer?.destroy(true);
    this.tweens.killAll();
    const floor = store.floor;
    const layer = this.add.container(0, 0);
    this.worldLayer = layer;

    const backdrop = this.add.rectangle(SCENE_SIZE / 2, SCENE_SIZE / 2, SCENE_SIZE, SCENE_SIZE, 0x090b10, 1);
    layer.add(backdrop);

    const mapShadow = this.add.rectangle(SCENE_SIZE / 2 + 8, SCENE_SIZE / 2 + 10, MAP_PIXELS + 24, MAP_PIXELS + 24, 0x000000, 0.58);
    mapShadow.setStrokeStyle(2, 0x000000, 0.7);
    layer.add(mapShadow);

    const mapBack = this.add.rectangle(SCENE_SIZE / 2, SCENE_SIZE / 2, MAP_PIXELS + 18, MAP_PIXELS + 18, 0x16151a, 1);
    mapBack.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(floor.theme.accent).color, 0.46);
    layer.add(mapBack);

    for (let y = 0; y < MAP_SIZE; y += 1) {
      for (let x = 0; x < MAP_SIZE; x += 1) {
        const wall = floor.grid[y][x] === "#";
        const frame = wall ? [14, 57, 58, 59][(x * 3 + y + floor.number) % 4] : 48 + ((x + y * 2 + floor.number) % 6);
        const tile = this.add.image(this.tileX(x), this.tileY(y), "tiny", frame);
        tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
        tile.setTint(wall ? floor.theme.wallTint : floor.theme.floorTint);
        tile.setAlpha(wall ? 0.98 : 0.9);
        layer.add(tile);

        if (!wall) {
          const grain = this.add.rectangle(this.tileX(x), this.tileY(y), TILE_SIZE, TILE_SIZE, 0x000000, (x + y + floor.number) % 3 === 0 ? 0.07 : 0.025);
          grain.setStrokeStyle(1, 0xffffff, 0.025);
          layer.add(grain);
        }
      }
    }

    const entities = store.visibleEntities(floor);
    for (const entity of entities) this.renderEntity(layer, entity);

    const playerGlow = this.add.ellipse(this.tileX(store.player.x), this.tileY(store.player.y) + 14, 36, 14, 0xffd67d, 0.18);
    layer.add(playerGlow);
    const player = this.add.image(this.tileX(store.player.x), this.tileY(store.player.y) - 3, "tiny", 85);
    player.setDisplaySize(44, 44).setDepth(20);
    layer.add(player);
    this.tweens.add({ targets: player, y: player.y - 2, duration: 760, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.28);
    vignette.fillRect(0, 0, SCENE_SIZE, ORIGIN - 5);
    vignette.fillRect(0, SCENE_SIZE - ORIGIN + 5, SCENE_SIZE, ORIGIN);
    vignette.fillRect(0, 0, ORIGIN - 5, SCENE_SIZE);
    vignette.fillRect(SCENE_SIZE - ORIGIN + 5, 0, ORIGIN, SCENE_SIZE);
    layer.add(vignette);

    if (this.lastFloor && this.lastFloor !== floor.number) {
      this.cameras.main.flash(260, 210, 184, 122, false);
    }
    this.lastFloor = floor.number;
  }

  private renderEntity(layer: Phaser.GameObjects.Container, entity: FloorEntity): void {
    let frame = 101;
    let tint = 0xffffff;
    let size = 40;
    let bob = false;
    let glowColor = 0xffffff;

    if (entity.kind === "stairs") {
      frame = entity.direction === "up" ? 36 : 38;
      tint = 0xe8e5dc;
      size = 48;
      glowColor = 0xd7c28c;
    } else if (entity.kind === "door") {
      frame = 75;
      tint = doorTint[entity.color];
      size = 48;
      glowColor = tint;
    } else if (entity.kind === "monster") {
      const monster = MONSTERS[entity.monsterId];
      frame = monster.sprite;
      tint = monster.tint;
      size = monster.boss ? 50 : 42;
      bob = true;
      glowColor = monster.boss ? 0xff6a54 : 0xa53d3d;
    } else if (entity.kind === "item") {
      const item = ITEMS[entity.itemId];
      frame = item.sprite;
      tint = item.tint ?? 0xffffff;
      size = 35;
      bob = true;
      glowColor = 0xffd776;
    } else if (entity.kind === "npc") {
      const npc = NPCS[entity.npcId];
      frame = npc.sprite;
      size = 43;
      bob = true;
      glowColor = 0x8dd9ff;
    } else if (entity.kind === "shop") {
      frame = 97;
      tint = 0xffd3a0;
      size = 46;
      bob = true;
      glowColor = 0xf6c66f;
    } else if (entity.kind === "trial") {
      const trial = TRIALS[entity.trialId];
      frame = trial.sprite;
      tint = trial.tint;
      size = 43;
      bob = true;
      glowColor = 0xb993ff;
    }

    const x = this.tileX(entity.x);
    const y = this.tileY(entity.y);
    const distance = Math.abs(entity.x - store.player.x) + Math.abs(entity.y - store.player.y);
    if (distance === 1 && entity.kind !== "stairs") {
      const ring = this.add.ellipse(x, y + 12, 44, 18, glowColor, 0.14);
      ring.setStrokeStyle(2, glowColor, 0.62);
      layer.add(ring);
      this.tweens.add({ targets: ring, alpha: 0.42, scaleX: 1.16, scaleY: 1.16, duration: 720, yoyo: true, repeat: -1 });
    }

    const sprite = this.add.image(x, y - 2, "tiny", frame);
    sprite.setDisplaySize(size, size).setTint(tint).setDepth(10);
    sprite.setInteractive({ useHandCursor: true });
    layer.add(sprite);
    if (bob) this.tweens.add({ targets: sprite, y: y - 5, duration: 680 + ((entity.x + entity.y) % 4) * 90, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  private tileX(x: number): number {
    return ORIGIN + x * TILE_SIZE + TILE_SIZE / 2;
  }

  private tileY(y: number): number {
    return ORIGIN + y * TILE_SIZE + TILE_SIZE / 2;
  }
}
