import type { AbilityDef, ItemDef, MonsterDef, NpcDef, ThemeDef, TrialDef } from "./types";
import { BALANCE } from "./balance";

export const THEMES: ThemeDef[] = [
  { id: "crypt", name: "遗忘墓道", subtitle: "石缝里仍有旧日火光", floorTint: 0x8793a5, wallTint: 0x5d6676, accent: "#d2b276", fog: "rgba(32, 39, 52, .48)" },
  { id: "moss", name: "苔痕地窟", subtitle: "根须沿着名字生长", floorTint: 0x78937b, wallTint: 0x4d6954, accent: "#b8d486", fog: "rgba(22, 50, 38, .46)" },
  { id: "copper", name: "赤铜工坊", subtitle: "停摆的齿轮仍在发热", floorTint: 0xb58d68, wallTint: 0x755340, accent: "#f0b86d", fog: "rgba(76, 41, 27, .45)" },
  { id: "tide", name: "潮汐牢城", subtitle: "无窗牢房听得见海", floorTint: 0x6e9da5, wallTint: 0x486b77, accent: "#91d7dd", fog: "rgba(25, 52, 65, .48)" },
  { id: "ember", name: "烬火兵廊", subtitle: "每一把剑都记得败者", floorTint: 0xb47b62, wallTint: 0x6e3f38, accent: "#ff9d68", fog: "rgba(76, 29, 26, .5)" },
  { id: "archive", name: "月银藏书塔", subtitle: "书页翻动，却没有风", floorTint: 0x9490aa, wallTint: 0x5f5976, accent: "#d5c5ff", fog: "rgba(48, 38, 67, .48)" },
  { id: "court", name: "风蚀高庭", subtitle: "王座之下只剩回声", floorTint: 0x96a19d, wallTint: 0x5e6c6a, accent: "#d1e1c7", fog: "rgba(39, 56, 55, .46)" },
  { id: "bloodmoon", name: "血月祭坛", subtitle: "影子比人更早跪下", floorTint: 0xa16d79, wallTint: 0x623b4d, accent: "#ff9aa7", fog: "rgba(69, 25, 43, .52)" },
  { id: "astral", name: "星穹回廊", subtitle: "脚下石板映着陌生星空", floorTint: 0x788eae, wallTint: 0x45566f, accent: "#a9c9ff", fog: "rgba(26, 38, 68, .52)" },
  { id: "throne", name: "失明王座", subtitle: "看不见的王在等待出手", floorTint: 0x9b896a, wallTint: 0x443d3c, accent: "#f2cf75", fog: "rgba(13, 12, 18, .62)" },
];

export const ABILITIES: Record<string, AbilityDef> = {
  sword: { id: "sword", name: "旧誓长剑", shortName: "长剑", sprite: 104, description: "攀塔者最初的武器。战斗伤害由总攻击力决定。" },
  spear: { id: "spear", name: "穿影长枪", shortName: "长枪", sprite: 106, description: "已经收录的武具。用于记录探索中的装备收藏。" },
  axe: { id: "axe", name: "回声战斧", shortName: "战斧", sprite: 118, description: "拾取断柄战斧时，攻击永久提升。" },
  hammer: { id: "hammer", name: "沉星战锤", shortName: "战锤", sprite: 117, description: "拾取沉星锤头时，防御永久提升。" },
  flame: { id: "flame", name: "烬火咒印", shortName: "咒印", sprite: 129, description: "拾取残页时，攻击与最大生命永久提升。" },
  lockpick: { id: "lockpick", name: "听簧针", shortName: "听簧", sprite: 131, description: "旧时代的机关工具。" },
  focusRing: { id: "focusRing", name: "共鸣环", shortName: "共鸣", sprite: 130, description: "旧时代的仪式工具。" },
};

