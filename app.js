import { getPartOptions, renderCharacterSVG } from './assets/characters/luna/character.js';
import { wardrobeThumb } from './assets/characters/luna/wardrobe.js';
import { FIXED_WARDROBE_UNLOCK_SEQUENCE, OC_WARDROBE, getItemMeta, getUnlockedWardrobeItems } from './assets/characters/luna/wardrobe-data.js';
import { ACHIEVEMENT_DEFINITIONS, unlockAchievementIds } from './features/achievements.js';
import { createStorage } from './features/storage.js';
import { themeNeedsReview as isThemeReviewDue, recommendedThemeId as getRecommendedThemeId, dailyRouteThemeIds } from './features/map-route.js';
import { createBuiltInThemes } from './features/theme-catalog.js';
import { WORD_TRANSLATIONS, HANZI_SCENES, WORD_SENTENCES } from './features/content-catalog.js';
import { DEFAULT_LEARNING_CONTENT } from './features/default-content.js';
import { LEARNING_IMAGES } from './features/learning-images.js';
import { buildDirectoryTree, contentFromEntries, directoryNode, normaliseContentWords, normaliseRecitalLines, repairTruncatedName } from './features/content-files.js';
import { mergeSyncedContent, restoreOfficialContent } from './features/content-sync.js';
import { REMOTE_CONTENT_STORAGE_KEY, syncRemoteContent } from './features/content-channel.js';
import { ARCADE_GAMES, ARCADE_HANZI_PICTURE_ITEMS, createColorRound, createFruitWave, createLightsBoard, createListeningRound, createMemoryDeck, createNumberRound, nextArcadeLane, nextRhythmColor, ARCADE_BOARD_SIZE } from './features/arcade-games.js';
import { BUILD_INFO } from './features/build-info.js';
import { clamp, chineseNumber, escapeHtml } from './features/utils.js';
import { applyTtsReading } from './features/tts-reading.js';
import { bindContentBrowser, browserMarkup, browserScopePath, countTreeItems } from './features/content-browser.js';
import { englishLearnCardMarkup, hanziLearnCardMarkup, hanziSceneMarkup, lessonGroupPathLabel, lessonPrimaryActionsMarkup, miscLearnCardMarkup, recitalLearnCardMarkup } from './features/lesson-cards.js';
import { getMiscVisual } from './features/misc-visuals.js';
import { bindNumberBoard, numberBoardCardMarkup, numberQuizCardMarkup, numberStageCardMarkup } from './features/number-tower.js';
import { playSfx } from './features/audio-sfx.js';
import { triggerConfetti } from './features/confetti.js';
import { DEFAULT_HANZI_CHARS } from './vendor/hanzi-writer/default-chars.js';
import { getStrokeName } from './vendor/hanzi-writer/stroke-names.js';

const CHILD_NAME = '荆宝';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function triggerHaptic(duration = 15) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(duration);
    }
  } catch {}
}
const { getText: storageGet, load, save, saveText } = createStorage(() => showToast?.('这台设备暂时无法保存学习记录。'));
let globalSpeechRate = clamp(Number(storageGet('luna-global-speech-rate') || 1), .5, 1.5);
// 中文 TTS 的实际语速系数（speakChinese 使用）。
const CHINESE_TTS_RATE_SCALE = .82;

const MAP_META = {
  color: { name: '彩虹花园', hint: '找一找会发光的颜色', icon: 'flower' },
  animal: { name: '小小游戏机', hint: '翻翻卡片，听音找图', icon: 'paw' },
  action: { name: '朗诵小舞台', hint: '听一听，把文本读出来', icon: 'spark' },
  number: { name: '数字高塔', hint: '数一数城堡星星', icon: 'tower' },
  hanzi: { name: '汉字图书塔', hint: '打开会说话的文字', icon: 'book' },
  english: { name: '单词森林', hint: '收集新的英文叶片', icon: 'leaf' },
};

let THEMES = createBuiltInThemes();
// 主题名统一以 MAP_META 为准（地图、顶栏、完成页用同一个名字）
Object.entries(MAP_META).forEach(([id, meta]) => { if (THEMES[id]) THEMES[id].title = meta.name; });

const ADMIN_DEFAULT = DEFAULT_LEARNING_CONTENT;
const ADMIN_CONTENT_STORAGE_KEY = 'luna-admin-content-v4';
const adminContent = load(ADMIN_CONTENT_STORAGE_KEY, JSON.parse(JSON.stringify(ADMIN_DEFAULT)));
if (!adminContent.misc) {
  adminContent.misc = JSON.parse(JSON.stringify(ADMIN_DEFAULT.misc || { activeGroupId: 'shapes', deletedGroupIds: [], groups: [] }));
}
// 官方内容分三层：内置（打进 APK）⊂ 远程官方快照（同步下来的）⊂ 本机生效层（家长改的）。
let remoteContentSnapshot = load(REMOTE_CONTENT_STORAGE_KEY, null);
// 官方内容 = 已同步的快照 与 内置内容 中更新的那份。
// 快照可能来自旧的内容分发站（甚至旧 App），若内置内容已经包含快照的全部分组，说明内置更新，用它。
function officialContent() {
  const remote = remoteContentSnapshot?.entries?.length ? contentFromEntries(remoteContentSnapshot.entries) : null;
  if (!remote) return ADMIN_DEFAULT;
  const groupIds = (content) => Object.values(content).filter((kind) => kind?.groups).flatMap((kind) => kind.groups.map((group) => group.id));
  const builtIds = new Set(groupIds(ADMIN_DEFAULT));
  const remoteIds = groupIds(remote);
  const builtInIsNewer = remoteIds.every((id) => builtIds.has(id));
  return builtInIsNewer ? ADMIN_DEFAULT : remote;
}
function subjectConfig(kind) {
  if (!adminContent[kind]) {
    adminContent[kind] = JSON.parse(JSON.stringify(ADMIN_DEFAULT[kind] || { groups: [], deletedGroupIds: [], activeGroupId: '' }));
  }
  return adminContent[kind];
}
const editingContentGroupIds = { english: null, hanzi: null, misc: null };
function contentGroups(kind) {
  const subject = subjectConfig(kind);
  if (!Array.isArray(subject.deletedGroupIds)) subject.deletedGroupIds = [];
  const official = officialContent()[kind] || {};
  const officialGroups = Array.isArray(official.groups) ? official.groups : [];
  // 读路径要保留分组上的完整字段（notes / directory 等），并按 id 从官方层回填缺失项。
  const existing = Array.isArray(subject.groups) ? subject.groups
    .map((group, index) => {
      const match = officialGroups.find((item) => item.id === String(group?.id));
      return {
        ...group,
        id: String(group?.id || `${kind}-${index + 1}`),
        name: repairTruncatedName(typeof group?.name === 'string' ? group.name.trim().slice(0, 24) : '', match?.name),
        image: typeof group?.image === 'boolean' ? group.image : Boolean(match?.image),
        directory: match?.directory ?? (typeof group?.directory === 'string' ? group.directory : ''),
        notes: group?.notes && typeof group.notes === 'object' ? group.notes : (match?.notes ?? {}),
        words: normaliseContentWords(kind, group?.words)
      };
    })
    .filter((group) => !subject.deletedGroupIds.includes(group.id)) : [];
  officialGroups.forEach((officialGroup) => {
    if (subject.deletedGroupIds.includes(officialGroup.id)) return;
    const found = existing.find((group) => group.id === officialGroup.id);
    if (!found) {
      existing.push({
        id: String(officialGroup.id),
        name: typeof officialGroup.name === 'string' ? officialGroup.name.trim().slice(0, 24) : '',
        image: Boolean(officialGroup.image),
        directory: officialGroup.directory ?? '',
        notes: officialGroup.notes ?? {},
        words: normaliseContentWords(kind, officialGroup.words)
      });
    }
  });
  if (existing.length) { subject.groups = existing; return existing; }
  const initial = { id: `${kind}-basics`, name: kind === 'hanzi' ? '汉字启蒙' : '基础单词', image: false, directory: '', notes: {}, words: [] };
  subject.groups = [initial]; subject.activeGroupId = initial.id;
  return subject.groups;
}
function activeContentGroup(kind) {
  const subject = subjectConfig(kind); const groups = contentGroups(kind);
  const valid = (group) => group.name && group.words.length >= 2;
  const active = groups.find((group) => group.id === subject.activeGroupId && valid(group)) || groups.find(valid) || groups[0];
  subject.activeGroupId = active.id;
  return active;
}
function setActiveContentGroup(kind, groupId) { subjectConfig(kind).activeGroupId = groupId; }
function editingContentGroup(kind) {
  const groups = contentGroups(kind); const editing = groups.find((group) => group.id === editingContentGroupIds[kind]);
  return editing || activeContentGroup(kind);
}
function saveContentConfiguration() { save(ADMIN_CONTENT_STORAGE_KEY, adminContent); }
function recitalGroups() {
  const subject = subjectConfig('recital');
  if (!Array.isArray(subject.deletedGroupIds)) subject.deletedGroupIds = [];
  const official = officialContent().recital || {};
  const officialGroups = Array.isArray(official.groups) ? official.groups : [];
  // 旧版本曾把长篇文本截断过：只有当本机文本正好是官方文本的前缀时，才当作"被截断"修复回官方版本。
  const repairLines = (localLines, officialLines) => {
    if (!Array.isArray(officialLines) || officialLines.length <= (localLines?.length || 0)) return localLines;
    const prefix = officialLines.slice(0, localLines.length);
    return prefix.every((line, index) => line === localLines[index]) ? officialLines : localLines;
  };
  const groups = Array.isArray(subject.groups) ? subject.groups
    .map((group, index) => {
      const match = officialGroups.find((item) => item.id === String(group?.id));
      return {
        ...group,
        id: String(group?.id || `recital-${index + 1}`),
        name: repairTruncatedName(String(group?.name || '').trim().slice(0, 24), match?.name) || `朗诵第 ${index + 1} 组`,
        directory: match?.directory ?? (typeof group?.directory === 'string' ? group.directory : ''),
        notes: group?.notes && typeof group.notes === 'object' ? group.notes : (match?.notes ?? {}),
        lines: normaliseRecitalLines(repairLines(group?.lines, match?.lines))
      };
    })
    .filter((group) => group.name && !subject.deletedGroupIds.includes(group.id)) : [];
  officialGroups.forEach((officialGroup) => {
    if (subject.deletedGroupIds.includes(officialGroup.id)) return;
    const found = groups.find((group) => group.id === officialGroup.id);
    if (!found) {
      groups.push({
        id: String(officialGroup.id),
        name: String(officialGroup.name || '').trim().slice(0, 24),
        directory: officialGroup.directory ?? '',
        notes: officialGroup.notes ?? {},
        lines: normaliseRecitalLines(officialGroup.lines)
      });
    }
  });
  if (groups.length) { subject.groups = groups; return groups; }
  const defaults = officialGroups
    .filter((group) => !subject.deletedGroupIds.includes(group.id))
    .map((group) => ({ ...group, lines: normaliseRecitalLines(group.lines) }));
  if (defaults.length) {
    subject.groups = defaults;
    subject.activeGroupId = defaults[0].id;
    return subject.groups;
  }
  const initial = { id: 'recital-basics', name: '朗诵启蒙', directory: '', notes: {}, lines: ['魔法城堡充满欢声笑语。'] };
  subject.groups = [initial];
  subject.activeGroupId = initial.id;
  return subject.groups;
}
function activeRecitalGroup() { const subject = subjectConfig('recital'); const groups = recitalGroups(); const active = groups.find((group) => group.id === subject.activeGroupId) || groups[0]; subject.activeGroupId = active.id; return active; }
function setActiveRecitalGroup(groupId) { subjectConfig('recital').activeGroupId = groupId; }
function buildRecitalTheme() {
  const group = activeRecitalGroup(); const rounds = group.lines.map((text, index) => ({ type: 'recite', chip: '逐行朗诵', word: `${group.id}-${index + 1}`, title: group.name, lineLabel: `第 ${index + 1} 句`, text, zh: '先听一听，再清楚地朗读这一句。' }));
  const reviewRounds = group.lines.map((text, index) => ({ type: 'recite', chip: '逐行回顾', word: `${group.id}-${index + 1}`, title: group.name, lineLabel: `第 ${index + 1} 句`, text, zh: '再读一次，注意语速和停顿。' }));
  return { id: 'action', title: '朗诵小舞台', subtitle: group.name, words: rounds.map((round) => round.word), rewards: ['hat_cap', 'top_sport', 'bottom_shorts', 'shoes_sport', 'held_balloon'], rounds, reviewRounds };
}
function textCard(text, fill = '#f1e8ff') { return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"><rect width="240" height="180" rx="28" fill="${fill}"/><text x="120" y="108" text-anchor="middle" font-family="sans-serif" font-size="${text.length > 5 ? 42 : 72}" font-weight="800" fill="#6744a5">${text}</text></svg>`)}`; }
function hanziWordImageUrl(word) {
  if (!word || !(LEARNING_IMAGES.hanzi || []).includes(word)) return '';
  return `assets/learning/hanzi/${encodeURIComponent(word)}.svg`;
}
function englishWordImageUrl(word) {
  if (!word || !(LEARNING_IMAGES.english || []).includes(word)) return '';
  return `assets/learning/vocabulary/${encodeURIComponent(word)}.svg`;
}
let hanziImageHintVisible = storageGet('luna-hanzi-image-hint-visible') === 'true';
// 英文分组也支持"看图识字"开关，状态与汉字分开存
let englishImageHintVisible = storageGet('luna-english-image-hint-visible') === 'true';
function toggleHanziImageHint() {
  hanziImageHintVisible = !hanziImageHintVisible;
  saveText('luna-hanzi-image-hint-visible', String(hanziImageHintVisible));
  renderRound();
  if ($('#hanziGroupModal')?.classList.contains('open')) {
    renderHanziGroupModal();
  }
  showToast(hanziImageHintVisible ? '已开启看图识字 🖼️' : '已关闭看图识字');
}
function toggleEnglishImageHint() {
  englishImageHintVisible = !englishImageHintVisible;
  saveText('luna-english-image-hint-visible', String(englishImageHintVisible));
  applyAdminContent();
  renderRound();
  if ($('#hanziGroupModal')?.classList.contains('open')) {
    renderHanziGroupModal();
  }
  showToast(englishImageHintVisible ? '已开启看图识字 🖼️' : '已关闭看图识字');
}
function buildCustomTheme(id, title, subtitle, words, isHanzi = false, hasImage = false) {
  const fallback = isHanzi ? ['人', '大人', '人口'] : ['red', 'yellow', 'blue'];
  const list = words.length >= 2 ? words : fallback;
  const imageFor = (word) => {
    if (isHanzi) return hasImage ? (hanziWordImageUrl(word) || textCard(word, '#fff0dc')) : textCard(word, '#fff0dc');
    // 英文分组开了 image 就有插图（与汉字一致），是否显示由"看图识字"开关决定
    if (hasImage) return englishWordImageUrl(word) || textCard(word);
    return textCard(word);
  };
  const rounds = list.map((word) => ({ type: 'learn', chip: isHanzi ? (word.length > 1 ? '认识词组' : '认识汉字') : '认识单词', word, image: imageFor(word), zh: isHanzi ? `看一看，读一读“${word}”。` : `看一看，这是 ${word}。` }));
  const reviewRounds = list.map((word, index) => { const other = list[(index + 1) % list.length]; return { type: index % 2 ? 'listen' : 'match', chip: index % 2 ? '听音找一找' : '魔法复习', prompt: isHanzi ? `Find ${word}` : 'Which word matches?', word, image: imageFor(word), zh: isHanzi ? '听一听，找到对应的汉字或词组。' : '看图片，选出对应的英文单词。', choices: [word, other], correct: word }; });
  return { id, title, subtitle, words: list, rewards: ['hat_wizard', 'gl_star', 'held_book'], rounds, reviewRounds };
}
function buildMiscTheme(group) {
  const fallback = ['三角形', '正方形', '长方形', '圆形', '半圆形', '梯形'];
  const list = (group?.words && group.words.length >= 2) ? group.words : fallback;
  const name = group?.name || '基础形状';
  const rounds = list.map((word) => ({
    type: 'learn',
    chip: '综合认知',
    word,
    image: '',
    zh: `看一看，认一认“${word}”。`,
  }));
  const reviewRounds = list.map((word, index) => {
    const other = list[(index + 1) % list.length];
    return {
      type: 'listen',
      chip: '听音认一认',
      prompt: `Find ${word}`,
      word,
      image: '',
      zh: `听一听，哪个是“${word}”？`,
      choices: [word, other],
      correct: word,
    };
  });
  return { id: 'color', title: MAP_META.color.name, subtitle: name, words: list, rewards: ['hat_wizard', 'gl_star', 'held_wand'], rounds, reviewRounds };
}
function applyAdminContent() {
  const english = activeContentGroup('english'); const hanzi = activeContentGroup('hanzi');
  const misc = activeContentGroup('misc');
  THEMES.english = buildCustomTheme('english', MAP_META.english.name, english.name, english.words, false, Boolean(english.image));
  THEMES.hanzi = buildCustomTheme('hanzi', MAP_META.hanzi.name, hanzi.name, hanzi.words, true, Boolean(hanzi.image));
  THEMES.color = buildMiscTheme(misc);
  THEMES.action = buildRecitalTheme();
}


function wordImage(word) {
  return Object.values(THEMES).flatMap((theme) => theme.rounds).find((round) => round.word === word)?.image || '';
}
// 词义：内置词表优先，其次用学习内容里写在竖线后的注释（如 red|红色）。
function wordMeaning(word) {
  const translation = WORD_TRANSLATIONS[word];
  if (translation) return translation;
  for (const kind of ['english', 'hanzi', 'misc']) {
    for (const group of contentGroups(kind)) {
      const note = group.notes?.[word];
      if (note) return note;
    }
  }
  return word;
}
function mapIcon(type) {
  const paths = {
    flower: '<path d="M12 8.2C9 3.4 3.7 5.1 5.3 9.7c-4.7.4-4.7 6.1 0 6.5C3.7 20.9 9 22.6 12 17.8c3 4.8 8.3 3.1 6.7-1.6 4.7-.4 4.7-6.1 0-6.5C20.3 5.1 15 3.4 12 8.2Z"/><circle cx="12" cy="13" r="2.3"/>',
    paw: '<circle cx="7.2" cy="7.8" r="1.8"/><circle cx="12" cy="5.8" r="1.8"/><circle cx="16.8" cy="7.8" r="1.8"/><path d="M12 20c-3.5 0-6-2.1-6-4.7 0-2.2 2.2-4 4.2-3.1.7.3 1.2.3 1.8 0 2-.9 4.2.9 4.2 3.1C18 17.9 15.5 20 12 20Z"/>',
    spark: '<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z"/>',
    tower: '<path d="M5 21h14M7 21V9l5-5 5 5v12M4 9h3M17 9h3M10 21v-5h4v5M10 11h4"/>',
    book: '<path d="M4.5 5.5A3.5 3.5 0 0 1 8 2h4v18H8a3.5 3.5 0 0 0-3.5 3V5.5ZM19.5 5.5A3.5 3.5 0 0 0 16 2h-4v18h4a3.5 3.5 0 0 1 3.5 3V5.5Z"/>',
    leaf: '<path d="M20 4C10 4 5 8.5 5 15c0 2.8 1.8 5 4.6 5C16 20 20 11.7 20 4Z"/><path d="M5 20c2.7-4.8 6.4-8 11-10"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[type] || paths.spark}</svg>`;
}
applyAdminContent();

const OC_CATEGORY_META = [
  { id: 'hair', label: '发型', slot: null }, { id: 'hat', label: '帽子', slot: 'hat' },
  { id: 'glasses', label: '眼镜', slot: 'glasses' }, { id: 'top', label: '上衣', slot: 'top' },
  { id: 'bottom', label: '下装', slot: 'bottom' }, { id: 'shoes', label: '鞋子', slot: 'shoes' },
  { id: 'held', label: '手持', slot: 'held' }, { id: 'back', label: '背饰', slot: 'back' },
  { id: 'earring', label: '耳饰', slot: 'earring' },
];
const OC_PART_OPTIONS = getPartOptions();
function wardrobeIcon(category) {
  const paths = {
    hair: '<path d="M5 11c0-5 3-8 7-8s7 3 7 8v5H5z"/><path d="M7 11c1 2 2 3 2 6m6-6c-1 2-2 3-2 6"/>',
    hat: '<path d="M7 11V8a5 5 0 0 1 10 0v3"/><path d="M4 12h16l-2 4H6z"/>',
    glasses: '<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><path d="M12 12h0M4 10l-2-1m18 1 2-1"/>',
    top: '<path d="m8 5 4 3 4-3 4 4-3 3v7H7v-7L4 9z"/>',
    bottom: '<path d="M7 4h10l-1 15h-3l-1-7-1 7H8z"/>',
    shoes: '<path d="M5 15h7l2-4 3 4c2 0 3 1 3 3H5z"/>',
    held: '<path d="M12 21V9"/><path d="m12 12-4-4m4 1 4-4"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="5" r="2"/>',
    back: '<path d="M12 20V8"/><path d="M11 11C7 5 3 7 5 12c1 3 4 4 6 4M13 11c4-6 8-4 6 1-1 3-4 4-6 4"/>',
    earring: '<path d="M12 4v5"/><circle cx="12" cy="15" r="4"/><circle cx="12" cy="4" r="1"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[category] || paths.hat}</svg>`;
}
const starterAvatar = { skin: 0, hair: 3, hairColor: 3, eyes: 0, eyeColor: 2, mouth: 0, showBlush: true, outfit: { hat: '', glasses: '', top: '', bottom: '', shoes: '', held: '', back: '', earring: '' } };
const cloneStarterAvatar = () => JSON.parse(JSON.stringify(starterAvatar));

function freshDaily() { return { round: false, theme: false, dress: false, claimed: false }; }
function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function createProfile(name = CHILD_NAME) {
  return {
    id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || CHILD_NAME,
    createdAt: new Date().toISOString(),
    activeTheme: 'color',
    completedThemes: [],
    learnedWords: [],
    wordProgress: {},
    stars: 0,
    dailyDate: localDateKey(),
    daily: freshDaily(),
    streak: { count: 0, lastCompletedDate: '' },
    recordingEnabled: false,
    activityDates: [],
    arcadeStats: { totalPlays: 0, bestRhythm: 0, bestMatch: 0, bestArrows: 0, bestFruit: 0, bestWhack: 0, bestCatch: 0, dailyPlays: {} },
    world: {}, achievements: [], study: { date: localDateKey(), seconds: 0, gameSeconds: 0, limitMinutes: 30, backupAt: '' },
    ocOwned: [],
    ocAvatar: cloneStarterAvatar(),
  };
}
function migrateLegacyProfile() {
  const profile = createProfile(CHILD_NAME);
  const legacyDate = storageGet('luna-daily-date');
  profile.activeTheme = storageGet('luna-active-theme') || profile.activeTheme;
  profile.completedThemes = load('luna-completed-themes', []);
  profile.stars = Number(storageGet('luna-stars') || 0);
  profile.dailyDate = legacyDate || localDateKey();
  profile.daily = legacyDate === localDateKey() ? load('luna-daily-tasks', freshDaily()) : freshDaily();
  profile.ocOwned = load('luna-oc-owned', profile.ocOwned);
  profile.ocAvatar = load('luna-oc-avatar', profile.ocAvatar);
  return profile;
}
let profiles = load('luna-profiles-v1', []);
if (!Array.isArray(profiles) || !profiles.length) profiles = [migrateLegacyProfile()];
let activeProfileId = storageGet('luna-active-profile-id') || profiles[0].id;
if (!profiles.some((profile) => profile.id === activeProfileId)) activeProfileId = profiles[0].id;
let todayKey = localDateKey();
function activeProfile() { return profiles.find((profile) => profile.id === activeProfileId) || profiles[0]; }
function childName() { return activeProfile()?.name || CHILD_NAME; }
function dailyFor(profile) { return profile.dailyDate === todayKey ? profile.daily : freshDaily(); }
const initialProfile = activeProfile();
const state = {
  screen: 'home', homeContext: 'lesson', magicHouseTab: 'closet', arcadeGameId: '', arcadeState: null, soundOn: true, recitalMode: 'line', round: 0, completed: false, roundLocked: false,
  arcadeListenMode: initialProfile.arcadeListenMode === 'hanzi' ? 'hanzi' : 'picture',
  activeTheme: initialProfile.activeTheme || 'color', lessonMode: 'learn',
  completedThemes: initialProfile.completedThemes || [], learnedWords: initialProfile.learnedWords || [], wordProgress: initialProfile.wordProgress || {},
  stars: Number(initialProfile.stars || 0), daily: dailyFor(initialProfile),
  streak: initialProfile.streak || { count: 0, lastCompletedDate: '' },
  recordingEnabled: Boolean(initialProfile.recordingEnabled), activityDates: initialProfile.activityDates || [], arcadeStats: initialProfile.arcadeStats || { totalPlays: 0, bestRhythm: 0, dailyPlays: {} }, world: initialProfile.world || {}, achievements: initialProfile.achievements || [], study: initialProfile.study || { date: todayKey, seconds: 0, gameSeconds: 0, limitMinutes: 30, backupAt: '' },
  ocTab: 'hair', ocOwned: initialProfile.ocOwned || [],
  ocAvatar: initialProfile.ocAvatar || cloneStarterAvatar(),
};
function syncActiveProfile() {
  const profile = activeProfile();
  Object.assign(profile, {
    activeTheme: state.activeTheme, completedThemes: state.completedThemes, learnedWords: state.learnedWords, wordProgress: state.wordProgress,
    stars: state.stars, dailyDate: todayKey, daily: state.daily, streak: state.streak,
    recordingEnabled: state.recordingEnabled, activityDates: state.activityDates, arcadeStats: state.arcadeStats, arcadeListenMode: state.arcadeListenMode, world: state.world, achievements: state.achievements, study: state.study, ocOwned: state.ocOwned, ocAvatar: state.ocAvatar,
  });
}
function persistProgress() {
  syncActiveProfile();
  save('luna-profiles-v1', profiles);
  saveText('luna-active-profile-id', activeProfileId);
}
function saveOcAvatar() { persistProgress(); }
function currentTheme() {
  return THEMES[state.activeTheme] || THEMES.color;
}
function currentRounds() {
  const rounds = state.lessonMode === 'review' ? currentTheme().reviewRounds : currentTheme().rounds;
  return state.activeTheme === 'action' && state.recitalMode === 'whole' && rounds[0]?.type === 'recite' ? rounds.slice(0, 1) : rounds;
}
function switchProfile(id) {
  if (id === activeProfileId || !profiles.some((profile) => profile.id === id)) return;
  persistProgress();
  activeProfileId = id;
  const profile = activeProfile();
  state.activeTheme = profile.activeTheme || 'color';
  state.completedThemes = profile.completedThemes || [];
  state.learnedWords = profile.learnedWords || []; state.wordProgress = profile.wordProgress || {};
  state.stars = Number(profile.stars || 0);
  state.daily = dailyFor(profile);
  state.streak = profile.streak || { count: 0, lastCompletedDate: '' };
  state.recordingEnabled = Boolean(profile.recordingEnabled); state.activityDates = profile.activityDates || []; state.world = profile.world || {}; state.achievements = profile.achievements || []; state.study = profile.study || { date: todayKey, seconds: 0, gameSeconds: 0, limitMinutes: 30, backupAt: '' };
  state.ocOwned = profile.ocOwned || [];
  state.ocAvatar = profile.ocAvatar || cloneStarterAvatar();
  state.round = 0; state.completed = false; state.roundLocked = false;
  persistProgress(); renderHome(); renderWardrobe(); updateProgress(); renderParentProfileControls();
}


let learnCountdownTimer = null;
let preferredEnglishVoice = null;
let preferredChineseVoice = null;
let speechRun = 0;
function chooseEnglishVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((voice) => /^en(-|_)/i.test(voice.lang));
  const preferredNames = [
    /Ava/i, /Samantha/i, /Aria/i, /Jenny/i, /Zira/i, /Google US English/i,
    /Microsoft.*(Natural|Online)/i, /Karen/i, /Moira/i,
  ];
  preferredEnglishVoice = preferredNames.map((pattern) => english.find((voice) => pattern.test(voice.name))).find(Boolean)
    || english.find((voice) => /en-US/i.test(voice.lang) && voice.localService === false)
    || english.find((voice) => /en-US/i.test(voice.lang))
    || english[0]
    || null;
  return preferredEnglishVoice;
}
function chooseChineseVoice() {
  if (!('speechSynthesis' in window)) return null;
  const chinese = window.speechSynthesis.getVoices().filter((voice) => /^zh(-|_)/i.test(voice.lang));
  const preferredNames = [/Xiaoxiao/i, /Ting-Ting/i, /Mei-Jia/i, /Google.*普通话/i, /Microsoft.*Natural/i];
  preferredChineseVoice = preferredNames.map((pattern) => chinese.find((voice) => pattern.test(voice.name))).find(Boolean)
    || chinese.find((voice) => /zh-CN/i.test(voice.lang) && voice.localService === false)
    || chinese.find((voice) => /zh-CN/i.test(voice.lang))
    || chinese[0]
    || null;
  return preferredChineseVoice;
}
function nativeTextToSpeech() {
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.MagicTextToSpeech || window.Capacitor.registerPlugin?.('MagicTextToSpeech') || null;
}
const requestedTtsLanguageInstall = new Set();
function nativeTtsCall(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      // A stuck engine must not leave the lesson silent: drop it and use the fallback voice.
      try { nativeTextToSpeech()?.stop?.().catch(() => {}); } catch { /* engine already gone */ }
      reject({ code: 'NATIVE_TTS_TIMEOUT' });
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}
function promptMissingChineseVoice(plugin, lang, error) {
  const code = error?.code || '';
  const engineProblem = code === 'ENGINE_UNAVAILABLE' || code === 'NATIVE_TTS_TIMEOUT';
  const silent = code === 'NATIVE_TTS_SILENT';
  // Root cause seen in the field: when the *system* language is English, some OEM engines accept
  // a zh request but pick the default (English) voice and never say anything.
  const languageHint = '若手机系统语言是英文，部分机型无法朗读中文——请把系统语言切换为中文。';
  if (silent) {
    showToast(`${languageHint}也可在已打开的语音设置里重新下载“中文”语音。`, 5000);
  } else if (engineProblem) {
    showToast(`系统朗读引擎暂时不可用，汉字读不出声音。${languageHint}`, 4200);
  } else {
    showToast(`这台设备缺少中文语音包。${languageHint}请下载“中文（简体）”后再试。`, 5000);
  }
  if (requestedTtsLanguageInstall.has(lang)) return;
  requestedTtsLanguageInstall.add(lang);
  plugin?.openLanguageInstall?.().catch(() => {});
}
// 原生 TTS 的"开始发声"事件：插件在引擎真正开口时回调 utteranceStart，
// 用来把界面高亮对齐到声音；旧版本 APK 没有这个事件，靠超时兜底。
let pendingNativeTtsStart = null;
let nativeTtsStartBound = false;
const NATIVE_TTS_START_FALLBACK_MS = 700;
function bindNativeTtsStartListener() {
  if (nativeTtsStartBound) return;
  const plugin = nativeTextToSpeech();
  if (!plugin?.addListener) return;
  nativeTtsStartBound = true;
  plugin.addListener('utteranceStart', () => {
    const callback = pendingNativeTtsStart;
    pendingNativeTtsStart = null;
    callback?.();
  });
}
function speakWithNativeTts(text, options, onend, onUnavailable, onStart) {
  const plugin = nativeTextToSpeech();
  if (!plugin) return false;
  bindNativeTtsStartListener();
  const finish = () => onend?.();
  const fallback = () => onUnavailable?.() || finish();
  const languages = options.langCandidates || [options.lang];
  const baseOptions = { ...options }; delete baseOptions.langCandidates;
  // A successful call that returns far too fast means the engine accepted the utterance but
  // never actually voiced it (broken/missing voice data) — treat that as a failure, not success.
  const start = (lang) => {
    const startedAt = Date.now();
    if (onStart) {
      pendingNativeTtsStart = () => onStart();
      window.setTimeout(() => { const callback = pendingNativeTtsStart; pendingNativeTtsStart = null; callback?.(); }, NATIVE_TTS_START_FALLBACK_MS);
    }
    return nativeTtsCall(
      plugin.speak({ text, volume: 1, category: 'ambient', queueStrategy: 0, ...baseOptions, lang }),
      9000
    ).then(() => {
      if (Date.now() - startedAt < 400) return Promise.reject({ code: 'NATIVE_TTS_SILENT' });
    });
  };
  if (options.lang?.startsWith('zh')) {
    let lastError = null;
    const tryLanguage = (index) => {
      if (index >= languages.length) {
        promptMissingChineseVoice(plugin, options.lang, lastError);
        fallback(); return;
      }
      start(languages[index]).then(finish).catch((error) => { lastError = error; tryLanguage(index + 1); });
    };
    tryLanguage(0);
  } else start(options.lang).then(finish).catch(fallback);
  return true;
}
function stopNativeTts() { nativeTextToSpeech()?.stop?.().catch(() => {}); }
function speakWithBrowserTts(text, { lang, voice, rate, pitch }, onend, onStart) {
  if (!('speechSynthesis' in window)) { onend?.(); return false; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang; utterance.voice = voice || null; utterance.rate = rate; utterance.pitch = pitch; utterance.volume = 1;
  // onstart 才是"真的出声了"，用它来对齐界面高亮；个别环境不触发 onstart，用超时兜底。
  let started = false;
  let startFallback = 0;
  const markStarted = () => { if (started) return; started = true; window.clearTimeout(startFallback); onStart?.(); };
  if (onStart) startFallback = window.setTimeout(markStarted, 600);
  utterance.onstart = onStart ? markStarted : null;
  utterance.onend = onend; utterance.onerror = onend;
  window.speechSynthesis.speak(utterance);
  return true;
}
function speak(text, onend, onStart) {
  const run = ++speechRun;
  if (!state.soundOn) { onend?.(); return false; }
  const finish = () => { if (run === speechRun) onend?.(); };
  // 开始回调不做"是不是最新一次朗读"的判断：极短的文本可能在下一次朗读开始后才回调，
  // 过期与否交给调用方自己的状态判断（如当前是不是在读标题/第几句）。
  const started = () => { onStart?.(); };
  const rate = clamp(.84 * globalSpeechRate, .1, 10); const voice = preferredEnglishVoice || chooseEnglishVoice();
  const browserFallback = () => speakWithBrowserTts(text, { lang: voice?.lang || 'en-US', voice, rate, pitch: 1.05 }, finish, started);
  if (speakWithNativeTts(text, { lang: 'en-US', rate, pitch: 1.05 }, finish, browserFallback, started)) return true;
  return browserFallback();
}
function speakChinese(text, onend, onStart) {
  const run = ++speechRun;
  if (!state.soundOn) { onend?.(); return false; }
  const finish = () => { if (run === speechRun) onend?.(); };
  const started = () => { onStart?.(); };
  const rate = clamp(CHINESE_TTS_RATE_SCALE * globalSpeechRate, .1, 10); const voice = preferredChineseVoice || chooseChineseVoice();
  // 多音字：送给引擎的文本按读音表做同音字替换，屏幕上的原文不变
  const spoken = applyTtsReading(text);
  const browserFallback = () => speakWithBrowserTts(spoken, { lang: voice?.lang || 'zh-CN', voice, rate, pitch: 1.04 }, finish, started);
  if (speakWithNativeTts(spoken, { lang: 'zh-CN', langCandidates: ['zh-CN', 'cmn-CN', 'zh'], rate, pitch: 1.04 }, finish, browserFallback, started)) return true;
  return browserFallback();
}
chooseEnglishVoice();
chooseChineseVoice();
if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', () => { chooseEnglishVoice(); chooseChineseVoice(); });
let wardrobeMusic = null;
// 魔法屋背景音乐音量：原先为 .11，现降为原来的 1/5。
const WARDROBE_MUSIC_VOLUME = 0.022;
let wardrobeMusicBackgroundPaused = false;
function stopWardrobeMusic() {
  wardrobeMusicBackgroundPaused = false;
  if (!wardrobeMusic) return;
  const { audio } = wardrobeMusic; wardrobeMusic = null;
  const fade = window.setInterval(() => {
    audio.volume = Math.max(0, audio.volume - .007);
    if (audio.volume <= .005) {
      clearInterval(fade); audio.pause(); audio.currentTime = 0;
    }
  }, 35);
}
function startWardrobeMusic() {
  if (wardrobeMusic || !state.soundOn) return;
  const audio = new Audio('assets/audio/magic-house/background-loop.wav');
  audio.loop = true; audio.volume = WARDROBE_MUSIC_VOLUME;
  wardrobeMusic = { audio };
  wardrobeMusicBackgroundPaused = false;
  audio.play().catch(() => { wardrobeMusic = null; });
}
// The magic-house loop must never keep playing while the app is in the background
// (Android WebView keeps the HTMLAudioElement alive after the activity pauses).
function pauseWardrobeMusicInBackground() {
  if (!wardrobeMusic || wardrobeMusicBackgroundPaused) return;
  wardrobeMusicBackgroundPaused = true;
  wardrobeMusic.audio.pause();
}
function resumeWardrobeMusicFromBackground() {
  if (!wardrobeMusicBackgroundPaused) return;
  wardrobeMusicBackgroundPaused = false;
  if (!wardrobeMusic || !state.soundOn) return;
  wardrobeMusic.audio.play().catch(() => {});
}
function handleAppVisibility(hidden) {
  if (hidden) pauseWardrobeMusicInBackground();
  else resumeWardrobeMusicFromBackground();
}
document.addEventListener('visibilitychange', () => handleAppVisibility(document.hidden));
window.addEventListener('pagehide', () => pauseWardrobeMusicInBackground());
window.addEventListener('pageshow', () => handleAppVisibility(document.hidden));
try {
  window.Capacitor?.Plugins?.App?.addListener('appStateChange', ({ isActive }) => handleAppVisibility(!isActive))?.catch?.(() => {});
  window.Capacitor?.Plugins?.App?.addListener('pause', () => pauseWardrobeMusicInBackground())?.catch?.(() => {});
} catch { /* The App plugin is only present inside the native shell. */ }
function playSuccessChime() {
  if (!state.soundOn) return;
  playSfx('ding');
}
function showToast(text, duration = 2200) {
  const toast = $('#toast'); toast.textContent = text; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), duration);
}
function routeFor(name) { return name === 'lesson' ? `#lesson/${state.activeTheme}` : `#${name}`; }
function renderTopbarContext() {
  const crumb = $('#topbarLessonTitle');
  const isRoadmapContext = state.screen === 'roadmap';
  const isParentContext = state.screen === 'parent';
  const isClosetContext = state.screen === 'closet' || state.screen === 'home' && state.homeContext === 'closet';
  const isArcadeContext = state.screen === 'arcade' || state.screen === 'home' && state.homeContext === 'arcade';
  const label = isRoadmapContext ? '星光奇遇之路' : (isParentContext ? '家长控制中心' : (isArcadeContext ? '小小游戏机' : (isClosetContext ? '魔法屋' : currentTheme().title)));
  const arcadeGameOpen = state.screen === 'arcade' && Boolean(state.arcadeGameId);
  const isCurrentScreen = state.screen === 'parent' || state.screen === 'roadmap' || state.screen === 'lesson' || state.screen === 'closet' || state.screen === 'arcade' && !arcadeGameOpen;
  crumb.querySelector('b').textContent = label;
  crumb.disabled = isCurrentScreen;
  crumb.setAttribute('aria-label', arcadeGameOpen ? '返回小小游戏机大厅' : (isCurrentScreen ? `当前位置：${label}` : `继续${label}`));
}
function setScreen(name, { push = true } = {}) {
  closeHanziGroupModal();
  closeHanziWriter();
  if (name !== 'arcade') releaseFruitOrientation();
  refreshDailyBoundary();
  const previousScreen = state.screen;
  if (name === 'home' && previousScreen === 'closet') state.homeContext = 'closet';
  else if (name === 'home' && previousScreen === 'arcade') state.homeContext = 'arcade';
  else if (name === 'home' && previousScreen === 'lesson') state.homeContext = 'lesson';
  if (state.screen === 'lesson' && name !== 'lesson') finishLessonSession();
  if (state.screen === 'arcade' && name !== 'arcade') {
    clearArcadeAutoExit();
    if (arcadeTicker) { clearInterval(arcadeTicker); arcadeTicker = null; }
    finishArcadeSession();
  }
  if (name === 'lesson' && !canStartLesson()) { showToast('今天的探险时间已完成，明天再来吧！'); name = 'home'; }
  if (name === 'arcade' && !canAccessArcade()) { name = 'home'; }
  state.screen = name;
  if (push && location.hash !== routeFor(name)) history.pushState({ screen: name, theme: state.activeTheme }, '', routeFor(name));
  renderTopbarContext();
  $('.app-shell').classList.toggle('home-active', name === 'home');
  if (name === 'closet') startWardrobeMusic(); else stopWardrobeMusic();
  $$('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === `${name}Screen`));
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.screen === name));
  if (name === 'lesson') { lessonSessionStartedAt = Date.now(); renderRound(); }
  if (name === 'arcade') {
    arcadeSessionStartedAt = Date.now();
    if (arcadeTicker) clearInterval(arcadeTicker);
    arcadeTicker = window.setInterval(tickArcadeTime, 1000);
    renderArcade();
  }
  if (name === 'closet') { renderWardrobe(); setMagicHouseTab(state.magicHouseTab); }
  if (name === 'roadmap') renderRoadmap();
  if (name === 'parent') { renderParentProfileControls(); setParentTab(parentActiveTab || 'overview'); }
  $('#main').focus({ preventScroll: true });
}

