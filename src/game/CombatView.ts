import { ABILITIES, ITEMS } from "./content";
import { ARENA_HEIGHT, ARENA_WIDTH, COMMIT_Y, asTargetLike, evaluateHit, targetPosition, type DragPoint } from "./combatGeometry";
import { store } from "./store";
import type { AbilityDef, CombatSession, MonsterDef, TrialDef } from "./types";
import { assetUrl, tileUrl } from "./assetUrl";

type Phase = "observe" | "blind" | "reveal" | "enemy";

interface DragState extends DragPoint {
  ability: AbilityDef;
  committed: boolean;
  pointerId: number;
}

interface RevealState {
  point: DragPoint;
  target: DragPoint;
  ability: AbilityDef;
  hit: boolean;
  weakpoint: boolean;
  label: string;
  tone: "hit" | "miss" | "enemy" | "practice";
  until: number;
}

export class CombatView {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private title: HTMLElement;
  private subtitle: HTMLElement;
  private hpFill: HTMLElement;
  private hpText: HTMLElement;
  private playerHpFill: HTMLElement;
  private playerHpText: HTMLElement;
  private enemyStats: HTMLElement;
  private traitText: HTMLElement;
  private turnText: HTMLElement;
  private focusText: HTMLElement;
  private abilityBar: HTMLElement;
  private abilityDetail: HTMLElement;
  private practiceButton: HTMLButtonElement;
  private retreatButton: HTMLButtonElement;
  private session: CombatSession | null = null;
  private phase: Phase = "observe";
  private drag: DragState | null = null;
  private reveal: RevealState | null = null;
  private hoverAbility: AbilityDef | null = null;
  private practice = false;
  private startTime = 0;
  private commitTime = 0;
  private frame = 0;
  private targetImage = new Image();
  private atlasImage = new Image();
  private targetLoaded = false;
  private atlasLoaded = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = `
      <section class="combat-overlay" aria-hidden="true">
        <header class="combat-topline">
          <div class="combat-heading">
            <span class="combat-kicker">盲域判定</span>
            <h2 id="combat-title">目标</h2>
            <p id="combat-subtitle"></p>
          </div>
          <div class="combat-turn"><span id="combat-turn">第 1 回合</span><strong id="combat-focus">专注 2/2</strong></div>
          <button class="game-button compact" id="combat-retreat" type="button">撤退</button>
        </header>
        <div class="combat-main">
          <div class="arena-shell">
            <canvas id="combat-canvas" width="${ARENA_WIDTH}" height="${ARENA_HEIGHT}" aria-label="盲域战斗场"></canvas>
            <div class="commit-caption"><span>承诺线</span><b>越过后目标、范围与鼠标同时隐藏</b></div>
          </div>
          <aside class="combat-intel">
            <div class="target-portrait"><img id="combat-portrait" alt="目标图案" /></div>
            <div class="target-hp"><div class="bar-label"><span>目标生命</span><b id="combat-hp-text"></b></div><div class="bar-track"><i id="combat-hp-fill"></i></div></div>
            <div class="player-combat-hp"><div class="bar-label"><span>你的生命</span><b id="combat-player-hp-text"></b></div><div class="bar-track player"><i id="combat-player-hp-fill"></i></div></div>
            <div id="combat-enemy-stats" class="intel-numbers"></div>
            <p id="combat-trait" class="trait-copy"></p>
            <button class="practice-toggle" id="practice-toggle" type="button" aria-pressed="false"><span class="practice-light"></span><b>练习模式</b><small>不隐藏 · 不结算</small></button>
          </aside>
        </div>
        <footer class="combat-actions">
          <div id="ability-bar" class="ability-bar"></div>
          <div id="ability-detail" class="ability-detail">悬停武器可在场内查看真实尺寸。</div>
        </footer>
      </section>`;