export const ITEMS: Record<string, ItemDef> = {
  yellowKey: { id: "yellowKey", name: "黄铜钥匙", sprite: 125, tint: 0xffd16a, description: "开启一扇黄门。" },
  blueKey: { id: "blueKey", name: "蔚蓝钥匙", sprite: 128, tint: 0x8dc8ff, description: "开启一扇蓝门。" },
  redKey: { id: "redKey", name: "猩红钥匙", sprite: 127, tint: 0xff7474, description: "开启一扇红门。" },
  smallPotion: { id: "smallPotion", name: "微光药剂", sprite: 113, description: `恢复 ${BALANCE.items.smallPotion} 点生命。` },
  largePotion: { id: "largePotion", name: "高塔圣水", sprite: 116, description: `恢复 ${BALANCE.items.largePotion} 点生命，或最大生命的 ${BALANCE.items.largePotionRatio * 100}%，取较高值。` },
  ruby: { id: "ruby", name: "力量红晶", sprite: 101, tint: 0xff6f62, description: "攻击永久 +3。" },
  sapphire: { id: "sapphire", name: "守护蓝晶", sprite: 102, tint: 0x77baff, description: "防御永久 +3。" },
  coinBag: { id: "coinBag", name: "旧王金币", sprite: 101, tint: 0xffd66b, description: "获得金币。" },
  insight: { id: "insight", name: "记忆尘晶", sprite: 56, tint: 0xc6a6ff, description: "洞察永久 +1，每点洞察使塔中机关的生命代价降低 8。" },
  axeRelic: { id: "axeRelic", name: "断柄战斧", sprite: 118, description: "攻击永久 +8。" },
  hammerRelic: { id: "hammerRelic", name: "沉星锤头", sprite: 117, description: "防御永久 +8。" },
  flameRelic: { id: "flameRelic", name: "烬火残页", sprite: 129, description: `攻击永久 +${BALANCE.items.flameAttack}，最大生命与当前生命 +${BALANCE.items.flameHp}。` },
  bomb: { id: "bomb", name: "裂墙火药", sprite: 110, description: "在背包中使用，清除相邻的普通怪物。" },
  holyWater: { id: "holyWater", name: "回生圣水", sprite: 114, description: "在背包中使用，恢复 35% 最大生命。" },
};

const monster = (data: MonsterDef): MonsterDef => data;

