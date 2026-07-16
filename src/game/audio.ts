import { assetUrl } from "./assetUrl";

export type SoundId =
  | "ui"
  | "step"
  | "door"
  | "pickup"
  | "coin"
  | "heal"
  | "heroHit"
  | "enemyHit"
  | "victory"
  | "blocked"
  | "blast"
  | "levelUp"
  | "floor";

type SoundDefinition = {
  files: string[];
  volume: number;
  pool?: number;
  cooldown?: number;
  rateVariance?: number;
};

const SOUND_KEY = "blind-tower-sound-enabled-v1";
const AUDIO_ROOT = "assets/audio";

const sounds: Record<SoundId, SoundDefinition> = {
  ui: { files: ["ui.mp3"], volume: 0.34, pool: 3, cooldown: 45, rateVariance: 0.025 },
  step: { files: ["step-1.mp3", "step-2.mp3"], volume: 0.2, pool: 4, cooldown: 55, rateVariance: 0.035 },
  door: { files: ["door.mp3"], volume: 0.52 },
  pickup: { files: ["pickup.mp3"], volume: 0.5 },
  coin: { files: ["coin.mp3"], volume: 0.48 },
  heal: { files: ["heal.mp3"], volume: 0.46 },
  heroHit: { files: ["hero-hit.mp3"], volume: 0.48, pool: 3, cooldown: 65, rateVariance: 0.025 },
  enemyHit: { files: ["enemy-hit.mp3"], volume: 0.44, pool: 3, cooldown: 65, rateVariance: 0.025 },
  victory: { files: ["victory.mp3"], volume: 0.52, cooldown: 220 },
  blocked: { files: ["blocked.mp3"], volume: 0.38, pool: 2, cooldown: 180 },
  blast: { files: ["blast.mp3"], volume: 0.55 },
  levelUp: { files: ["level-up.mp3"], volume: 0.52, cooldown: 250 },
  floor: { files: ["floor.mp3"], volume: 0.42, cooldown: 180 },
};

export class GameAudio {
  private enabled = this.loadEnabled();
  private readonly channels = new Map<SoundId, HTMLAudioElement[]>();
  private readonly channelIndexes = new Map<SoundId, number>();
  private readonly lastPlayed = new Map<SoundId, number>();
  private readonly playCounts = new Map<SoundId, number>();
  private loaded = false;

  constructor() {
    this.updateDocumentState();
  }

  preload(): void {
    if (this.loaded) return;
    this.loaded = true;
    for (const [id, definition] of Object.entries(sounds) as [SoundId, SoundDefinition][]) {
      const poolSize = Math.max(definition.pool ?? 2, definition.files.length);
      const channels = Array.from({ length: poolSize }, (_, index) => {
        const file = definition.files[index % definition.files.length];
        const channel = new Audio(assetUrl(`${AUDIO_ROOT}/${file}`));
        channel.preload = "auto";
        channel.volume = definition.volume;
        return channel;
      });
      this.channels.set(id, channels);
    }
  }

  play(id: SoundId): void {
    if (!this.enabled) return;
    this.preload();
    const definition = sounds[id];
    const now = performance.now();
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < (definition.cooldown ?? 0)) return;
    this.lastPlayed.set(id, now);

    const channels = this.channels.get(id);
    if (!channels?.length) return;
    const index = this.channelIndexes.get(id) ?? 0;
    const channel = channels[index % channels.length];
    this.channelIndexes.set(id, index + 1);
    channel.pause();
    channel.currentTime = 0;
    channel.volume = definition.volume;
    const variance = definition.rateVariance ?? 0;
    channel.playbackRate = variance ? 1 + (Math.random() * 2 - 1) * variance : 1;
    document.documentElement.dataset.requestedSound = id;
    void channel.play().then(() => {
      this.playCounts.set(id, (this.playCounts.get(id) ?? 0) + 1);
      delete document.documentElement.dataset.soundError;
      this.updateDocumentState(id);
    }).catch((error: unknown) => {
      document.documentElement.dataset.soundError = error instanceof Error ? error.name : "PlaybackError";
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem(SOUND_KEY, String(enabled));
    } catch {
      // Sound still works for this session when storage is unavailable.
    }
    if (!enabled) this.stopAll();
    this.updateDocumentState();
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) this.play("ui");
    return this.enabled;
  }

  debugState(): { enabled: boolean; loaded: boolean; plays: Partial<Record<SoundId, number>> } {
    return {
      enabled: this.enabled,
      loaded: this.loaded,
      plays: Object.fromEntries(this.playCounts) as Partial<Record<SoundId, number>>,
    };
  }

  private stopAll(): void {
    for (const channels of this.channels.values()) {
      for (const channel of channels) {
        channel.pause();
        channel.currentTime = 0;
      }
    }
  }

  private loadEnabled(): boolean {
    try {
      return localStorage.getItem(SOUND_KEY) !== "false";
    } catch {
      return true;
    }
  }

  private updateDocumentState(lastSound?: SoundId): void {
    document.documentElement.dataset.soundEnabled = String(this.enabled);
    if (lastSound) document.documentElement.dataset.lastSound = lastSound;
  }
}

export const gameAudio = new GameAudio();