function refreshDailyBoundary() { const next = localDateKey(); if (next !== todayKey) { todayKey = next; state.daily = dailyFor(activeProfile()); state.study = { ...state.study, date: next, seconds: 0, gameSeconds: 0 }; persistProgress(); renderHome(); updateProgress(); } }
function masteredWordCount() { return Object.values(state.wordProgress).filter((item) => item.mastered).length; }
function recordWordProgress(word, kind) { const key = `${state.activeTheme}:${word}`; const item = state.wordProgress[key] || { learn: 0, review: 0, mastered: false, dueDate: todayKey }; if (kind === 'learn') item.learn += 1; else item.review += 1; item.lastSeen = todayKey; item.mastered = item.learn >= 1 && item.review >= 2; item.dueDate = item.mastered ? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) : todayKey; state.wordProgress[key] = item; }
function refreshAchievements() { unlockAchievementIds(state, masteredWordCount()).forEach((id) => { if (!state.achievements.includes(id)) { state.achievements.push(id); const label = ACHIEVEMENT_DEFINITIONS.find((item) => item.id === id)?.label || '新徽章'; showToast(`获得徽章：${label}！`); } }); }
let lessonSessionStartedAt = null;
function studyTodaySeconds() {
  const base = state.study.date === todayKey ? (state.study.seconds || 0) : 0;
  const current = lessonSessionStartedAt ? Math.floor((Date.now() - lessonSessionStartedAt) / 1000) : 0;
  return base + current;
}
function markActivityToday() { state.activityDates = Array.from(new Set([...(state.activityDates || []), todayKey])).sort().slice(-90); }
function renderStudyCalendar() {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const activeDates = new Set(state.activityDates || []);
  const today = new Date();

  // 1. 家长中心完整周日历
  const parentCal = $('#studyCalendar');
  if (parentCal) {
    parentCal.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 6 + index);
      const key = localDateKey(date);
      const active = activeDates.has(key);
      return `<div class="${active ? 'active' : ''} ${key === todayKey ? 'today' : ''}"><i></i><span>${weekdays[date.getDay()]}</span></div>`;
    }).join('');
  }

  // 2. 首页星光宝石链 (Starlight Gem Chain)
  const homeCal = $('#homeStudyCalendar');
  const streakCount = (state.streak && state.streak.count) || 0;
  const streakBadge = $('#homeCalendarStreak');
  if (streakBadge) {
    streakBadge.innerHTML = streakCount > 0 ? `🔥 连续 <b>${streakCount}</b> 天` : '✨ 今日待点亮';
  }

  if (homeCal) {
    homeCal.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 6 + index);
      const key = localDateKey(date);
      const isToday = key === todayKey;
      const active = activeDates.has(key);
      const weekday = weekdays[date.getDay()];

      let gemClass = 'gem-missed';
      let gemIcon = '○';
      let title = `周${weekday}`;

      if (isToday) {
        if (active) {
          gemClass = 'gem-today-lit';
          gemIcon = '🌟';
          title = `今天（周${weekday}）已点亮`;
        } else {
          gemClass = 'gem-today-pending';
          gemIcon = '💎';
          title = `今天（周${weekday}）待点亮`;
        }
      } else if (active) {
        gemClass = 'gem-lit';
        gemIcon = '⭐';
        title = `周${weekday}已打卡`;
      }

      return `<span class="starlight-gem ${gemClass}" title="${title}" aria-label="${title}"><i class="gem-symbol">${gemIcon}</i><small class="gem-day">${weekday}</small></span>`;
    }).join('');
  }
}
function finishLessonSession() {
  if (!lessonSessionStartedAt) return;
  const elapsed = Math.floor((Date.now() - lessonSessionStartedAt) / 1000);
  if (state.study.date === todayKey) {
    state.study.seconds = (state.study.seconds || 0) + elapsed;
  }
  lessonSessionStartedAt = null;
  persistProgress();
}
function canStartLesson() {
  if (parentModeEnabled) return true;
  const limit = Number(state.study.limitMinutes || 0);
  return !limit || studyTodaySeconds() < limit * 60;
}
let arcadeSessionStartedAt = null;
let arcadeTicker = null;
let arcadeWarnedFiveMin = false;
let arcadeAutoExitTimer = null;

function clearArcadeAutoExit() {
  if (arcadeAutoExitTimer) {
    clearTimeout(arcadeAutoExitTimer);
    arcadeAutoExitTimer = null;
  }
}

function hasAnyArcadeCredit() {
  if (parentModeEnabled) return true;
  if (getUniversalCoins() > 0) return true;
  const specificDict = state.arcadeStats.specificCoins?.[todayKey] || {};
  return Object.values(specificDict).some(count => Number(count) > 0);
}

function gameTodaySeconds() {
  const base = state.study.date === todayKey ? (state.study.gameSeconds || 0) : 0;
  const current = arcadeSessionStartedAt ? Math.floor((Date.now() - arcadeSessionStartedAt) / 1000) : 0;
  return base + current;
}

function finishArcadeSession() {
  if (!arcadeSessionStartedAt) return;
  const elapsed = Math.floor((Date.now() - arcadeSessionStartedAt) / 1000);
  if (state.study.date === todayKey) {
    state.study.gameSeconds = (state.study.gameSeconds || 0) + elapsed;
  }
  arcadeSessionStartedAt = null;
  persistProgress();
}

function arcadeDailyPlays() { return Number(state.arcadeStats.dailyPlays?.[todayKey] || 0); }

// 魔法转盘与游戏币系统
const WHEEL_SECTORS = [
  { id: 'universal_1', name: '通用魔法币 ×1', label: '通用币', icon: '🪙', type: 'universal', count: 1, color: '#f59e0b' },
  { id: 'specific_fruit', name: '切切乐专属币 ×1', label: '切切乐', icon: '🍎', type: 'specific', gameId: 'fruit', count: 1, color: '#ef4444' },
  { id: 'specific_sheep', name: '羊了个羊专属币 ×1', label: '小绵羊', icon: '🐑', type: 'specific', gameId: 'sheep', count: 1, color: '#10b981' },
  { id: 'specific_rhythm', name: '星星节奏专属币 ×1', label: '节奏星', icon: '♫', type: 'specific', gameId: 'rhythm', count: 1, color: '#8b5cf6' },
  { id: 'universal_2', name: '幸运暴击！通用币 ×2', label: '双倍币', icon: '🪙🪙', type: 'universal', count: 2, color: '#ec4899' },
  { id: 'specific_whack', name: '打地鼠专属币 ×1', label: '打地鼠', icon: '●', type: 'specific', gameId: 'whack', count: 1, color: '#f97316' },
  { id: 'specific_memory', name: '翻翻乐专属币 ×1', label: '翻翻乐', icon: '✦', type: 'specific', gameId: 'memory', count: 1, color: '#06b6d4' },
  { id: 'stars_gift', name: '星光大礼包：星星 ×2', label: '魔法星', icon: '⭐⭐', type: 'stars', count: 2, color: '#eab308' },
];

function arcadeSpinsAvailable() {
  const granted = Number(state.arcadeStats.wheelSpinsGranted?.[todayKey] || 0);
  const used = Number(state.arcadeStats.wheelSpinsUsed?.[todayKey] || 0);
  return Math.max(0, granted - used);
}

function updateArcadeSpinsFromStudy() {
  const studySec = studyTodaySeconds();
  // 每学习 10 分钟 (600秒) 奖 1 次，每天上限 3 次
  const earnedTotal = Math.min(3, Math.floor(studySec / 600));
  const currentGranted = Number(state.arcadeStats.wheelSpinsGranted?.[todayKey] || 0);
  if (earnedTotal > currentGranted) {
    state.arcadeStats.wheelSpinsGranted = {
      ...(state.arcadeStats.wheelSpinsGranted || {}),
      [todayKey]: earnedTotal
    };
    persistProgress();
  }
}

function getUniversalCoins() {
  return Number(state.arcadeStats.universalCoins?.[todayKey] || 0);
}

function getSpecificCoins(gameId) {
  return Number(state.arcadeStats.specificCoins?.[todayKey]?.[gameId] || 0);
}

function isArcadeGamePlayable(gameId) {
  if (parentModeEnabled) return true;
  if (getUniversalCoins() > 0) return true;
  return getSpecificCoins(gameId) > 0;
}

function consumeArcadeGameCredit(gameId) {
  if (parentModeEnabled) return;
  const specific = getSpecificCoins(gameId);
  if (specific > 0) {
    state.arcadeStats.specificCoins = {
      ...(state.arcadeStats.specificCoins || {}),
      [todayKey]: {
        ...(state.arcadeStats.specificCoins?.[todayKey] || {}),
        [gameId]: specific - 1
      }
    };
  } else {
    const universal = getUniversalCoins();
    if (universal > 0) {
      state.arcadeStats.universalCoins = {
        ...(state.arcadeStats.universalCoins || {}),
        [todayKey]: universal - 1
      };
    }
  }
  persistProgress();
}

function canAccessArcade({ speak = true } = {}) {
  return true; // 小朋友可以随时自由进入小小游戏机大厅查看与互动
}

function tickArcadeTime() {
  // 小小游戏机游玩权限完全由游戏币与转盘驱动，不再按时间强制掐断退出大厅
}
function updateDailyStreak() {
  const previous = state.streak.lastCompletedDate;
  if (previous === todayKey) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  state.streak.count = previous === localDateKey(yesterday) ? state.streak.count + 1 : 1;
  state.streak.lastCompletedDate = todayKey;
}
function openDailyWrapUp() {
  $('#dailyWrapStreak').textContent = state.streak.count;
  $('#dailyWrapCopy').textContent = state.streak.count > 1 ? `已经连续学习 ${state.streak.count} 天，明天也来和露娜一起学英文吧。` : '今天的三个小目标都完成了，明天再见！';
  $('#dailyModal').classList.add('open'); $('#dailyModal').setAttribute('aria-hidden', 'false');
  setTimeout(() => $('#dailyWrapCloset').focus(), 200);
}
function closeDailyWrapUp() { $('#dailyModal').classList.remove('open'); $('#dailyModal').setAttribute('aria-hidden', 'true'); }
function setDailyTask(task) {
  if (state.daily[task]) return;
  state.daily[task] = true; markActivityToday();
  const finishedToday = state.daily.round && state.daily.theme && state.daily.dress && !state.daily.claimed;
  if (finishedToday) {
    state.daily.claimed = true;
    updateDailyStreak();
    state.stars += 3;
    state.ocOwned = Array.from(new Set([...state.ocOwned, 'hat_ribbon']));
    showToast('今日任务完成！获得蝴蝶结发箍和 3 颗星星！');
  } else {
    showToast('今日魔法任务完成一项！');
  }
  persistProgress(); renderHome(); updateProgress();
  if (finishedToday) setTimeout(openDailyWrapUp, 350);
}
function mountHomeMap() {
  const scene = $('.garden-scene'); const map = $('.theme-map');
  if (scene && map && map.parentElement !== scene) scene.append(map);
}
function themeNeedsReview(theme) { return isThemeReviewDue(theme, state.wordProgress, todayKey); }
function recommendedThemeId() { return getRecommendedThemeId(THEMES, state.completedThemes, state.wordProgress, todayKey, state.activeTheme); }
function dailyRouteThemes() { return dailyRouteThemeIds(THEMES, state.completedThemes, state.wordProgress, todayKey); }
function renderHomeAvatar() {
  const container = $('#homeOcAvatar');
  if (container) {
    container.innerHTML = renderCharacterSVG(state.ocAvatar, 1.5);
  }
  const speech = $('#speechChildName');
  if (speech) {
    speech.textContent = `Hi, ${childName()}!`;
  }
}
function renderHome() {
  const recommended = recommendedThemeId();
  const route = dailyRouteThemes();
  const routeButton = $('#dailyRoute');
  routeButton.hidden = !route.length;
  if (route.length) { const next = THEMES[route[0]]; routeButton.dataset.theme = next.id; routeButton.textContent = `今日路线：先去${MAP_META[next.id]?.name || next.title}`; }
  $('#themeCards').innerHTML = Object.values(THEMES).map((theme) => {
    const done = state.completedThemes.includes(theme.id);
    const reviewDue = themeNeedsReview(theme);
    const map = MAP_META[theme.id] || { name: theme.title, hint: theme.subtitle, icon: 'spark' };
    const status = done ? '已经点亮 · 再去看看' : map.hint;
    return `<button class="theme-card map-node map-${theme.id} ${theme.id === state.activeTheme ? 'active' : ''} ${theme.id === recommended ? 'recommended' : ''} ${reviewDue ? 'review-due' : ''}" type="button" data-theme="${theme.id}" aria-label="${map.name}，${status}"><span class="map-copy"><strong>${map.name}</strong></span></button>`;
  }).join('');
  $$('[data-theme]').forEach((button) => button.addEventListener('click', () => selectTheme(button.dataset.theme, true)));
  $('#dailyRoute').onclick = () => selectTheme($('#dailyRoute').dataset.theme, true);
  renderHomeAvatar();
  renderStudyCalendar();
}
let arcadeSequenceTimer = null;
let whackTimer = null;
let catchTimer = null;
function openArcade() {
  if (!canAccessArcade()) return;
  state.arcadeGameId = '';
  state.arcadeState = null;
  setScreen('arcade');
}
function completeArcadeGame(name, { rhythmScore = 0, arrowScore = 0 } = {}) {
  const stats = state.arcadeStats; const playedBefore = arcadeDailyPlays();
  stats.dailyPlays = { ...(stats.dailyPlays || {}), [todayKey]: playedBefore + 1 }; stats.totalPlays = Number(stats.totalPlays || 0) + 1;
  stats.bestRhythm = Math.max(Number(stats.bestRhythm || 0), rhythmScore);
  stats.bestArrows = Math.max(Number(stats.bestArrows || 0), arrowScore);
  stats.bestFruit = Math.max(Number(stats.bestFruit || 0), fruitScore);
  stats.bestWhack = Math.max(Number(stats.bestWhack || 0), whackScore);
  stats.bestCatch = Math.max(Number(stats.bestCatch || 0), catchScore);
  Object.keys(stats.dailyPlays).sort().slice(0, -30).forEach((key) => delete stats.dailyPlays[key]);
  setDailyTask('round'); persistProgress(); updateProgress();
  showToast(playedBefore < 3 ? `完成${name}，今天的小游戏打卡成功！` : `完成${name}！`);
}
function arcadeStatus(items) { return `<div class="arcade-status">${items.map(([label, value, tone = 'violet']) => `<span class="${tone}"><b>${value}</b>${label}</span>`).join('')}</div>`; }