export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries([
  monster({ id: "moss_slime", name: "苔衣史莱姆", sprite: 108, tint: 0x8be0a2, hp: 46, attack: 14, defense: 3, gold: 7, exp: 6, trait: "none" }),
  monster({ id: "tunnel_goblin", name: "穴居斥候", sprite: 109, tint: 0xd9c674, hp: 62, attack: 19, defense: 5, gold: 10, exp: 8, trait: "agile" }),
  monster({ id: "cave_boar", name: "石鬃野猪", sprite: 120, tint: 0xc79c83, hp: 94, attack: 24, defense: 8, gold: 13, exp: 10, trait: "armored" }),

  monster({ id: "bone_scout", name: "骨哨巡兵", sprite: 111, tint: 0xd9e0e8, hp: 108, attack: 31, defense: 11, gold: 17, exp: 13, trait: "none" }),
  monster({ id: "ash_imp", name: "灰烬小鬼", sprite: 110, tint: 0xff766a, hp: 92, attack: 36, defense: 9, gold: 19, exp: 15, trait: "agile" }),
  monster({ id: "crypt_wraith", name: "墓灯怨魂", sprite: 121, tint: 0xa5d1ff, hp: 134, attack: 39, defense: 14, gold: 22, exp: 18, trait: "regen" }),

  monster({ id: "copper_guard", name: "赤铜守卫", sprite: 96, tint: 0xe1a66b, hp: 176, attack: 49, defense: 22, gold: 28, exp: 23, trait: "armored" }),
  monster({ id: "gear_scorpion", name: "齿轮蝎", sprite: 122, tint: 0xe6a878, hp: 144, attack: 57, defense: 18, gold: 30, exp: 25, trait: "thorns" }),
  monster({ id: "furnace_worm", name: "炉膛钻虫", sprite: 123, tint: 0xff9d60, hp: 201, attack: 61, defense: 25, gold: 34, exp: 28, trait: "enraged" }),

  monster({ id: "tide_hunter", name: "潮牢猎手", sprite: 112, tint: 0x82d7dd, hp: 230, attack: 70, defense: 29, gold: 38, exp: 32, trait: "agile" }),
  monster({ id: "drowned_knight", name: "溺亡骑士", sprite: 97, tint: 0x79b9ca, hp: 286, attack: 76, defense: 36, gold: 43, exp: 35, trait: "armored" }),
  monster({ id: "salt_wolf", name: "盐霜猎狼", sprite: 124, tint: 0xb4e3df, hp: 214, attack: 82, defense: 28, gold: 45, exp: 38, trait: "agile" }),

  monster({ id: "ember_duelist", name: "烬火剑士", sprite: 98, tint: 0xff9b6d, hp: 322, attack: 91, defense: 42, gold: 50, exp: 42, trait: "none" }),
  monster({ id: "blood_imp", name: "燃血魔童", sprite: 110, tint: 0xff4c5e, hp: 270, attack: 99, defense: 35, gold: 54, exp: 45, trait: "regen" }),
  monster({ id: "iron_maw", name: "铁颚兽", sprite: 120, tint: 0x8f9099, hp: 398, attack: 104, defense: 50, gold: 58, exp: 49, trait: "armored" }),

  monster({ id: "paper_wraith", name: "噬字幽灵", sprite: 121, tint: 0xd3c5ff, hp: 372, attack: 113, defense: 51, gold: 63, exp: 53, trait: "mirror" }),
  monster({ id: "moon_scholar", name: "月蚀学士", sprite: 84, tint: 0xcdb7ff, hp: 430, attack: 121, defense: 58, gold: 67, exp: 56, trait: "regen" }),
  monster({ id: "ink_spider", name: "墨痕毒蝎", sprite: 122, tint: 0x8b74b8, hp: 346, attack: 129, defense: 47, gold: 70, exp: 60, trait: "thorns" }),

  monster({ id: "gale_ranger", name: "高庭风弩手", sprite: 112, tint: 0xc8e0d4, hp: 458, attack: 137, defense: 63, gold: 76, exp: 64, trait: "agile" }),
  monster({ id: "court_guard", name: "无主近卫", sprite: 96, tint: 0xbec8c3, hp: 560, attack: 145, defense: 78, gold: 82, exp: 68, trait: "armored" }),
  monster({ id: "storm_wolf", name: "裂风银狼", sprite: 124, tint: 0xe7f0ef, hp: 436, attack: 154, defense: 61, gold: 86, exp: 72, trait: "enraged" }),

  monster({ id: "moon_assassin", name: "血月刺客", sprite: 98, tint: 0xff8da0, hp: 590, attack: 162, defense: 80, gold: 92, exp: 77, trait: "agile" }),
  monster({ id: "altar_demon", name: "祭坛赤魔", sprite: 110, tint: 0xff4f69, hp: 704, attack: 171, defense: 88, gold: 98, exp: 82, trait: "thorns" }),
  monster({ id: "blind_hound", name: "盲嗅猎犬", sprite: 124, tint: 0x92717e, hp: 612, attack: 181, defense: 75, gold: 103, exp: 86, trait: "mirror" }),

  monster({ id: "astral_guard", name: "星穹卫士", sprite: 97, tint: 0x9fc6ff, hp: 780, attack: 190, defense: 101, gold: 112, exp: 92, trait: "armored" }),
  monster({ id: "void_wraith", name: "虚空残响", sprite: 121, tint: 0x85a5e8, hp: 690, attack: 201, defense: 89, gold: 118, exp: 98, trait: "regen" }),
  monster({ id: "crown_scorpion", name: "冠冕星蝎", sprite: 122, tint: 0xe4c6ff, hp: 744, attack: 212, defense: 94, gold: 124, exp: 104, trait: "thorns" }),

  monster({ id: "throne_knight", name: "王座黑骑", sprite: 96, tint: 0xd9bd77, hp: 860, attack: 215, defense: 112, gold: 135, exp: 112, trait: "armored" }),
  monster({ id: "crown_mimic", name: "伪冠吞噬者", sprite: 92, tint: 0xe0b55f, hp: 800, attack: 226, defense: 100, gold: 148, exp: 120, trait: "enraged" }),
  monster({ id: "nameless_king", name: "无名王影", sprite: 110, tint: 0xe8c87a, hp: 960, attack: 238, defense: 118, gold: 160, exp: 132, trait: "mirror" }),

  monster({ id: "seal_5", name: "五层封印兽·石喉", sprite: 120, tint: 0xd7b477, hp: 170, attack: 31, defense: 10, gold: 48, exp: 36, trait: "armored", boss: true }),
  monster({ id: "seal_15", name: "十五层熔炉监工", sprite: 96, tint: 0xf0a45f, hp: 650, attack: 95, defense: 42, gold: 120, exp: 92, trait: "enraged", boss: true }),
  monster({ id: "seal_25", name: "二十五层烬甲统领", sprite: 98, tint: 0xff8068, hp: 1050, attack: 140, defense: 68, gold: 210, exp: 158, trait: "armored", boss: true }),
  monster({ id: "seal_35", name: "三十五层风蚀执政", sprite: 112, tint: 0xd1e1c7, hp: 1450, attack: 179, defense: 94, gold: 320, exp: 245, trait: "agile", boss: true }),
  monster({ id: "seal_45", name: "四十五层星冠裁决", sprite: 97, tint: 0xa9c9ff, hp: 1900, attack: 220, defense: 120, gold: 470, exp: 360, trait: "mirror", boss: true }),

  monster({ id: "boss_10", name: "十层守门人·铁誓", sprite: 96, tint: 0xeab36f, hp: 460, attack: 64, defense: 28, gold: 80, exp: 70, trait: "armored", boss: true }),
  monster({ id: "boss_20", name: "二十层主祭·溺月", sprite: 84, tint: 0x8de4ee, hp: 780, attack: 112, defense: 55, gold: 150, exp: 120, trait: "regen", boss: true }),
  monster({ id: "boss_30", name: "三十层刑官·焚脊", sprite: 110, tint: 0xff674f, hp: 1260, attack: 164, defense: 82, gold: 230, exp: 190, trait: "enraged", boss: true }),
  monster({ id: "boss_40", name: "四十层镜卫·无面", sprite: 97, tint: 0xf3a4c3, hp: 1650, attack: 200, defense: 106, gold: 340, exp: 280, trait: "mirror", boss: true }),
  monster({ id: "boss_50", name: "失明之王·阿尔德", sprite: 110, tint: 0xf4d27a, hp: 2200, attack: 240, defense: 128, gold: 999, exp: 999, trait: "mirror", boss: true }),
].map((entry) => [entry.id, entry]));

