# 失明王座：五十层魔塔

一款可直接在浏览器游玩的 2D 固定数值魔塔 RPG。游戏包含经典格子地图、钥匙门、商店、NPC、道具与 50 层固定塔图；战斗采用可提前计算战损的传统魔塔规则。

## 在线试玩

[打开游戏](https://magick47.github.io/blind-tower/)

桌面端使用方向键或 `WASD` 移动，也可以点击地图，按点击位置相对勇者的主方向走一步。手机竖屏提供固定在最下方的加大方向键和常用工具，按住方向键可以连续移动。接敌前会显示准确战损，战斗自动进行，也可以立即完成演出。右上角音符按钮可以随时开关游戏音效。

![塔层探索](docs/screenshots/exploration.png)

![经典魔塔自动战斗](docs/screenshots/combat.png)

![手机竖屏与底部固定操作区](docs/screenshots/mobile.png)

## 本地运行

```bash
npm install
npm run dev
```

构建检查：

```bash
npm run build
```

## 美术资源

游戏使用 Kenney 的 Tiny Dungeon 与 UI Pack: RPG Expansion 素材，相关 CC0 许可文件随资源保存在 `public/assets/LICENSE-KENNEY-*.txt`。

游戏音效来自项目方持有许可的本地素材库，并已转换为网页游戏使用的 MP3；来源说明见 `public/assets/audio/SOURCE.md`。

核心系统的持续设计记录见 `core-system-design.html`。
