import { ITEMS } from "./content";
import { tileUrl } from "./assetUrl";
import { gameAudio } from "./audio";
import { store } from "./store";
import type { CombatForecast, CombatSession, MonsterDef } from "./types";

type BattleStep = () => void;

export class CombatView {
  private session: CombatSession | null = null;
  private sequence = 0;
  private timers: number[] = [];
  private resolved = false;

  private readonly overlay: HTMLElement;
  private readonly kicker: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly forecastText: HTMLElement;
  private readonly heroCard: HTMLElement;
  private readonly targetCard: HTMLElement;
  private readonly targetPortrait: HTMLImageElement;
  private readonly targetName: HTMLElement;
  private readonly targetTrait: HTMLElement;
  private readonly heroHpText: HTMLElement;
  private readonly heroHpFill: HTMLElement;
  private readonly targetHpText: HTMLElement;
  private readonly targetHpFill: HTMLElement;
  private readonly callout: HTMLElement;
  private readonly metrics: HTMLElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly retreatButton: HTMLButtonElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <section class="combat-overlay classic-combat" aria-hidden="true">
        <header class="combat-topline">
          <div class="combat-heading">
            <span class="combat-kicker" id="combat-kicker">经典魔塔战斗</span>
            <h2 id="combat-title">目标</h2>
            <p id="combat-subtitle">固定数值自动结算</p>
          </div>
          <div class="combat-forecast"><span>本次结果</span><strong id="combat-forecast">预计损失 0</strong></div>
        </header>

        <main class="classic-battlefield">
          <article class="combatant-card hero-combatant" id="hero-combatant">
            <span class="combatant-side">勇者先手</span>
            <div class="combatant-portrait"><img src="${tileUrl(85)}" alt="勇者" /></div>
            <h3>无名攀登者</h3>
            <p>攻 <b id="hero-attack"></b> · 防 <b id="hero-defense"></b></p>
            <div class="duel-hp"><div><span>生命</span><b id="combat-player-hp-text"></b></div><i><em id="combat-player-hp-fill"></em></i></div>
          </article>

          <div class="clash-core" aria-live="polite">
            <span>VS</span>
            <strong id="combat-callout">战斗开始</strong>
            <small>点击下方按钮可跳过演出</small>
          </div>

          <article class="combatant-card target-combatant" id="target-combatant">
            <span class="combatant-side" id="target-side">塔中敌人</span>
            <div class="combatant-portrait"><img id="combat-portrait" alt="敌人" /></div>
            <h3 id="combat-target-name">目标</h3>
            <p id="combat-target-trait"></p>
            <div class="duel-hp"><div><span id="target-value-label">生命</span><b id="combat-target-hp-text"></b></div><i><em id="combat-target-hp-fill"></em></i></div>
          </article>
        </main>