export const TRIALS: Record<string, TrialDef> = {
  sealedChest: { id: "sealedChest", name: "古簧秘匣", sprite: 89, tint: 0xe6b56e, description: "拆开秘匣会触发固定强度的簧片机关；洞察越高，承受的生命代价越低。", successText: "锁舌发出清脆回响，秘匣开启。" },
  memoryAltar: { id: "memoryAltar", name: "回忆祭坛", sprite: 56, tint: 0xc3a6ff, description: "读取祭坛需要承受记忆冲击；代价会在确认前完整显示。", successText: "尘封的记忆重新回到手中。" },
  moonWell: { id: "moonWell", name: "月相古井", sprite: 32, tint: 0x9de7f1, description: "井中的祝福有明确代价；洞察足够高时可以安全取得。", successText: "清凉的月水修复了伤口。" },
};

export const NPCS: Record<string, NpcDef> = {
  elder: { id: "elder", name: "守塔老人", sprite: 100, lines: ["这座塔里的胜负早在接敌前就能算清。", "看一眼预计战损，再决定先拿钥匙、晶石，还是绕去商店。"], gift: { itemId: "smallPotion", amount: 1 } },
  smith: { id: "smith", name: "哑火铁匠", sprite: 86, lines: ["破不了防，挥一千剑也没有用。", "我把一截斧柄留在前面的支路里。找到它，你的攻击会真正变强。"], gift: { itemId: "ruby", amount: 1 } },
  cartographer: { id: "cartographer", name: "失途绘师", sprite: 88, lines: ["我画不出移动的东西，但能画出你走过的楼层。", "打开塔图，就能回到任何已经踏足的楼层。"], gift: { itemId: "blueKey", amount: 1 } },
  healer: { id: "healer", name: "月井医师", sprite: 99, lines: ["生命不是拿来硬撞每一堵墙的。", "换一条路线，多一颗蓝晶，可能比一瓶药更省血。"], gift: { itemId: "largePotion", amount: 1 } },
  prisoner: { id: "prisoner", name: "无名囚徒", sprite: 98, lines: ["王把所有人的名字藏进了第五十层。", "最后的门不考运气，只考你一路留下了多少力量。"], gift: { itemId: "redKey", amount: 1 } },
  princess: { id: "princess", name: "执灯公主", sprite: 99, lines: ["我不需要被营救。我需要有人替我把王座上的名字击碎。", "去吧。真正的答案，是你为最终一战保留下来的每一点生命。"], gift: { itemId: "insight", amount: 2 } },
};

export const MONSTER_POOLS: string[][] = [
  ["moss_slime", "tunnel_goblin", "cave_boar"],
  ["bone_scout", "ash_imp", "crypt_wraith"],
  ["copper_guard", "gear_scorpion", "furnace_worm"],
  ["tide_hunter", "drowned_knight", "salt_wolf"],
  ["ember_duelist", "blood_imp", "iron_maw"],
  ["paper_wraith", "moon_scholar", "ink_spider"],
  ["gale_ranger", "court_guard", "storm_wolf"],
  ["moon_assassin", "altar_demon", "blind_hound"],
  ["astral_guard", "void_wraith", "crown_scorpion"],
  ["throne_knight", "crown_mimic", "nameless_king"],
];

export const BOSS_BY_FLOOR: Record<number, string> = {
  5: "seal_5",
  10: "boss_10",
  15: "seal_15",
  20: "boss_20",
  25: "seal_25",
  30: "boss_30",
  35: "seal_35",
  40: "boss_40",
  45: "seal_45",
  50: "boss_50",
};