function openArcadeWheelModal() {
  updateArcadeSpinsFromStudy();
  const spins = arcadeSpinsAvailable();
  $('#wheelRemainingSpins').textContent = spins;
  $('#arcadeWheelModal').classList.add('open');
  $('#arcadeWheelModal').setAttribute('aria-hidden', 'false');
  renderWheelDisc();
}

function closeArcadeWheelModal() {
  $('#arcadeWheelModal').classList.remove('open');
  $('#arcadeWheelModal').setAttribute('aria-hidden', 'true');
  renderArcade();
}

let isSpinningWheel = false;
let currentWheelRotation = 0;

function renderWheelDisc() {
  const disc = $('#wheelDisc');
  if (!disc) return;
  const numSectors = WHEEL_SECTORS.length; // 8
  const anglePerSector = 360 / numSectors; // 45deg
  // 生成标准 SVG 饼图扇区，确保每个扇区角度严格对称闭合无接缝
  const cx = 140;
  const cy = 140;
  const r = 138;

  let paths = '';
  let labels = '';

  WHEEL_SECTORS.forEach((sector, i) => {
    // 扇区从 -90deg (12点方向) 开始顺时针排布
    // 扇区 i 覆盖范围: [i * 45 - 90, (i + 1) * 45 - 90]
    // 扇区中心角: (i + 0.5) * 45 - 90
    const startDeg = i * anglePerSector - 90;
    const endDeg = (i + 1) * anglePerSector - 90;
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
    paths += `<path d="${pathD}" fill="${sector.color}" stroke="#ffffff" stroke-width="2" data-sector-idx="${i}" />`;

    // 文字与图标位置：半径在 90px 处
    const midDeg = (i + 0.5) * anglePerSector - 90;
    const midRad = (midDeg * Math.PI) / 180;
    const textRadius = 90;
    const tx = cx + textRadius * Math.cos(midRad);
    const ty = cy + textRadius * Math.sin(midRad);
    // 文字角度使其沿着轮盘径向朝外可读
    const textRot = midDeg + 90;

    labels += `<g transform="translate(${tx}, ${ty}) rotate(${textRot})" pointer-events="none">
      <text y="-8" text-anchor="middle" font-size="24" font-family="'Baloo 2', sans-serif">${sector.icon}</text>
      <text y="14" text-anchor="middle" font-size="13.5" font-weight="900" fill="#ffffff" stroke="#2a1b4e" stroke-width="2.5" paint-order="stroke fill" font-family="'Nunito', sans-serif">${sector.label || sector.name.slice(0, 3)}</text>
    </g>`;
  });

  disc.innerHTML = `<svg viewBox="0 0 280 280" width="100%" height="100%" class="wheel-svg">
    ${paths}
    ${labels}
  </svg>`;

  $$('path[data-sector-idx]', disc).forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(el.dataset.sectorIdx);
      const sector = WHEEL_SECTORS[idx];
      if (sector) {
        playSfx('pop');
        triggerHaptic(10);
        speakChinese(`这是【${sector.name}】！抽中它可以点亮小游戏哟！`);
      }
    });
  });
}

function spinArcadeWheel() {
  if (isSpinningWheel) return;
  updateArcadeSpinsFromStudy();
  const spins = arcadeSpinsAvailable();
  if (spins <= 0 && !parentModeEnabled) {
    playSfx('wrong');
    speakChinese('转盘机会用完啦！去认真学习 10 分钟就能再转一次哟！');
    showToast('去认真学习满 10 分钟，就能获得新的魔法大转盘机会！');
    return;
  }

  isSpinningWheel = true;
  $('#spinWheelBtn').disabled = true;
  playSfx('pop');
  triggerHaptic(20);

  // 随机抽取一个扇区（也可以按概率加权）
  const targetIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);
  const selectedSector = WHEEL_SECTORS[targetIndex];
  const numSectors = WHEEL_SECTORS.length;
  const sectorAngle = 360 / numSectors;

  // 顶部指针在 0 度 (12 点方向)。
  // 扇区 i 覆盖范围为 [i * 45 - 90, (i + 1) * 45 - 90]
  // 扇区正中心角度为 i * 45 + 22.5 - 90 = i * 45 - 67.5 度
  // 当转盘顺时针旋转 R 度后，该扇区中心的新角度为 (i * 45 - 67.5 + R)
  // 要让它精准对齐 12 点方向 (-90 度)，即：
  // i * 45 - 67.5 + R ≡ -90 (mod 360) => R ≡ -22.5 - i * 45 (mod 360) ≡ 337.5 - i * 45
  // 计算到达该扇区正中心的目标纯角：
  const targetExactAngle = (360 + 337.5 - targetIndex * sectorAngle) % 360;
  // 当前角度在 360 周期内的剩余角
  const currentMod = currentWheelRotation % 360;
  // 前进到该绝对中心所需的度数
  let forward = (targetExactAngle - currentMod + 360) % 360;
  if (forward < 10) forward += 360; // 避免转动幅度太小
  // 增加 6 圈旋转 (2160 度)
  const totalDelta = 360 * 6 + forward;
  currentWheelRotation += totalDelta;

  const disc = $('#wheelDisc');
  disc.style.transition = 'transform 3.8s cubic-bezier(0.15, 0.9, 0.2, 1)';
  disc.style.transform = `rotate(${currentWheelRotation}deg)`;

  setTimeout(() => {
    isSpinningWheel = false;
    $('#spinWheelBtn').disabled = false;
    // 扣除次数
    if (!parentModeEnabled) {
      const used = Number(state.arcadeStats.wheelSpinsUsed?.[todayKey] || 0);
      state.arcadeStats.wheelSpinsUsed = {
        ...(state.arcadeStats.wheelSpinsUsed || {}),
        [todayKey]: used + 1
      };
    }
    // 发放奖励
    if (selectedSector.type === 'universal') {
      const cur = getUniversalCoins();
      state.arcadeStats.universalCoins = {
        ...(state.arcadeStats.universalCoins || {}),
        [todayKey]: cur + selectedSector.count
      };
      playSfx('fanfare');
      triggerHaptic(40);
      triggerConfetti();
      speakChinese(`恭喜你！抽到了${selectedSector.name}！全场游戏全部点亮啦！`);
      showToast(`🎉 抽中【${selectedSector.name}】！全场游戏已点亮！`);
    } else if (selectedSector.type === 'specific') {
      const gameId = selectedSector.gameId;
      const cur = getSpecificCoins(gameId);
      state.arcadeStats.specificCoins = {
        ...(state.arcadeStats.specificCoins || {}),
        [todayKey]: {
          ...(state.arcadeStats.specificCoins?.[todayKey] || {}),
          [gameId]: cur + selectedSector.count
        }
      };
      playSfx('fanfare');
      triggerHaptic(40);
      triggerConfetti();
      const gameName = ARCADE_GAMES.find(g => g.id === gameId)?.name || '小游戏';
      speakChinese(`恭喜你！抽到了${selectedSector.name}！快去玩【${gameName}】吧！`);
      showToast(`🎉 抽中【${selectedSector.name}】！已点亮【${gameName}】！`);
    } else if (selectedSector.type === 'stars') {
      state.stars = (state.stars || 0) + selectedSector.count;
      state.ocOwned = getUnlockedWardrobeItems(state.stars);
      saveOcAvatar();
      playSfx('fanfare');
      triggerHaptic(40);
      triggerConfetti();
      speakChinese(`太幸运啦！额外获得 ${selectedSector.count} 颗魔法星！快去星光奇遇之路看看吧！`);
      showToast(`🎉 抽中【${selectedSector.name}】！`);
    }
    persistProgress();
    $('#wheelRemainingSpins').textContent = arcadeSpinsAvailable();
  }, 4000);
}

function renderArcade() {
  if (state.arcadeGameId !== 'fruit') releaseFruitOrientation();
  renderTopbarContext();
  updateArcadeSpinsFromStudy();
  const area = $('#arcadeArea');
  if (!state.arcadeGameId) {
    clearArcadeAutoExit();
    const daily = arcadeDailyPlays();
    const spins = arcadeSpinsAvailable();
    const universalCoins = getUniversalCoins();
    const studySec = studyTodaySeconds();
    const minutes = Math.floor(studySec / 60);
    const nextSpinMins = Math.max(0, 10 - (minutes % 10));

    // 非家长模式下：若既无转盘机会，又无任何可用游戏币，语音提示并在 10 秒后自动返回首页
    if (!parentModeEnabled && spins === 0 && !hasAnyArcadeCredit()) {
      speakChinese(`${childName()}，今天还没有学习时间来开启转盘哟！先去认真学 10 分钟吧！`);
      showToast(`⏱️ 暂无可用游戏币或转盘机会，10 秒后返回魔法城堡...`);
      arcadeAutoExitTimer = setTimeout(() => {
        if (state.screen === 'arcade' && !state.arcadeGameId) {
          setScreen('home');
        }
      }, 10000);
    }

    const wheelStatusBadge = spins > 0
      ? `<button class="arcade-wheel-trigger-btn active" type="button" id="openArcadeWheelBtn"><span>🎡 魔法大转盘</span><b>${spins} 次抽奖可用！点我点亮游戏</b></button>`
      : `<button class="arcade-wheel-trigger-btn" type="button" id="openArcadeWheelBtn"><span>🎡 魔法大转盘</span><small>今日已学 ${minutes} 分钟 · 还差 ${nextSpinMins} 分钟获得转盘</small></button>`;

    const modeBadge = parentModeEnabled
      ? `<div class="arcade-parent-mode-badge" role="status">🛡️ 家长模式：全场常亮 · 无限畅玩</div>`
      : `<div class="arcade-coin-status" role="status"><span class="coin-token">🪙</span><strong>通用魔法币：${universalCoins} 枚</strong><small>（抽中通用币全场点亮 · 抽中专属币定向点亮）</small></div>`;

    area.innerHTML = `<section class="arcade-hub"><div class="arcade-heading"><p class="section-kicker">小小游戏机</p><h1>今天想玩什么？</h1><p>每一局都是轻松的魔法复习。</p>${modeBadge}${wheelStatusBadge}<div class="arcade-progress"><span>今日游玩局数</span><b>${daily} 局</b><i style="--arcade-progress:${Math.min(daily, 6) / 6 * 100}%"></i></div></div><div class="arcade-game-grid">${ARCADE_GAMES.map((game) => {
      const playable = isArcadeGamePlayable(game.id);
      const specific = getSpecificCoins(game.id);
      const tag = parentModeEnabled ? '' : (specific > 0 ? `<em class="arcade-game-badge specific">🎟️ 专属可用</em>` : (universalCoins > 0 ? `<em class="arcade-game-badge universal">🪙 通用点亮</em>` : `<em class="arcade-game-badge dormant">💤 沉睡中</em>`));
      return `<button class="arcade-game-card arcade-game-${game.id} ${playable ? 'lit' : 'dormant'}" type="button" data-arcade-game="${game.id}"><b>${game.icon}</b><span><strong>${game.name}</strong><small>${game.description}</small></span>${tag}</button>`;
    }).join('')}</div><div class="arcade-best-list">${state.arcadeStats.bestRhythm ? `<span>节奏最高 ${state.arcadeStats.bestRhythm} 轮</span>` : ''}${state.arcadeStats.bestFruit ? `<span>切切乐最高 ${state.arcadeStats.bestFruit} 分</span>` : ''}</div></section>`;

    $('#openArcadeWheelBtn')?.addEventListener('click', () => {
      playSfx('pop');
      if (spins > 0) {
        speakChinese(`太棒啦，${childName()}！你有 ${spins} 次转盘机会，快来抽大奖吧！`);
      } else {
        speakChinese(`今天已学 ${minutes} 分钟，再认真学 ${nextSpinMins} 分钟，就能来转大转盘啦！`);
      }
      openArcadeWheelModal();
    });

    $('.arcade-coin-status', area)?.addEventListener('click', () => {
      playSfx('pop');
      triggerHaptic(10);
      if (universalCoins > 0) {
        speakChinese(`你现在拥有 ${universalCoins} 枚通用魔法币，全场游戏都为你点亮啦！想玩哪一个都可以哟！`);
      } else {
        speakChinese('这里是你的魔法游戏币，认真学习后转动大转盘，就能拿到魔法币来点亮小游戏哟！');
      }
    });

    $$('[data-arcade-game]', area).forEach((button) => button.addEventListener('click', () => {
      const gameId = button.dataset.arcadeGame;
      const gameName = ARCADE_GAMES.find(g => g.id === gameId)?.name || '小游戏';
      if (!isArcadeGamePlayable(gameId)) {
        playSfx('wrong');
        triggerHaptic(20);
        speakChinese(`【${gameName}】还在睡觉呢，去转动魔法大转盘，拿到魔法币就能把它唤醒啦！`);
        showToast(`【${gameName}】正在沉睡中！学习满 10 分钟转大转盘可将其点亮！`);
        // 自动引导转盘或学习
        if (arcadeSpinsAvailable() > 0) {
          setTimeout(openArcadeWheelModal, 800);
        } else {
          setTimeout(() => setScreen('lesson'), 1600);
        }
        return;
      }
      playSfx('pop');
      triggerHaptic(15);
      speakChinese(`【${gameName}】已经为你点亮啦，快来玩吧！`);
      consumeArcadeGameCredit(gameId);
      state.arcadeGameId = gameId;
      state.arcadeState = null;
      renderArcade();
    }));
    return;
  }
  if (state.arcadeGameId === 'memory') renderMemoryGame(area);
  if (state.arcadeGameId === 'listen') renderListeningGame(area);
  if (state.arcadeGameId === 'numbers') renderNumberGame(area);
  if (state.arcadeGameId === 'colors') renderColorGame(area);
  if (state.arcadeGameId === 'rhythm') renderRhythmGame(area);
  if (state.arcadeGameId === 'match') renderMatchGame(area);
  if (state.arcadeGameId === 'fruit') renderFruitGame(area);
  if (state.arcadeGameId === 'whack') renderWhackGame(area);
  if (state.arcadeGameId === 'catch') renderCatchGame(area);
  if (state.arcadeGameId === 'lights') renderLightsGame(area);
  if (state.arcadeGameId === 'tictactoe') renderTicTacToeGame(area);
  if (VENDOR_MINI_GAMES[state.arcadeGameId]) renderVendorMiniGame(area, state.arcadeGameId);
}
function arcadeLevelProgress(level, maxLevels) {
  if (!level || !maxLevels) return '';
  const dots = Array.from({ length: maxLevels }, (_, i) => `<i class="level-dot ${i < level ? 'done' : ''} ${i === level - 1 ? 'current' : ''}"></i>`).join('');
  return `<div class="arcade-level-bar"><span class="arcade-level-badge">第 ${level} / ${maxLevels} 关</span><span class="arcade-level-dots" aria-hidden="true">${dots}</span></div>`;
}
function arcadeFrame(title, description, body, levelMeta = '') {
  // 头部：上面一行是「游戏名 + 关卡进度」的信息条，下面一行是这个关要做什么
  return `<section class="arcade-play"><div class="arcade-play-header"><div class="arcade-meta-row"><p class="section-kicker">${title}</p>${levelMeta || ''}</div><h1>${description}</h1></div>${body}</section>`;
}
function bindArcadeBack() { /* Return to the arcade uses the global Magic Castle breadcrumb. */ }
function finishArcadeRound(name, options) {
  triggerConfetti();
  completeArcadeGame(name, options);
  window.setTimeout(() => { state.arcadeState = null; state.arcadeGameId = ''; renderArcade(); }, 900);
}
const ARCADE_FALLBACK_PICTURES = [
  { id: 'cat', label: '小猫', image: 'assets/learning/vocabulary/cat.svg' },
  { id: 'dog', label: '小狗', image: 'assets/learning/vocabulary/dog.svg' },
  { id: 'rabbit', label: '小兔子', image: 'assets/learning/vocabulary/rabbit.svg' },
  { id: 'clap', label: '拍手', image: 'assets/learning/vocabulary/clap.svg' },
  { id: 'dance', label: '跳舞', image: 'assets/learning/vocabulary/dance.svg' },
  { id: 'jump', label: '跳跃', image: 'assets/learning/vocabulary/jump.svg' },
  { id: 'one', label: '一', image: 'assets/learning/vocabulary/one.svg' },
  { id: 'two', label: '二', image: 'assets/learning/vocabulary/two.svg' },
  { id: 'three', label: '三', image: 'assets/learning/vocabulary/three.svg' },
];
const ARCADE_FALLBACK_COLORS = [
  { id: 'red', label: '红色', image: 'assets/learning/vocabulary/red.svg', color: '#ef6274' },
  { id: 'yellow', label: '黄色', image: 'assets/learning/vocabulary/yellow.svg', color: '#f4c952' },
  { id: 'blue', label: '蓝色', image: 'assets/learning/vocabulary/blue.svg', color: '#75a8f0' },
  { id: 'green', label: '绿色', image: 'assets/learning/vocabulary/rabbit.svg', color: '#48c269' },
  { id: 'pink', label: '粉色', image: 'assets/learning/vocabulary/clap.svg', color: '#f06eb0' },
  { id: 'purple', label: '紫色', image: 'assets/learning/vocabulary/dance.svg', color: '#8d5cd6' },
  { id: 'orange', label: '橙色', image: 'assets/learning/vocabulary/jump.svg', color: '#ff8c37' },
  { id: 'sky', label: '天蓝', image: 'assets/learning/vocabulary/cat.svg', color: '#3ec9f5' },
];
// 魔法翻翻乐：size 是每排几张卡，pairs 是对数（卡片总数 = pairs × 2）
const ARCADE_MEMORY_LEVELS = [
  { level: 1, size: 2, pairs: 3, label: '2×3' },
  { level: 2, size: 4, pairs: 8, label: '4×4' },
  { level: 3, size: 4, pairs: 12, label: '4×6' },
  { level: 4, size: 6, pairs: 18, label: '6×6' },
  { level: 5, size: 6, pairs: 24, label: '6×8' }
];