        <footer class="classic-combat-footer">
          <div class="combat-metrics" id="combat-metrics"></div>
          <div class="combat-footer-actions">
            <button class="game-button" id="combat-retreat" type="button">暂时离开</button>
            <button class="game-button primary" id="combat-action" type="button">立即完成</button>
          </div>
        </footer>
      </section>`;

    this.overlay = root.querySelector(".combat-overlay")!;
    this.kicker = root.querySelector("#combat-kicker")!;
    this.title = root.querySelector("#combat-title")!;
    this.subtitle = root.querySelector("#combat-subtitle")!;
    this.forecastText = root.querySelector("#combat-forecast")!;
    this.heroCard = root.querySelector("#hero-combatant")!;
    this.targetCard = root.querySelector("#target-combatant")!;
    this.targetPortrait = root.querySelector("#combat-portrait")!;
    this.targetName = root.querySelector("#combat-target-name")!;
    this.targetTrait = root.querySelector("#combat-target-trait")!;
    this.heroHpText = root.querySelector("#combat-player-hp-text")!;
    this.heroHpFill = root.querySelector("#combat-player-hp-fill")!;
    this.targetHpText = root.querySelector("#combat-target-hp-text")!;
    this.targetHpFill = root.querySelector("#combat-target-hp-fill")!;
    this.callout = root.querySelector("#combat-callout")!;
    this.metrics = root.querySelector("#combat-metrics")!;
    this.actionButton = root.querySelector("#combat-action")!;
    this.retreatButton = root.querySelector("#combat-retreat")!;

    this.actionButton.addEventListener("click", () => this.primaryAction());
    this.retreatButton.addEventListener("click", () => this.retreat());
  }

  open(session: CombatSession): void {
    this.clearTimers();
    this.session = session;
    this.resolved = false;
    this.sequence += 1;
    this.overlay.classList.add("is-open");
    this.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open", "combat-open");

    if (session.mode === "combat" && session.monster && session.forecast) {
      this.renderCombat(session.monster, session.forecast);
      const token = this.sequence;
      this.schedule(() => this.playCombat(token, session.monster!, session.forecast!), 240);
    } else {
      this.renderTrial(session);
    }
  }

  close(): void {
    this.clearTimers();
    this.sequence += 1;
    this.session = null;
    this.overlay.classList.remove("is-open", "is-trial", "is-resolved");
    this.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("combat-open", "modal-open");
  }

  refresh(): void {
    if (!this.session) return;
    this.setHeroHp(store.player.hp);
  }

  private renderCombat(monster: MonsterDef, forecast: CombatForecast): void {
    this.overlay.classList.remove("is-trial", "is-resolved");
    this.resetCombatantClasses();
    this.kicker.textContent = "经典魔塔战斗";
    this.title.textContent = monster.name;
    this.subtitle.textContent = "勇者先手，双方按固定数值交替攻击";
    this.forecastText.textContent = `预计损失 ${forecast.totalDamage}`;
    this.targetPortrait.src = tileUrl(monster.sprite);
    this.targetPortrait.style.filter = `drop-shadow(0 0 12px #${monster.tint.toString(16).padStart(6, "0")})`;
    this.targetName.textContent = monster.name;
    this.targetTrait.textContent = `${this.traitName(monster)} · 攻 ${monster.attack} · 防 ${monster.defense}`;
    this.root.querySelector("#target-side")!.textContent = monster.boss ? "楼层首领" : "塔中敌人";
    this.root.querySelector("#target-value-label")!.textContent = "生命";
    this.root.querySelector("#hero-attack")!.textContent = String(store.player.attack);
    this.root.querySelector("#hero-defense")!.textContent = String(store.player.defense);
    this.setHeroHp(store.player.hp);
    this.setTargetHp(monster.hp, monster.hp);
    this.callout.textContent = "战斗开始";
    this.metrics.innerHTML = `
      <span><small>勇者每击</small><b>${forecast.heroDamage}</b></span>
      <span><small>敌人反击</small><b>${forecast.enemyDamage}</b></span>
      <span><small>需要回合</small><b>${forecast.rounds}</b></span>
      <span class="loss"><small>预计战损</small><b>${forecast.totalDamage}</b></span>`;
    this.actionButton.textContent = "立即完成";
    this.actionButton.disabled = false;
    this.retreatButton.hidden = true;
  }

  private renderTrial(session: CombatSession): void {
    const trial = session.trial!;
    const source = session.source.kind === "trial" ? session.source : null;
    const reward = source ? ITEMS[source.rewardId] : null;
    const cost = session.trialCost ?? 0;
    this.overlay.classList.add("is-trial");
    this.overlay.classList.remove("is-resolved");
    this.resetCombatantClasses();
    this.kicker.textContent = "塔中机关";
    this.title.textContent = trial.name;
    this.subtitle.textContent = trial.description;
    this.forecastText.textContent = cost ? `固定代价 ${cost} 生命` : "洞察已免除代价";
    this.targetPortrait.src = tileUrl(trial.sprite);
    this.targetPortrait.style.filter = `drop-shadow(0 0 12px #${trial.tint.toString(16).padStart(6, "0")})`;
    this.targetName.textContent = trial.name;
    this.targetTrait.textContent = reward ? `奖励 · ${reward.name}` : "未知奖励";
    this.root.querySelector("#target-side")!.textContent = "可预估事件";
    this.root.querySelector("#target-value-label")!.textContent = "生命代价";
    this.root.querySelector("#hero-attack")!.textContent = String(store.player.attack);
    this.root.querySelector("#hero-defense")!.textContent = String(store.player.defense);
    this.setHeroHp(store.player.hp);
    this.targetHpText.textContent = String(cost);
    this.targetHpFill.style.width = `${Math.min(100, (cost / Math.max(1, store.player.hp)) * 100)}%`;
    this.callout.textContent = cost ? `确认后损失 ${cost} 生命` : "可以安全取得奖励";
    this.metrics.innerHTML = `
      <span><small>当前生命</small><b>${store.player.hp}</b></span>
      <span><small>洞察</small><b>${store.player.insight}</b></span>
      <span><small>固定代价</small><b>${cost}</b></span>
      <span class="reward"><small>获得</small><b>${reward?.name ?? "奖励"}</b></span>`;
    this.actionButton.textContent = cost ? "承受代价并开启" : "安全开启";
    this.actionButton.disabled = false;
    this.retreatButton.hidden = false;
  }