    this.canvas = this.root.querySelector("#combat-canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.title = this.root.querySelector("#combat-title")!;
    this.subtitle = this.root.querySelector("#combat-subtitle")!;
    this.hpFill = this.root.querySelector("#combat-hp-fill")!;
    this.hpText = this.root.querySelector("#combat-hp-text")!;
    this.playerHpFill = this.root.querySelector("#combat-player-hp-fill")!;
    this.playerHpText = this.root.querySelector("#combat-player-hp-text")!;
    this.enemyStats = this.root.querySelector("#combat-enemy-stats")!;
    this.traitText = this.root.querySelector("#combat-trait")!;
    this.turnText = this.root.querySelector("#combat-turn")!;
    this.focusText = this.root.querySelector("#combat-focus")!;
    this.abilityBar = this.root.querySelector("#ability-bar")!;
    this.abilityDetail = this.root.querySelector("#ability-detail")!;
    this.practiceButton = this.root.querySelector("#practice-toggle")!;
    this.retreatButton = this.root.querySelector("#combat-retreat")!;

    this.atlasImage.src = assetUrl("assets/tiny-dungeon.png");
    this.atlasImage.onload = () => { this.atlasLoaded = true; };
    this.practiceButton.addEventListener("click", () => this.togglePractice());
    this.retreatButton.addEventListener("click", () => this.retreat());
    window.addEventListener("pointermove", (event) => this.pointerMove(event));
    window.addEventListener("pointerup", (event) => this.pointerUp(event));
    window.addEventListener("pointercancel", (event) => this.pointerUp(event));
  }

  open(session: CombatSession): void {
    this.session = session;
    this.phase = "observe";
    this.drag = null;
    this.reveal = null;
    this.hoverAbility = null;
    this.practice = false;
    this.startTime = performance.now() / 1000;
    this.commitTime = 0;
    this.targetLoaded = false;
    const target = session.monster ?? session.trial!;
    this.targetImage = new Image();
    this.targetImage.src = tileUrl(target.sprite);
    this.targetImage.onload = () => { this.targetLoaded = true; };

    this.root.querySelector(".combat-overlay")?.classList.add("is-open");
    this.root.querySelector(".combat-overlay")?.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open", "combat-open");
    this.renderStaticUi();
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame((time) => this.draw(time));
  }

  close(): void {
    this.session = null;
    this.drag = null;
    this.reveal = null;
    document.body.classList.remove("blind-committed", "combat-open", "modal-open");
    this.root.querySelector(".combat-overlay")?.classList.remove("is-open");
    this.root.querySelector(".combat-overlay")?.setAttribute("aria-hidden", "true");
    cancelAnimationFrame(this.frame);
  }

  refresh(): void {
    if (this.session) this.renderStaticUi();
  }

  private renderStaticUi(): void {
    const session = this.session;
    if (!session) return;
    const target = session.monster ?? session.trial!;
    this.title.textContent = target.name;
    this.subtitle.textContent = session.mode === "combat" ? "你的回合没有观察时限。看够了，再把攻击拖过承诺线。" : session.trial!.description;
    this.turnText.textContent = `第 ${session.turn} 回合`;
    this.focusText.textContent = session.mode === "combat" ? `专注 ${session.focus}/${store.player.focusMax}` : "冒险试炼";
    this.hpText.textContent = session.mode === "combat" ? `${session.hp}/${session.maxHp}` : "待解";
    this.hpFill.style.width = `${session.mode === "combat" ? (session.hp / session.maxHp) * 100 : 100}%`;
    this.playerHpText.textContent = `${store.player.hp}/${store.player.maxHp}`;
    this.playerHpFill.style.width = `${Math.max(0, Math.min(100, (store.player.hp / store.player.maxHp) * 100))}%`;
    (this.root.querySelector("#combat-portrait") as HTMLImageElement).src = tileUrl(target.sprite);

    if (session.monster) {
      const estimate = store.perfectFightEstimate(session.monster.id);
      this.enemyStats.innerHTML = `<span>攻击 <b>${session.monster.attack}</b></span><span>防御 <b>${session.monster.defense}</b></span><span>完美战损 <b>${estimate.damage}</b></span>`;
      this.traitText.textContent = `${this.traitName(session.monster)}。${session.monster.note}`;
    } else {
      const reward = ITEMS[(session.source as { rewardId: string }).rewardId];
      this.enemyStats.innerHTML = `<span>工具 <b>${ABILITIES[session.trial!.abilityId].shortName}</b></span><span>奖励 <b>${reward.name}</b></span>`;
      this.traitText.textContent = session.trial!.description;
    }
    this.renderAbilityBar();
  }