function getArcadeMemoryDeck(pairCount = 2) {
  let deck = null;
  try { deck = createMemoryDeck(pairCount); } catch {}
  if (deck && deck.length >= 2) return deck;
  const source = ARCADE_HANZI_PICTURE_ITEMS?.length ? ARCADE_HANZI_PICTURE_ITEMS : ARCADE_FALLBACK_PICTURES;
  // 图标不够就少发几对，绝不让同一张图配成不同的 id（否则图案一样却永远不成功）
  const count = Math.min(Math.max(1, pairCount), source.length);
  const pool = [...source].sort(() => Math.random() - 0.5).slice(0, count);
  return [...pool, ...pool].sort(() => Math.random() - 0.5).map((item, index) => ({ ...item, cardId: `${item.id}-${index}` }));
}
// 牌桌尺寸：每排几张 × 几排，按实际牌组算
function memoryLevelLabel(config, deck) {
  const columns = config.size;
  const rows = Math.ceil((deck?.length || 0) / columns);
  return `${columns}×${rows}`;
}
// 通关反馈：胜利音效 + 彩纸
function celebrateArcadeLevel() {
  if (state.soundOn) playSfx('fanfare');
  triggerConfetti();
}
function getArcadeListeningRound(choiceCount = 2, mode = 'picture') {
  let round = null;
  try { round = createListeningRound(choiceCount, mode); } catch {}
  if (round && round.choices?.length === choiceCount) return round;
  const source = mode === 'hanzi' ? (ARCADE_HANZI_PICTURE_ITEMS?.length ? ARCADE_HANZI_PICTURE_ITEMS : ARCADE_FALLBACK_PICTURES) : ARCADE_FALLBACK_PICTURES;
  const count = Math.max(2, Math.min(choiceCount, source.length));
  const choices = [...source].sort(() => Math.random() - 0.5).slice(0, count);
  const answer = choices[Math.floor(Math.random() * choices.length)];
  return { answer, choices, mode };
}
function getArcadeColorRound(choiceCount = 2) {
  let round = null;
  try { round = createColorRound(choiceCount); } catch {}
  if (round && round.choices?.length === choiceCount) return round;
  const count = Math.max(2, Math.min(choiceCount, ARCADE_FALLBACK_COLORS.length));
  const choices = [...ARCADE_FALLBACK_COLORS].sort(() => Math.random() - 0.5).slice(0, count);
  const answer = choices[Math.floor(Math.random() * choices.length)];
  return { answer, choices };
}
function renderMemoryGame(area) {
  const MAX_LEVELS = ARCADE_MEMORY_LEVELS.length;
  if (!state.arcadeState) {
    const initialConfig = ARCADE_MEMORY_LEVELS[0];
    state.arcadeState = {
      level: 1,
      maxLevels: MAX_LEVELS,
      deck: getArcadeMemoryDeck(initialConfig.pairs),
      open: [],
      matched: []
    };
  }
  const game = state.arcadeState;
  const currentConfig = ARCADE_MEMORY_LEVELS.find((cfg) => cfg.level === game.level) || ARCADE_MEMORY_LEVELS[0];
  const pairGoal = new Set(game.deck.map((card) => card.id)).size;
  const levelLabel = memoryLevelLabel(currentConfig, game.deck);
  const popping = new Set(game.popping || []);
  const flipping = new Set(game.flipping || []);
  area.innerHTML = arcadeFrame(
    '魔法翻翻乐',
    `第 ${game.level} 关 · ${levelLabel} 卡片 (${game.matched.length} / ${pairGoal} 对)`,
    `<div class="memory-grid memory-grid-${currentConfig.size} memory-pairs-${pairGoal}" style="--memory-size:${currentConfig.size}">${game.deck.map((card, index) => {
      const visible = game.open.includes(index) || game.matched.includes(card.id);
      const classes = ['memory-card'];
      if (visible) classes.push('open');
      if (game.matched.includes(card.id)) classes.push('matched');
      if (flipping.has(index)) classes.push('card-flip');
      if (popping.has(index)) classes.push('match-pop');
      return `<button class="${classes.join(' ')}" type="button" data-memory-index="${index}" ${visible ? 'disabled' : ''}>${visible ? `<img src="${card.image}" alt="${card.label}" /><span>${card.label}</span>` : '<b>✦</b>'}</button>`;
    }).join('')}</div>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  // 特效只播一次
  game.popping = [];
  game.flipping = [];
  bindArcadeBack();
  $$('[data-memory-index]', area).forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.memoryIndex);
    if (game.open.length >= 2 || game.open.includes(index) || game.matched.includes(game.deck[index].id)) return;
    game.open.push(index);
    game.flipping = [index]; // 翻牌的小弹跳
    if (state.soundOn) playSfx('pop'); // 翻牌音效
    renderMemoryGame(area);
    if (game.open.length !== 2) return;
    const [first, second] = game.open;
    const isMatch = game.deck[first].id === game.deck[second].id;
    window.setTimeout(() => {
      if (isMatch) {
        game.matched.push(game.deck[first].id);
        game.open = [];
        game.popping = [first, second]; // 匹配成功特效
        if (state.soundOn) playSfx('ding');
        if (game.matched.length >= pairGoal) {
          if (game.level < game.maxLevels) {
            game.level += 1;
            const nextConfig = ARCADE_MEMORY_LEVELS.find((cfg) => cfg.level === game.level) || ARCADE_MEMORY_LEVELS[game.level - 1];
            game.deck = getArcadeMemoryDeck(nextConfig.pairs);
            game.matched = [];
            game.open = [];
            celebrateArcadeLevel();
            showToast(`🎉 第 ${game.level - 1} 关完成！进入第 ${game.level} 关（${memoryLevelLabel(nextConfig, game.deck)} 翻翻乐）`);
            renderMemoryGame(area);
            return;
          }
          finishArcadeRound('魔法翻翻乐');
          return;
        }
      } else {
        game.open = [];
      }
      renderMemoryGame(area);
    }, 600);
  }));
}
function renderListeningGame(area) {
  const MAX_LEVELS = 5;
  const preferredMode = state.arcadeListenMode === 'hanzi' ? 'hanzi' : 'picture';
  if (!state.arcadeState) {
    state.arcadeState = { level: 1, maxLevels: MAX_LEVELS, ...getArcadeListeningRound(2, preferredMode) };
  }
  const game = state.arcadeState;
  const hanziMode = game.mode === 'hanzi';
  const modeSwitch = `<div class="arcade-mode-switch" role="group" aria-label="选择找图片还是找汉字">
      <button type="button" class="${hanziMode ? '' : 'active'}" data-listen-mode="picture" aria-pressed="${!hanziMode}">找图片</button>
      <button type="button" class="${hanziMode ? 'active' : ''}" data-listen-mode="hanzi" aria-pressed="${hanziMode}">找汉字</button>
    </div>`;
  area.innerHTML = arcadeFrame(
    '听音找一找',
    hanziMode ? '听一听，找到正确的汉字' : '听一听，找到正确图片',
    `${modeSwitch}<button class="arcade-listen" id="arcadeListen" type="button">再听一遍 <span>R</span></button><div class="arcade-picture-choices ${hanziMode ? 'is-hanzi' : ''}">${game.choices.map((item) => (hanziMode
      ? `<button type="button" data-arcade-choice="${item.id}" aria-label="汉字 ${item.label}"><b class="arcade-hanzi-glyph">${item.label}</b></button>`
      : `<button type="button" data-arcade-choice="${item.id}"><img src="${item.image}" alt="${item.label}" /><b>${item.label}</b></button>`)).join('')}</div>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  const replay = () => (hanziMode ? speakChinese(game.answer.label) : speak(game.answer.id));
  $('#arcadeListen').addEventListener('click', replay);
  window.setTimeout(replay, 120);
  bindArcadeBack();
  $$('[data-listen-mode]', area).forEach((button) => button.addEventListener('click', () => {
    const nextMode = button.dataset.listenMode;
    if (nextMode === game.mode) return;
    state.arcadeListenMode = nextMode;
    game.mode = nextMode;
    const choiceCount = Math.min(2 + (game.level - 1), 6);
    const nextRound = getArcadeListeningRound(choiceCount, nextMode);
    game.answer = nextRound.answer;
    game.choices = nextRound.choices;
    persistProgress();
    renderListeningGame(area);
  }));
  $$('[data-arcade-choice]', area).forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.arcadeChoice === game.answer.id) {
      button.classList.add('correct');
      window.setTimeout(() => {
        if (game.level < game.maxLevels) {
          game.level += 1;
          const choiceCount = Math.min(2 + (game.level - 1), 6);
          const nextRound = getArcadeListeningRound(choiceCount, game.mode);
          game.answer = nextRound.answer;
          game.choices = nextRound.choices;
          celebrateArcadeLevel();
          showToast(`🌟 第 ${game.level - 1} 关答对！进入第 ${game.level} 关（${choiceCount} 个选项）`);
          renderListeningGame(area);
          return;
        }
        finishArcadeRound('听音找一找');
      }, 500);
    } else {
      button.classList.add('wrong');
      button.disabled = true;
    }
  }));
}
function renderNumberGame(area) {
  const MAX_LEVELS = 10;
  if (!state.arcadeState) {
    state.arcadeState = { level: 1, maxLevels: MAX_LEVELS, ...createNumberRound(1) };
  }
  const game = state.arcadeState;
  area.innerHTML = arcadeFrame(
    '数字泡泡',
    `找到数字 ${game.answer}`,
    `<div class="number-bubbles">${game.choices.map((number) => `<button class="number-bubble bubble-${number % 10}" type="button" data-number-choice="${number}">${number}</button>`).join('')}</div>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  bindArcadeBack();
  window.setTimeout(() => speakChinese(chineseNumber(game.answer)), 120); // 数字泡泡用中文念
  $$('[data-number-choice]', area).forEach((button) => button.addEventListener('click', () => {
    if (Number(button.dataset.numberChoice) === game.answer) {
      button.classList.add('correct');
      window.setTimeout(() => {
        if (game.level < game.maxLevels) {
          game.level += 1;
          const nextRound = createNumberRound(game.level);
          game.answer = nextRound.answer;
          game.choices = nextRound.choices;
          celebrateArcadeLevel();
          showToast(`🎈 第 ${game.level - 1} 关点破！进入第 ${game.level} 关`);
          renderNumberGame(area);
          return;
        }
        finishArcadeRound('数字泡泡');
      }, 500);
    } else {
      button.classList.add('wrong');
      button.disabled = true;
    }
  }));
}
function renderColorGame(area) {
  const MAX_LEVELS = 5;
  if (!state.arcadeState) {
    state.arcadeState = { level: 1, maxLevels: MAX_LEVELS, ...getArcadeColorRound(2) };
  }
  const game = state.arcadeState;
  area.innerHTML = arcadeFrame(
    '颜色魔法',
    '听到颜色后，点中正确魔法色',
    `<button class="arcade-listen" id="arcadeColorListen" type="button">再听一遍 <span>R</span></button><div class="arcade-color-choices">${game.choices.map((item) => `<button style="--arcade-color:${item.color}" type="button" data-color-choice="${item.id}" aria-label="${item.label}"><img src="${item.image}" alt="" /><b class="arcade-color-name">${item.label}</b></button>`).join('')}</div>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  const replay = () => speakChinese(game.answer.label); // 用中文念颜色名
  $('#arcadeColorListen').addEventListener('click', replay);
  window.setTimeout(replay, 120);
  bindArcadeBack();
  $$('[data-color-choice]', area).forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.colorChoice === game.answer.id) {
      button.classList.add('correct');
      window.setTimeout(() => {
        if (game.level < game.maxLevels) {
          game.level += 1;
          const choiceCount = Math.min(2 + (game.level - 1), 6);
          const nextRound = getArcadeColorRound(choiceCount);
          game.answer = nextRound.answer;
          game.choices = nextRound.choices;
          showToast(`✨ 第 ${game.level - 1} 关点中！进入第 ${game.level} 关（${choiceCount} 种颜色）`);
          renderColorGame(area);
          return;
        }
        finishArcadeRound('颜色魔法');
      }, 500);
    } else {
      button.classList.add('wrong');
      button.disabled = true;
    }
  }));
}
function renderRhythmGame(area) {
  const MAX_LEVELS = 5;
  if (!state.arcadeState) {
    const seqLen = 3;
    state.arcadeState = {
      level: 1,
      maxLevels: MAX_LEVELS,
      sequence: Array.from({ length: seqLen }, () => nextRhythmColor()),
      input: [],
      showing: true,
    };
  }
  const game = state.arcadeState;
  const speed = Math.max(220, 460 - (game.level - 1) * 55);
  area.innerHTML = arcadeFrame(
    '星星节奏',
    game.showing ? `记住 ${game.sequence.length} 颗闪亮顺序 (速度 Lv.${game.level})` : `按记忆依序点击 (${game.input.length} / ${game.sequence.length})`,
    `<div class="rhythm-grid">${['violet', 'gold', 'sky', 'pink'].map((color) => `<button class="rhythm-pad ${color}" type="button" data-rhythm-color="${color}" ${game.showing ? 'disabled' : ''}></button>`).join('')}</div><p class="rhythm-copy">${game.showing ? '魔法星星正在闪烁…' : `已经点了 ${game.input.length} / ${game.sequence.length} 颗`}</p>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  bindArcadeBack();
  const pads = (color) => $$('.rhythm-pad', area).filter((button) => button.dataset.rhythmColor === color);
  if (game.showing) {
    let index = 0;
    const flash = () => {
      if (index >= game.sequence.length) {
        game.showing = false;
        renderRhythmGame(area);
        return;
      }
      const pad = pads(game.sequence[index])[0];
      pad?.classList.add('flash');
      arcadeSequenceTimer = window.setTimeout(() => {
        pad?.classList.remove('flash');
        index += 1;
        arcadeSequenceTimer = window.setTimeout(flash, Math.floor(speed * 0.45));
      }, speed);
    };
    arcadeSequenceTimer = window.setTimeout(flash, 500);
    return;
  }
  $$('[data-rhythm-color]', area).forEach((button) => button.addEventListener('click', () => {
    const color = button.dataset.rhythmColor;
    const expected = game.sequence[game.input.length];
    if (color !== expected) {
      button.classList.add('wrong');
      game.input = [];
      showToast('顺序不对哦，再看一遍！');
      window.setTimeout(() => {
        game.showing = true;
        renderRhythmGame(area);
      }, 550);
      return;
    }
    button.classList.add('flash');
    game.input.push(color);
    if (game.input.length === game.sequence.length) {
      if (game.level < game.maxLevels) {
        game.level += 1;
        game.sequence = Array.from({ length: 2 + game.level }, () => nextRhythmColor());
        game.input = [];
        game.showing = true;
        showToast(`🎶 第 ${game.level - 1} 关通关！进入第 ${game.level} 关（${game.sequence.length} 颗星，更快）`);
        window.setTimeout(() => renderRhythmGame(area), 600);
        return;
      }
      finishArcadeRound('星星节奏', { rhythmScore: game.sequence.length });
    }
  }));
}
function renderMatchGame(area) {
  area.innerHTML = arcadeFrame('魔法消消乐', '连接三个或更多相同宝石', `<div class="match-game-shell"><iframe id="matchGameFrame" src="vendor/match-3-game/index.html" title="魔法消消乐" loading="eager"></iframe></div><p class="arcade-rule">拖动相邻宝石，连成三个或更多同色宝石即可消除。</p>`);
  bindArcadeBack();
  // 消消乐把内容高度报过来，iframe 收到刚好，底部不留空白
  const frame = $('#matchGameFrame');
  if (frame) {
    const applyHeight = (height) => {
      const value = Math.round(Number(height) || 0);
      if (!value) return; // 量不到就别动，别把 iframe 压扁
      frame.style.height = `${Math.max(300, value)}px`;
      frame.style.minHeight = '0px'; // 别让样式表里的 min-height 又把底部撑出空白
    };
    // 兜底：不等 iframe 脚本回报，直接量它内容里最后一个元素的位置
    const measure = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return 0;
        const viewport = doc.documentElement.clientHeight || 0;
        const top = doc.body.getBoundingClientRect().top;
        let bottom = 0;
        doc.body.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;            // 隐藏的元素
          if (viewport && rect.height > viewport * 1.2) return;        // 被拉满的容器
          bottom = Math.max(bottom, rect.bottom);
        });
        return bottom > top ? Math.ceil(bottom - top + 12) : 0;
      } catch { return 0; }
    };
    frame.addEventListener('load', () => applyHeight(measure()));
    window.setTimeout(() => applyHeight(measure()), 600);
  }
}
function distanceToSegment(point, start, end) {
  const dx = end.x - start.x; const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
  const closest = { x: start.x + t * dx, y: start.y + t * dy };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}
const VENDOR_MINI_GAMES = {
  fruit: { title: '水果魔法切切乐', description: '原始水果切切乐 UI', src: 'vendor/mini-games/fruitninjia/index.html' },
  whack: { title: '打地鼠', description: '看准了敲！别让地鼠跑掉', src: 'vendor/mini-games/whac-a-mole.html' },
  catch: { title: '接水果', description: '移动篮子，接住落下的水果', src: 'vendor/mini-games/library/fruit-catch.html' },
  screw: { title: '打个螺丝', description: '拧下螺丝，收纳所有的彩色垫板', src: 'vendor/mini-games/screw/index.html' },
  fruitbox: { title: '消个水果', description: '点击水果放入卡槽，三个消除', src: 'vendor/mini-games/fruitbox/index.html' },
  arrowshoot: { title: '一箭又一箭', description: '看准靶心与角度，箭无虚发', src: 'vendor/mini-games/arrow-shoot/index.html' },
  sheep: { title: '羊了个羊：星球', description: '星球上的堆叠消除大挑战', src: 'vendor/mini-games/sheep/index.html' },
  goose: { title: '抓大鹅', description: '3D 杂乱场景中找出三个相同物品', src: 'vendor/mini-games/goose/index.html' },
  beads: { title: '快乐拼拼豆', description: '挑选彩色豆豆，拼出精美像素画', src: 'vendor/mini-games/beads/index.html' },
  xlegex: { title: '兔了个兔', description: '可爱的兔子卡片三消趣味挑战', src: 'vendor/mini-games/xlegex/index.html' },
  yulegeyu: { title: '鱼了个鱼', description: '海洋鱼类主题叠层收纳三消', src: 'vendor/mini-games/yulegeyu/index.html' },
  game2048: { title: '2048', description: '经典合并数字挑战', src: 'vendor/mini-games/library/2048.html' },
  hanoi: { title: '汉诺塔', description: '移动圆盘到目标柱', src: 'vendor/mini-games/library/hanoi.html' },
  klotski: { title: '华容道', description: '经典横刀立马布局', src: 'vendor/mini-games/library/klotski.html' },
  sudoku: { title: '数独', description: '4×4 入门数独填数', src: 'vendor/mini-games/library/sudoku.html' },
  bulls: { title: '猜数字', description: '推理出隐藏的 4 位数字', src: 'vendor/mini-games/library/bulls-and-cows.html' },
};
let fruitOrientationLocked = false;
function nativeScreenOrientation() { return window.Capacitor?.Plugins?.MagicScreenOrientation; }
async function releaseFruitOrientation() {
  document.body.classList.remove('fruit-landscape-mode');
  const fruitFrame = $('[data-fruit-game-frame]');
  fruitFrame?.contentWindow?.postMessage({ type: 'magic-castle:fruit-landscape-release' }, '*');
  if (fruitOrientationLocked) {
    fruitOrientationLocked = false;
    try { await nativeScreenOrientation()?.unlock(); } catch {}
    try { screen.orientation?.unlock?.(); } catch {}
  }
  if (document.fullscreenElement && document.exitFullscreen) {
    try { await document.exitFullscreen(); } catch {}
  }
}
async function lockFruitOrientation(source) {
  document.body.classList.add('fruit-landscape-mode');
  let locked = false;
  try {
    const plugin = nativeScreenOrientation();
    if (plugin?.lockLandscape) {
      await plugin.lockLandscape();
      fruitOrientationLocked = true;
      locked = true;
    }
  } catch {}
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
      fruitOrientationLocked = true;
      locked = true;
    }
  } catch {}
  locked = true;
  source?.postMessage({ type: 'magic-castle:fruit-landscape-result', locked: true }, '*');
}
window.addEventListener('message', (event) => {
  const fruitFrame = $('[data-fruit-game-frame]');
  // 消消乐（iframe）报来内容高度：把 iframe 收到刚好，底部不留空白
  if (event.data?.type === 'match3-height') {
    const matchFrame = $('#matchGameFrame');
    if (matchFrame && event.source === matchFrame.contentWindow) {
      matchFrame.style.height = `${Math.max(300, Number(event.data.height) || 0)}px`;
    }
  }
  if (event.data?.type === 'magic-castle:fruit-landscape-request') {
    lockFruitOrientation(event.source);
  }
  if (event.data?.type === 'magic-castle:fruit-exit-request') {
    releaseFruitOrientation();
    if (state.screen === 'arcade' && state.arcadeGameId === 'fruit') {
      state.arcadeGameId = ''; state.arcadeState = null; renderArcade();
    }
  }
});
function renderVendorMiniGame(area, gameId) {
  const game = VENDOR_MINI_GAMES[gameId];
  const fruitFrameAttributes = gameId === 'fruit' ? ' allow="fullscreen" allowfullscreen data-fruit-game-frame' : '';
  area.innerHTML = arcadeFrame(game.title, game.description, `<div class="mini-game-frame vendor-${gameId}"><iframe src="${game.src}" title="${game.title}" loading="eager"${fruitFrameAttributes}></iframe></div>`);
  bindArcadeBack();
}
function renderFruitGame(area) { renderVendorMiniGame(area, 'fruit'); }
function renderWhackGame(area) {
  area.innerHTML = arcadeFrame('打地鼠', '看准了敲！别让地鼠跑掉', `<div class="mini-game-frame"><iframe src="vendor/mini-games/whac-a-mole.html" title="打地鼠"></iframe></div><p class="arcade-rule">点击“开始游戏”后，看见地鼠就马上敲它。</p>`);
  bindArcadeBack();
}
function renderCatchGame(area) { renderVendorMiniGame(area, 'catch'); }
function toggleLights(board, index, size = 4) {
  const row = Math.floor(index / size); const col = index % size;
  [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].forEach(([r, c]) => { if (r >= 0 && r < size && c >= 0 && c < size) board[r * size + c] = !board[r * size + c]; });
}
function renderLightsGame(area) {
  const MAX_LEVELS = 3;
  if (!state.arcadeState) {
    const size = 3;
    state.arcadeState = { level: 1, maxLevels: MAX_LEVELS, size, board: createLightsBoard(size), moves: 0 };
  }
  const game = state.arcadeState;
  area.innerHTML = arcadeFrame(
    '点灯游戏',
    `熄灭全部灯光 · ${game.size}×${game.size}`,
    `<div class="lights-difficulty" role="group" aria-label="点灯游戏难度"><button type="button" class="${game.level === 1 ? 'active' : ''}" data-light-level="1">第 1 关 3×3</button><button type="button" class="${game.level === 2 ? 'active' : ''}" data-light-level="2">第 2 关 4×4</button><button type="button" class="${game.level === 3 ? 'active' : ''}" data-light-level="3">第 3 关 5×5</button></div>${arcadeStatus([['还亮', game.board.filter(Boolean).length, 'gold'], ['步数', game.moves, 'violet']])}<div class="lights-grid" style="--lights-grid:${game.size}">${game.board.map((on, index) => `<button class="light-tile ${on ? 'on' : ''}" type="button" data-light-index="${index}"><i></i></button>`).join('')}</div><p class="arcade-rule">点击一格会翻转自己和上下左右，熄灭全部灯光即可通关。</p>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  bindArcadeBack();
  $$('[data-light-level]', area).forEach((button) => button.addEventListener('click', () => {
    const level = Number(button.dataset.lightLevel);
    const size = level === 1 ? 3 : level === 2 ? 4 : 5;
    state.arcadeState = { level, maxLevels: MAX_LEVELS, size, board: createLightsBoard(size), moves: 0 };
    renderLightsGame(area);
  }));
  $$('[data-light-index]', area).forEach((button) => button.addEventListener('click', () => {
    toggleLights(game.board, Number(button.dataset.lightIndex), game.size);
    game.moves += 1;
    if (game.board.every((light) => !light)) {
      if (game.level < game.maxLevels) {
        game.level += 1;
        const nextSize = game.level === 2 ? 4 : 5;
        game.size = nextSize;
        game.board = createLightsBoard(nextSize);
        game.moves = 0;
        showToast(`💡 第 ${game.level - 1} 关全部熄灭！进入第 ${game.level} 关（${nextSize}×${nextSize}）`);
        renderLightsGame(area);
        return;
      }
      finishArcadeRound('点灯游戏');
      return;
    }
    renderLightsGame(area);
  }));
}
function ticWinner(board, mark) { const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; return lines.some((line) => line.every((index) => board[index] === mark)); }
function renderTicTacToeGame(area) {
  const MAX_LEVELS = 3;
  if (!state.arcadeState) {
    state.arcadeState = { level: 1, maxLevels: MAX_LEVELS, wins: 0, board: Array(9).fill(''), turn: 'X', message: '轮到你了' };
  }
  const game = state.arcadeState;
  area.innerHTML = arcadeFrame(
    '井字棋',
    `${game.message} (已胜 ${game.wins} / 3 局)`,
    `<div class="tic-grid">${game.board.map((mark, index) => `<button class="tic-cell ${mark ? `mark-${mark}` : ''}" type="button" data-tic-index="${index}" ${mark || game.turn !== 'X' ? 'disabled' : ''}>${mark}</button>`).join('')}</div><p class="arcade-rule">你是 X，露娜是 O。胜出 3 局即可通关。</p>`,
    arcadeLevelProgress(game.wins + 1, game.maxLevels)
  );
  bindArcadeBack();
  $$('[data-tic-index]', area).forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.ticIndex); game.board[index] = 'X';
    if (ticWinner(game.board, 'X')) {
      game.wins += 1;
      if (game.wins >= 3) {
        game.message = '三局连胜！通关啦！';
        finishArcadeRound('井字棋');
        return;
      }
      game.message = `你赢了这一局！(已胜 ${game.wins}/3)`;
      showToast(`🏆 赢下第 ${game.wins} 局！`);
      window.setTimeout(() => {
        game.board = Array(9).fill('');
        game.turn = 'X';
        game.message = '新的一局，轮到你了';
        renderTicTacToeGame(area);
      }, 900);
      return;
    }
    const empty = game.board.map((value, i) => value ? null : i).filter((value) => value !== null);
    if (!empty.length) {
      game.message = '平局，再来一局吧！';
      window.setTimeout(() => {
        game.board = Array(9).fill('');
        game.turn = 'X';
        game.message = '轮到你了';
        renderTicTacToeGame(area);
      }, 800);
      return;
    }
    const winMove = (mark) => empty.find((candidate) => { game.board[candidate] = mark; const win = ticWinner(game.board, mark); game.board[candidate] = ''; return win; });
    const ai = winMove('O') ?? winMove('X') ?? empty[Math.floor(Math.random() * empty.length)]; game.board[ai] = 'O';
    if (ticWinner(game.board, 'O')) {
      game.message = '露娜赢啦，再试一次！';
      window.setTimeout(() => {
        game.board = Array(9).fill('');
        game.turn = 'X';
        game.message = '加油，轮到你了';
        renderTicTacToeGame(area);
      }, 900);
      return;
    }
    renderTicTacToeGame(area);
  }));
}
function selectTheme(id, goToLesson = true) {
  if (id === 'animal') { openArcade(); return; }
  state.activeTheme = id; state.round = 0; state.completed = false; state.roundLocked = false;
  persistProgress(); renderHome();
  if (goToLesson) setScreen('lesson');
}

function updateProgress() {
  const theme = currentTheme(); const total = currentRounds().length;
  $('#starTotal').textContent = state.stars;
  $('#gemCountBtn')?.setAttribute('aria-label', `拥有 ${state.stars} 颗魔法星，查看星光奇遇之路`);

  // 更新首页学习时长展示与 10 分钟分段彩虹能量轨
  const studySec = studyTodaySeconds();
  const studyMins = Math.floor(studySec / 60);
  const homeBadge = $('#homeStudyMinutes');
  if (homeBadge) {
    homeBadge.textContent = `探险 ${studyMins} 分钟`;
  }
  $('#homeStudyBadge')?.setAttribute('aria-label', `今天已探险 ${studyMins} 分钟`);

  const limitMins = Number(state.study.limitMinutes || 0);
  const targetMins = limitMins > 0 ? limitMins : 30;
  const percent = Math.min(100, Math.round((studyMins / targetMins) * 100));

  const fillEl = $('#studyTimeFill');
  if (fillEl) {
    fillEl.style.width = `${percent}%`;
    if (percent >= 100) {
      fillEl.className = 'study-time-fill status-complete';
    } else if (percent >= 70) {
      fillEl.className = 'study-time-fill status-warm';
    } else {
      fillEl.className = 'study-time-fill status-fresh';
    }
  }

  const tailEl = $('#studyBadgeTail');
  if (tailEl) {
    if (percent >= 100) {
      tailEl.innerHTML = '<span class="study-target-complete">👑 达成</span>';
    } else {
      tailEl.innerHTML = `<span class="study-target-label">/ ${targetMins}分</span>`;
    }
  }

  const ticksEl = $('#studyTimeTicks');
  if (ticksEl) {
    const tickCount = Math.max(1, Math.round(targetMins / 10));
    ticksEl.innerHTML = Array.from({ length: tickCount - 1 }, (_, i) => {
      const tickMin = (i + 1) * 10;
      const tickPercent = (tickMin / targetMins) * 100;
      const isReached = studyMins >= tickMin;
      return `<i class="time-tick ${isReached ? 'reached' : ''}" style="left:${tickPercent}%" title="${tickMin}分钟"></i>`;
    }).join('');
  }

  $('#parentStars').textContent = state.stars;
  $('#parentWords').textContent = masteredWordCount();
  $('#parentStreak').textContent = state.streak.count;
  $('#progressStars').textContent = `${Math.min(state.round + 1, total)} / ${total}`;
  // 朗诵台用「第 n/m 句」：单句模式按当前关卡，整篇模式按正在读的那一句实时跟随。
  const recital = theme.id === 'action';
  const group = recital ? activeRecitalGroup() : null;
  const lineTotal = group?.lines?.length || 0;
  const lineIndex = recital
    ? (state.recitalMode === 'whole' ? (recitalPlayerValid() ? recitalPlayer.lineIndex : recitalCurrentLine) : state.round)
    : 0;
  if (recital && lineTotal && !state.completed) {
    // 句数由右侧「第 n/m 句」显示，左边不再重复一遍
    $('#progressLabel').textContent = '';
    $('#progressStars').textContent = `第 ${lineIndex + 1}/${lineTotal} 句`;
    $('#progressFill').style.width = `${((lineIndex + 1) / lineTotal) * 100}%`;
  } else if ($('#cardProgressHost')) {
    // 进度搬进卡片后（汉字/英文/朗诵/数字高塔），左边不重复计数，交给右侧「第 n/m 量词」
    const unit = theme.id === 'hanzi' ? '字' : theme.id === 'english' ? '个' : '关';
    const count = Math.min(state.round + 1, total);
    const stage = currentRounds()[state.round]?.stage;
    if (stage) {
      // 数字高塔按关卡计数：条形图在关内随题号前进
      $('#progressLabel').textContent = state.completed ? (state.lessonMode === 'review' ? '魔法回顾完成啦！' : '魔法完成啦！') : '';
      $('#progressStars').textContent = `第 ${stage.index}/${stage.total} 关`;
      const inside = (stage.step - 0.5) / stage.size;
      $('#progressFill').style.width = `${(((stage.index - 1) + inside) / stage.total) * 100}%`;
    } else {
      $('#progressLabel').textContent = state.completed ? (state.lessonMode === 'review' ? '魔法回顾完成啦！' : '魔法完成啦！') : '';
      $('#progressStars').textContent = theme.id === 'hanzi' || theme.id === 'english' ? `第 ${count}/${total} ${unit}` : `${count} / ${total}`;
      $('#progressFill').style.width = `${(count / total) * 100}%`;
    }
  } else {
    $('#progressLabel').textContent = state.completed ? (state.lessonMode === 'review' ? '魔法回顾完成啦！' : '魔法完成啦！') : `第 ${state.round + 1} 关，共 ${total} 关`;
    $('#progressFill').style.width = `${(Math.min(state.round + 1, total) / total) * 100}%`;
  }
  const prevBtn = $('#prevCardBtn');
  const nextBtn = $('#nextCardBtn');
  if (prevBtn) {
    prevBtn.disabled = state.completed || state.round <= 0;
  }
  if (nextBtn) {
    nextBtn.disabled = state.completed || state.round >= total - 1;
  }
}

function navigateCard(delta) {
  if (state.screen !== 'lesson' || state.completed) return;
  const total = currentRounds().length;
  const nextRound = state.round + delta;
  if (nextRound < 0 || nextRound >= total) return;
  window.speechSynthesis?.cancel();
  stopNativeTts();
  recitalPlaybackId += 1;
  state.round = nextRound;
  state.roundLocked = false;
  renderRound();
}

function startLearnCountdown(seconds = 3) {
  const button = $('#learnNext');
  const label = $('#learnNextLabel');
  if (!button || !label) return;
  clearInterval(learnCountdownTimer);
  let remaining = seconds;
  button.disabled = true;
  button.setAttribute('aria-disabled', 'true');
  label.textContent = '继续';
  button.style.setProperty('--listen-progress', '0%');
  learnCountdownTimer = window.setInterval(() => {
    remaining -= 1;
    button.style.setProperty('--listen-progress', `${((seconds - remaining) / seconds) * 100}%`);
    if (remaining <= 0) {
      clearInterval(learnCountdownTimer);
      button.disabled = false;
      button.removeAttribute('aria-disabled');
      label.textContent = '继续';
      button.style.setProperty('--listen-progress', '100%');
      button.classList.add('ready');
      return;
    }
    label.textContent = '继续';
  }, 1000);
}

function speakForCurrentTheme(text, onend) {
  return (currentTheme().id === 'hanzi' || currentTheme().id === 'color') ? speakChinese(text, onend) : speak(text, onend);
}
function autoReadWordCard(word) {
  const card = $('.learn-word-card') || $('.misc-learn-card');
  const isHanzi = currentTheme().id === 'hanzi';
  const isMisc = currentTheme().id === 'color';
  const translation = wordMeaning(word);
  card?.classList.add('is-speaking', isHanzi || isMisc ? 'speaking-chinese' : 'speaking-english');
  // Hanzi and Misc cards read the word in Chinese.
  if (isHanzi || isMisc) {
    speakChinese(word, () => card?.classList.remove('is-speaking', 'speaking-chinese'));
    return;
  }
  speak(word, () => {
    card?.classList.remove('speaking-english');
    card?.classList.add('speaking-chinese');
    window.setTimeout(() => {
      if (!translation) { card?.classList.remove('is-speaking', 'speaking-chinese'); return; }
      speakChinese(translation, () => {
        card?.classList.remove('is-speaking', 'speaking-chinese');
      });
    }, 120);
  });
}

function hanziLearnMarkup(game, recordingAction) {
  const group = activeContentGroup('hanzi');
  const isImageGroup = Boolean(group.image);
  const showImage = isImageGroup && hanziImageHintVisible;
  return hanziLearnCardMarkup({
    word: game.word,
    totalWords: group.words.length,
    isImageGroup,
    showImage,
    imageUrl: hanziWordImageUrl(game.word),
    groupPath: lessonGroupPathLabel(group),
    actions: lessonPrimaryActionsMarkup(),
    recording: recordingAction,
  });
}
let hanziPlaybackTimer = null;
let hanziPlaybackRunId = 0;
let isSequentialPlaying = false;