  private playCombat(token: number, monster: MonsterDef, forecast: CombatForecast): void {
    if (!this.isCurrent(token)) return;
    let heroHp = store.player.hp;
    let monsterHp = monster.hp;
    let elapsed = 0;
    const steps: BattleStep[] = [];
    const previewExchanges = Math.min(forecast.rounds - 1, 3);

    for (let index = 0; index < previewExchanges; index += 1) {
      steps.push(() => {
        monsterHp = Math.max(0, monsterHp - forecast.heroDamage);
        this.setTargetHp(monsterHp, monster.hp);
        this.flash(this.heroCard, "is-attacking");
        this.flash(this.targetCard, "is-hit");
        this.callout.textContent = `你造成 ${forecast.heroDamage} 点伤害`;
        gameAudio.play("heroHit");
      });
      steps.push(() => {
        heroHp = Math.max(0, heroHp - forecast.enemyDamage);
        this.setHeroHp(heroHp);
        this.flash(this.targetCard, "is-attacking");
        this.flash(this.heroCard, "is-hit");
        this.callout.textContent = forecast.enemyDamage ? `${monster.name} 反击 ${forecast.enemyDamage}` : `${monster.name} 无法伤害你`;
        if (forecast.enemyDamage) gameAudio.play("enemyHit");
      });
    }

    const hiddenExchanges = Math.max(0, forecast.rounds - 1 - previewExchanges);
    if (hiddenExchanges > 0) {
      steps.push(() => {
        heroHp = store.player.hp - forecast.totalDamage;
        monsterHp = Math.max(1, monster.hp - forecast.heroDamage * (forecast.rounds - 1));
        this.setHeroHp(heroHp);
        this.setTargetHp(monsterHp, monster.hp);
        this.flash(this.heroCard, "is-clashing");
        this.flash(this.targetCard, "is-clashing");
        this.callout.textContent = `连续交锋 ×${hiddenExchanges}`;
        gameAudio.play("heroHit");
      });
    }

    steps.push(() => {
      this.setHeroHp(store.player.hp - forecast.totalDamage);
      this.setTargetHp(0, monster.hp);
      this.flash(this.heroCard, "is-attacking");
      this.flash(this.targetCard, "is-defeated");
      this.callout.textContent = `最后一击 · ${monster.name} 被击败`;
      gameAudio.play("heroHit");
    });

    for (const step of steps) {
      elapsed += 185;
      this.schedule(() => {
        if (this.isCurrent(token)) step();
      }, elapsed);
    }
    this.schedule(() => this.finishCombat(token), elapsed + 300);
  }

  private primaryAction(): void {
    if (!this.session || this.resolved) return;
    if (this.session.mode === "trial") {
      this.resolved = true;
      store.resolveTrial();
      this.close();
      return;
    }
    this.finishCombat(this.sequence);
  }

  private finishCombat(token: number): void {
    if (!this.isCurrent(token) || this.resolved || !this.session?.monster || !this.session.forecast) return;
    this.resolved = true;
    this.clearTimers();
    const monster = this.session.monster;
    const forecast = this.session.forecast;
    this.setHeroHp(store.player.hp - forecast.totalDamage);
    this.setTargetHp(0, monster.hp);
    this.targetCard.classList.add("is-defeated");
    this.overlay.classList.add("is-resolved");
    this.callout.textContent = `胜利 · 获得 ${monster.gold} 金币 / ${monster.exp} 经验`;
    gameAudio.play("victory");
    this.actionButton.textContent = "结算中";
    this.actionButton.disabled = true;
    this.schedule(() => {
      if (!this.isCurrent(token)) return;
      store.resolveClassicCombat();
      if (this.session) this.close();
    }, 360);
  }

  private retreat(): void {
    if (!this.session || this.session.mode !== "trial" || this.resolved) return;
    store.closeEncounter();
    this.close();
  }

  private setHeroHp(value: number): void {
    const hp = Math.max(0, Math.round(value));
    this.heroHpText.textContent = `${hp} / ${store.player.maxHp}`;
    this.heroHpFill.style.width = `${Math.min(100, (hp / Math.max(1, store.player.maxHp)) * 100)}%`;
  }

  private setTargetHp(value: number, max: number): void {
    const hp = Math.max(0, Math.round(value));
    this.targetHpText.textContent = `${hp} / ${max}`;
    this.targetHpFill.style.width = `${Math.min(100, (hp / Math.max(1, max)) * 100)}%`;
  }

  private flash(element: HTMLElement, className: string): void {
    element.classList.remove("is-attacking", "is-hit", "is-clashing");
    void element.offsetWidth;
    element.classList.add(className);
    this.schedule(() => element.classList.remove(className), 170);
  }

  private resetCombatantClasses(): void {
    for (const card of [this.heroCard, this.targetCard]) {
      card.classList.remove("is-attacking", "is-hit", "is-clashing", "is-defeated");
    }
  }

  private traitName(monster: MonsterDef): string {
    const names: Record<MonsterDef["trait"], string> = {
      none: "普通",
      armored: "厚甲",
      agile: "迅捷",
      thorns: "尖甲",
      regen: "高生命",
      mirror: "诡术",
      enraged: "狂战",
    };
    return names[monster.trait];
  }

  private schedule(callback: () => void, delay: number): void {
    this.timers.push(window.setTimeout(callback, delay));
  }

  private clearTimers(): void {
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers = [];
  }

  private isCurrent(token: number): boolean {
    return token === this.sequence && Boolean(this.session);
  }
}