  private renderAbilityBar(): void {
    if (!this.session) return;
    const ids = this.session.mode === "combat" ? store.player.unlockedAbilities : [this.session.trial!.abilityId];
    this.abilityBar.innerHTML = "";
    ids.forEach((id, index) => {
      const ability = ABILITIES[id];
      const button = document.createElement("button");
      button.className = "ability-slot";
      button.type = "button";
      button.dataset.ability = id;
      button.disabled = ability.focusCost > this.session!.focus || this.phase === "enemy" || this.phase === "reveal";
      button.innerHTML = `<span class="ability-key">${index + 1}</span><img src="${tileUrl(ability.sprite)}" alt="" /><b>${ability.shortName}</b>${ability.focusCost ? `<em>专注 ${ability.focusCost}</em>` : ""}`;
      button.addEventListener("pointerenter", () => {
        this.hoverAbility = ability;
        this.abilityDetail.textContent = `${ability.name}：${ability.description}`;
      });
      button.addEventListener("pointerleave", () => {
        if (!this.drag) this.hoverAbility = null;
      });
      button.addEventListener("pointerdown", (event) => this.beginDrag(event, ability));
      this.abilityBar.appendChild(button);
    });
  }

  private beginDrag(event: PointerEvent, ability: AbilityDef): void {
    if (!this.session || this.phase !== "observe" || ability.focusCost > this.session.focus) return;
    event.preventDefault();
    const point = this.toArenaPoint(event.clientX, event.clientY);
    this.drag = { ...point, ability, committed: false, pointerId: event.pointerId };
    this.hoverAbility = ability;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private pointerMove(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId || !this.session) return;
    const point = this.toArenaPoint(event.clientX, event.clientY);
    this.drag.x = point.x;
    this.drag.y = point.y;
    const inside = this.isInsideArena(event.clientX, event.clientY);
    if (!this.practice && !this.drag.committed && inside && point.y < COMMIT_Y) {
      if (this.drag.ability.focusCost && !store.spendFocus(this.drag.ability.focusCost)) {
        this.drag = null;
        return;
      }
      this.drag.committed = true;
      this.phase = "blind";
      this.commitTime = performance.now() / 1000 - this.startTime;
      document.body.classList.add("blind-committed");
      this.renderStaticUi();
    }
  }

  private pointerUp(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId || !this.session) return;
    const drag = this.drag;
    if (this.practice) {
      const elapsed = performance.now() / 1000 - this.startTime;
      const target = this.session.monster ?? this.session.trial!;
      const targetPoint = targetPosition(elapsed, asTargetLike(target), false, 0, store.player.insight);
      const result = evaluateHit(drag.ability, drag, targetPoint, target.size);
      this.reveal = { point: { x: drag.x, y: drag.y }, target: targetPoint, ability: drag.ability, hit: result.hit, weakpoint: result.weakpoint, label: result.hit ? "练习：命中" : "练习：偏离", tone: "practice", until: performance.now() + 900 };
      this.drag = null;
      return;
    }
    if (!drag.committed) {
      this.drag = null;
      this.hoverAbility = null;
      return;
    }

    const elapsed = performance.now() / 1000 - this.startTime;
    const target = this.session.monster ?? this.session.trial!;
    const targetPoint = targetPosition(elapsed, asTargetLike(target), true, this.commitTime, store.player.insight);
    const result = evaluateHit(drag.ability, drag, targetPoint, target.size);
    document.body.classList.remove("blind-committed");
    this.phase = "reveal";
    this.drag = null;

    if (this.session.mode === "trial") {
      if (result.hit) {
        this.reveal = { point: drag, target: targetPoint, ability: drag.ability, ...result, label: result.weakpoint ? "完美共鸣" : "试炼成功", tone: "hit", until: performance.now() + 1050 };
        window.setTimeout(() => {
          store.resolveEncounterSuccess();
          this.close();
        }, 1050);
      } else {
        const damage = store.trialFailure();
        this.reveal = { point: drag, target: targetPoint, ability: drag.ability, ...result, label: `偏离 · 反噬 ${damage}`, tone: "miss", until: performance.now() + 1100 };
        window.setTimeout(() => this.resumeObservation(), 1100);
      }
      return;
    }