function stopSequentialHanzi() {
  hanziPlaybackRunId += 1;
  clearTimeout(hanziPlaybackTimer);
  window.speechSynthesis?.cancel();
  stopNativeTts();
  isSequentialPlaying = false;
  const label = $('#hanziGroupPlayAllLabel');
  const btn = $('#hanziGroupPlayAllBtn');
  if (label) label.textContent = '连续朗读';
  if (btn) btn.classList.remove('is-playing');
  $$('.hanzi-fullscreen-card.is-speaking').forEach((el) => el.classList.remove('is-speaking'));
}

// 分组弹窗：汉字与英文共用（同一个全屏网格弹窗），kind 决定取哪个分组、怎么读、用什么插图。
let groupModalKind = 'hanzi';
function openGroupModal(kind = 'hanzi') {
  groupModalKind = kind;
  const modal = $('#hanziGroupModal');
  if (!modal) return;
  renderHanziGroupModal();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => $('#closeHanziGroupModal')?.focus(), 80);
}
function openHanziGroupModal() { openGroupModal('hanzi'); }
function speakGroupWord(kind, word, onend) {
  return (kind === 'hanzi' || kind === 'misc') ? speakChinese(word, onend) : speak(word, onend);
}
function groupWordImageUrl(kind, word) {
  return kind === 'hanzi' ? hanziWordImageUrl(word) : englishWordImageUrl(word);
}

function closeHanziGroupModal() {
  stopSequentialHanzi();
  const modal = $('#hanziGroupModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function playSequentialHanzi(words) {
  if (isSequentialPlaying) {
    stopSequentialHanzi();
    return;
  }
  isSequentialPlaying = true;
  const label = $('#hanziGroupPlayAllLabel');
  const btn = $('#hanziGroupPlayAllBtn');
  if (label) label.textContent = '停止';
  if (btn) btn.classList.add('is-playing');
  const runId = ++hanziPlaybackRunId;

  let index = 0;
  const playNext = () => {
    if (runId !== hanziPlaybackRunId || index >= words.length) {
      if (runId === hanziPlaybackRunId) {
        stopSequentialHanzi();
      }
      return;
    }
    const word = words[index];
    $$('.hanzi-fullscreen-card').forEach((card) => {
      card.classList.toggle('is-speaking', card.dataset.hanziWord === word);
    });
    const activeCard = $(`[data-hanzi-word="${word}"]`);
    activeCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    index += 1;
    speakGroupWord(groupModalKind, word, () => {
      if (runId !== hanziPlaybackRunId) return;
      hanziPlaybackTimer = window.setTimeout(playNext, 400);
    });
  };
  playNext();
}

function updateHanziGridGeometry(count) {
  const grid = $('#hanziGroupWordsGrid');
  if (!grid || !count) return;
  const isPortrait = window.innerHeight > window.innerWidth;
  const isNarrow = window.innerWidth <= 500;
  let cols, rows;
  if (isNarrow && isPortrait) {
    if (count <= 2) {
      cols = 1;
      rows = count;
    } else {
      cols = 2;
      rows = Math.ceil(count / 2);
    }
  } else if (isPortrait) {
    if (count <= 2) { cols = 1; rows = count; }
    else if (count <= 4) { cols = 2; rows = 2; }
    else if (count <= 6) { cols = 2; rows = 3; }
    else if (count <= 8) { cols = 2; rows = 4; }
    else if (count <= 10) { cols = 2; rows = 5; }
    else if (count <= 12) { cols = 3; rows = 4; }
    else if (count <= 15) { cols = 3; rows = 5; }
    else if (count <= 16) { cols = 4; rows = 4; }
    else if (count <= 20) { cols = 4; rows = 5; }
    else {
      cols = 3;
      rows = Math.ceil(count / 3);
    }
  } else {
    if (count <= 3) { cols = count; rows = 1; }
    else if (count <= 6) { cols = Math.ceil(count / 2); rows = 2; }
    else if (count <= 8) { cols = 4; rows = 2; }
    else if (count <= 10) { cols = 5; rows = 2; }
    else if (count <= 12) { cols = 4; rows = 3; }
    else if (count <= 15) { cols = 5; rows = 3; }
    else if (count <= 16) { cols = 4; rows = 4; }
    else if (count <= 20) { cols = 5; rows = 4; }
    else {
      cols = Math.min(6, Math.ceil(Math.sqrt(count * 1.5)));
      rows = Math.ceil(count / cols);
    }
  }
  grid.style.setProperty('--hanzi-cols', String(cols));
  grid.style.setProperty('--hanzi-rows', String(rows));

  let density = 'medium';
  if (count <= 4) density = 'few';
  else if (count <= 8) density = 'medium';
  else if (count <= 14) density = 'many';
  else density = 'dense';
  grid.dataset.density = density;
}

function renderHanziGroupModal() {
  const kind = groupModalKind;
  const active = activeContentGroup(kind);
  const words = active.words;
  const groups = contentGroups(kind).filter((g) => g.name && g.words.length >= 2);
  const currentWord = currentRounds()[state.round]?.word;

  $('#hanziGroupModalTitle').textContent = active.name;
  $('#hanziGroupModalCount').textContent = `共 ${words.length} ${kind === 'hanzi' ? '字' : (kind === 'misc' ? '项' : '词')}`;

  const tabsContainer = $('#hanziModalGroupTabs');
  if (tabsContainer) {
    if (groups.length > 1) {
      tabsContainer.hidden = false;
      tabsContainer.innerHTML = groups.map((g) => `
        <button type="button" role="tab" class="hanzi-modal-group-tab ${g.id === active.id ? 'active' : ''}" data-hanzi-modal-group="${escapeHtml(g.id)}" aria-selected="${g.id === active.id}">
          ${escapeHtml(g.name)} (${g.words.length})
        </button>
      `).join('');
      $$('[data-hanzi-modal-group]', tabsContainer).forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.hanziModalGroup;
          if (targetId === active.id) return;
          stopSequentialHanzi();
          setActiveContentGroup(kind, targetId);
          saveContentConfiguration();
          applyAdminContent();
          state.round = 0;
          state.completed = false;
          state.roundLocked = false;
          persistProgress();
          renderHome();
          renderRound();
          renderHanziGroupModal();
          showToast(`已切换到“${activeContentGroup(kind).name}”分组。`);
        });
      });
    } else {
      tabsContainer.hidden = true;
      tabsContainer.replaceChildren();
    }
  }

  const isImageGroup = Boolean(active.image);
  const showImage = kind === 'hanzi' ? (isImageGroup && hanziImageHintVisible) : (isImageGroup && englishImageHintVisible);

  const modalToggleBtn = $('#hanziModalImageToggleBtn');
  if (modalToggleBtn) {
    if (kind === 'misc') {
      modalToggleBtn.hidden = true;
    } else {
      modalToggleBtn.hidden = !isImageGroup;
      modalToggleBtn.classList.toggle('is-active', showImage);
      modalToggleBtn.setAttribute('aria-pressed', String(showImage));
      const label = $('#hanziModalImageToggleLabel');
      if (label) label.textContent = '看图识字';
      modalToggleBtn.onclick = () => (kind === 'hanzi' ? toggleHanziImageHint() : toggleEnglishImageHint());
    }
  }

  updateHanziGridGeometry(words.length);
  const grid = $('#hanziGroupWordsGrid');
  grid.innerHTML = words.map((word, index) => {
    const isCurrent = currentWord === word;
    const isMastered = Boolean(state.wordProgress[`${kind}:${word}`]?.mastered);
    const isLearned = state.learnedWords.includes(word) || Boolean(state.wordProgress[`${kind}:${word}`]?.learn);
    let cornerTag = '';
    if (isCurrent) {
      cornerTag = '<span class="hanzi-card-tag is-current">正在学 ⭐</span>';
    } else if (isMastered) {
      cornerTag = '<span class="hanzi-card-tag is-mastered">已掌握 ✓</span>';
    } else if (isLearned) {
      cornerTag = `<button class="hanzi-card-jump-btn" type="button" data-hanzi-jump-index="${index}" aria-label="学习 ${escapeHtml(word)}">学过 · 再学</button>`;
    } else {
      cornerTag = `<button class="hanzi-card-jump-btn" type="button" data-hanzi-jump-index="${index}" aria-label="学习 ${escapeHtml(word)}">学这个</button>`;
    }
    let thumbnailHtml = '';
    const hasThumb = kind === 'misc' || showImage;
    if (kind === 'misc') {
      const visual = getMiscVisual(word);
      thumbnailHtml = `
        <div class="hanzi-card-thumbnail misc-thumbnail">
          ${visual.svg}
        </div>
      `;
    } else if (showImage) {
      thumbnailHtml = `
        <div class="hanzi-card-thumbnail">
          <img src="${groupWordImageUrl(kind, word)}" alt="${escapeHtml(word)}" loading="lazy" />
        </div>
      `;
    }
    return `
      <div class="hanzi-fullscreen-card ${hasThumb ? 'has-thumb' : ''} ${isCurrent ? 'is-current' : ''} ${isMastered ? 'is-mastered' : ''} ${isLearned ? 'is-learned' : ''}" data-hanzi-word="${escapeHtml(word)}" data-hanzi-length="${word.length}" tabindex="0" role="button" aria-label="${escapeHtml(word)}，点击听读音">
        <div class="hanzi-card-topline">
          <span class="hanzi-card-index">#${index + 1}</span>
          ${cornerTag}
        </div>
        ${thumbnailHtml}
        <div class="hanzi-card-body">
          <span class="hanzi-card-big-text">${escapeHtml(word)}</span>
        </div>
      </div>
    `;
  }).join('');

  $$('.hanzi-fullscreen-card', grid).forEach((card) => {
    const triggerSpeak = () => {
      const word = card.dataset.hanziWord;
      if (!word) return;
      $$('.hanzi-fullscreen-card.is-speaking').forEach((c) => c.classList.remove('is-speaking'));
      card.classList.add('is-speaking');
      speakGroupWord(kind, word, () => card.classList.remove('is-speaking'));
    };
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-hanzi-jump-index]')) return;
      triggerSpeak();
    });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('[data-hanzi-jump-index]')) {
        e.preventDefault();
        triggerSpeak();
      }
    });
  });

  $$('[data-hanzi-jump-index]', grid).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetIndex = Number(btn.dataset.hanziJumpIndex);
      const targetWord = words[targetIndex];
      state.round = targetIndex;
      state.completed = false;
      state.roundLocked = false;
      closeHanziGroupModal();
      renderRound();
      speakForCurrentTheme(targetWord);
      showToast(`已开始学习“${targetWord}”。`);
    });
  });

  $('#hanziGroupPlayAllBtn').onclick = () => playSequentialHanzi(words);
}

let currentHanziWriter = null;
let hanziWriterActiveWord = '';
let hanziWriterChars = [];
let hanziWriterCurrentCharIndex = 0;
let hanziWriterCompletedChars = new Set();

async function customCharDataLoader(char) {
  if (DEFAULT_HANZI_CHARS && DEFAULT_HANZI_CHARS[char]) {
    return DEFAULT_HANZI_CHARS[char];
  }
  const cacheKey = `hw-char-${char}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}
  const res = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
  return data;
}

function closeHanziWriter() {
  const modal = $('#hanziWriterModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (currentHanziWriter) {
    try { currentHanziWriter.destroy?.(); } catch {}
    currentHanziWriter = null;
  }
}

function openHanziWriter(word) {
  const modal = $('#hanziWriterModal');
  if (!modal) return;
  hanziWriterActiveWord = word;
  hanziWriterChars = [...word].filter((c) => /[\u4e00-\u9fa5]/.test(c));
  if (!hanziWriterChars.length) {
    showToast('该卡片暂无可练习的汉字');
    return;
  }
  hanziWriterCurrentCharIndex = 0;
  hanziWriterCompletedChars.clear();

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    renderHanziWriterWord();
  });
}

function renderHanziWriterWord() {
  const currentChar = hanziWriterChars[hanziWriterCurrentCharIndex];
  if (!currentChar) return;

  $('#hanziWriterTitle').textContent = `练习书写 · ${hanziWriterActiveWord}`;

  const tabsContainer = $('#hanziWriterWordTabs');
  if (tabsContainer) {
    tabsContainer.innerHTML = hanziWriterChars.map((c, idx) => {
      const isActive = idx === hanziWriterCurrentCharIndex;
      const isDone = hanziWriterCompletedChars.has(c);
      return `<button type="button" role="tab" class="hanzi-writer-char-tab ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}" data-hanzi-writer-index="${idx}" aria-selected="${isActive}">
        <span>${escapeHtml(c)}</span>
      </button>`;
    }).join('');

    $$('[data-hanzi-writer-index]', tabsContainer).forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetIndex = Number(btn.dataset.hanziWriterIndex);
        if (targetIndex === hanziWriterCurrentCharIndex) return;
        playSfx('pop');
        hanziWriterCurrentCharIndex = targetIndex;
        renderHanziWriterWord();
      });
    });
  }

  const holder = $('#hanziWriterCanvasHolder');
  holder.replaceChildren();

  const stage = $('.hanzi-tian-grid');
  const size = Math.min(280, Math.floor(stage.clientWidth || 260));

  if (!window.HanziWriter) {
    $('#hanziWriterStatus').textContent = '笔顺引擎正在加载，请稍候…';
    return;
  }

  if (currentHanziWriter) {
    try { currentHanziWriter.destroy?.(); } catch {}
    currentHanziWriter = null;
  }

  currentHanziWriter = window.HanziWriter.create(holder, currentChar, {
    width: size,
    height: size,
    padding: 18,
    strokeColor: '#2b1c13',
    radicalColor: '#9c301c',
    outlineColor: '#dfb79e',
    drawingColor: '#9c301c',
    highlightColor: '#ff9800',
    drawingWidth: 28,
    showOutline: true,
    showCharacter: false,
    strokeAnimationSpeed: 1.2,
    delayBetweenStrokes: 180,
    charDataLoader: customCharDataLoader,
    onLoadCharDataError: () => {
      $('#hanziWriterStatus').textContent = `暂未获取到【${currentChar}】的笔顺数据`;
    },
  });

  speakChinese(currentChar, () => {
    promptCurrentStroke(currentChar, 0);
  });
  startHanziQuiz();
}

function animateHanziWriter() {
  if (!currentHanziWriter) return;
  const currentChar = hanziWriterChars[hanziWriterCurrentCharIndex];
  $('#hanziWriterStatus').textContent = `正在演示【${currentChar}】笔顺…`;
  currentHanziWriter.cancelQuiz();
  currentHanziWriter.showOutline();
  currentHanziWriter.hideCharacter();
  currentHanziWriter.animateCharacter({
    onComplete: () => {
      $('#hanziWriterStatus').textContent = `演示完毕！点击“手指描红”试一试吧`;
    },
  });
}

function promptCurrentStroke(char, strokeIndex) {
  const strokeName = getStrokeName(char, strokeIndex);
  if (!strokeName) return;
  const total = currentHanziWriter?._character?.strokes?.length || 0;
  const progressDesc = total > 0 ? `（第 ${strokeIndex + 1}/${total} 笔）` : '';
  $('#hanziWriterStatus').textContent = `请写【${strokeName}】${progressDesc}`;
  speakChinese(strokeName);
}

function startHanziQuiz(shouldPromptFirst = false) {
  if (!currentHanziWriter) return;
  const currentChar = hanziWriterChars[hanziWriterCurrentCharIndex];
  $('#hanziWriterStatus').textContent = `跟着橙色笔画描红【${currentChar}】吧~`;

  currentHanziWriter.cancelQuiz();
  currentHanziWriter.showOutline();
  currentHanziWriter.hideCharacter();

  if (shouldPromptFirst) {
    promptCurrentStroke(currentChar, 0);
  }

  currentHanziWriter.quiz({
    onCorrectStroke: (strokeData) => {
      playSfx('ding');
      triggerHaptic(15);
      const totalStrokes = currentHanziWriter._character?.strokes?.length || (strokeData.strokeNum + 1);
      const nextStrokeIndex = strokeData.strokeNum + 1;
      if (nextStrokeIndex < totalStrokes) {
        promptCurrentStroke(currentChar, nextStrokeIndex);
      } else {
        $('#hanziWriterStatus').textContent = `最后一笔写对啦！⭐`;
      }
    },
    onMistake: (strokeData) => {
      playSfx('wrong');
      const currentName = getStrokeName(currentChar, strokeData.strokeNum);
      const nameText = currentName ? `【${currentName}】` : '这一笔';
      $('#hanziWriterStatus').textContent = `${nameText}不太对哦，跟着橙色笔画再试一次~`;
      if (currentName) {
        speakChinese(currentName);
      }
    },
    onComplete: (summary) => {
      hanziWriterCompletedChars.add(currentChar);
      playSfx('ding');

      if (hanziWriterCompletedChars.size < hanziWriterChars.length) {
        $('#hanziWriterStatus').textContent = `太棒啦！【${currentChar}】书写完成！`;
        setTimeout(() => {
          const nextIndex = hanziWriterChars.findIndex((c) => !hanziWriterCompletedChars.has(c));
          if (nextIndex !== -1) {
            hanziWriterCurrentCharIndex = nextIndex;
            renderHanziWriterWord();
          }
        }, 550);
      } else {
        playSfx('victory');
        triggerConfetti();
        $('#hanziWriterStatus').textContent = `🎉 太棒啦！【${hanziWriterActiveWord}】全部书写完成！`;
        state.stars += 1;
        state.wordProgress[`hanzi:${hanziWriterActiveWord}`] = {
          ...(state.wordProgress[`hanzi:${hanziWriterActiveWord}`] || {}),
          written: true,
        };
        persistProgress();
        renderTopbarContext();
        const tabsContainer = $('#hanziWriterWordTabs');
        if (tabsContainer) {
          $$('.hanzi-writer-char-tab', tabsContainer).forEach((el) => el.classList.add('completed'));
        }
      }
    },
  });
}

function sentenceMarkup(word) {
  const sentence = WORD_SENTENCES[word];
  if (!sentence) return '';
  return `<div class="sentence-card"><div class="sentence-main"><b>${sentence.text}</b><button type="button" data-sentence="${sentence.text}" aria-label="听整句话"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Zm12.5 2A4.5 4.5 0 0 0 14 8v2a2.5 2.5 0 0 1 0 4v2a4.5 4.5 0 0 0 2.5-4Z"/></svg></button></div><span>${sentence.zh}</span></div>`;
}
function bindSentenceButtons(area) { $$('[data-sentence]', area).forEach((button) => button.addEventListener('click', () => speak(button.dataset.sentence))); }
function renderLessonGroupSwitcher() {
  const container = $('#lessonGroupSwitcher'); const kind = state.activeTheme;
  if (!['english', 'hanzi', 'action', 'color'].includes(kind)) { container.hidden = true; container.replaceChildren(); return; }
  // 四个主题都用同一套「按目录分层的篇目浏览器」：朗诵篇目 / 汉字分组 / 英文分组 / 花园分组。
  const scope = BROWSER_SCOPES[kind];
  const groups = scope.groups().filter((group) => group.name && (group.lines?.length || group.words?.length));
  if (groups.length < 2) { container.hidden = true; container.replaceChildren(); return; }
  const tree = buildDirectoryTree(groups);
  if (countTreeItems(tree) < 2) { container.hidden = true; container.replaceChildren(); return; }
  // 默认停在「当前正在学的分组」所在目录，和汉字页面的层级一致；用户主动上下层后以用户选择为准。
  const activeGroup = groups.find((group) => group.id === scope.activeId());
  const defaultPath = activeGroup?.directory ? String(activeGroup.directory).split('/').filter(Boolean) : [];
  const stored = browserScopePath(kind);
  const path = (stored ?? defaultPath).filter((part) => typeof part === 'string');
  const node = directoryNode(tree, path) || directoryNode(tree, defaultPath) || tree;
  container.hidden = false;
  container.innerHTML = browserMarkup(kind, { node, path, activeId: scope.activeId(), rootTitle: scope.rootTitle, pathPrefix: scope.pathPrefix, activeLabel: scope.activeLabel, unitLabel: scope.unitLabel });
  bindContentBrowser(container, { scope: kind, path, onSelect: scope.onSelect, onChange: () => { renderLessonGroupSwitcher(); } });
}
function addLessonShortcutHints(area) {
  $$('button.primary-button', area).forEach((button) => {
    if (button.querySelector('.keyboard-hint')) return;
    const hint = document.createElement('kbd'); hint.className = 'keyboard-hint'; hint.textContent = 'Space'; hint.setAttribute('aria-hidden', 'true');
    button.append(hint);
  });
}
function isTypingTarget(target) { return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]')); }
function replayCurrentPrompt() {
  const game = currentRounds()[state.round];
  if (!game) return;
  if (game.type === 'recite') { $('#reciteListen')?.click(); return; }
  // 数字高塔的关卡封面与练习题都是中文，用中文嗓子念
  if (game.type === 'stage' || game.type === 'quiz' || game.type === 'board') { speakChinese(game.prompt || game.zh || game.goal); return; }
  speakForCurrentTheme(currentTheme().id === 'hanzi' ? game.word : (game.type === 'match' ? game.prompt : game.word));
}
function handleLessonShortcuts(event) {
  if (state.screen !== 'lesson' || isTypingTarget(event.target) || event.defaultPrevented) return;
  if ($('#hanziGroupModal')?.classList.contains('open') || $('#hanziWriterModal')?.classList.contains('open')) return;
  if (event.key.toLowerCase() === 'r') { event.preventDefault(); replayCurrentPrompt(); return; }
  if (event.key === 'ArrowLeft') { event.preventDefault(); navigateCard(-1); return; }
  if (event.key === 'ArrowRight') { event.preventDefault(); navigateCard(1); return; }
  if ((event.key === 'Enter' || event.key === ' ') && !(event.target instanceof HTMLElement && event.target.closest('button, a'))) {
    const action = [...$$('#gameArea button.primary-button')].find((button) => !button.disabled && !button.hidden);
    if (action) { event.preventDefault(); action.click(); }
  }
}
let recitalPlaybackId = 0;
let recitalAutoReadTimer = 0;
const RECITAL_GAP_OPTIONS = [0, 500, 1000, 2000, 3000];
let recitalLineGapMs = (() => { const saved = load('luna-recital-line-gap', 500); return RECITAL_GAP_OPTIONS.includes(saved) ? saved : 500; })();
// 篇目浏览器是否铺开显示（默认紧凑两行，点"展开"才铺开）。
// 朗诵台记住读到第几句（整篇模式下播放结束也要保持计数，不回落）。
let recitalCurrentLine = 0;
function normaliseDirectory(value) { return String(value ?? '').split('/').map((part) => part.trim()).filter(Boolean).join('/'); }
function recitalGapLabel(ms) { return `${ms / 1000} 秒`; }
const recitalPlayer = { active: false, paused: false, playbackId: 0, title: '', lines: [], card: null, phase: 'lines', lineIndex: 0, pendingIndex: null, gapTimer: 0, delayTimer: 0 };
function recitalPlayerValid() { return recitalPlayer.active && recitalPlayer.playbackId === recitalPlaybackId; }
function clearRecitalTimers() {
  if (recitalPlayer.gapTimer) { window.clearTimeout(recitalPlayer.gapTimer); recitalPlayer.gapTimer = 0; }
  if (recitalPlayer.delayTimer) { window.clearTimeout(recitalPlayer.delayTimer); recitalPlayer.delayTimer = 0; }
}
function clearRecitalHighlights() {
  const card = recitalPlayer.card;
  if (card) $$('.recital-line.speaking', card).forEach((el) => el.classList.remove('speaking'));
  $$('.recital-card h2.speaking').forEach((el) => el.classList.remove('speaking'));
}
function stopRecitalPlayer() {
  recitalPlayer.active = false;
  recitalPlayer.paused = false;
  recitalPlayer.pendingIndex = null;
  clearRecitalTimers();
}
function updateRecitalHint() {
  const hint = $('#reciteHint');
  if (!hint) return;
  if (!hint.dataset.base) hint.dataset.base = hint.textContent;
  if (!recitalPlayerValid()) hint.textContent = hint.dataset.base;
  else if (recitalPlayer.paused) hint.textContent = '⏸ 已暂停 · 点击继续朗读';
  else hint.textContent = '🔊 朗读中 · 点击暂停';
}
function recitalLineNode(index) {
  if (!recitalPlayer.card) return null;
  return $$('[data-recital-line]', recitalPlayer.card)[index] || null;
}
function finishRecitalPlayback() {
  clearRecitalTimers();
  recitalPlayer.active = false;
  recitalPlayer.paused = false;
  recitalPlayer.pendingIndex = null;
  clearRecitalHighlights();
  updateRecitalHint();
}
function advanceRecitalLine(index) {
  const p = recitalPlayer;
  if (!recitalPlayerValid() || p.paused) return;
  if (index + 1 < p.lines.length) {
    p.pendingIndex = index + 1;
    p.gapTimer = window.setTimeout(() => { p.gapTimer = 0; p.pendingIndex = null; readRecitalLine(index + 1); }, recitalLineGapMs);
  } else finishRecitalPlayback();
}
function readRecitalLine(index) {
  const p = recitalPlayer;
  if (!recitalPlayerValid() || p.paused) return;
  if (index >= p.lines.length) { finishRecitalPlayback(); return; }
  p.lineIndex = index;
  p.phase = 'lines';
  p.pendingIndex = null;
  recitalCurrentLine = index;
  updateProgress(); // 整篇模式：计数与进度条实时跟随正在读的那一句
  const currentLine = recitalLineNode(index);
  const nodes = $$('[data-recital-line]', p.card);
  const highlightLine = state.recitalMode === 'whole'; // 单句朗诵不高亮句子本身
  nodes.forEach((line) => line.classList.remove('speaking'));
  const applyHighlight = () => { if (highlightLine && recitalPlayerValid() && !p.paused && p.lineIndex === index) nodes[index]?.classList.add('speaking'); };
  const manuscript = currentLine?.closest('.recital-manuscript');
  if (currentLine && manuscript) manuscript.scrollTo({ top: currentLine.offsetTop - (manuscript.clientHeight - currentLine.offsetHeight) / 2, behavior: 'smooth' });
  const text = p.lines[index] || '';
  if (!text) { advanceRecitalLine(index); return; }
  speakChinese(text, () => {
    if (!recitalPlayerValid() || p.paused) return;
    advanceRecitalLine(index);
  }, applyHighlight);
}
function readRecitalTitle() {
  const p = recitalPlayer;
  if (!recitalPlayerValid() || p.paused) return;
  const titleNode = p.card?.closest('.recital-card')?.querySelector('h2');
  speakChinese(p.title, () => {
    if (!recitalPlayerValid() || p.paused) return;
    if (titleNode) titleNode.classList.remove('speaking');
    p.phase = 'lines';
    p.delayTimer = window.setTimeout(() => { p.delayTimer = 0; readRecitalLine(p.lineIndex); }, 400);
  }, () => { if (recitalPlayerValid() && !p.paused && p.phase === 'title') titleNode?.classList.add('speaking'); }); // 标题高亮跟着声音走
}
function pauseRecital() {
  const p = recitalPlayer;
  if (!recitalPlayerValid() || p.paused) return;
  p.paused = true;
  clearRecitalTimers();
  window.speechSynthesis?.cancel();
  stopNativeTts();
  updateRecitalHint();
}
function resumeRecital() {
  const p = recitalPlayer;
  if (!recitalPlayerValid() || !p.paused) return;
  p.paused = false;
  updateRecitalHint();
  if (p.phase === 'title') { readRecitalTitle(); return; }
  if (p.pendingIndex != null) { const next = p.pendingIndex; p.pendingIndex = null; readRecitalLine(next); return; }
  readRecitalLine(p.lineIndex);
}
function playRecitalLines(lines, card, startIndex = 0, title = '') {
  stopRecitalPlayer();
  clearRecitalHighlights();
  const playbackId = ++recitalPlaybackId;
  window.speechSynthesis?.cancel();
  stopNativeTts();
  Object.assign(recitalPlayer, {
    active: true, paused: false, playbackId, title, lines, card,
    lineIndex: Math.max(0, startIndex), pendingIndex: null,
    phase: title && startIndex === 0 ? 'title' : 'lines',
  });
  updateRecitalHint();
  if (recitalPlayer.phase === 'title') readRecitalTitle();
  else readRecitalLine(recitalPlayer.lineIndex);
}
// 朗诵台：把关卡进度（计数 + 卡片切换 + 进度条）整组搬进卡片，替掉原来"第 N 句"的位置。
// 元素是移动而不是复制，所以 ID、事件与进度更新逻辑都只有一份。
// 注意：进度元素被移进卡片后，重写卡片（innerHTML 覆盖）会把它一起销毁，
// 所以重渲染前先暂存到片段里，渲染后再放回该在的位置。
function stashLessonProgress() {
  const label = $('.progress-label');
  const track = $('.progress-track');
  if (!label || !track || !label.closest('#gameArea')) return null;
  const fragment = document.createDocumentFragment();
  fragment.append(label, track);
  return fragment;
}
function relocateLessonProgress(area, stash) {
  const side = $('.lesson-side');
  const label = stash?.querySelector('.progress-label') || $('.progress-label');
  const track = stash?.querySelector('.progress-track') || $('.progress-track');
  if (!side || !label || !track) return;
  const host = area?.querySelector('#cardProgressHost');
  if (host) host.append(label, track);
  else side.prepend(label, track);
}
function renderRound() {
  stopRecitalPlayer();
  window.clearTimeout(recitalAutoReadTimer);
  clearRecitalHighlights();
  const theme = currentTheme();
  renderLessonGroupSwitcher();
  renderTopbarContext();
  if (state.completed) { relocateLessonProgress(null); return renderCompletion(); }
  state.roundLocked = false;
  const game = currentRounds()[state.round];
  const area = $('#gameArea');
  const progressStash = stashLessonProgress();
  if (game.type === 'learn') {
    const recordingAction = state.recordingEnabled ? '<button class="record-practice" id="recordPractice" type="button">跟我说一说</button><div id="practicePlayback"></div>' : '';
    // 英文等学习卡片顶部标出「所在目录 / 分组」，排版与汉字卡片一致
    const learnGroup = currentTheme().id === 'english' ? activeContentGroup('english') : null;
    const groupPath = learnGroup ? lessonGroupPathLabel(learnGroup) : currentTheme().title;
    const groupCount = learnGroup ? learnGroup.words.length : currentTheme().words.length;
    if (currentTheme().id === 'hanzi') {
      area.innerHTML = hanziLearnMarkup(game, recordingAction);
    } else if (currentTheme().id === 'color') {
      const miscGroup = activeContentGroup('misc');
      const groupPath = miscGroup ? lessonGroupPathLabel(miscGroup) : currentTheme().title;
      const groupCount = miscGroup ? miscGroup.words.length : currentTheme().words.length;
      area.innerHTML = miscLearnCardMarkup({
        word: game.word,
        note: miscGroup?.notes?.[game.word] || '',
        groupPath,
        totalWords: groupCount,
        actions: lessonPrimaryActionsMarkup(),
        recording: recordingAction,
      });
    } else {
      area.innerHTML = englishLearnCardMarkup({
        word: game.word,
        note: game.zh,
        image: game.image,
        groupPath: learnGroup ? lessonGroupPathLabel(learnGroup) : currentTheme().title,
        groupCount: learnGroup ? learnGroup.words.length : currentTheme().words.length,
        hasImage: Boolean(learnGroup?.image),
        showImage: learnGroup ? englishImageHintVisible : true,
        sentence: sentenceMarkup(game.word),
        actions: lessonPrimaryActionsMarkup(`中文：${wordMeaning(game.word)}`),
        recording: recordingAction,
      });
    }
    // 插图缺失时退回文字卡片，避免出现破图
    $$('img[data-fallback-image]', area).forEach((img) => img.addEventListener('error', () => { if (img.dataset.fallbackImage) img.src = img.dataset.fallbackImage; }, { once: true }));
    $('#learnNext').addEventListener('click', () => handleCorrect(game.word, 'learn'));
    $('#openEnglishGroupBtn')?.addEventListener('click', () => openGroupModal('english'));
    $('#englishImageToggleBtn')?.addEventListener('click', toggleEnglishImageHint);
    $('#openMiscGroupBtn')?.addEventListener('click', () => openGroupModal('misc'));
    $('#miscSpeak')?.addEventListener('click', (event) => {
      const el = event.currentTarget;
      el.classList.add('speaking');
      speakChinese(game.word, () => el.classList.remove('speaking'));
    });
    $('#hanziSpeak')?.addEventListener('click', (event) => {
      const glyph = event.currentTarget;
      glyph.classList.add('speaking');
      speakChinese(game.word, () => glyph.classList.remove('speaking'));
    });
    $('#hanziSpellbookGroupBtn')?.addEventListener('click', openHanziGroupModal);
    $('#hanziImageToggleBtn')?.addEventListener('click', toggleHanziImageHint);
    $('#openHanziWriterBtn')?.addEventListener('click', () => openHanziWriter(game.word));
    $('#recordPractice')?.addEventListener('click', recordPractice);
    startLearnCountdown(3);
  } else if (game.type === 'recite') {
    const wholePiece = state.recitalMode === 'whole'; const piece = activeRecitalGroup(); const recitalText = wholePiece ? piece.lines.join('\n') : game.text;    const manuscript = wholePiece
      ? `<span class="recital-manuscript">${piece.lines.map((line, index) => `<span class="recital-line" data-recital-line="${index}">${escapeHtml(line)}</span>`).join('')}</span>`
      : `<span class="recital-line recital-line-single" data-recital-line="0">${escapeHtml(recitalText)}</span>`;
    const gapRow = wholePiece
      ? `<div class="recital-gap-row"><label for="recitalGapSelect">句间隔</label><select id="recitalGapSelect" aria-label="两句之间的停顿时间">${RECITAL_GAP_OPTIONS.map((value) => `<option value="${value}" ${value === recitalLineGapMs ? 'selected' : ''}>${recitalGapLabel(value)}</option>`).join('')}</select></div>`
      : '';
    const recordingAction = state.recordingEnabled ? '<button class="record-practice" id="recordPractice" type="button">录下我的朗诵</button><div id="practicePlayback"></div>' : '';
    const modeSwitch = `<div class="recital-mode-switch" role="group" aria-label="朗诵方式"><button type="button" class="${wholePiece ? '' : 'active'}" data-recital-mode="line" aria-pressed="${!wholePiece}">单句朗诵</button><button type="button" class="${wholePiece ? 'active' : ''}" data-recital-mode="whole" aria-pressed="${wholePiece}">整篇朗诵</button></div>`;
    area.innerHTML = recitalLearnCardMarkup({
      title: game.title || game.word,
      directory: piece.directory || '',
      wholePiece,
      modeSwitch,
      gapRow,
      manuscript,
      hint: wholePiece ? '点任意一句即可从该句开始朗读；支持滚动查看' : '点文本，听露娜朗读',
      tip: wholePiece ? '听完整篇后，试着一口气朗诵下来。' : game.zh,
      actions: lessonPrimaryActionsMarkup(),
      recording: recordingAction,
    });
    const pieceTitle = game.title || game.word || piece.name || '';
    const readText = (startIndex = 0, readTitle = false) => {
      playRecitalLines(wholePiece ? piece.lines : [recitalText], $('#reciteListen'), startIndex, readTitle ? pieceTitle : '');
    };
    $('#reciteListen').addEventListener('click', (event) => {
      const clickedLine = event.target.closest('[data-recital-line]');
      const clickedIndex = clickedLine ? parseInt(clickedLine.dataset.recitalLine, 10) : NaN;
      if (recitalPlayerValid()) {
        if (recitalPlayer.paused) {
          if (!Number.isNaN(clickedIndex) && clickedIndex !== recitalPlayer.lineIndex) readText(clickedIndex, false);
          else resumeRecital();
          return;
        }
        pauseRecital();
        return;
      }
      readText(Number.isNaN(clickedIndex) ? 0 : clickedIndex, false);
    });
    $('#recitalGapSelect')?.addEventListener('change', (event) => {
      const next = Number(event.target.value);
      recitalLineGapMs = RECITAL_GAP_OPTIONS.includes(next) ? next : 500;
      save('luna-recital-line-gap', recitalLineGapMs);
      showToast(`句间停顿已设为 ${recitalGapLabel(recitalLineGapMs)}`);
    });
    $$('[data-recital-mode]', area).forEach((button) => button.addEventListener('click', () => { const mode = button.dataset.recitalMode; if (mode !== state.recitalMode) { stopRecitalPlayer(); recitalPlaybackId += 1; state.recitalMode = mode; recitalCurrentLine = 0; state.round = 0; state.completed = false; window.speechSynthesis?.cancel(); stopNativeTts(); renderRound(); } }));
    $('#learnNext').addEventListener('click', () => handleCorrect(game.word, state.lessonMode === 'review' ? 'review' : 'learn'));
    $('#recordPractice')?.addEventListener('click', recordPractice);
    startLearnCountdown(3);
    recitalAutoReadTimer = window.setTimeout(() => readText(0, state.round === 0), 180);
  } else if (game.type === 'stage') {
    // 数字高塔的关卡封面：告诉小朋友这是第几关、要做什么
    area.innerHTML = numberStageCardMarkup({ stage: game.stage, title: game.title, goal: game.goal, preview: game.preview });
    $('#learnNext').addEventListener('click', () => handleCorrect(game.word, 'stage', { record: false, celebration: game.celebration, toast: game.toast }));
    const stageLabel = $('#learnNextLabel');
    if (stageLabel) stageLabel.textContent = '开始闯关';
    // 封面卡没有倒计时，按钮直接可用
    const stageButton = $('#learnNext');
    if (stageButton) { stageButton.disabled = false; stageButton.removeAttribute('aria-disabled'); stageButton.classList.add('ready'); }
    speakChinese(game.goal);
  } else if (game.type === 'board') {
    // 数字板：点一个数字念一个，全部点亮才能继续
    area.innerHTML = numberBoardCardMarkup({ stage: game.stage, title: game.stage.name, goal: game.zh || game.prompt, numbers: game.numbers, hint: '点一点下面的数字，露娜念给你听' });
    bindNumberBoard(area, {
      speakWord: (text, done) => speak(text, done),
      speakChinese: (text, done) => speakChinese(text, done),
      onLight: (count) => recordWordProgress(String(count), 'learn'),
      onComplete: () => {
        const button = $('#learnNext');
        if (button) { button.disabled = false; button.removeAttribute('aria-disabled'); button.classList.add('ready'); }
        triggerConfetti();
        playSuccessChime();
        showToast('全部点亮啦！点「继续」去下一关');
      },
    });
  } else if (game.type === 'quiz') {
    // 算式题 / 比多少题
    area.innerHTML = numberQuizCardMarkup({ stage: game.stage, title: game.stage.name, image: game.image, equation: game.equation, prompt: game.prompt, hint: game.zh, choices: game.choices });
    $('#reviewListenAction')?.addEventListener('click', () => speakChinese(game.prompt));
    $$('[data-choice]', area).forEach((button) => button.addEventListener('click', () => handleChoice(button, game)));
  } else if (game.type === 'action') {
area.innerHTML = `${lessonCardProgress()}<div class="number-action-card"><img src="${game.image}" alt="拍手动作" /><div><p>数字动作</p><h2>${game.prompt}</h2><strong>${game.zh}</strong></div><button class="primary-button" id="actionDone" type="button">${game.actionLabel || '我做完啦'}</button></div>`;
    $('#actionDone').addEventListener('click', () => handleCorrect(game.word, 'action'));
    speak(game.prompt);
  } else if (game.type === 'listen') {
area.innerHTML = `${lessonCardProgress()}<div class="match-word-card"><img src="${game.image}" alt="${game.word} 的图片" /><div class="game-copy"><h2>听一听<br /><em>找一找</em></h2><strong class="match-translation">中文：${game.zh}</strong><p>先听一遍，再点图片。</p></div></div><button class="review-listen-action" id="reviewListenAction" type="button">听一听 <svg viewBox="0 0 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Zm12.5 2A4.5 4.5 0 0 0 14 8v2a2.5 2.5 0 0 1 0 4v2a4.5 4.5 0 0 0 2.5-4Z"/></svg></button><div class="picture-choice-row">${game.choices.map((choice) => `<button class="picture-choice" type="button" data-choice="${choice}"><img src="${wordImage(choice)}" alt="${escapeHtml(wordMeaning(choice))}" /><b>${escapeHtml(wordMeaning(choice))}</b></button>`).join('')}</div>`;
    $('#reviewListenAction').addEventListener('click', () => { speakForCurrentTheme(game.word); $$('.picture-choice', area).forEach((button) => button.classList.add('attention')); setTimeout(() => $$('.picture-choice', area).forEach((button) => button.classList.remove('attention')), 900); });
    $$('[data-choice]', area).forEach((button) => button.addEventListener('click', () => handleChoice(button, game)));
  } else {
area.innerHTML = `${lessonCardProgress()}<div class="match-word-card"><img src="${game.image}" alt="${game.word} 的图片" /><div class="game-copy"><h2>${escapeHtml((game.heading || ['找一找', '对应单词'])[0])}<br /><em>${escapeHtml((game.heading || ['找一找', '对应单词'])[1])}</em></h2>${game.hideTranslation ? '' : `<strong class="match-translation">中文：${escapeHtml(wordMeaning(game.word))}</strong>`}<p>${game.zh}</p></div></div><button class="review-listen-action" id="reviewListenAction" type="button">${escapeHtml(game.action || '先听一遍，再选单词')} <svg viewBox="0 0 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Zm12.5 2A4.5 4.5 0 0 0 14 8v2a4.5 4.5 0 0 1 0 4v2a4.5 2.5 0 0 0 2.5-4Z"/></svg></button><div class="word-choice-row">${game.choices.map((choice) => `<button class="word-choice ${theme.id}" type="button" data-choice="${choice}"><b>${choice}</b><span>点一个单词</span></button>`).join('')}</div>`;
    $('#reviewListenAction').addEventListener('click', () => { speakForCurrentTheme(game.word); $$('.word-choice', area).forEach((button) => button.classList.add('attention')); setTimeout(() => $$('.word-choice', area).forEach((button) => button.classList.remove('attention')), 900); });
    $$('[data-choice]', area).forEach((button) => button.addEventListener('click', () => handleChoice(button, game)));
  }
  bindSentenceButtons(area);
  $('#repeatCurrent')?.addEventListener('click', replayCurrentPrompt);
  addLessonShortcutHints(area);
  relocateLessonProgress(area, progressStash);
  updateProgress();
  if (game.type === 'learn') autoReadWordCard(game.word);
}
async function recordPractice() {
  const button = $('#recordPractice'); const playback = $('#practicePlayback');
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { showToast('这台设备暂不支持录音跟读。'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream); const chunks = [];
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data); });
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      const audio = document.createElement('audio'); audio.controls = true; audio.className = 'practice-playback';
      audio.src = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      playback.replaceChildren(audio); button.disabled = false; button.classList.remove('recording'); button.textContent = '再说一遍';
      showToast('录好啦，点播放按钮听听自己的声音！');
    });
    recorder.start(); button.disabled = true; button.classList.add('recording'); button.textContent = '正在听你说…';
    window.setTimeout(() => recorder.state === 'recording' && recorder.stop(), 2500);
  } catch {
    showToast('没有获得麦克风权限，可以请爸爸妈妈在浏览器设置中开启。');
  }
}

