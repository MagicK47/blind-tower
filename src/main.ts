import Phaser from "phaser";
import "./style.css";
import { ABILITIES, ITEMS, MONSTERS, NPCS } from "./game/content";
import { validateFloors } from "./game/floors";
import { CombatView } from "./game/CombatView";
import { SCENE_SIZE, TowerScene } from "./game/TowerScene";
import { store, type GameEvent } from "./game/store";
import type { MonsterEntity, NpcEntity, ShopEntity } from "./game/types";
import { installAssetCssVariables, tileUrl } from "./game/assetUrl";

installAssetCssVariables();

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <main class="game-shell">
    <section class="game-frame" aria-label="失明王座五十层魔塔游戏">
      <header class="tower-header">
        <div class="brand-mark"><img src="${tileUrl(56)}" alt="" /><span><b>失明王座</b><small>经典魔塔 · 50 层</small></span></div>
        <div class="floor-heading"><strong id="floor-number">第 1 层</strong><span id="floor-name">遗忘墓道</span></div>
        <div class="header-actions">
          <button class="icon-button" id="quick-save" type="button" title="快速存档" aria-label="快速存档"><img src="${tileUrl(65)}" alt="" /></button>
          <button class="icon-button" id="open-help" type="button" title="玩法说明" aria-label="玩法说明">?</button>
        </div>
      </header>

      <div class="tower-layout">
        <section class="world-panel">
          <div id="phaser-root" aria-label="塔层地图"></div>
          <div class="floor-ribbon"><span id="theme-subtitle"></span><b id="floor-objective"></b></div>
        </section>

        <aside class="status-panel">
          <section class="hero-status">
            <div class="hero-portrait"><img src="${tileUrl(85)}" alt="勇者" /></div>
            <div class="hero-level"><span>无名攀登者</span><b id="player-level">Lv.1</b></div>
            <div class="hp-block"><div><span>生命</span><strong id="hp-number">1000 / 1000</strong></div><div class="hud-bar"><i id="hp-bar"></i></div></div>
            <div class="stat-grid">
              <span><small>攻击</small><b id="attack-number">18</b></span>
              <span><small>防御</small><b id="defense-number">10</b></span>
              <span><small>金币</small><b id="gold-number">0</b></span>
              <span><small>洞察</small><b id="insight-number">0</b></span>
            </div>
          </section>

          <section class="key-ring" aria-label="钥匙">
            <span><img src="${tileUrl(125)}" alt="黄钥匙" /><b id="yellow-keys">0</b></span>
            <span><img src="${tileUrl(128)}" alt="蓝钥匙" /><b id="blue-keys">0</b></span>
            <span><img src="${tileUrl(127)}" alt="红钥匙" /><b id="red-keys">0</b></span>
          </section>

          <section class="equipment-strip">
            <h3>已获得武具</h3>
            <div id="equipment-list"></div>
          </section>

          <section class="nearby-panel">
            <h3>近处目标</h3>
            <div id="nearby-target" class="nearby-empty">尚未靠近可互动目标</div>
          </section>

          <section class="tower-log">
            <h3>塔中记录</h3>
            <ol id="log-list"></ol>
          </section>
        </aside>
      </div>

      <footer class="tool-belt">
        <button type="button" id="open-bestiary" aria-label="怪物手册" title="怪物手册"><img src="${tileUrl(74)}" alt="" /><span><b>怪物手册</b><small>战损资料</small></span></button>
        <button type="button" id="open-map" aria-label="塔之罗盘" title="塔之罗盘"><img src="${tileUrl(18)}" alt="" /><span><b>塔之罗盘</b><small>已访问楼层</small></span></button>
        <div class="dpad" aria-label="移动方向">
          <button type="button" data-move="0,-1" aria-label="向上">▲</button>
          <button type="button" data-move="-1,0" aria-label="向左">◀</button>
          <button type="button" data-move="0,1" aria-label="向下">▼</button>
          <button type="button" data-move="1,0" aria-label="向右">▶</button>
        </div>
        <button type="button" id="use-bomb" aria-label="使用裂墙火药" title="裂墙火药"><img src="${tileUrl(110)}" alt="" /><span><b>裂墙火药</b><small id="bomb-count">持有 0</small></span></button>
        <button type="button" id="use-water" aria-label="使用回生圣水" title="回生圣水"><img src="${tileUrl(114)}" alt="" /><span><b>回生圣水</b><small id="water-count">持有 0</small></span></button>
        <div class="control-hint"><kbd>WASD</kbd><span>移动</span><kbd>接敌</kbd><span>自动结算</span></div>
      </footer>

      <div id="combat-root"></div>
      <div id="modal-root"></div>
      <div id="toast" role="status" aria-live="polite"></div>

      <section id="title-screen" class="title-screen">
        <div class="title-art">
          <img class="title-rune" src="${tileUrl(56)}" alt="" />
          <img class="title-hero" src="${tileUrl(85)}" alt="" />
          <div class="title-copy"><span>固定数值探索 × 路线规划</span><h1>失明王座</h1><p>五十层魔塔</p></div>
          <img class="title-king" src="${tileUrl(110)}" alt="" />
        </div>
        <div class="title-menu">
          <button class="game-button primary" id="continue-game" type="button">继续攀登</button>
          <button class="game-button" id="new-game" type="button">开始新游戏</button>
          <small>50 层固定塔图 · 本地自动存档</small>
        </div>
      </section>
    </section>
  </main>`;

const combatView = new CombatView(document.querySelector("#combat-root")!);
const modalRoot = document.querySelector<HTMLDivElement>("#modal-root")!;
const titleScreen = document.querySelector<HTMLElement>("#title-screen")!;
let toastTimer = 0;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "phaser-root",
  width: SCENE_SIZE,
  height: SCENE_SIZE,
  backgroundColor: "#090b10",
  pixelArt: true,
  render: { antialias: false, roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TowerScene],
});

function setText(id: string, value: string | number): void {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element) element.textContent = String(value);
}

function renderHud(): void {
  const player = store.player;
  const floor = store.floor;
  setText("floor-number", `第 ${player.floor} 层`);
  setText("floor-name", floor.name);
  setText("theme-subtitle", floor.theme.subtitle);
  setText("floor-objective", floor.objective);
  setText("player-level", `Lv.${player.level}`);
  setText("hp-number", `${player.hp} / ${player.maxHp}`);
  setText("attack-number", player.attack);
  setText("defense-number", player.defense);
  setText("gold-number", player.gold);
  setText("insight-number", player.insight);
  setText("yellow-keys", player.yellowKeys);
  setText("blue-keys", player.blueKeys);
  setText("red-keys", player.redKeys);
  setText("bomb-count", `持有 ${player.inventory.bomb ?? 0}`);
  setText("water-count", `持有 ${player.inventory.holyWater ?? 0}`);
  const hpBar = document.querySelector<HTMLElement>("#hp-bar")!;
  hpBar.style.width = `${Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100))}%`;
  document.documentElement.style.setProperty("--theme-accent", floor.theme.accent);

  const equipment = document.querySelector<HTMLDivElement>("#equipment-list")!;
  equipment.innerHTML = player.unlockedAbilities.map((id) => {
    const ability = ABILITIES[id];
    return `<span title="${ability.name}：${ability.description}"><img src="${tileUrl(ability.sprite)}" alt="" /><b>${ability.shortName}</b></span>`;
  }).join("");

  const logList = document.querySelector<HTMLOListElement>("#log-list")!;
  logList.innerHTML = store.saveData.log.slice(0, 5).map((line) => `<li>${line}</li>`).join("");
  renderNearby();
  combatView.refresh();
}

function renderNearby(): void {
  const player = store.player;
  const nearby = store.visibleEntities().find((entity) => Math.abs(entity.x - player.x) + Math.abs(entity.y - player.y) === 1);
  const container = document.querySelector<HTMLDivElement>("#nearby-target")!;
  if (!nearby) {
    container.className = "nearby-empty";
    container.textContent = "尚未靠近可互动目标";
    return;
  }
  container.className = "nearby-content";
  if (nearby.kind === "monster") {
    const monster = MONSTERS[nearby.monsterId];
    const forecast = store.fightForecast(monster.id);
    const outcome = !forecast.canDamage
      ? "无法破防"
      : `${forecast.canSurvive ? "预计损失" : "生命不足"} ${forecast.totalDamage} · ${forecast.rounds} 回合`;
    container.innerHTML = `<img src="${tileUrl(monster.sprite)}" alt="" style="filter: drop-shadow(0 0 7px #${monster.tint.toString(16).padStart(6, "0")});" /><div><b>${monster.name}</b><span class="${forecast.canSurvive ? "" : "danger-text"}">HP ${monster.hp} · ${outcome}</span></div>`;
  } else if (nearby.kind === "item") {
    const item = ITEMS[nearby.itemId];
    container.innerHTML = `<img src="${tileUrl(item.sprite)}" alt="" /><div><b>${item.name}</b><span>${item.description}</span></div>`;
  } else {
    const labels: Record<string, string> = { door: "锁门", stairs: "楼梯", npc: "塔中人物", shop: "流浪商人", trial: "塔中机关" };
    const frame = nearby.kind === "npc" ? NPCS[nearby.npcId].sprite : nearby.kind === "shop" ? 97 : nearby.kind === "stairs" ? 36 : nearby.kind === "trial" ? 56 : 75;
    container.innerHTML = `<img src="${tileUrl(frame)}" alt="" /><div><b>${labels[nearby.kind]}</b><span>向它移动以互动</span></div>`;
  }
}

function showToast(message: string, tone: "normal" | "danger" | "reward" = "normal"): void {
  const toast = document.querySelector<HTMLDivElement>("#toast")!;
  toast.textContent = message;
  toast.className = `is-visible ${tone}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.className = ""; }, 2200);
}

