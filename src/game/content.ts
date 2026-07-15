import type { AbilityDef, ItemDef, MonsterDef, NpcDef, ThemeDef, TrialDef } from "./types";

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
  sword: { id: "sword", name: "旧誓长剑", shortName: "长剑", sprite: 104, shape: "circle", radius: 37, power: 1, armorPen: 0, focusCost: 0, combat: true, description: "均衡的小圆斩。范围直观，弱点命中稳定。" },
  spear: { id: "spear", name: "穿影长枪", shortName: "长枪", sprite: 106, shape: "line", length: 178, width: 26, power: 1.2, armorPen: 0.12, focusCost: 0, combat: true, description: "狭长刺击。适合预判冲刺与直线移动。" },
  axe: { id: "axe", name: "回声战斧", shortName: "战斧", sprite: 118, shape: "arc", radius: 92, angle: 1.8, power: 1.34, armorPen: 0.18, focusCost: 0, combat: true, description: "扇形横扫。范围宽，但中心弱点更难对准。" },
  hammer: { id: "hammer", name: "沉星战锤", shortName: "战锤", sprite: 117, shape: "circle", radius: 68, power: 0.86, armorPen: 0.5, focusCost: 0, combat: true, description: "大圆重击。伤害较低，却能压过厚甲。" },
  flame: { id: "flame", name: "烬火咒印", shortName: "咒印", sprite: 129, shape: "ring", radius: 92, width: 28, power: 1.55, armorPen: 0.25, focusCost: 1, combat: true, description: "环形术式。消耗专注，命中环带时爆发极高。" },
  lockpick: { id: "lockpick", name: "听簧针", shortName: "听簧", sprite: 131, shape: "line", length: 146, width: 15, power: 1, armorPen: 0, focusCost: 0, combat: false, description: "以极窄直线寻找锁芯。" },
  focusRing: { id: "focusRing", name: "共鸣环", shortName: "共鸣", sprite: 130, shape: "ring", radius: 76, width: 20, power: 1, armorPen: 0, focusCost: 0, combat: false, description: "让环带与符文边缘重合。" },
};

export const ITEMS: Record<string, ItemDef> = {
  yellowKey: { id: "yellowKey", name: "黄铜钥匙", sprite: 125, tint: 0xffd16a, description: "开启一扇黄门。" },
  blueKey: { id: "blueKey", name: "蔚蓝钥匙", sprite: 128, tint: 0x8dc8ff, description: "开启一扇蓝门。" },
  redKey: { id: "redKey", name: "猩红钥匙", sprite: 127, tint: 0xff7474, description: "开启一扇红门。" },
  smallPotion: { id: "smallPotion", name: "微光药剂", sprite: 113, description: "恢复 160 点生命。" },
  largePotion: { id: "largePotion", name: "高塔圣水", sprite: 116, description: "恢复 520 点生命。" },
  ruby: { id: "ruby", name: "力量红晶", sprite: 101, tint: 0xff6f62, description: "攻击永久 +3。" },
  sapphire: { id: "sapphire", name: "守护蓝晶", sprite: 102, tint: 0x77baff, description: "防御永久 +3。" },
  coinBag: { id: "coinBag", name: "旧王金币", sprite: 101, tint: 0xffd66b, description: "获得金币。" },
  insight: { id: "insight", name: "记忆尘晶", sprite: 56, tint: 0xc6a6ff, description: "洞察永久 +1，盲区中的目标运动略微放缓。" },
  axeRelic: { id: "axeRelic", name: "断柄战斧", sprite: 118, description: "解锁回声战斧。" },
  hammerRelic: { id: "hammerRelic", name: "沉星锤头", sprite: 117, description: "解锁沉星战锤。" },
  flameRelic: { id: "flameRelic", name: "烬火残页", sprite: 129, description: "解锁烬火咒印，并使专注上限 +1。" },
  bomb: { id: "bomb", name: "裂墙火药", sprite: 110, description: "在背包中使用，清除相邻的普通怪物。" },
  holyWater: { id: "holyWater", name: "回生圣水", sprite: 114, description: "在背包中使用，恢复 35% 最大生命。" },
};

const monster = (data: MonsterDef): MonsterDef => data;