function handleChoice(button, game) {
  if (state.roundLocked || button.disabled) return;
  if (button.dataset.choice === game.correct) { button.classList.add('correct'); handleCorrect(game.word, 'quiz', { toast: game.toast, celebration: game.celebration }); }
  else {
    button.classList.add('try-again'); button.disabled = true;
    const prompt = game.prompt || game.word;
    // 数字高塔的题目是中文，用中文嗓子念；汉字卡念汉字，其余念英文
    if (currentTheme().id === 'hanzi') speakChinese(game.word);
    else if (game.type === 'quiz') speakChinese(prompt);
    else speakForCurrentTheme(prompt);
    showToast('再听一次，露娜相信你！');
  }
}
function showWordCelebration(word, title = '我认识了！') {
  const card = $('.learn-word-card') || $('.misc-learn-card') || $('.recital-card') || $('.number-action-card') || $('#gameArea > div');
  if (card) {
    card.classList.remove('card-mastered');
    void card.offsetWidth;
    card.classList.add('card-mastered');
  }
}
function handleCorrect(word, kind = 'match', extras = {}) {
  if (state.roundLocked) return;
  state.roundLocked = true; state.round += 1;
  if (kind === 'learn') { state.learnedWords = Array.from(new Set([...state.learnedWords, word])); showWordCelebration(word); }
  if (extras.record !== false && word) recordWordProgress(word, kind);
  if (extras.celebration) showWordCelebration(extras.celebration.word, extras.celebration.title);
  refreshAchievements();
  setDailyTask('round'); playSuccessChime(); showToast(extras.toast || `你认识了 ${word}！`); persistProgress(); updateProgress();
  setTimeout(() => {
    if (state.round >= currentRounds().length) { if (state.lessonMode === 'review') completeReview(); else completeTheme(); }
    renderRound();
  }, 450);
}
function awardGroupStar() {
  const prevStars = state.stars || 0;
  state.stars = prevStars + 1;
  const prevUnlocked = Math.floor(prevStars / 5);
  const nextUnlocked = Math.floor(state.stars / 5);
  state.ocOwned = getUnlockedWardrobeItems(state.stars);
  saveOcAvatar();
  persistProgress();
  $('#newDot').hidden = false;
  if (nextUnlocked > prevUnlocked) {
    const newItemId = FIXED_WARDROBE_UNLOCK_SEQUENCE[nextUnlocked - 1];
    const newItem = getItemMeta(newItemId);
    showToast(`获得 1 颗魔法星（共 ${state.stars} 颗）！集齐 5 颗星，解锁了新装扮【${newItem?.name || '新装扮'}】！`);
  } else {
    showToast(`获得 1 颗魔法星（共 ${state.stars} 颗，还差 ${5 - (state.stars % 5)} 颗解锁下一件饰品）！`);
  }
  // 上课奖励游戏币（每日最多奖励 2 枚）
  const currentBonus = Number(state.arcadeStats.coinsBonus?.[todayKey] || 0);
  if (currentBonus < 2) {
    state.arcadeStats.coinsBonus = { ...(state.arcadeStats.coinsBonus || {}), [todayKey]: currentBonus + 1 };
    setTimeout(() => {
      showToast('🎁 努力学习奖励：额外获得 1 枚小小游戏机魔法币 🪙！');
    }, 1800);
  }
}
function completeReview() {
  state.completed = true;
  awardGroupStar();
  if (state.soundOn) playSfx('fanfare');
  triggerConfetti();
  speakChinese(`${childName()}，你真棒！`);
}
function completeTheme() {
  const theme = currentTheme(); state.completed = true;
  state.world[theme.id] = Math.max(state.world[theme.id] || 0, 2);
  state.completedThemes = Array.from(new Set([...state.completedThemes, theme.id]));
  awardGroupStar();
  setDailyTask('theme');
  if (state.soundOn) playSfx('fanfare');
  triggerConfetti();
  speakChinese(`${childName()}，你真棒！`);
}
function renderCompletion() {
  const theme = currentTheme();
  const reviewing = state.lessonMode === 'review';
  $('#gameArea').innerHTML = reviewing
    ? `<div class="completion"><div class="completion-crown">✦</div><h2>魔法回顾完成！<br /><em>${theme.title}</em></h2><p>已经把这些学习内容又记牢了一次。</p><button class="primary-button" type="button" id="backHome">回到魔法城堡 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></div>`
    : `<div class="completion"><div class="completion-crown">♕</div><h2>你完成了<br /><em>${theme.title}!</em></h2><p>魔法礼盒里有新的 OC-English 装扮。</p><div class="reward-chest-preview"><i></i><b>✦</b></div><button class="primary-button" type="button" id="openReward">打开魔法礼盒 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></div>`;
  if (reviewing) $('#backHome').addEventListener('click', () => setScreen('home')); else $('#openReward').addEventListener('click', openReward);
  updateProgress();
}