    if (result.hit) {
      const outcome = store.damageMonster(drag.ability.id, result.weakpoint);
      const reflection = outcome.reflected ? ` · 反伤 ${outcome.reflected}` : "";
      this.reveal = { point: drag, target: targetPoint, ability: drag.ability, ...result, label: `${result.weakpoint ? "核心命中" : "命中"} · ${outcome.damage}${reflection}`, tone: "hit", until: performance.now() + 900 };
      if (store.player.hp <= 0) {
        window.setTimeout(() => {
          this.close();
          store.enemyCounter();
        }, 900);
      } else if (outcome.defeated) {
        window.setTimeout(() => {
          store.resolveEncounterSuccess();
          this.close();
        }, 950);
      } else {
        window.setTimeout(() => this.enemyTurn(), 850);
      }
    } else {
      store.missMonster();
      this.reveal = { point: drag, target: targetPoint, ability: drag.ability, ...result, label: "攻击落空", tone: "miss", until: performance.now() + 850 };
      window.setTimeout(() => this.enemyTurn(), 800);
    }
  }

  private enemyTurn(): void {
    if (!this.session?.monster) return;
    this.phase = "enemy";
    const damage = store.enemyCounter();
    if (!store.encounter) {
      this.close();
      return;
    }
    const elapsed = performance.now() / 1000 - this.startTime;
    const target = targetPosition(elapsed, asTargetLike(this.session.monster), false, 0, store.player.insight);
    this.reveal = { point: target, target, ability: ABILITIES.sword, hit: true, weakpoint: false, label: `${this.session.monster.name} 反击 · ${damage}`, tone: "enemy", until: performance.now() + 820 };
    this.renderStaticUi();
    window.setTimeout(() => this.resumeObservation(), 830);
  }

  private resumeObservation(): void {
    if (!this.session || !store.encounter) return;
    this.phase = "observe";
    this.reveal = null;
    this.hoverAbility = null;
    this.renderStaticUi();
  }

  private togglePractice(): void {
    if (!this.session || this.phase !== "observe") return;
    this.practice = !this.practice;
    this.practiceButton.classList.toggle("is-active", this.practice);
    this.practiceButton.setAttribute("aria-pressed", String(this.practice));
    this.abilityDetail.textContent = this.practice ? "练习已开启：目标和范围不会隐藏，也不会造成任何效果。" : "练习已关闭：越过承诺线后将正式结算。";
  }

  private retreat(): void {
    if (!this.session || this.phase !== "observe" || this.drag) return;
    store.closeEncounter();
    this.close();
  }

  private draw(timestamp: number): void {
    if (!this.session) return;
    const elapsed = timestamp / 1000 - this.startTime;
    const targetDef = this.session.monster ?? this.session.trial!;
    const target = targetPosition(elapsed, asTargetLike(targetDef), this.phase === "blind", this.commitTime, store.player.insight);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.drawArena(ctx, elapsed);

    const targetVisible = this.phase !== "blind";
    if (targetVisible) this.drawTarget(ctx, target, targetDef, elapsed);

    if (this.drag && (this.practice || !this.drag.committed)) this.drawAbility(ctx, this.drag.ability, this.drag, this.practice ? "practice" : "preview");
    else if (!this.drag && this.hoverAbility && this.phase === "observe") this.drawAbility(ctx, this.hoverAbility, { x: 225, y: 342 }, "preview");

    if (this.reveal && timestamp <= this.reveal.until) {
      this.drawAbility(ctx, this.reveal.ability, this.reveal.point, this.reveal.tone === "practice" ? "practice" : this.reveal.hit ? "hit" : "miss");
      this.drawReveal(ctx, this.reveal, timestamp);
    }

    this.frame = requestAnimationFrame((time) => this.draw(time));
  }

  private drawArena(ctx: CanvasRenderingContext2D, elapsed: number): void {
    const theme = store.floor.theme;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#11131a";
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    const tile = 50;
    for (let y = 0; y < COMMIT_Y; y += tile) {
      for (let x = 0; x < ARENA_WIDTH; x += tile) {
        if (this.atlasLoaded) {
          const frame = 48 + ((x / tile + y / tile + store.player.floor) % 6);
          const sx = (frame % 12) * 16;
          const sy = Math.floor(frame / 12) * 16;
          ctx.globalAlpha = 0.52;
          ctx.drawImage(this.atlasImage, sx, sy, 16, 16, x, y, tile, tile);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = y / tile % 2 === 0 ? "rgba(255,255,255,.015)" : "rgba(0,0,0,.035)";
        ctx.fillRect(x, y, tile, tile);
      }
    }
    ctx.fillStyle = theme.fog;
    ctx.fillRect(0, 0, ARENA_WIDTH, COMMIT_Y);
    const glow = ctx.createRadialGradient(ARENA_WIDTH * 0.52, ARENA_HEIGHT * 0.4, 20, ARENA_WIDTH * 0.52, ARENA_HEIGHT * 0.4, 430);
    glow.addColorStop(0, "rgba(255,224,158,.12)");
    glow.addColorStop(0.65, "rgba(0,0,0,.05)");
    glow.addColorStop(1, "rgba(0,0,0,.52)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, ARENA_WIDTH, COMMIT_Y);

    ctx.strokeStyle = this.practice ? "rgba(118,220,177,.9)" : "rgba(221,91,75,.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -elapsed * 22;
    ctx.beginPath();
    ctx.moveTo(0, COMMIT_Y);
    ctx.lineTo(ARENA_WIDTH, COMMIT_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.phase === "blind") {
      ctx.fillStyle = "rgba(5,6,10,.26)";
      ctx.fillRect(0, 0, ARENA_WIDTH, COMMIT_Y);
    }
  }

  private drawTarget(ctx: CanvasRenderingContext2D, point: DragPoint, def: MonsterDef | TrialDef, elapsed: number): void {
    const pulse = 1 + Math.sin(elapsed * 4) * 0.025;
    const size = def.size * pulse;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.38, size * 0.42, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    if ("boss" in def && def.boss) {
      ctx.strokeStyle = "rgba(245,198,102,.46)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.62 + Math.sin(elapsed * 2.2) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.targetLoaded) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.targetImage, -size / 2, -size / 2, size, size);
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = `#${def.tint.toString(16).padStart(6, "0")}55`;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.fillStyle = "#d8bd78";
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAbility(ctx: CanvasRenderingContext2D, ability: AbilityDef, center: DragPoint, mode: "preview" | "practice" | "hit" | "miss"): void {
    const color = mode === "hit" ? "#ffe080" : mode === "miss" ? "#ff7569" : mode === "practice" ? "#77e0b3" : "#f4d696";
    const fill = mode === "hit" ? "rgba(255,224,128,.24)" : mode === "miss" ? "rgba(255,80,70,.18)" : mode === "practice" ? "rgba(90,220,165,.17)" : "rgba(244,214,150,.14)";
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = fill;
    ctx.lineWidth = 3;
    ctx.setLineDash(mode === "preview" ? [8, 6] : []);
    if (ability.shape === "circle") {
      ctx.beginPath();
      ctx.arc(center.x, center.y, ability.radius ?? 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (ability.shape === "line") {
      const length = ability.length ?? 150;
      const width = ability.width ?? 20;
      ctx.beginPath();
      ctx.roundRect(center.x - width / 2, center.y - length * 0.52, width, length, width / 2);
      ctx.fill();
      ctx.stroke();
    } else if (ability.shape === "ring") {
      ctx.lineWidth = ability.width ?? 22;
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      ctx.arc(center.x, center.y, ability.radius ?? 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, ability.radius ?? 80, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ability.shape === "arc") {
      const radius = ability.radius ?? 90;
      const angle = ability.angle ?? 1.8;
      const facing = -Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, radius, facing - angle / 2, facing + angle / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawReveal(ctx: CanvasRenderingContext2D, reveal: RevealState, timestamp: number): void {
    const remaining = Math.max(0, Math.min(1, (reveal.until - timestamp) / 750));
    const toneColor = reveal.tone === "miss" ? "#ff746a" : reveal.tone === "enemy" ? "#ff6b57" : reveal.tone === "practice" ? "#7ce1b5" : "#ffe08a";
    ctx.save();
    ctx.globalAlpha = Math.min(1, remaining * 1.8);
    ctx.strokeStyle = toneColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(reveal.point.x, reveal.point.y);
    ctx.lineTo(reveal.target.x, reveal.target.y);
    ctx.stroke();
    const width = Math.max(190, ctx.measureText(reveal.label).width + 54);
    const x = ARENA_WIDTH / 2 - width / 2;
    const y = 28;
    ctx.fillStyle = "rgba(9,9,13,.86)";
    ctx.strokeStyle = toneColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 48, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = toneColor;
    ctx.font = "700 22px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(reveal.label, ARENA_WIDTH / 2, y + 32);
    ctx.restore();
  }

  private toArenaPoint(clientX: number, clientY: number): DragPoint {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(ARENA_WIDTH, ((clientX - rect.left) / rect.width) * ARENA_WIDTH)),
      y: Math.max(0, Math.min(ARENA_HEIGHT, ((clientY - rect.top) / rect.height) * ARENA_HEIGHT)),
    };
  }

  private isInsideArena(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  private traitName(monster: MonsterDef): string {
    const names: Record<MonsterDef["trait"], string> = {
      none: "无特殊被动",
      armored: "厚甲：低穿甲攻击伤害受限",
      agile: "敏捷：体型小且移动快",
      thorns: "荆棘：命中也会受到反伤",
      regen: "再生：攻击落空时恢复生命",
      mirror: "镜步：承诺后反转运动方向",
      enraged: "狂怒：受伤后动作更具压迫感",
    };
    return names[monster.trait];
  }
}