export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries([
  monster({ id: "moss_slime", name: "苔衣史莱姆", sprite: 108, tint: 0x8be0a2, hp: 46, attack: 14, defense: 3, gold: 7, exp: 6, size: 78, speed: 0.35, motion: "drift", movementScale: 0.015, trait: "none", note: "体型大、几乎不动，是熟悉盲投距离的练习目标。" }),
  monster({ id: "tunnel_goblin", name: "穴居斥候", sprite: 109, tint: 0xd9c674, hp: 62, attack: 19, defense: 5, gold: 10, exp: 8, size: 50, speed: 0.62, motion: "hop", movementScale: 0.075, trait: "agile", note: "会在原地附近小幅跳跃，起跳节奏固定。" }),
  monster({ id: "cave_boar", name: "石鬃野猪", sprite: 120, tint: 0xc79c83, hp: 94, attack: 24, defense: 8, gold: 13, exp: 10, size: 88, speed: 0.55, motion: "dash", movementScale: 0.035, trait: "armored", note: "只做短距离蓄力前冲，体型很大且护甲较厚。" }),

  monster({ id: "bone_scout", name: "骨哨巡兵", sprite: 111, tint: 0xd9e0e8, hp: 108, attack: 31, defense: 11, gold: 17, exp: 13, size: 56, speed: 0.72, motion: "orbit", trait: "none", note: "绕着中心巡行，轨迹稳定。" }),
  monster({ id: "ash_imp", name: "灰烬小鬼", sprite: 110, tint: 0xff766a, hp: 92, attack: 36, defense: 9, gold: 19, exp: 15, size: 44, speed: 0.92, motion: "teleport", trait: "agile", note: "会在几个落点间闪烁，观察其轮换顺序。" }),
  monster({ id: "crypt_wraith", name: "墓灯怨魂", sprite: 121, tint: 0xa5d1ff, hp: 134, attack: 39, defense: 14, gold: 22, exp: 18, size: 68, speed: 0.74, motion: "feint", trait: "regen", note: "失手后会恢复少量生命。" }),

  monster({ id: "copper_guard", name: "赤铜守卫", sprite: 96, tint: 0xe1a66b, hp: 176, attack: 49, defense: 22, gold: 28, exp: 23, size: 84, speed: 0.46, motion: "dash", trait: "armored", note: "沉重而笔直，战锤对它更有效。" }),
  monster({ id: "gear_scorpion", name: "齿轮蝎", sprite: 122, tint: 0xe6a878, hp: 144, attack: 57, defense: 18, gold: 30, exp: 25, size: 58, speed: 0.96, motion: "spiral", trait: "thorns", note: "被击中时也会反弹少量伤害。" }),
  monster({ id: "furnace_worm", name: "炉膛钻虫", sprite: 123, tint: 0xff9d60, hp: 201, attack: 61, defense: 25, gold: 34, exp: 28, size: 72, speed: 0.78, motion: "hop", trait: "enraged", note: "生命降低后移动加快。" }),

  monster({ id: "tide_hunter", name: "潮牢猎手", sprite: 112, tint: 0x82d7dd, hp: 230, attack: 70, defense: 29, gold: 38, exp: 32, size: 57, speed: 0.9, motion: "orbit", trait: "agile", note: "沿椭圆轨迹游走，长枪容易截住它。" }),
  monster({ id: "drowned_knight", name: "溺亡骑士", sprite: 97, tint: 0x79b9ca, hp: 286, attack: 76, defense: 36, gold: 43, exp: 35, size: 86, speed: 0.5, motion: "drift", trait: "armored", note: "体型宽阔，防御很高。" }),
  monster({ id: "salt_wolf", name: "盐霜猎狼", sprite: 124, tint: 0xb4e3df, hp: 214, attack: 82, defense: 28, gold: 45, exp: 38, size: 61, speed: 1.08, motion: "feint", trait: "agile", note: "会假冲一次再折返。" }),

  monster({ id: "ember_duelist", name: "烬火剑士", sprite: 98, tint: 0xff9b6d, hp: 322, attack: 91, defense: 42, gold: 50, exp: 42, size: 66, speed: 0.86, motion: "dash", trait: "none", note: "冲刺前会短暂停顿。" }),
  monster({ id: "blood_imp", name: "燃血魔童", sprite: 110, tint: 0xff4c5e, hp: 270, attack: 99, defense: 35, gold: 54, exp: 45, size: 46, speed: 1.16, motion: "teleport", trait: "regen", note: "闪现频繁，失手时会吸取热量恢复。" }),
  monster({ id: "iron_maw", name: "铁颚兽", sprite: 120, tint: 0x8f9099, hp: 398, attack: 104, defense: 50, gold: 58, exp: 49, size: 98, speed: 0.68, motion: "dash", trait: "armored", note: "巨大且厚重，弱点在头部中心。" }),

  monster({ id: "paper_wraith", name: "噬字幽灵", sprite: 121, tint: 0xd3c5ff, hp: 372, attack: 113, defense: 51, gold: 63, exp: 53, size: 64, speed: 1.02, motion: "spiral", trait: "mirror", note: "承诺后偶尔反转移动方向。" }),
  monster({ id: "moon_scholar", name: "月蚀学士", sprite: 84, tint: 0xcdb7ff, hp: 430, attack: 121, defense: 58, gold: 67, exp: 56, size: 72, speed: 0.79, motion: "orbit", trait: "regen", note: "失手会让它重新凝聚护体文字。" }),
  monster({ id: "ink_spider", name: "墨痕毒蝎", sprite: 122, tint: 0x8b74b8, hp: 346, attack: 129, defense: 47, gold: 70, exp: 60, size: 54, speed: 1.28, motion: "hop", trait: "thorns", note: "小且敏捷，边缘命中会受到反噬。" }),

  monster({ id: "gale_ranger", name: "高庭风弩手", sprite: 112, tint: 0xc8e0d4, hp: 458, attack: 137, defense: 63, gold: 76, exp: 64, size: 58, speed: 1.2, motion: "feint", trait: "agile", note: "横移后突然回拉，先看完整周期。" }),
  monster({ id: "court_guard", name: "无主近卫", sprite: 96, tint: 0xbec8c3, hp: 560, attack: 145, defense: 78, gold: 82, exp: 68, size: 91, speed: 0.62, motion: "drift", trait: "armored", note: "极厚的护甲，需要穿甲武器。" }),
  monster({ id: "storm_wolf", name: "裂风银狼", sprite: 124, tint: 0xe7f0ef, hp: 436, attack: 154, defense: 61, gold: 86, exp: 72, size: 63, speed: 1.36, motion: "dash", trait: "enraged", note: "受伤后冲刺间隔缩短。" }),

  monster({ id: "moon_assassin", name: "血月刺客", sprite: 98, tint: 0xff8da0, hp: 590, attack: 162, defense: 80, gold: 92, exp: 77, size: 52, speed: 1.38, motion: "teleport", trait: "agile", note: "体型很小，闪现落点遵循五角次序。" }),
  monster({ id: "altar_demon", name: "祭坛赤魔", sprite: 110, tint: 0xff4f69, hp: 704, attack: 171, defense: 88, gold: 98, exp: 82, size: 92, speed: 0.94, motion: "spiral", trait: "thorns", note: "体型大，但命中也会触发血契反伤。" }),
  monster({ id: "blind_hound", name: "盲嗅猎犬", sprite: 124, tint: 0x92717e, hp: 612, attack: 181, defense: 75, gold: 103, exp: 86, size: 67, speed: 1.5, motion: "feint", trait: "mirror", note: "承诺瞬间可能改变方向。" }),

  monster({ id: "astral_guard", name: "星穹卫士", sprite: 97, tint: 0x9fc6ff, hp: 780, attack: 190, defense: 101, gold: 112, exp: 92, size: 88, speed: 0.72, motion: "orbit", trait: "armored", note: "星甲会削弱低穿甲攻击。" }),
  monster({ id: "void_wraith", name: "虚空残响", sprite: 121, tint: 0x85a5e8, hp: 690, attack: 201, defense: 89, gold: 118, exp: 98, size: 60, speed: 1.42, motion: "teleport", trait: "regen", note: "闪现且能在失手时重聚。" }),
  monster({ id: "crown_scorpion", name: "冠冕星蝎", sprite: 122, tint: 0xe4c6ff, hp: 744, attack: 212, defense: 94, gold: 124, exp: 104, size: 57, speed: 1.5, motion: "spiral", trait: "thorns", note: "高速螺旋，宽范围武器更稳妥。" }),

  monster({ id: "throne_knight", name: "王座黑骑", sprite: 96, tint: 0xd9bd77, hp: 920, attack: 224, defense: 116, gold: 135, exp: 112, size: 94, speed: 0.8, motion: "dash", trait: "armored", note: "防御极高，冲刺终点会停顿。" }),
  monster({ id: "crown_mimic", name: "伪冠吞噬者", sprite: 92, tint: 0xe0b55f, hp: 836, attack: 238, defense: 102, gold: 148, exp: 120, size: 74, speed: 1.22, motion: "hop", trait: "enraged", note: "受伤后跳跃幅度会变大。" }),
  monster({ id: "nameless_king", name: "无名王影", sprite: 110, tint: 0xe8c87a, hp: 1020, attack: 252, defense: 124, gold: 160, exp: 132, size: 106, speed: 1.08, motion: "feint", trait: "mirror", note: "会在承诺后反转一次轨迹。" }),

  monster({ id: "boss_10", name: "十层守门人·铁誓", sprite: 96, tint: 0xeab36f, hp: 460, attack: 64, defense: 28, gold: 80, exp: 70, size: 112, speed: 0.64, motion: "dash", trait: "armored", note: "庞大、厚甲、直冲。观察它三次冲刺后再下注。", boss: true }),
  monster({ id: "boss_20", name: "二十层主祭·溺月", sprite: 84, tint: 0x8de4ee, hp: 780, attack: 112, defense: 55, gold: 150, exp: 120, size: 88, speed: 1.02, motion: "orbit", trait: "regen", note: "环绕与回摆交替，失手会恢复生命。", boss: true }),
  monster({ id: "boss_30", name: "三十层刑官·焚脊", sprite: 110, tint: 0xff674f, hp: 1260, attack: 164, defense: 82, gold: 230, exp: 190, size: 118, speed: 1.18, motion: "hop", trait: "enraged", note: "受伤后越来越快，最好用高爆发攻击结束战斗。", boss: true }),
  monster({ id: "boss_40", name: "四十层镜卫·无面", sprite: 97, tint: 0xf3a4c3, hp: 1820, attack: 218, defense: 110, gold: 340, exp: 280, size: 94, speed: 1.32, motion: "feint", trait: "mirror", note: "在你承诺后反向移动，必须记住速度而非方向。", boss: true }),
  monster({ id: "boss_50", name: "失明之王·阿尔德", sprite: 110, tint: 0xf4d27a, hp: 2800, attack: 286, defense: 142, gold: 999, exp: 999, size: 126, speed: 1.46, motion: "teleport", trait: "mirror", note: "五个王座落点循环闪烁。最后一击必须命中核心。", boss: true }),
].map((entry) => [entry.id, entry]));