function renderMagicHouseBook() {
  const entries = Object.entries(state.wordProgress).filter(([key]) => key.startsWith('hanzi:')).map(([key, item]) => ({ word: key.split(':')[1], item }));
  const groups = [['已掌握', entries.filter(({ item }) => item.mastered)], ['正在学习', entries.filter(({ item }) => !item.mastered && item.learn)], ['等待复习', entries.filter(({ item }) => item.mastered && item.dueDate <= todayKey)]];
  const book = $('#magicHouseBookContent');
  book.innerHTML = entries.length ? groups.map(([label, words]) => words.length ? `<section><h3>${label}</h3><div>${words.map(({ word }) => `<article><button class="hanzi-book-word" type="button" data-hanzi-book-word="${escapeHtml(word)}" aria-label="朗读 ${escapeHtml(word)}"><b>${escapeHtml(word)}</b><span>${label}</span></button></article>`).join('')}</div></section>` : '').join('') : '<p class="hanzi-book-empty">先去汉字图书塔完成探险吧。</p>';
  $$('[data-hanzi-book-word]', book).forEach((button) => button.addEventListener('click', () => speakChinese(button.dataset.hanziBookWord)));
}
function renderMagicHouseAchievements() {
  $('#magicHouseAchievementContent').innerHTML = ACHIEVEMENT_DEFINITIONS.map(({ id, label, condition }) => `<article class="${state.achievements.includes(id) ? 'earned' : ''}"><b>${state.achievements.includes(id) ? '✦' : '○'}</b><span>${label}</span><small>${state.achievements.includes(id) ? '已获得' : condition}</small></article>`).join('');
}
function renderMagicHouseCounts() {
  const ownedCount = state.ocOwned.length + 1; const totalOutfits = OC_WARDROBE.length + OC_PART_OPTIONS.hair.length;
  const hanziCount = Object.keys(state.wordProgress).filter((key) => key.startsWith('hanzi:')).length;
  $('#magicHouseCountCloset').textContent = `${ownedCount}/${totalOutfits}`;
  $('#magicHouseCountBook').textContent = hanziCount;
  $('#magicHouseCountAchievements').textContent = `${state.achievements.length}/${ACHIEVEMENT_DEFINITIONS.length}`;
}
function setMagicHouseTab(tab) {
  const next = ['closet', 'book', 'achievements'].includes(tab) ? tab : 'closet'; state.magicHouseTab = next; renderMagicHouseCounts();
  $$('[data-magic-house-tab]').forEach((button) => { const active = button.dataset.magicHouseTab === next; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  $$('.magic-house-panel').forEach((panel) => { panel.hidden = panel.id !== `magicHousePanel${next[0].toUpperCase()}${next.slice(1)}`; });
  if (next === 'closet') renderWardrobe();
  if (next === 'book') renderMagicHouseBook();
  if (next === 'achievements') renderMagicHouseAchievements();
}
function triggerAvatarDressPop() {
  const avatar = $('#ocAvatar');
  if (!avatar) return;
  avatar.classList.remove('avatar-dress-pop');
  void avatar.offsetWidth;
  avatar.classList.add('avatar-dress-pop');
}
function renderWardrobe() {
  $('#ocAvatar').innerHTML = renderCharacterSVG(state.ocAvatar, 1.45);
  $('#ocCollectionCount').textContent = `${state.ocOwned.length + 1} / ${OC_WARDROBE.length + OC_PART_OPTIONS.hair.length}`;
  const category = OC_CATEGORY_META.find((item) => item.id === state.ocTab);
  $('#ocLookName').textContent = '✨ 点选装扮盒，给露娜试穿新造型';
  renderOcTabs(); renderOcItems(); renderMagicHouseCounts();
  renderHomeAvatar();
}
function renderOcTabs() {
  $('#ocCategoryTabs').innerHTML = OC_CATEGORY_META.map((category) => `<button class="oc-category-tab ${state.ocTab === category.id ? 'active' : ''}" type="button" data-oc-tab="${category.id}">${wardrobeIcon(category.id)}<span>${category.label}</span></button>`).join('');
  $$('[data-oc-tab]').forEach((button) => button.addEventListener('click', () => { state.ocTab = button.dataset.ocTab; renderOcTabs(); renderOcItems(); const grid = $('#ocItemGrid'); if (grid) grid.scrollLeft = 0; }));
}
function renderOcItems() {
  const grid = $('#ocItemGrid');
  if (state.ocTab === 'hair') {
    grid.innerHTML = OC_PART_OPTIONS.hair.map((hair) => {
      const isOwned = hair.i === 3 || state.ocOwned.includes(`hair_${hair.i}`);
      const isEquipped = state.ocAvatar.hair === hair.i;
      return `<button class="oc-item-card ${isOwned ? '' : 'locked'} ${isEquipped ? 'equipped' : ''}" type="button" data-oc-hair="${hair.i}" ${isOwned ? '' : 'disabled'}><span class="oc-item-preview hair-preview">${isOwned ? renderCharacterSVG({ ...state.ocAvatar, hair: hair.i, outfit: {} }, .42) : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7a4 4 0 0 1 8 0v3"/><rect x="5" y="10" width="14" height="11" rx="2"/></svg>'}</span><strong>${hair.name}</strong><small>${isOwned ? (isEquipped ? '正在使用' : '点一下试试') : '完成课程解锁'}</small></button>`;
    }).join('');
    $$('[data-oc-hair]').forEach((button) => button.addEventListener('click', () => {
      const hairIdx = Number(button.dataset.ocHair);
      if (hairIdx !== 3 && !state.ocOwned.includes(`hair_${hairIdx}`)) return;
      state.ocAvatar.hair = hairIdx;
      saveOcAvatar();
      setDailyTask('dress');
      renderWardrobe();
      triggerAvatarDressPop();
      playSfx('pop');
      showToast('换了一个新发型！');
    }));
    return;
  }
  const category = OC_CATEGORY_META.find((item) => item.id === state.ocTab);
  const items = OC_WARDROBE.filter((item) => item.slot === category.slot);
  grid.innerHTML = items.map((item) => { const owned = state.ocOwned.includes(item.id); const equipped = state.ocAvatar.outfit[category.slot] === item.id; return `<button class="oc-item-card ${owned ? '' : 'locked'} ${equipped ? 'equipped' : ''}" type="button" data-oc-item="${item.id}" ${owned ? '' : 'disabled'}><span class="oc-item-preview slot-${category.slot}">${owned ? wardrobeThumb(item.id) : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7a4 4 0 0 1 8 0v3"/><rect x="5" y="10" width="14" height="11" rx="2"/></svg>'}</span><strong>${item.name}</strong><small>${owned ? (equipped ? '正在使用' : '点一下试试') : '完成课程解锁'}</small></button>`; }).join('');
  $$('[data-oc-item]').forEach((button) => button.addEventListener('click', () => {
    state.ocAvatar.outfit[category.slot] = button.dataset.ocItem;
    saveOcAvatar();
    setDailyTask('dress');
    renderWardrobe();
    triggerAvatarDressPop();
    playSfx('pop');
    showToast('露娜换好了新装扮！');
  }));
}

function openReward() {
  $('#rewardModal').classList.add('open'); $('#rewardModal').setAttribute('aria-hidden', 'false'); $('#rewardChest').classList.add('opening');
  if (state.soundOn) playSfx('victory');
  triggerHaptic(40);
  triggerConfetti();
  const unlockedCount = state.ocOwned.length;
  const latestItemId = unlockedCount > 0 ? state.ocOwned[unlockedCount - 1] : null;
  const latestItem = latestItemId ? getItemMeta(latestItemId) : null;
  const firstThumb = $('#ocRewardDress'); const lastThumb = $('#ocRewardWings');
  if (latestItem) {
    if (latestItem.slot === 'hair') {
      firstThumb.className = 'oc-reward-thumb slot-hair';
      firstThumb.innerHTML = renderCharacterSVG({ ...state.ocAvatar, hair: latestItem.hairIndex, outfit: {} }, .42);
    } else {
      firstThumb.className = `oc-reward-thumb slot-${latestItem.slot || 'default'}`;
      firstThumb.innerHTML = wardrobeThumb(latestItem.id);
    }
    $('#ocRewardName1').textContent = latestItem.name;
    const nextItemId = FIXED_WARDROBE_UNLOCK_SEQUENCE[unlockedCount];
    const nextItem = nextItemId ? getItemMeta(nextItemId) : null;
    if (nextItem) {
      lastThumb.hidden = false;
      lastThumb.className = 'oc-reward-thumb locked-preview';
      lastThumb.innerHTML = '<span class="star-token">⭐</span>';
      $('#ocRewardName2').textContent = `再攒 ${5 - (state.stars % 5)} 星解锁【${nextItem.name}】`;
    } else {
      lastThumb.hidden = true;
      $('#ocRewardName2').textContent = '已集齐全部装扮！';
    }
  } else {
    firstThumb.className = 'oc-reward-thumb star-reward-thumb';
    firstThumb.innerHTML = '<span class="star-token">⭐</span>';
    $('#ocRewardName1').textContent = `获得魔法星（共 ${state.stars} 颗）`;
    const nextItemId = FIXED_WARDROBE_UNLOCK_SEQUENCE[0];
    const nextItem = nextItemId ? getItemMeta(nextItemId) : null;
    lastThumb.hidden = false;
    lastThumb.className = 'oc-reward-thumb locked-preview';
    lastThumb.innerHTML = '<i>🔒</i>';
    $('#ocRewardName2').textContent = `再攒 ${5 - (state.stars % 5)} 星解锁【${nextItem?.name || '新装扮'}】`;
  }
  speak(`A magic gift for you, ${childName()}!`); setTimeout(() => $('#claimReward').focus(), 650);
}
function closeReward() { $('#rewardModal').classList.remove('open'); $('#rewardModal').setAttribute('aria-hidden', 'true'); }

function renderRoadmap() {
  const container = $('#roadmapPathContainer');
  if (!container) return;
  const stars = Number(state.stars) || 0;
  const unlockedCount = Math.floor(stars / 5);
  const totalItems = FIXED_WARDROBE_UNLOCK_SEQUENCE.length;

  $('#roadmapStarCount').textContent = stars;
  $('#roadmapUnlockedCount').textContent = `${Math.min(unlockedCount, totalItems)} / ${totalItems}`;

  const rows = [];

  // 起点地标 (0 星)
  rows.push(`
    <div class="roadmap-start-marker" aria-label="星光奇遇起点">
      <span>✨</span>
      <span>魔法探险起点 · 0 ⭐</span>
    </div>
  `);

  FIXED_WARDROBE_UNLOCK_SEQUENCE.forEach((itemId, index) => {
    const requiredStars = (index + 1) * 5;
    const isUnlocked = index < unlockedCount;
    const isCurrent = index === unlockedCount;
    const itemMeta = getItemMeta(itemId);
    const itemName = itemMeta?.name || '神秘宝物';
    const isHair = itemId.startsWith('hair_');
    const hairIdx = isHair ? Number(itemId.replace('hair_', '')) : 0;

    // S 弯交替位置：奇偶交替 left / right
    const posClass = index % 2 === 0 ? 'pos-left' : 'pos-right';
    let statusClass = 'locked';
    let badgeText = `${requiredStars} ⭐`;
    let descText = `需攒齐 ${requiredStars} 颗星`;

    if (isUnlocked) {
      statusClass = 'passed';
      badgeText = '已获得 ✓';
      descText = '已收入衣橱';
    } else if (isCurrent) {
      statusClass = 'current';
      const diff = requiredStars - stars;
      badgeText = `差 ${diff} 星解锁`;
      descText = `当前进度 ${stars}/${requiredStars} ⭐`;
    }

    let thumbHtml = '';
    if (isHair) {
      thumbHtml = renderCharacterSVG({ ...state.ocAvatar, hair: hairIdx, outfit: {} }, 0.42);
    } else {
      thumbHtml = wardrobeThumb(itemId);
    }

    rows.push(`
      <div class="roadmap-node-row ${posClass}" ${isCurrent ? 'id="roadmapCurrentTarget"' : ''}>
        <button class="roadmap-node-card ${statusClass}" type="button" data-roadmap-index="${index}" data-roadmap-id="${itemId}" aria-label="${itemName}，${badgeText}，${descText}">
          <span class="roadmap-node-thumb">${thumbHtml}</span>
          <div class="roadmap-node-body">
            <div class="roadmap-node-header">
              <span class="roadmap-node-stars">⭐ ${requiredStars} 星</span>
              <span class="roadmap-badge">${badgeText}</span>
            </div>
            <strong class="roadmap-node-name">${itemName}</strong>
            <span class="roadmap-node-desc">${descText}</span>
          </div>
        </button>
      </div>
    `);
  });

  // 终点地标
  rows.push(`
    <div class="roadmap-end-marker" aria-label="终点：星光大满贯">
      <span>👑</span>
      <span>星光大满贯 · 全部点亮！</span>
    </div>
  `);

  container.innerHTML = rows.join('');

  // 绑定节点卡片点击交互
  $$('.roadmap-node-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.roadmapIndex);
      const itemId = card.dataset.roadmapId;
      const meta = getItemMeta(itemId);
      const reqStars = (idx + 1) * 5;
      if (idx < unlockedCount) {
        // 已解锁：穿上并跳转到衣帽间
        if (itemId.startsWith('hair_')) {
          state.ocAvatar.hair = Number(itemId.replace('hair_', ''));
          state.ocTab = 'hair';
        } else if (meta?.slot) {
          state.ocAvatar.outfit[meta.slot] = itemId;
          state.ocTab = meta.slot;
        }
        saveOcAvatar();
        setDailyTask('dress');
        setScreen('closet');
        setMagicHouseTab('closet');
        showToast(`已为你换上【${meta?.name || '新装扮'}】！`);
      } else if (idx === unlockedCount) {
        // 当前目标：鼓励提示 + 快速去学习闭环
        const need = reqStars - stars;
        if (state.soundOn) playSfx('tap');
        triggerHaptic(20);
        speakChinese(`加油，${childName()}！只要再拿 ${need} 颗星，就能点亮【${meta?.name || '新道具'}】啦！`);
        showToast(`再获得 ${need} 颗星就能开启这个盲盒啦！快去完成一课吧！`);
        // 延时引导或再次点击直接去上课
        if (card.dataset.promptLearn === 'true') {
          setScreen('lesson');
        } else {
          card.dataset.promptLearn = 'true';
          setTimeout(() => { delete card.dataset.promptLearn; }, 3500);
        }
      } else {
        // 后续未解锁
        if (state.soundOn) playSfx('tap');
        showToast(`积攒满 ${reqStars} 颗魔法星时解锁【${meta?.name || '神秘宝物'}】`);
      }
    });
  });

  // 平滑聚焦到当前目标节点
  requestAnimationFrame(() => {
    const target = $('#roadmapCurrentTarget');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}
let parentGateAnswer = 0;
let parentModeEnabled = storageGet('luna-parent-mode-enabled') === 'true';
function renderParentModeState() {
  const button = $('#parentButton'); const status = $('#parentModeStatus');
  button.classList.toggle('enabled', parentModeEnabled); button.setAttribute('aria-pressed', String(parentModeEnabled));
  button.setAttribute('aria-label', parentModeEnabled ? '家长模式已启用（点击打开家长设置）' : '给爸爸妈妈（家长设置）');
  button.textContent = parentModeEnabled ? '👑 家长模式' : '🌱 给爸爸妈妈';
  if (status) status.textContent = parentModeEnabled ? '家长模式已启用：再次打开无需答题。' : '家长模式未启用。';
}
function setParentModeEnabled(enabled) {
  parentModeEnabled = enabled; saveText('luna-parent-mode-enabled', String(enabled)); renderParentModeState();
  if (state.screen === 'arcade') renderArcade();
}
function speechRateLabel(rate = globalSpeechRate) { if (rate < .85) return '慢速'; if (rate > 1.15) return '快速'; return '标准'; }
function renderSpeechRateControl() {
  const input = $('#speechRate'); const label = $('#speechRateValue');
  if (!input || !label) return;
  input.value = String(globalSpeechRate); input.setAttribute('aria-valuetext', `${speechRateLabel()}，${globalSpeechRate.toFixed(2)} 倍`);
  label.textContent = `${speechRateLabel()} · ${globalSpeechRate.toFixed(2)}×`;
}
const DAILY_LIMIT_OPTIONS = [30, 60, 120, 0];
function dailyLimitLabel(limit) {
  if (!limit) return '不限时长';
  if (limit >= 60) {
    const hours = limit / 60;
    return `${hours} 小时`;
  }
  return `${limit} 分钟`;
}
function renderDailyLimitControl() {
  const input = $('#dailyLimitRange'); const label = $('#dailyLimitValue');
  if (!input || !label) return;
  const limit = Number(state.study.limitMinutes || 0); const index = Math.max(0, DAILY_LIMIT_OPTIONS.indexOf(limit));
  input.value = String(index); input.setAttribute('aria-valuetext', dailyLimitLabel(DAILY_LIMIT_OPTIONS[index]));
  label.textContent = dailyLimitLabel(DAILY_LIMIT_OPTIONS[index]);
}
function renderStarRecoveryControls() {
  const input = $('#starCountInput');
  const status = $('#starRecoveryStatus');
  if (input) input.value = state.stars || 0;
  if (status) status.textContent = `当前：${state.stars || 0} 颗星 · 已解锁 ${state.ocOwned.length} 件饰品`;
}
function renderParentProfileControls() {
  const select = $('#profileSelect');
  if (!select) return;
  select.innerHTML = profiles.map((profile) => `<option value="${profile.id}" ${profile.id === activeProfileId ? 'selected' : ''}>${profile.name}</option>`).join('');
  $('#recordingToggle').setAttribute('aria-pressed', String(state.recordingEnabled));
  $('#recordingToggle').textContent = state.recordingEnabled ? '录音跟读：已开启' : '录音跟读：已关闭';
  $('#parentStudyToday').textContent = `今天已探险 ${Math.floor(studyTodaySeconds() / 60)} 分钟`; $('#parentAchievements').textContent = state.achievements.length;
  renderDailyLimitControl();
  renderSpeechRateControl();
  renderStudyCalendar();
  renderStarRecoveryControls();
  $('#appVersion').textContent = `v${BUILD_INFO.version}`;
  updateProgress();
}
let parentActiveTab = 'overview';
function setParentTab(tab) {
  parentActiveTab = tab || 'overview';
  $$('.parent-tab').forEach((button) => { const active = button.dataset.parentTab === parentActiveTab; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  $$('.parent-tab-panel').forEach((panel) => { panel.hidden = panel.id !== `parentPanel${parentActiveTab[0].toUpperCase()}${parentActiveTab.slice(1)}`; });
  renderStarRecoveryControls();
}
function prepareParentGate() {
  const first = Math.floor(Math.random() * 7) + 7;
  const second = Math.floor(Math.random() * 6) + 3;
  parentGateAnswer = first + second;
  $('#parentGateQuestion').textContent = `请计算：${first} + ${second} = ?`;
  $('#parentGateAnswer').value = ''; $('#parentGateError').hidden = true;
  $('#parentGate').hidden = false;
}
function unlockParent() {
  setParentModeEnabled(true);
  $('#parentGate').hidden = true;
  $('#parentModal').classList.remove('open');
  $('#parentModal').setAttribute('aria-hidden', 'true');
  setScreen('parent');
}
function openParent() {
  if (parentModeEnabled) {
    setScreen('parent');
    return;
  }
  $('#parentModal').classList.add('open');
  $('#parentModal').setAttribute('aria-hidden', 'false');
  prepareParentGate();
  setTimeout(() => $('#parentGateAnswer').focus(), 100);
}
function closeParent() {
  $('#parentModal').classList.remove('open');
  $('#parentModal').setAttribute('aria-hidden', 'true');
  $('#parentButton').focus();
}
function disableParentMode() {
  setParentModeEnabled(false);
  closeParent();
  showToast('家长模式已关闭；下次打开需要重新答题。');
  if (state.screen === 'parent') setScreen('home');
}
function renderAdminContentSummary() {
  ['english', 'hanzi', 'misc'].forEach((kind) => {
    const group = activeContentGroup(kind); const groups = contentGroups(kind);
    $(`#${kind}ConfigMeta`).textContent = `正在学习：${group.name} · ${groups.length} 个分组 · ${group.words.length} 项`;
  });
  const recital = activeRecitalGroup(); $('#recitalConfigMeta').textContent = `正在朗诵：《${recital.name}》· ${recital.lines.length} 句`;
}
function openAdmin() { $('#adminModal').classList.add('open'); $('#adminModal').setAttribute('aria-hidden', 'false'); $('#adminContent').hidden = false; renderAdminContentSummary(); renderContentSyncStatus(); setTimeout(() => $('#openEnglishConfig').focus(), 100); }
function closeAdmin() { $('#adminModal').classList.remove('open'); $('#adminModal').setAttribute('aria-hidden', 'true'); $('#parentButton').focus(); }
function contentSyncStatusText() {
  const builtIn = ADMIN_DEFAULT.resourceVersion ?? 0;
  const remote = remoteContentSnapshot?.resourceVersion;
  const syncedAt = remoteContentSnapshot?.syncedAt;
  const when = syncedAt ? new Date(syncedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '尚未同步';
  return `内置内容 v${builtIn} · 远程内容 ${remote ? `v${remote}` : '未同步'} · ${when}`;
}
function renderContentSyncStatus() {
  const status = $('#contentSyncStatus');
  if (status) status.textContent = contentSyncStatusText();
}
function setContentSyncBusy(busy) {
  const button = $('#syncContentButton');
  if (button) { button.disabled = busy; button.textContent = busy ? '正在同步…' : '同步最新内容'; }
  const restore = $('#restoreOfficialContentButton');
  if (restore) restore.disabled = busy;
}
function applySyncedContent(merged) {
  Object.assign(adminContent, merged);
  saveContentConfiguration();
  applyAdminContent();
  renderAdminContentSummary();
  if (['hanzi', 'english', 'action'].includes(state.activeTheme)) { state.round = 0; state.completed = false; persistProgress(); }
  renderRound();
}
async function syncLearningContent() {
  setContentSyncBusy(true);
  const resultBox = $('#contentSyncResult');
  try {
    const outcome = await syncRemoteContent({ baseUrl: BUILD_INFO.contentBaseUrl, previousSnapshot: remoteContentSnapshot });
    if (!outcome.changed) {
      showToast('学习内容已是最新。');
      renderContentSyncStatus();
      return;
    }
    const previousOfficial = remoteContentSnapshot?.entries?.length ? contentFromEntries(remoteContentSnapshot.entries) : ADMIN_DEFAULT;
    const nextOfficial = contentFromEntries(outcome.entries);
    const merged = mergeSyncedContent({ previousOfficial, nextOfficial, local: adminContent });
    remoteContentSnapshot = { resourceVersion: outcome.manifest.resourceVersion, manifest: outcome.manifest, entries: outcome.entries, syncedAt: Date.now() };
    save(REMOTE_CONTENT_STORAGE_KEY, remoteContentSnapshot);
    applySyncedContent(merged.content);
    const summary = merged.summary;
    if (resultBox) {
      resultBox.hidden = false;
      const line = (label, items) => items.length ? `<li>${label}：${items.map((item) => escapeHtml(item.name)).join('、')}</li>` : '';
      resultBox.innerHTML = `<p>已更新到内容版本 v${outcome.manifest.resourceVersion}${outcome.warnings?.length ? `（${escapeHtml(outcome.warnings[0])}）` : ''}</p><ul>${line('新增', summary.added)}${line('更新', summary.updated)}${line('保留本地修改', summary.keptLocal)}${line('随官方移除', summary.removed)}</ul>`;
    }
    showToast('学习内容已更新。');
  } catch (error) {
    showToast(`内容同步失败：${error?.message || '请检查网络连接'}`, 4200);
  } finally {
    setContentSyncBusy(false);
    renderContentSyncStatus();
  }
}
function restoreOfficialLearningContent() {
  if (!window.confirm('恢复官方内容会丢弃本机对分组名称与内容的修改，确定吗？')) return;
  const restored = restoreOfficialContent({ official: officialContent(), local: adminContent });
  applySyncedContent(restored);
  showToast('已恢复为官方内容。');
}
function groupTitle(kind) {
  if (kind === 'hanzi') return MAP_META.hanzi.name;
  if (kind === 'misc') return MAP_META.color.name;
  return MAP_META.english.name;
}
function groupWordLabel(kind) {
  if (kind === 'hanzi') return '汉字、词组或成语';
  if (kind === 'misc') return '形状、颜色或认知词汇';
  return '英文单词';
}
function groupItemsPreview(group) { return group.words.length ? group.words.slice(0, 4).map((word) => `<span>${escapeHtml(word)}</span>`).join('') + (group.words.length > 4 ? `<i>+${group.words.length - 4}</i>` : '') : '<i>待写入内容</i>'; }
// 分组按目录（学期/单元）折叠展示；没有目录的归到「未分类」。
function groupFolders(groups) {
  const folders = new Map();
  groups.forEach((group) => {
    const key = group.directory || '';
    if (!folders.has(key)) folders.set(key, []);
    folders.get(key).push(group);
  });
  return [...folders.entries()];
}
// 目录改名：把某个目录（连同它的子目录）整体改名。目录名来自内容，代码不写死。
function renameContentFolder(kind, from, to) {
  const name = String(to ?? '').split('/').map((part) => part.trim().replace(/[/\\]/g, ' ')).filter(Boolean).join('/').slice(0, 48);
  if (!name) { showToast('目录名不能为空。'); return; }
  const groups = kind === 'recital' ? recitalGroups() : contentGroups(kind);
  const prefix = from ? `${from}/` : '';
  let changed = 0;
  groups.forEach((group) => {
    const current = group.directory || '';
    if (current === from) { group.directory = name; changed += 1; }
    else if (prefix && current.startsWith(prefix)) { group.directory = `${name}/${current.slice(prefix.length)}`; changed += 1; }
  });
  if (!changed) { showToast('这个目录下没有内容。'); return; }
  saveContentConfiguration();
  applyAdminContent();
  renderAdminContentSummary();
  if (kind === 'recital') renderRecitalGroupList(); else renderContentGroupDirectory(kind);
  showToast(`目录已改名为「${name}」。`);
}
const BROWSER_SCOPES = {
  action: { pathPrefix: '朗诵篇目', rootTitle: '全部篇目', activeLabel: '正在朗诵', unitLabel: '篇', groups: () => recitalGroups(), activeId: () => activeRecitalGroup().id, onSelect: (id) => selectRecitalArticle(id) },
  hanzi: { pathPrefix: '汉字分组', rootTitle: '全部分组', activeLabel: '正在学习', unitLabel: '组', groups: () => contentGroups('hanzi'), activeId: () => activeContentGroup('hanzi').id, onSelect: (id) => selectContentGroup('hanzi', id) },
  english: { pathPrefix: '英文分组', rootTitle: '全部分组', activeLabel: '正在学习', unitLabel: '组', groups: () => contentGroups('english'), activeId: () => activeContentGroup('english').id, onSelect: (id) => selectContentGroup('english', id) },
  color: { pathPrefix: '花园分组', rootTitle: '全部分组', activeLabel: '正在认知', unitLabel: '组', groups: () => contentGroups('misc'), activeId: () => activeContentGroup('misc').id, onSelect: (id) => selectContentGroup('misc', id) },
};
function selectContentGroup(kind, groupId) {
  const group = contentGroups(kind).find((item) => item.id === groupId);
  if (!group) return;
  stopRecitalPlayer();
  setActiveContentGroup(kind, groupId);
  saveContentConfiguration();
  applyAdminContent();
  state.round = 0; state.completed = false; state.roundLocked = false;
  persistProgress();
  renderHome();
  renderRound();
  showToast(`开始学习“${group.name}”分组。`);
}
function selectRecitalArticle(groupId) {
  const group = recitalGroups().find((item) => item.id === groupId);
  if (!group) return;
  stopRecitalPlayer();
  setActiveRecitalGroup(groupId);
  recitalCurrentLine = 0;
  saveContentConfiguration();
  applyAdminContent();
  state.round = 0; state.completed = false; state.roundLocked = false;
  persistProgress();
  renderHome();
  renderRound();
  showToast(`已切换到《${group.name}》。`);
}
function renderContentGroupDirectory(kind) {
  const active = activeContentGroup(kind); const editing = editingContentGroup(kind); const groups = contentGroups(kind);
  $('#contentConfigSummary').innerHTML = `<div><b>${groups.length}</b><span>个分组</span></div><div><b>${groups.reduce((total, group) => total + group.words.length, 0)}</b><span>项内容</span></div><div><b>${active.words.length}</b><span>当前学习项</span></div>`;
  const card = (group) => `<button class="content-group-card ${group.id === editing.id ? 'active' : ''}" type="button" data-content-group="${escapeHtml(group.id)}" aria-pressed="${group.id === editing.id}"><span class="content-group-card-head"><b>${escapeHtml(group.name || '未命名分组')}</b>${group.id === active.id ? '<em>正在学习</em>' : ''}</span><span class="content-group-card-meta">${group.words.length ? `${group.words.length} 项内容` : '待写入'}</span><span class="content-group-card-words">${groupItemsPreview(group)}</span></button>`;
  $('#contentGroupList').innerHTML = groupFolders(groups).map(([folder, items]) => `<section class="content-group-folder"><h4 class="content-group-folder-title">${escapeHtml(folder || '未分类')}${folder ? `<button class="content-group-folder-rename" type="button" data-folder-rename="${escapeHtml(folder)}" data-folder-kind="${kind}">改名</button>` : ''}</h4><div class="content-group-folder-items">${items.map(card).join('')}</div></section>`).join('');
  $$('[data-content-group]', $('#contentGroupList')).forEach((button) => button.addEventListener('click', () => chooseContentGroup(button.dataset.contentGroup)));
  $$('[data-folder-rename]', $('#contentGroupList')).forEach((button) => button.addEventListener('click', () => {
    const next = window.prompt('新的目录名（可用 / 分层）', button.dataset.folderRename);
    if (next === null) return;
    renameContentFolder(button.dataset.folderKind, button.dataset.folderRename, next);
  }));
}
function openContentConfig(kind) {
  const group = editingContentGroup(kind);
  const title = groupTitle(kind);
  $('#contentConfigType').value = kind;
  $('#contentConfigTitle').textContent = title;
  $('#contentConfigDescription').textContent = `每个分组是一份独立的学习清单。新增分组会先以空白草稿显示；填写至少两项内容并保存后，才会成为${title}当前使用的内容。`;
  renderContentGroupDirectory(kind);
  $('#contentGroupName').value = group.name;
  $('#contentGroupWords').value = group.words.join(kind === 'english' ? ', ' : '，');
  $('#contentGroupDirectory').value = group.directory || '';
  $('#contentGroupNameLabel').textContent = `${title}分组名称`;
  $('#contentGroupWordsLabel').textContent = `${groupWordLabel(kind)}（用逗号、分号或换行分隔）`;
  $('#contentConfigModal').classList.add('open');
  $('#contentConfigModal').setAttribute('aria-hidden', 'false');
  setTimeout(() => $('.content-group-card.active', $('#contentGroupList'))?.focus(), 80);
}
function closeContentConfig() { const kind = $('#contentConfigType').value; $('#contentConfigModal').classList.remove('open'); $('#contentConfigModal').setAttribute('aria-hidden', 'true'); if ($('#adminModal').classList.contains('open')) $(`#open${kind[0].toUpperCase()}${kind.slice(1)}Config`).focus(); else $('#parentButton').focus(); }
function selectedContentGroup(kind) { return editingContentGroup(kind); }
function refreshContentConfig(kind) { openContentConfig(kind); }
function chooseContentGroup(groupId) {
  const kind = $('#contentConfigType').value; const group = contentGroups(kind).find((item) => item.id === groupId) || editingContentGroup(kind);
  editingContentGroupIds[kind] = group.id; refreshContentConfig(kind);
}
function saveSelectedContentGroup() {
  const kind = $('#contentConfigType').value; const group = selectedContentGroup(kind); const name = $('#contentGroupName').value.trim().slice(0, 24); const words = normaliseContentWords(kind, $('#contentGroupWords').value);
  if (!name) { showToast('请为分组取一个名称。'); $('#contentGroupName').focus(); return; }
  if (words.length < 2) { showToast(`${groupTitle(kind)}分组至少填写 2 项。`); $('#contentGroupWords').focus(); return; }
  group.name = name; group.words = words; group.directory = normaliseDirectory($('#contentGroupDirectory').value); setActiveContentGroup(kind, group.id); editingContentGroupIds[kind] = group.id; saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary();
  if ((kind === 'misc' && state.activeTheme === 'color') || state.activeTheme === kind) { state.round = 0; state.completed = false; persistProgress(); }
  renderHome(); refreshContentConfig(kind); showToast(`“${name}”已保存，并设为正在学习。`);
}
function addContentGroup() {
  const kind = $('#contentConfigType').value; const groups = contentGroups(kind); const group = { id: `${kind}-${Date.now()}`, name: '', words: [] };
  groups.push(group); editingContentGroupIds[kind] = group.id; saveContentConfiguration(); refreshContentConfig(kind); $('#contentGroupName').focus(); showToast('已新增空白分组，请填写名称和学习内容。');
}
function deleteContentGroup() {
  const kind = $('#contentConfigType').value; const groups = contentGroups(kind);
  if (groups.length <= 1) { showToast('每种内容至少保留一个分组。'); return; }
  const group = selectedContentGroup(kind); const index = groups.findIndex((item) => item.id === group.id); const wasActive = group.id === subjectConfig(kind).activeGroupId;
  const subject = subjectConfig(kind);
  if (!Array.isArray(subject.deletedGroupIds)) subject.deletedGroupIds = [];
  if (!subject.deletedGroupIds.includes(group.id)) subject.deletedGroupIds.push(group.id);
  groups.splice(index, 1);
  if (wasActive) setActiveContentGroup(kind, (groups.find((item) => item.name && item.words.length >= 2) || groups[0]).id);
  editingContentGroupIds[kind] = (groups[Math.max(0, index - 1)] || groups[0]).id; saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary();
  if ((kind === 'misc' && state.activeTheme === 'color') || state.activeTheme === kind) { state.round = 0; state.completed = false; persistProgress(); }
  renderHome(); refreshContentConfig(kind); showToast('分组已删除。');
}
function renderRecitalGroupList() {
  const active = activeRecitalGroup(); const groups = recitalGroups();
  const card = (group) => `<button class="content-group-card ${group.id === active.id ? 'active' : ''}" type="button" data-recital-group="${escapeHtml(group.id)}" aria-pressed="${group.id === active.id}"><span class="content-group-card-head"><b>${escapeHtml(group.name)}</b>${group.id === active.id ? '<em>正在朗诵</em>' : ''}</span><span class="content-group-card-meta">${group.lines.length} 句文本</span><span class="content-group-card-words">${group.lines.slice(0, 2).map((line) => `<span>${escapeHtml(line)}</span>`).join('')}${group.lines.length > 2 ? `<i>+${group.lines.length - 2}</i>` : ''}</span></button>`;
  $('#recitalGroupList').innerHTML = groupFolders(groups).map(([folder, items]) => `<section class="content-group-folder"><h4 class="content-group-folder-title">${escapeHtml(folder || '未分类')}${folder ? `<button class="content-group-folder-rename" type="button" data-folder-rename="${escapeHtml(folder)}" data-folder-kind="recital">改名</button>` : ''}</h4><div class="content-group-folder-items">${items.map(card).join('')}</div></section>`).join('');
  $$('[data-recital-group]', $('#recitalGroupList')).forEach((button) => button.addEventListener('click', () => chooseRecitalGroup(button.dataset.recitalGroup)));
  $$('[data-folder-rename]', $('#recitalGroupList')).forEach((button) => button.addEventListener('click', () => {
    const next = window.prompt('新的目录名（可用 / 分层）', button.dataset.folderRename);
    if (next === null) return;
    renameContentFolder(button.dataset.folderKind, button.dataset.folderRename, next);
  }));
}
function openRecitalConfig() {
  const group = activeRecitalGroup(); $('#recitalGroupTitle').value = group.name; $('#recitalGroupLines').value = group.lines.join('\n'); $('#recitalGroupDirectory').value = group.directory || ''; renderRecitalGroupList();
  $('#recitalConfigModal').classList.add('open'); $('#recitalConfigModal').setAttribute('aria-hidden', 'false'); setTimeout(() => $('.content-group-card.active', $('#recitalGroupList'))?.focus(), 80);
}
function closeRecitalConfig() { $('#recitalConfigModal').classList.remove('open'); $('#recitalConfigModal').setAttribute('aria-hidden', 'true'); $('#openRecitalConfig').focus(); }
function chooseRecitalGroup(id) { const group = recitalGroups().find((item) => item.id === id) || activeRecitalGroup(); setActiveRecitalGroup(group.id); saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary(); if (state.activeTheme === 'action') { state.round = 0; state.completed = false; persistProgress(); } renderHome(); openRecitalConfig(); showToast(`已切换到《${group.name}》，将按行朗诵。`); }
function saveRecitalGroup() {
  const group = activeRecitalGroup(); const name = $('#recitalGroupTitle').value.trim().slice(0, 24); const lines = normaliseRecitalLines($('#recitalGroupLines').value);
  if (!name) { showToast('请填写分组名称。'); $('#recitalGroupTitle').focus(); return; }
  if (!lines.length) { showToast('请至少添加一行朗诵文本。'); $('#recitalGroupLines').focus(); return; }
  group.name = name; group.lines = lines; group.directory = normaliseDirectory($('#recitalGroupDirectory').value); saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary(); if (state.activeTheme === 'action') { state.round = 0; state.completed = false; persistProgress(); } renderHome(); openRecitalConfig(); showToast(`《${name}》已保存，共 ${lines.length} 句。`);
}
function addRecitalGroup() { const groups = recitalGroups(); const group = { id: `recital-${Date.now()}`, name: '新朗诵分组', lines: ['请填写第一句文本。'] }; groups.push(group); setActiveRecitalGroup(group.id); saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary(); openRecitalConfig(); $('#recitalGroupTitle').select(); showToast('已新增分组，请填写名称和每一句文本。'); }
function deleteRecitalGroup() {
  const groups = recitalGroups();
  if (groups.length <= 1) { showToast('至少保留一篇朗诵文本。'); return; }
  const group = activeRecitalGroup();
  const subject = subjectConfig('recital');
  if (!Array.isArray(subject.deletedGroupIds)) subject.deletedGroupIds = [];
  if (!subject.deletedGroupIds.includes(group.id)) subject.deletedGroupIds.push(group.id);
  groups.splice(groups.findIndex((item) => item.id === group.id), 1);
  setActiveRecitalGroup(groups[0].id); saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary();
  if (state.activeTheme === 'action') { state.round = 0; state.completed = false; persistProgress(); }
  renderHome(); openRecitalConfig(); showToast('朗诵分组已删除。');
}
function exportProgress() {
  state.study.backupAt = new Date().toISOString(); persistProgress();
  const payload = { version: 1, exportedAt: new Date().toISOString(), activeProfileId, profiles };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `luna-learning-${todayKey}.json`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000); showToast('学习记录已经导出。');
}
async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data?.version !== 1 || !Array.isArray(data.profiles) || !data.profiles.length) throw new Error('invalid backup');
    if (!window.confirm('导入会替换这台设备现有的学习记录，确定继续吗？')) return;
    profiles = data.profiles.filter((profile) => profile?.id && profile?.name).map((profile) => ({ ...createProfile(profile.name), ...profile }));
    activeProfileId = profiles.some((profile) => profile.id === data.activeProfileId) ? data.activeProfileId : profiles[0].id;
    const profile = activeProfile();
    state.activeTheme = profile.activeTheme || 'color'; state.completedThemes = profile.completedThemes || []; state.learnedWords = profile.learnedWords || [];
    state.stars = Number(profile.stars || 0); state.daily = dailyFor(profile); state.streak = profile.streak || { count: 0, lastCompletedDate: '' };
    state.recordingEnabled = Boolean(profile.recordingEnabled); state.world = profile.world || {}; state.achievements = profile.achievements || []; state.study = profile.study || { date: todayKey, seconds: 0, limitMinutes: 5, backupAt: '' }; state.ocOwned = profile.ocOwned || []; state.ocAvatar = profile.ocAvatar || cloneStarterAvatar();
    state.round = 0; state.completed = false; state.roundLocked = false;
    persistProgress(); renderHome(); renderWardrobe(); renderParentProfileControls(); setScreen('home'); showToast('学习记录导入成功。');
  } catch {
    showToast('这个备份文件无法导入，请选择由魔法城堡导出的 JSON 文件。');
  }
}