function updateModalClass(): void {
  const genericOpen = Boolean(modalRoot.querySelector(".modal-backdrop"));
  const combatOpen = document.body.classList.contains("combat-open");
  const titleOpen = !titleScreen.classList.contains("is-hidden");
  document.body.classList.toggle("modal-open", genericOpen || combatOpen || titleOpen);
}

function closeModal(): void {
  modalRoot.innerHTML = "";
  updateModalClass();
}

function openModal(title: string, kicker: string, content: string, className = ""): HTMLElement {
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <section class="game-modal ${className}" role="dialog" aria-modal="true" aria-label="${title}">
        <header><div><span>${kicker}</span><h2>${title}</h2></div><button class="modal-close" type="button" aria-label="关闭">×</button></header>
        <div class="modal-body">${content}</div>
      </section>
    </div>`;
  modalRoot.querySelector(".modal-close")?.addEventListener("click", closeModal);
  modalRoot.querySelector(".modal-backdrop")?.addEventListener("pointerdown", (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
  updateModalClass();
  return modalRoot.querySelector(".game-modal")!;
}

function openShop(entity: ShopEntity): void {
  const render = () => {
    const price = store.shopPrice(entity.level);
    const modal = openModal("流浪商人的砧台", `第 ${store.player.floor} 层商店`, `
      <div class="shop-intro"><img src="${tileUrl(97)}" alt="商人" /><p>“金币换成活下去的可能。每次购买后，下一次会更贵。”</p><b>持有 ${store.player.gold} 金币</b></div>
      <div class="shop-grid">
        <button type="button" data-upgrade="attack"><img src="${tileUrl(104)}" alt="" /><span><b>武器淬炼</b><small>攻击 +5</small></span><em>${price} 金</em></button>
        <button type="button" data-upgrade="defense"><img src="${tileUrl(102)}" alt="" /><span><b>护甲加固</b><small>防御 +5</small></span><em>${price} 金</em></button>
        <button type="button" data-upgrade="health"><img src="${tileUrl(114)}" alt="" /><span><b>生命祝福</b><small>最大生命 +260</small></span><em>${price} 金</em></button>
        <button type="button" data-upgrade="insight"><img src="${tileUrl(56)}" alt="" /><span><b>机关研习</b><small>洞察 +1</small></span><em>${price} 金</em></button>
      </div>`, "shop-modal");
    modal.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach((button) => button.addEventListener("click", () => {
      if (store.buyUpgrade(entity.level, button.dataset.upgrade as "attack" | "defense" | "health" | "insight")) render();
    }));
  };
  render();
}

function openNpc(entity: NpcEntity): void {
  const npc = NPCS[entity.npcId];
  const received = store.saveData.npcFlags.includes(npc.id);
  const gift = npc.gift ? ITEMS[npc.gift.itemId] : null;
  const modal = openModal(npc.name, "塔中相遇", `
    <div class="npc-dialogue">
      <img src="${tileUrl(npc.sprite)}" alt="${npc.name}" />
      <div>${npc.lines.map((line) => `<p>“${line}”</p>`).join("")}</div>
    </div>
    ${gift ? `<button class="gift-button" id="accept-gift" type="button" ${received ? "disabled" : ""}><img src="${tileUrl(gift.sprite)}" alt="" /><span><b>${received ? "赠礼已收下" : `收下 ${gift.name}`}</b><small>${gift.description}</small></span></button>` : ""}`, "dialogue-modal");
  modal.querySelector("#accept-gift")?.addEventListener("click", () => {
    store.acceptNpcGift(npc.id);
    closeModal();
  });
}

function openMap(): void {
  const buttons = Array.from({ length: 50 }, (_, index) => index + 1).map((floor) => {
    const visited = store.saveData.visitedFloors.includes(floor);
    const current = floor === store.player.floor;
    return `<button type="button" data-floor="${floor}" ${visited && !current ? "" : "disabled"} class="${current ? "current" : ""}"><b>${floor}</b><small>${visited ? (current ? "当前" : "可传送") : "未知"}</small></button>`;
  }).join("");
  const modal = openModal("塔之罗盘", `已发现 ${store.saveData.visitedFloors.length}/50 层`, `<div class="floor-map">${buttons}</div>`, "map-modal");
  modal.querySelectorAll<HTMLButtonElement>("[data-floor]").forEach((button) => button.addEventListener("click", () => {
    store.jumpToVisitedFloor(Number(button.dataset.floor));
    closeModal();
  }));
}

function openBestiary(): void {
  const defeated = Object.entries(store.saveData.defeatedMonsters).sort((a, b) => MONSTERS[a[0]].attack - MONSTERS[b[0]].attack);
  const content = defeated.length ? defeated.map(([id, count]) => {
    const monster = MONSTERS[id];
    const forecast = store.fightForecast(id);
    const outcome = !forecast.canDamage ? "当前无法破防" : `当前预计战损 ${forecast.totalDamage}`;
    return `<article class="monster-entry"><img src="${tileUrl(monster.sprite)}" alt="" /><div><b>${monster.name}</b><span>HP ${monster.hp} · 攻 ${monster.attack} · 防 ${monster.defense}</span><small>${outcome} · ${forecast.rounds || "--"} 回合</small></div><em>击败 ${count}</em></article>`;
  }).join("") : `<div class="empty-state"><img src="${tileUrl(74)}" alt="" /><p>击败怪物后，它的完整资料会被写入手册。</p></div>`;
  openModal("怪物手册", `已记录 ${defeated.length} 种`, `<div class="bestiary-list">${content}</div>`, "bestiary-modal");
}

function openHelp(): void {
  openModal("攀塔规则", "核心玩法", `
    <div class="help-grid">
      <section><b>探索</b><p>方向键或 WASD 按格移动。钥匙开门，药剂、晶石与武具会立即生效。已经到达的楼层可用塔之罗盘往返。</p></section>
      <section><b>战斗</b><p>勇者先手。每击伤害为“攻击减敌防”，敌人反击为“敌攻减勇者防”。最后一击结束战斗，敌人不会再反击。</p></section>
      <section><b>战损</b><p>靠近怪物即可看到准确战损。攻击不高于敌方防御时无法破防；预计战损足以致命时，接敌会被阻止。</p></section>
      <section><b>机关</b><p>机关会在确认前显示固定生命代价。洞察越高，代价越低；没有随机结果，也不需要拖动或长按。</p></section>
    </div>`);
}

function showDefeat(): void {
  combatView.close();
  const modal = openModal("攀登在此中断", "生命归零", `
    <div class="defeat-copy"><img src="${tileUrl(121)}" alt="" /><p>最后一次自动存档仍在。重新读取后，可以换一条支路、先拿属性晶石，或把金币留给商店。</p></div>
    <div class="modal-actions"><button class="game-button primary" id="retry-save" type="button">读取最近存档</button><button class="game-button" id="restart-game" type="button">重新开始</button></div>`);
  modal.querySelector("#retry-save")?.addEventListener("click", () => { store.restoreLastSave(); closeModal(); });
  modal.querySelector("#restart-game")?.addEventListener("click", () => { store.newGame(); closeModal(); });
}

function showEnding(): void {
  combatView.close();
  const minutes = Math.floor(store.saveData.playSeconds / 60);
  const defeated = Object.values(store.saveData.defeatedMonsters).reduce((sum, value) => sum + value, 0);
  const modal = openModal("名字重回世界", "第 50 层 · 终幕", `
    <div class="ending-scene"><img src="${tileUrl(99)}" alt="执灯者" /><div><p>王座碎裂后，塔中第一次出现了真正的黑暗。不是遮住眼睛的黑，而是不再替任何人决定落点的黑。</p><p>你想起自己的名字。画面没有写出来，因为它应当由玩家亲口说出。</p></div></div>
    <div class="ending-stats"><span><small>等级</small><b>${store.player.level}</b></span><span><small>击败</small><b>${defeated}</b></span><span><small>耗时</small><b>${minutes} 分</b></span><span><small>洞察</small><b>${store.player.insight}</b></span></div>
    <div class="modal-actions"><button class="game-button primary" id="ending-new-game" type="button">再次攀登</button></div>`, "ending-modal");
  modal.querySelector("#ending-new-game")?.addEventListener("click", () => { store.newGame(); closeModal(); });
}

function handleEvent(event: GameEvent): void {
  if (event.type === "state") renderHud();
  if (event.type === "encounter") combatView.open(event.session);
  if (event.type === "shop") openShop(event.entity);
  if (event.type === "dialog") openNpc(event.entity);
  if (event.type === "toast") showToast(event.message, event.tone);
  if (event.type === "defeat") showDefeat();
  if (event.type === "ending") showEnding();
}

store.subscribe(handleEvent);
renderHud();

const gameFrame = document.querySelector<HTMLElement>(".game-frame")!;
for (const eventName of ["contextmenu", "dragstart", "selectstart"]) {
  gameFrame.addEventListener(eventName, (event) => event.preventDefault());
}
gameFrame.querySelectorAll("img").forEach((image) => image.setAttribute("draggable", "false"));

document.querySelector("#quick-save")?.addEventListener("click", () => store.save(true));
document.querySelector("#open-help")?.addEventListener("click", openHelp);
document.querySelector("#open-map")?.addEventListener("click", openMap);
document.querySelector("#open-bestiary")?.addEventListener("click", openBestiary);
document.querySelector("#use-bomb")?.addEventListener("click", () => store.useInventory("bomb"));
document.querySelector("#use-water")?.addEventListener("click", () => store.useInventory("holyWater"));

let moveHoldDelay = 0;
let moveHoldInterval = 0;
const stopHeldMove = (): void => {
  window.clearTimeout(moveHoldDelay);
  window.clearInterval(moveHoldInterval);
  moveHoldDelay = 0;
  moveHoldInterval = 0;
};
document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => {
  const move = (): void => {
    if (document.body.classList.contains("modal-open")) {
      stopHeldMove();
      return;
    }
    const [dx, dy] = button.dataset.move!.split(",").map(Number);
    store.tryMove(dx, dy);
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    stopHeldMove();
    button.setPointerCapture?.(event.pointerId);
    move();
    moveHoldDelay = window.setTimeout(() => {
      moveHoldInterval = window.setInterval(move, 115);
    }, 280);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, stopHeldMove);
  }
});
window.addEventListener("blur", stopHeldMove);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopHeldMove();
});

const continueButton = document.querySelector<HTMLButtonElement>("#continue-game")!;
continueButton.disabled = !store.hasSave();
continueButton.textContent = store.hasSave() ? "继续攀登" : "暂无存档";
continueButton.addEventListener("click", () => {
  if (!store.continueGame()) return;
  titleScreen.classList.add("is-hidden");
  updateModalClass();
});
document.querySelector("#new-game")?.addEventListener("click", () => {
  store.newGame();
  titleScreen.classList.add("is-hidden");
  updateModalClass();
  showToast("攀登开始。先去听听守塔老人的话。", "reward");
});

document.body.classList.add("modal-open");
window.setInterval(() => store.addPlaySecond(), 1000);

const floorProblems = validateFloors();
if (floorProblems.length) console.error("Floor validation failed", floorProblems);

Object.assign(window as unknown as { __BLIND_TOWER__: unknown }, {
  __BLIND_TOWER__: {
    store,
    jumpFloor: (floor: number) => store.debugJump(floor),
    grant: () => store.debugGrant(),
    validateFloors,
    snapshot: () => store.snapshot(),
  },
});