export const TRIALS: Record<string, TrialDef> = {
  sealedChest: { id: "sealedChest", name: "盲簧秘匣", sprite: 89, tint: 0xe6b56e, size: 58, speed: 0.62, motion: "hop", abilityId: "lockpick", description: "锁芯在匣面上周期滑动。用听簧针盲中锁芯。", successText: "锁舌发出清脆回响，秘匣开启。", failureText: "针尖擦过簧片，机关弹回原位。" },
  memoryAltar: { id: "memoryAltar", name: "回忆祭坛", sprite: 56, tint: 0xc3a6ff, size: 70, speed: 0.75, motion: "orbit", abilityId: "focusRing", description: "让共鸣环与旋转符文的边缘重合。", successText: "遗失的距离感重新回到手中。", failureText: "回声错位，祭坛暂时沉默。" },
  moonWell: { id: "moonWell", name: "月相古井", sprite: 32, tint: 0x9de7f1, size: 82, speed: 0.48, motion: "drift", abilityId: "focusRing", description: "水面核心缓慢漂移，套中它可获得祝福。", successText: "清凉的月水修复了伤口。", failureText: "涟漪散去，只剩井底的黑暗。" },
};

export const NPCS: Record<string, NpcDef> = {
  elder: { id: "elder", name: "守塔老人", sprite: 100, lines: ["这座塔不惩罚看得慢的人，只惩罚出手后反悔的人。", "先看清目标的节奏。拖出武器，越过誓线以后，眼睛、准星和退路都会消失。"], gift: { itemId: "smallPotion", amount: 1 } },
  smith: { id: "smith", name: "哑火铁匠", sprite: 86, lines: ["剑只告诉你形状，手才决定落点。", "我把一截斧柄留在前面的支路里。找到它，你会得到更宽的盲区。"], gift: { itemId: "ruby", amount: 1 } },
  cartographer: { id: "cartographer", name: "失途绘师", sprite: 88, lines: ["我画不出移动的东西，但能画出你走过的楼层。", "打开塔图，就能回到任何已经踏足的楼层。"], gift: { itemId: "blueKey", amount: 1 } },
  healer: { id: "healer", name: "月井医师", sprite: 99, lines: ["观察没有时限。疲惫来自决定，而不是等待。", "让伤口先停下来，再去面对更快的影子。"], gift: { itemId: "largePotion", amount: 1 } },
  prisoner: { id: "prisoner", name: "无名囚徒", sprite: 98, lines: ["王把所有人的名字藏进了第五十层。", "别相信他第一次出现的位置。那只是给眼睛看的。"], gift: { itemId: "redKey", amount: 1 } },
  princess: { id: "princess", name: "执灯公主", sprite: 99, lines: ["我不需要被营救。我需要有人替我把王座上的名字击碎。", "去吧。最后十层没有正确答案，只有你愿意承担的落点。"], gift: { itemId: "insight", amount: 2 } },
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
  10: "boss_10",
  20: "boss_20",
  30: "boss_30",
  40: "boss_40",
  50: "boss_50",
};