const ISSUE_STORAGE_KEY = 'luna-castle-issues-v1';
let currentIssueFilter = 'all';

function loadIssues() {
  return load(ISSUE_STORAGE_KEY, []);
}
function saveIssues(issues) {
  save(ISSUE_STORAGE_KEY, issues);
}

function openIssueTracker() {
  $('#issueTrackerModal')?.classList.add('open');
  $('#issueTrackerModal')?.setAttribute('aria-hidden', 'false');
  renderIssues(currentIssueFilter);
  setTimeout(() => $('#issueTitle')?.focus(), 100);
}
function closeIssueTracker() {
  $('#issueTrackerModal')?.classList.remove('open');
  $('#issueTrackerModal')?.setAttribute('aria-hidden', 'true');
}

function issueTypeBadge(type) {
  const map = {
    bug: { label: '🐞 Bug 缺陷', cls: 'badge-bug' },
    feature: { label: '💡 新想法', cls: 'badge-feature' },
    improvement: { label: '🎨 体验优化', cls: 'badge-improvement' },
  };
  const item = map[type] || { label: type, cls: 'badge-default' };
  return `<span class="issue-badge ${item.cls}">${item.label}</span>`;
}

function issueToMarkdown(issue) {
  const typeMap = { bug: '🐞 Bug 缺陷', feature: '💡 新想法/需求', improvement: '🎨 体验优化' };
  const statusMap = { open: '待处理 (Open)', resolved: '已解决 (Resolved)' };
  const time = new Date(issue.createdAt).toLocaleString('zh-CN', { hour12: false });
  return `### [${issue.type.toUpperCase()}] ${issue.title}
- **类型**: ${typeMap[issue.type] || issue.type}
- **状态**: ${statusMap[issue.status] || issue.status}
- **记录时间**: ${time}
${issue.details ? `\n**详细说明**:\n${issue.details}\n` : ''}`;
}

async function copyAllIssuesMarkdown() {
  const issues = loadIssues().filter((item) => item.status !== 'resolved');
  if (!issues.length) {
    showToast('当前没有待处理的 Issue。');
    return;
  }
  const md = `# 魔法城堡 (Magic Castle) - 反馈与待办清单\n\n> 导出时间：${new Date().toLocaleString('zh-CN')}\n\n` +
    issues.map(issueToMarkdown).join('\n---\n\n');
  try {
    await navigator.clipboard.writeText(md);
    showToast('已复制待办 Issue 的 Markdown 到剪贴板！📋');
  } catch {
    showToast('剪贴板写入失败，请检查浏览器权限。');
  }
}

function exportIssuesMarkdown() {
  const issues = loadIssues();
  if (!issues.length) {
    showToast('暂无记录可导出。');
    return;
  }
  const md = `# 魔法城堡 (Magic Castle) - 反馈与想法汇总\n\n> 导出时间：${new Date().toLocaleString('zh-CN')}\n\n` +
    issues.map(issueToMarkdown).join('\n---\n\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `magic-castle-issues-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出 Markdown 文件！💾');
}

function renderIssues(filter = currentIssueFilter) {
  currentIssueFilter = filter;
  const issues = loadIssues();
  const filtered = issues.filter((item) => {
    if (filter === 'open') return item.status !== 'resolved';
    if (filter === 'resolved') return item.status === 'resolved';
    return true;
  });
  const countEl = $('#issueCount');
  if (countEl) countEl.textContent = String(issues.length);
  $$('.issue-filter-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.filter === filter));

  const list = $('#issueList');
  if (!list) return;
  if (!filtered.length) {
    list.innerHTML = `<p class="issue-empty">暂无${filter === 'open' ? '待处理' : filter === 'resolved' ? '已解决' : ''}记录。在上方记下一条灵感或遇到的问题吧！</p>`;
    return;
  }

  list.innerHTML = filtered.map((issue) => {
    const isResolved = issue.status === 'resolved';
    const timeStr = new Date(issue.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="issue-card ${isResolved ? 'is-resolved' : ''}" data-issue-id="${escapeHtml(issue.id)}">
        <div class="issue-card-top">
          <div class="issue-card-tags">
            ${issueTypeBadge(issue.type)}
            <span class="issue-status-tag ${isResolved ? 'tag-resolved' : 'tag-open'}">${isResolved ? '已解决 ✓' : '待处理'}</span>
          </div>
          <span class="issue-time">${timeStr}</span>
        </div>
        <h4 class="issue-card-title">${escapeHtml(issue.title)}</h4>
        ${issue.details ? `<p class="issue-card-details">${escapeHtml(issue.details)}</p>` : ''}
        <div class="issue-card-actions">
          <button class="issue-btn-status" type="button" data-action="toggle-status">${isResolved ? '标记为未解决' : '标记已解决 ✓'}</button>
          <button class="issue-btn-copy" type="button" data-action="copy-md">复制 Markdown</button>
          <button class="issue-btn-delete" type="button" data-action="delete">删除</button>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-issue-id]', list).forEach((card) => {
    const id = card.dataset.issueId;
    $('[data-action="toggle-status"]', card)?.addEventListener('click', () => {
      const items = loadIssues();
      const target = items.find((i) => i.id === id);
      if (!target) return;
      target.status = target.status === 'resolved' ? 'open' : 'resolved';
      saveIssues(items);
      renderIssues();
      showToast(target.status === 'resolved' ? '已标记为解决！🎉' : '已重新打开待办。');
    });
    $('[data-action="copy-md"]', card)?.addEventListener('click', async () => {
      const items = loadIssues();
      const target = items.find((i) => i.id === id);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(issueToMarkdown(target));
        showToast('已复制该条 Markdown！📋');
      } catch {
        showToast('复制失败，请检查剪贴板权限。');
      }
    });
    $('[data-action="delete"]', card)?.addEventListener('click', () => {
      if (!window.confirm('确定删除这条便签吗？')) return;
      const items = loadIssues().filter((i) => i.id !== id);
      saveIssues(items);
      renderIssues();
      showToast('已删除记录。');
    });
  });
}

function handleIssueFormSubmit(event) {
  event.preventDefault();
  const titleInput = $('#issueTitle');
  const detailsInput = $('#issueDetails');
  const title = titleInput?.value.trim();
  if (!title) {
    titleInput?.focus();
    return;
  }
  const typeRadio = $('input[name="issueType"]:checked');
  const type = typeRadio ? typeRadio.value : 'bug';
  const details = detailsInput?.value.trim() || '';
  const newIssue = {
    id: String(Date.now()),
    type,
    title,
    details,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  const issues = loadIssues();
  issues.unshift(newIssue);
  saveIssues(issues);
  titleInput.value = '';
  if (detailsInput) detailsInput.value = '';
  renderIssues();
  showToast('便签已记录！✍️');
}

$$('[data-screen]').forEach((button) => button.addEventListener('click', () => setScreen(button.dataset.screen)));
$$('[data-magic-house-tab]').forEach((button) => button.addEventListener('click', () => setMagicHouseTab(button.dataset.magicHouseTab)));
$('#topbarLessonTitle').addEventListener('click', () => { if (state.screen === 'arcade' && state.arcadeGameId) { clearTimeout(arcadeSequenceTimer); clearTimeout(whackTimer); clearTimeout(catchTimer); state.arcadeGameId = ''; state.arcadeState = null; renderTopbarContext(); renderArcade(); return; } if (state.screen === 'home') setScreen(state.homeContext === 'closet' ? 'closet' : state.homeContext === 'arcade' ? 'arcade' : 'lesson'); });
$('#magicHouse').addEventListener('click', () => { setScreen('closet'); showToast('欢迎来到魔法屋，给露娜换上新装吧！'); });
$('#gemCountBtn')?.addEventListener('click', () => {
  speakChinese(`${childName()}现在拥有 ${state.stars} 颗魔法星！一起来看星光奇遇之路吧！`);
  setScreen('roadmap');
  showToast(`你有 ${state.stars} 颗魔法星，来看你的星光奇遇之路吧！`);
});
function onStudyTimePillClick() {
  playSfx('pop');
  triggerHaptic(10);
  const studySec = studyTodaySeconds();
  const mins = Math.floor(studySec / 60);
  if (mins > 0) {
    speakChinese(`太棒啦，${childName()}！今天已经认真探险了 ${mins} 分钟啦！继续加油哦！`);
    showToast(`⏳ 今天已经认真探险了 ${mins} 分钟！`);
  } else {
    speakChinese(`你好，${childName()}！今天的魔法探险刚刚开始，快去点亮新关卡吧！`);
    showToast(`⏳ 今天的探险刚刚开始，加油！`);
  }
}
$('#homeStudyBadge')?.addEventListener('click', onStudyTimePillClick);
$('#homeCalendarBadge')?.addEventListener('click', () => {
  playSuccessChime();
  const activeDates = new Set(state.activityDates || []);
  const streakCount = (state.streak && state.streak.count) || 0;
  if (activeDates.has(todayKey)) {
    speakChinese(`太棒啦！今天已经点亮了魔法星，已连续打卡 ${streakCount} 天！`);
    showToast(`🌟 太棒啦！今天已点亮魔法星，已连续打卡 ${streakCount} 天！`);
  } else {
    speakChinese(`今天的魔法水晶正等待被点亮，去任意地图探险完成一关吧！`);
    showToast('💎 今天的星光水晶正等待被点亮，去任意地图探险完成一关吧！');
  }
});
$('#roadmapGoCloset')?.addEventListener('click', () => {
  setScreen('closet');
  setMagicHouseTab('closet');
  showToast('欢迎来到魔法屋，给露娜试穿新造型吧！');
});
$('#homeOcGuide')?.addEventListener('click', () => {
  speakChinese(`你好，${childName()}！快来魔法屋看看吧！`);
  setScreen('closet');
  showToast('欢迎来到魔法屋，给露娜换上新装吧！');
});
function renderSoundToggleState() {
  const toggle = $('#soundToggle');
  if (!toggle) return;
  toggle.setAttribute('aria-pressed', String(state.soundOn));
  toggle.setAttribute('aria-label', state.soundOn ? '关闭声音' : '打开声音');
  toggle.classList.toggle('muted', !state.soundOn);
  const icon = toggle.querySelector('.sound-icon');
  if (icon) icon.textContent = state.soundOn ? '🔔' : '🔕';
}
$('#soundToggle').addEventListener('click', () => {
  state.soundOn = !state.soundOn;
  renderSoundToggleState();
  if (!state.soundOn) {
    window.speechSynthesis?.cancel();
    stopNativeTts();
    stopWardrobeMusic();
  } else if (state.screen === 'closet') startWardrobeMusic();
});
$('#parentButton').addEventListener('click', openParent); $('#closeParent').addEventListener('click', closeParent); $('#disableParentMode').addEventListener('click', disableParentMode); $('#parentBackBtn')?.addEventListener('click', () => setScreen('home'));
$$('[data-parent-tab]').forEach((button) => button.addEventListener('click', () => setParentTab(button.dataset.parentTab)));
$('#parentGateForm').addEventListener('submit', (event) => { event.preventDefault(); if (Number($('#parentGateAnswer').value) === parentGateAnswer) unlockParent(); else { $('#parentGateError').hidden = false; $('#parentGateAnswer').select(); } });
$('#profileSelect').addEventListener('change', (event) => switchProfile(event.target.value));
$('#createProfile').addEventListener('click', () => { const input = $('#newProfileName'); const name = input.value.trim(); if (!name) { input.focus(); return; } const profile = createProfile(name); profiles.push(profile); input.value = ''; switchProfile(profile.id); showToast(`已为 ${profile.name} 建立新的学习档案。`); });
$('#dailyLimitRange').addEventListener('input', (event) => { const index = Number(event.target.value); state.study.limitMinutes = DAILY_LIMIT_OPTIONS[index]; renderDailyLimitControl(); });
$('#dailyLimitRange').addEventListener('change', () => { persistProgress(); showToast(state.study.limitMinutes ? `已设置每日 ${dailyLimitLabel(state.study.limitMinutes)}探险时间。` : '已取消每日探险时间限制。'); });
$('#speechRate').addEventListener('input', (event) => { globalSpeechRate = clamp(Number(event.target.value), .5, 1.5); saveText('luna-global-speech-rate', String(globalSpeechRate)); renderSpeechRateControl(); });
$('#speechRate').addEventListener('change', () => { window.speechSynthesis?.cancel(); showToast(`全局朗读语速已设为${speechRateLabel()}。`); });
$('#recordingToggle').addEventListener('click', () => { state.recordingEnabled = !state.recordingEnabled; persistProgress(); renderParentProfileControls(); showToast(state.recordingEnabled ? '已开启录音跟读；录音只留在当前页面。' : '已关闭录音跟读。'); });
$('#saveStarCountBtn')?.addEventListener('click', () => {
  const input = $('#starCountInput');
  const count = Math.max(0, parseInt(input?.value, 10) || 0);
  state.stars = count;
  state.ocOwned = getUnlockedWardrobeItems(count);
  for (const slot of Object.keys(state.ocAvatar.outfit || {})) {
    if (state.ocAvatar.outfit[slot] && !state.ocOwned.includes(state.ocAvatar.outfit[slot])) {
      state.ocAvatar.outfit[slot] = '';
    }
  }
  if (state.ocAvatar.hair !== 3 && !state.ocOwned.includes(`hair_${state.ocAvatar.hair}`)) {
    state.ocAvatar.hair = 3;
  }
  saveOcAvatar();
  persistProgress();
  updateProgress();
  renderWardrobe();
  renderStarRecoveryControls();
  showToast(`已设置 ${count} 颗魔法星，已按固定顺序解锁 ${state.ocOwned.length} 件饰品！`);
});
$('#adminButton').addEventListener('click', () => { closeParent(); openAdmin(); });
$('#closeAdmin').addEventListener('click', closeAdmin);
$('#syncContentButton')?.addEventListener('click', syncLearningContent);
$('#restoreOfficialContentButton')?.addEventListener('click', restoreOfficialLearningContent);
$('#openEnglishConfig').addEventListener('click', () => openContentConfig('english')); $('#openHanziConfig').addEventListener('click', () => openContentConfig('hanzi')); $('#openRecitalConfig').addEventListener('click', openRecitalConfig); $('#openMiscConfig')?.addEventListener('click', () => openContentConfig('misc'));
$('#closeContentConfig').addEventListener('click', closeContentConfig); $('#saveContentGroup').addEventListener('click', saveSelectedContentGroup); $('#addContentGroup').addEventListener('click', addContentGroup); $('#deleteContentGroup').addEventListener('click', deleteContentGroup);
$('#contentConfigModal').addEventListener('click', (event) => { if (event.target === $('#contentConfigModal')) closeContentConfig(); });
$('#closeRecitalConfig').addEventListener('click', closeRecitalConfig); $('#addRecitalGroup').addEventListener('click', addRecitalGroup); $('#saveRecitalGroup').addEventListener('click', saveRecitalGroup); $('#deleteRecitalGroup').addEventListener('click', deleteRecitalGroup); $('#recitalConfigModal').addEventListener('click', (event) => { if (event.target === $('#recitalConfigModal')) closeRecitalConfig(); });
$('#openIssueTrackerBtn')?.addEventListener('click', () => { closeParent(); openIssueTracker(); });
$('#closeIssueTracker')?.addEventListener('click', closeIssueTracker);
$('#issueTrackerModal')?.addEventListener('click', (event) => { if (event.target === $('#issueTrackerModal')) closeIssueTracker(); });
$('#issueForm')?.addEventListener('submit', handleIssueFormSubmit);
$('#copyAllIssuesMarkdown')?.addEventListener('click', copyAllIssuesMarkdown);
$('#exportIssuesMarkdown')?.addEventListener('click', exportIssuesMarkdown);
$$('.issue-filter-btn').forEach((btn) => btn.addEventListener('click', () => renderIssues(btn.dataset.filter)));
$('#exportProgress').addEventListener('click', exportProgress);
$('#importProgress').addEventListener('click', () => $('#importProgressFile').click());
$('#importProgressFile').addEventListener('change', (event) => { importProgress(event.target.files[0]); event.target.value = ''; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then((registration) => {
      if (registration.waiting) showToast('城堡有新内容，重新打开后即可使用。');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) showToast('城堡地图已更新，重新打开后即可使用。'); });
      });
    }).catch(() => {
      // The game remains fully usable online if an older browser cannot register a worker.
    });
  });
}
$('#checkForUpdate').addEventListener('click', async () => {
  const button = $('#checkForUpdate'); button.disabled = true; button.textContent = '检查中…';
  try {
    const response = await fetch(`https://api.github.com/repos/${BUILD_INFO.releaseRepository}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error('release lookup failed');
    const latest = (await response.json()).tag_name?.replace(/^v/, '') || '';
    showToast(latest && latest !== BUILD_INFO.version ? `发现 v${latest}，请前往 GitHub Release 更新。` : '已经是最新版本。');
  } catch { showToast('暂时无法检查更新，请稍后再试。'); }
  finally { button.disabled = false; button.textContent = '检查更新'; }
});
$('#voiceTest').addEventListener('click', () => { chooseEnglishVoice(); speak(`Hello, ${childName()}! I am Luna. Let us learn English together.`); });
$('#claimReward').addEventListener('click', () => { closeReward(); $('#newDot').hidden = false; setScreen('closet'); showToast('新的 OC-English 装扮已经放进衣橱！'); });
$('#closeWheelModal')?.addEventListener('click', closeArcadeWheelModal);
$('#arcadeWheelModal')?.addEventListener('click', (event) => { if (event.target === $('#arcadeWheelModal')) closeArcadeWheelModal(); });
$('#spinWheelBtn')?.addEventListener('click', spinArcadeWheel);
$('#dailyWrapHome').addEventListener('click', () => { closeDailyWrapUp(); setScreen('home'); });
$('#dailyWrapCloset').addEventListener('click', () => { closeDailyWrapUp(); setScreen('closet'); });
$('#parentModal').addEventListener('click', (event) => { if (event.target === $('#parentModal')) closeParent(); });
$('#closeHanziGroupModal')?.addEventListener('click', closeHanziGroupModal);
$('#closeHanziGroupModalPrimary')?.addEventListener('click', closeHanziGroupModal);
$('#hanziGroupModal')?.addEventListener('click', (event) => { if (event.target === $('#hanziGroupModal')) closeHanziGroupModal(); });
$('#closeHanziWriterModal')?.addEventListener('click', closeHanziWriter);
$('#hanziWriterAnimateBtn')?.addEventListener('click', animateHanziWriter);
$('#hanziWriterQuizBtn')?.addEventListener('click', () => startHanziQuiz(true));
$('#hanziWriterResetBtn')?.addEventListener('click', () => {
  renderHanziWriterWord();
});
$('#prevCardBtn')?.addEventListener('click', () => navigateCard(-1));
$('#nextCardBtn')?.addEventListener('click', () => navigateCard(1));
$('#resetProgress').addEventListener('click', () => { state.round = 0; state.completed = false; state.roundLocked = false; closeParent(); setScreen('home'); showToast('今天的挑战已经从第一关重新开始。'); });
window.addEventListener('resize', () => {
  if ($('#hanziGroupModal')?.classList.contains('open')) { updateHanziGridGeometry(activeContentGroup('hanzi').words.length); }
  if ($('#hanziWriterModal')?.classList.contains('open')) { renderHanziWriterWord(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDailyBoundary(); });
window.addEventListener('popstate', () => { const [,screen = 'home', theme] = location.hash.match(/^#([^/]+)\/?(.*)?/) || []; if (theme && THEMES[theme]) state.activeTheme = theme; setScreen(['home','lesson','closet','arcade','roadmap','parent'].includes(screen) ? screen : 'home', { push: false }); });
document.addEventListener('keydown', handleLessonShortcuts);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('#recitalConfigModal').classList.contains('open')) closeRecitalConfig(); else if (event.key === 'Escape' && $('#contentConfigModal').classList.contains('open')) closeContentConfig(); else if (event.key === 'Escape' && $('#parentModal').classList.contains('open')) closeParent(); else if (event.key === 'Escape' && $('#rewardModal').classList.contains('open')) closeReward(); else if (event.key === 'Escape' && $('#dailyModal').classList.contains('open')) closeDailyWrapUp(); else if (event.key === 'Escape' && $('#adminModal').classList.contains('open')) closeAdmin(); else if (event.key === 'Escape' && $('#hanziGroupModal')?.classList.contains('open')) closeHanziGroupModal(); else if (event.key === 'Escape' && $('#issueTrackerModal')?.classList.contains('open')) closeIssueTracker(); else if (event.key === 'Escape' && $('#hanziWriterModal')?.classList.contains('open')) closeHanziWriter(); else if (event.key === 'Escape' && $('#arcadeWheelModal')?.classList.contains('open')) closeArcadeWheelModal(); });

$('.app-shell').classList.add('home-active'); renderTopbarContext(); mountHomeMap(); renderWardrobe(); renderHome(); updateProgress(); renderSoundToggleState(); renderParentModeState(); renderSpeechRateControl(); renderParentProfileControls(); renderContentSyncStatus(); if (location.hash) window.dispatchEvent(new PopStateEvent('popstate'));
