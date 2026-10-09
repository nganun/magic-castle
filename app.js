import { getPartOptions, renderCharacterSVG } from './assets/characters/luna/character.js';
import { wardrobeThumb } from './assets/characters/luna/wardrobe.js';
import { OC_WARDROBE } from './assets/characters/luna/wardrobe-data.js';
import { ACHIEVEMENT_DEFINITIONS, unlockAchievementIds } from './features/achievements.js';
import { createStorage } from './features/storage.js';
import { themeNeedsReview as isThemeReviewDue, recommendedThemeId as getRecommendedThemeId, dailyRouteThemeIds } from './features/map-route.js';
import { createBuiltInThemes } from './features/theme-catalog.js';
import { WORD_TRANSLATIONS, HANZI_SCENES, WORD_SENTENCES } from './features/content-catalog.js';
import { DEFAULT_LEARNING_CONTENT } from './features/default-content.js';
import { ARCADE_GAMES, createArrowBoard, createColorRound, createFruitWave, createLightsBoard, createListeningRound, createMemoryDeck, createNumberRound, nextArcadeLane, nextRhythmColor, ARCADE_BOARD_SIZE } from './features/arcade-games.js';
import { BUILD_INFO } from './features/build-info.js';
import { playSfx } from './features/audio-sfx.js';
import { triggerConfetti } from './features/confetti.js';
import { DEFAULT_HANZI_CHARS } from './vendor/hanzi-writer/default-chars.js';

const CHILD_NAME = '荆宝';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const { getText: storageGet, load, save, saveText } = createStorage(() => showToast?.('这台设备暂时无法保存学习记录。'));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let globalSpeechRate = clamp(Number(storageGet('luna-global-speech-rate') || 1), .5, 1.5);

let THEMES = createBuiltInThemes();

const ADMIN_DEFAULT = DEFAULT_LEARNING_CONTENT;
const ADMIN_CONTENT_STORAGE_KEY = 'luna-admin-content-v4';
const adminContent = load(ADMIN_CONTENT_STORAGE_KEY, JSON.parse(JSON.stringify(ADMIN_DEFAULT)));
function safeEnglishWords(value) { return String(value).split(/[，,；;\n]/).map((word) => word.trim().toLowerCase()).filter((word) => /^[a-z]{1,16}$/.test(word)).slice(0, 24); }
function safeHanzi(value) { return String(value).split(/[，,；;\n]/).map((term) => term.trim()).filter((term) => /^[\p{Script=Han}]{1,8}$/u.test(term)).slice(0, 24); }
function subjectConfig(kind) { return adminContent[kind]; }
function defaultContentWords(kind) { return subjectConfig(kind).fallbackItems; }
function normaliseContentWords(kind, words) { return kind === 'hanzi' ? safeHanzi(Array.isArray(words) ? words.join('，') : words) : safeEnglishWords(Array.isArray(words) ? words.join(',') : words); }
const editingContentGroupIds = { english: null, hanzi: null };
function contentGroups(kind) {
  const subject = subjectConfig(kind);
  const existing = Array.isArray(subject.groups) ? subject.groups
    .map((group, index) => ({ id: String(group?.id || `${kind}-${index + 1}`), name: typeof group?.name === 'string' ? group.name.trim().slice(0, 16) : `${kind === 'hanzi' ? '汉字' : '英文'}分组 ${index + 1}`, words: normaliseContentWords(kind, group?.words) })) : [];
  if (existing.length) { subject.groups = existing; return existing; }
  const fallback = normaliseContentWords(kind, subject.fallbackItems);
  const initial = { id: `${kind}-basics`, name: kind === 'hanzi' ? '汉字启蒙' : '基础单词', words: fallback };
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
function normaliseRecitalLines(value) { return String(Array.isArray(value) ? value.join('\n') : value).split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 24); }
function recitalGroups() {
  const subject = subjectConfig('recital');
  const groups = Array.isArray(subject.groups) ? subject.groups.map((group, index) => ({ id: String(group?.id || `recital-${index + 1}`), name: String(group?.name || `朗诵第 ${index + 1} 组`).trim().slice(0, 24), lines: normaliseRecitalLines(group?.lines) })).filter((group) => group.name) : [];
  if (groups.length) { subject.groups = groups; return groups; }
  subject.groups = ADMIN_DEFAULT.recital.groups.map((group) => ({ ...group, lines: [...group.lines] }));
  subject.activeGroupId = ADMIN_DEFAULT.recital.activeGroupId;
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
function buildCustomTheme(id, title, subtitle, words, isHanzi = false) {
  const fallback = isHanzi ? ['人', '大人', '人口'] : ['red', 'yellow', 'blue'];
  const list = words.length >= 2 ? words : fallback;
  const rounds = list.map((word) => ({ type: 'learn', chip: isHanzi ? (word.length > 1 ? '认识词组' : '认识汉字') : '认识单词', word, image: isHanzi ? textCard(word, '#fff0dc') : wordImage(word) || textCard(word), zh: isHanzi ? `看一看，读一读“${word}”。` : `看一看，这是 ${word}。` }));
  const reviewRounds = list.map((word, index) => { const other = list[(index + 1) % list.length]; return { type: index % 2 ? 'listen' : 'match', chip: index % 2 ? '听音找一找' : '魔法复习', prompt: isHanzi ? `Find ${word}` : 'Which word matches?', word, image: isHanzi ? textCard(word, '#fff0dc') : wordImage(word) || textCard(word), zh: isHanzi ? '听一听，找到对应的汉字或词组。' : '看图片，选出对应的英文单词。', choices: [word, other], correct: word }; });
  return { id, title, subtitle, words: list, rewards: ['hat_wizard', 'gl_star', 'held_book'], rounds, reviewRounds };
}
function applyAdminContent() {
  const english = activeContentGroup('english'); const hanzi = activeContentGroup('hanzi');
  THEMES.english = buildCustomTheme('english', '英文单词', english.name, english.words);
  THEMES.hanzi = buildCustomTheme('hanzi', '汉字魔法', hanzi.name, hanzi.words, true);
  THEMES.action = buildRecitalTheme();
}


function hanziSceneMarkup(word) { const scene = HANZI_SCENES[word]; return scene ? `<div class="hanzi-scene scene-${scene.art}" aria-label="${scene.label}"><i></i><i></i><i></i><span>${scene.label}</span></div>` : ''; }
function wordImage(word) {
  return Object.values(THEMES).flatMap((theme) => theme.rounds).find((round) => round.word === word)?.image || '';
}
const MAP_META = {
  color: { name: '彩虹花园', hint: '找一找会发光的颜色', icon: 'flower' },
  animal: { name: '小小游戏机', hint: '翻翻卡片，听音找图', icon: 'paw' },
  action: { name: '朗诵小舞台', hint: '听一听，把文本读出来', icon: 'spark' },
  number: { name: '数字高塔', hint: '数一数城堡星星', icon: 'tower' },
  hanzi: { name: '汉字图书塔', hint: '打开会说话的文字', icon: 'book' },
  english: { name: '单词森林', hint: '收集新的英文叶片', icon: 'leaf' },
};
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
const starterAvatar = { skin: 0, hair: 3, hairColor: 3, eyes: 0, eyeColor: 2, mouth: 0, showBlush: true, outfit: { hat: '', glasses: '', top: 'top_starter', bottom: 'bottom_starter', shoes: 'shoes_starter', held: 'held_flower', back: '', earring: '' } };
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
    world: {}, achievements: [], study: { date: localDateKey(), seconds: 0, limitMinutes: 5, backupAt: '' },
    ocOwned: ['top_starter', 'bottom_starter', 'shoes_starter', 'held_flower'],
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
  activeTheme: initialProfile.activeTheme || 'color', lessonMode: 'learn',
  completedThemes: initialProfile.completedThemes || [], learnedWords: initialProfile.learnedWords || [], wordProgress: initialProfile.wordProgress || {},
  stars: Number(initialProfile.stars || 0), daily: dailyFor(initialProfile),
  streak: initialProfile.streak || { count: 0, lastCompletedDate: '' },
  recordingEnabled: Boolean(initialProfile.recordingEnabled), activityDates: initialProfile.activityDates || [], arcadeStats: initialProfile.arcadeStats || { totalPlays: 0, bestRhythm: 0, dailyPlays: {} }, world: initialProfile.world || {}, achievements: initialProfile.achievements || [], study: initialProfile.study || { date: todayKey, seconds: 0, limitMinutes: 5, backupAt: '' },
  ocTab: 'hair', ocOwned: initialProfile.ocOwned || ['top_starter', 'bottom_starter', 'shoes_starter', 'held_flower'],
  ocAvatar: initialProfile.ocAvatar || cloneStarterAvatar(),
};
function syncActiveProfile() {
  const profile = activeProfile();
  Object.assign(profile, {
    activeTheme: state.activeTheme, completedThemes: state.completedThemes, learnedWords: state.learnedWords, wordProgress: state.wordProgress,
    stars: state.stars, dailyDate: todayKey, daily: state.daily, streak: state.streak,
    recordingEnabled: state.recordingEnabled, activityDates: state.activityDates, arcadeStats: state.arcadeStats, world: state.world, achievements: state.achievements, study: state.study, ocOwned: state.ocOwned, ocAvatar: state.ocAvatar,
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
  state.recordingEnabled = Boolean(profile.recordingEnabled); state.activityDates = profile.activityDates || []; state.world = profile.world || {}; state.achievements = profile.achievements || []; state.study = profile.study || { date: todayKey, seconds: 0, limitMinutes: 5, backupAt: '' };
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
  if (silent) {
    showToast('汉字朗读没有发出声音。已打开语音设置：请重新下载“中文”语音，或换用其它朗读引擎。');
  } else if (engineProblem) {
    showToast('系统朗读引擎暂时不可用，汉字读不出声音。已打开语音设置，请检查或更换“文字转语音”引擎。');
  } else {
    showToast('这台设备缺少中文语音包，汉字暂时读不出声音。已为你打开语音下载页面，请下载“中文（简体）”后回到城堡再试一次。');
  }
  if (requestedTtsLanguageInstall.has(lang)) return;
  requestedTtsLanguageInstall.add(lang);
  plugin?.openLanguageInstall?.().catch(() => {});
}
function speakWithNativeTts(text, options, onend, onUnavailable) {
  const plugin = nativeTextToSpeech();
  if (!plugin) return false;
  const finish = () => onend?.();
  const fallback = () => onUnavailable?.() || finish();
  const languages = options.langCandidates || [options.lang];
  const baseOptions = { ...options }; delete baseOptions.langCandidates;
  // A successful call that returns far too fast means the engine accepted the utterance but
  // never actually voiced it (broken/missing voice data) — treat that as a failure, not success.
  const start = (lang) => {
    const startedAt = Date.now();
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
function speakWithBrowserTts(text, { lang, voice, rate, pitch }, onend) {
  if (!('speechSynthesis' in window)) { onend?.(); return false; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang; utterance.voice = voice || null; utterance.rate = rate; utterance.pitch = pitch; utterance.volume = 1;
  utterance.onend = onend; utterance.onerror = onend;
  window.speechSynthesis.speak(utterance);
  return true;
}
function speak(text, onend) {
  const run = ++speechRun;
  if (!state.soundOn) { onend?.(); return false; }
  const finish = () => { if (run === speechRun) onend?.(); };
  const rate = clamp(.84 * globalSpeechRate, .1, 10); const voice = preferredEnglishVoice || chooseEnglishVoice();
  const browserFallback = () => speakWithBrowserTts(text, { lang: voice?.lang || 'en-US', voice, rate, pitch: 1.05 }, finish);
  if (speakWithNativeTts(text, { lang: 'en-US', rate, pitch: 1.05 }, finish, browserFallback)) return true;
  return browserFallback();
}
function speakChinese(text, onend) {
  const run = ++speechRun;
  if (!state.soundOn) { onend?.(); return false; }
  const finish = () => { if (run === speechRun) onend?.(); };
  const rate = clamp(.82 * globalSpeechRate, .1, 10); const voice = preferredChineseVoice || chooseChineseVoice();
  const browserFallback = () => speakWithBrowserTts(text, { lang: voice?.lang || 'zh-CN', voice, rate, pitch: 1.04 }, finish);
  if (speakWithNativeTts(text, { lang: 'zh-CN', langCandidates: ['zh-CN', 'cmn-CN', 'zh'], rate, pitch: 1.04 }, finish, browserFallback)) return true;
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
function showToast(text) {
  const toast = $('#toast'); toast.textContent = text; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}
function routeFor(name) { return name === 'lesson' ? `#lesson/${state.activeTheme}` : `#${name}`; }
function renderTopbarContext() {
  const crumb = $('#topbarLessonTitle');
  const isClosetContext = state.screen === 'closet' || state.screen === 'home' && state.homeContext === 'closet';
  const isArcadeContext = state.screen === 'arcade' || state.screen === 'home' && state.homeContext === 'arcade';
  const label = isArcadeContext ? '小小游戏机' : (isClosetContext ? '魔法屋' : currentTheme().title);
  const arcadeGameOpen = state.screen === 'arcade' && Boolean(state.arcadeGameId);
  const isCurrentScreen = state.screen === 'lesson' || state.screen === 'closet' || state.screen === 'arcade' && !arcadeGameOpen;
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
  if ((name === 'lesson' || name === 'arcade') && !canStartLesson()) { showToast('今天的探险时间已完成，明天再来吧！'); name = 'home'; }
  state.screen = name;
  if (push && location.hash !== routeFor(name)) history.pushState({ screen: name, theme: state.activeTheme }, '', routeFor(name));
  renderTopbarContext();
  $('.app-shell').classList.toggle('home-active', name === 'home');
  if (name === 'closet') startWardrobeMusic(); else stopWardrobeMusic();
  $$('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === `${name}Screen`));
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.screen === name));
  if (name === 'lesson') { lessonSessionStartedAt = Date.now(); renderRound(); }
  if (name === 'arcade') renderArcade();
  if (name === 'closet') { renderWardrobe(); setMagicHouseTab(state.magicHouseTab); }
  $('#main').focus({ preventScroll: true });
}

function refreshDailyBoundary() { const next = localDateKey(); if (next !== todayKey) { todayKey = next; state.daily = dailyFor(activeProfile()); state.study = { ...state.study, date: next, seconds: 0 }; persistProgress(); renderHome(); updateProgress(); } }
function masteredWordCount() { return Object.values(state.wordProgress).filter((item) => item.mastered).length; }
function recordWordProgress(word, kind) { const key = `${state.activeTheme}:${word}`; const item = state.wordProgress[key] || { learn: 0, review: 0, mastered: false, dueDate: todayKey }; if (kind === 'learn') item.learn += 1; else item.review += 1; item.lastSeen = todayKey; item.mastered = item.learn >= 1 && item.review >= 2; item.dueDate = item.mastered ? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) : todayKey; state.wordProgress[key] = item; }
function refreshAchievements() { unlockAchievementIds(state, masteredWordCount()).forEach((id) => { if (!state.achievements.includes(id)) { state.achievements.push(id); const label = ACHIEVEMENT_DEFINITIONS.find((item) => item.id === id)?.label || '新徽章'; showToast(`获得徽章：${label}！`); } }); }
let lessonSessionStartedAt = null;
function studyTodaySeconds() { return state.study.date === todayKey ? state.study.seconds : 0; }
function markActivityToday() { state.activityDates = Array.from(new Set([...(state.activityDates || []), todayKey])).sort().slice(-90); }
function renderStudyCalendar() {
  const calendar = $('#studyCalendar'); if (!calendar) return;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']; const activeDates = new Set(state.activityDates || []); const today = new Date();
  calendar.innerHTML = Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - 6 + index); const key = localDateKey(date); const active = activeDates.has(key); return `<div class="${active ? 'active' : ''} ${key === todayKey ? 'today' : ''}"><i></i><span>${weekdays[date.getDay()]}</span></div>`; }).join('');
}
function finishLessonSession() { if (!lessonSessionStartedAt) return; state.study.seconds += Math.floor((Date.now() - lessonSessionStartedAt) / 1000); lessonSessionStartedAt = null; persistProgress(); }
function canStartLesson() { const limit = Number(state.study.limitMinutes || 0); return !limit || studyTodaySeconds() < limit * 60; }
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
function renderHome() {
  const recommended = recommendedThemeId();
  const route = dailyRouteThemes();
  const routeButton = $('#dailyRoute');
  routeButton.hidden = !route.length;
  if (route.length) { const next = THEMES[route[0]]; routeButton.dataset.theme = next.id; routeButton.textContent = `今日路线：先去${MAP_META[next.id]?.name || next.title}`; }
  $('#themeCards').innerHTML = Object.values(THEMES).map((theme) => {
    const done = state.completedThemes.includes(theme.id);
    const reviewDue = themeNeedsReview(theme);
    const unavailable = state.lessonMode === 'review' && !done;
    const map = MAP_META[theme.id] || { name: theme.title, hint: theme.subtitle, icon: 'spark' };
    const status = state.lessonMode === 'review' ? (done ? '再次探险' : '先探索新知识') : (done ? '已经点亮 · 再去看看' : map.hint);
    return `<button class="theme-card map-node map-${theme.id} ${theme.id === state.activeTheme ? 'active' : ''} ${unavailable ? 'needs-learning' : ''} ${theme.id === recommended ? 'recommended' : ''} ${reviewDue ? 'review-due' : ''}" type="button" data-theme="${theme.id}" aria-label="${map.name}，${status}"><span class="map-copy"><strong>${map.name}</strong></span></button>`;
  }).join('');
  $$('[data-theme]').forEach((button) => button.addEventListener('click', () => selectTheme(button.dataset.theme, true)));
  $('#dailyRoute').onclick = () => selectTheme($('#dailyRoute').dataset.theme, true);
  $$('[data-lesson-mode]').forEach((button) => {
    const active = button.dataset.lessonMode === state.lessonMode;
    button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active));
    button.addEventListener('click', () => { state.lessonMode = button.dataset.lessonMode; state.round = 0; state.completed = false; renderHome(); });
  });
}
let arcadeSequenceTimer = null;
let whackTimer = null;
let catchTimer = null;
function arcadeDailyPlays() { return Number(state.arcadeStats.dailyPlays?.[todayKey] || 0); }
function openArcade() { state.arcadeGameId = ''; state.arcadeState = null; setScreen('arcade'); }
function completeArcadeGame(name, { rhythmScore = 0, arrowScore = 0 } = {}) {
  const stats = state.arcadeStats; const playedBefore = arcadeDailyPlays();
  stats.dailyPlays = { ...(stats.dailyPlays || {}), [todayKey]: playedBefore + 1 }; stats.totalPlays = Number(stats.totalPlays || 0) + 1;
  stats.bestRhythm = Math.max(Number(stats.bestRhythm || 0), rhythmScore);
  stats.bestArrows = Math.max(Number(stats.bestArrows || 0), arrowScore);
  stats.bestFruit = Math.max(Number(stats.bestFruit || 0), fruitScore);
  stats.bestWhack = Math.max(Number(stats.bestWhack || 0), whackScore);
  stats.bestCatch = Math.max(Number(stats.bestCatch || 0), catchScore);
  Object.keys(stats.dailyPlays).sort().slice(0, -30).forEach((key) => delete stats.dailyPlays[key]);
  const rewarded = playedBefore < 3;
  if (rewarded) state.stars += 1;
  setDailyTask('round'); persistProgress(); updateProgress();
  showToast(rewarded ? `完成${name}，获得 1 颗魔法星！` : `完成${name}！今天的小游戏奖励已领取完。`);
}
function arcadeStatus(items) { return `<div class="arcade-status">${items.map(([label, value, tone = 'violet']) => `<span class="${tone}"><b>${value}</b>${label}</span>`).join('')}</div>`; }
function renderArcade() {
  if (state.arcadeGameId !== 'fruit') releaseFruitOrientation();
  renderTopbarContext();
  const area = $('#arcadeArea');
  if (!state.arcadeGameId) {
    const daily = arcadeDailyPlays();
    area.innerHTML = `<section class="arcade-hub"><div class="arcade-heading"><p class="section-kicker">小小游戏机</p><h1>今天想玩什么？</h1><p>每一局都是轻松的魔法复习。</p><div class="arcade-progress"><span>今日小游戏</span><b>${Math.min(daily, 3)} / 3</b><i style="--arcade-progress:${Math.min(daily, 3) / 3 * 100}%"></i></div></div><div class="arcade-game-grid">${ARCADE_GAMES.map((game) => `<button class="arcade-game-card arcade-game-${game.id}" type="button" data-arcade-game="${game.id}"><b>${game.icon}</b><span><strong>${game.name}</strong><small>${game.description}</small><em>${game.meta}</em></span></button>`).join('')}</div><div class="arcade-best-list">${state.arcadeStats.bestRhythm ? `<span>节奏最高 ${state.arcadeStats.bestRhythm} 轮</span>` : ''}${state.arcadeStats.bestArrows ? `<span>箭头最高 ${state.arcadeStats.bestArrows} 个</span>` : ''}${state.arcadeStats.bestFruit ? `<span>切切乐最高 ${state.arcadeStats.bestFruit} 分</span>` : ''}</div></section>`;
    $$('[data-arcade-game]', area).forEach((button) => button.addEventListener('click', () => { state.arcadeGameId = button.dataset.arcadeGame; state.arcadeState = null; renderArcade(); }));
    return;
  }
  if (state.arcadeGameId === 'memory') renderMemoryGame(area);
  if (state.arcadeGameId === 'listen') renderListeningGame(area);
  if (state.arcadeGameId === 'numbers') renderNumberGame(area);
  if (state.arcadeGameId === 'colors') renderColorGame(area);
  if (state.arcadeGameId === 'rhythm') renderRhythmGame(area);
  if (state.arcadeGameId === 'match') renderMatchGame(area);
  if (state.arcadeGameId === 'arrows') renderArrowGame(area);
  if (state.arcadeGameId === 'fruit') renderFruitGame(area);
  if (state.arcadeGameId === 'whack') renderWhackGame(area);
  if (state.arcadeGameId === 'catch') renderCatchGame(area);
  if (state.arcadeGameId === 'lights') renderLightsGame(area);
  if (state.arcadeGameId === 'tictactoe') renderTicTacToeGame(area);
  if (['game2048', 'hanoi', 'klotski', 'sudoku', 'bulls'].includes(state.arcadeGameId)) renderVendorMiniGame(area, state.arcadeGameId);
}
function arcadeLevelProgress(level, maxLevels) {
  if (!level || !maxLevels) return '';
  const dots = Array.from({ length: maxLevels }, (_, i) => `<i class="level-dot ${i < level ? 'done' : ''} ${i === level - 1 ? 'current' : ''}"></i>`).join('');
  return `<div class="arcade-level-bar"><span class="arcade-level-badge">第 ${level} / ${maxLevels} 关</span><span class="arcade-level-dots" aria-hidden="true">${dots}</span></div>`;
}
function arcadeFrame(title, description, body, levelMeta = '') {
  return `<section class="arcade-play"><div class="arcade-play-header"><div class="arcade-title-group"><p class="section-kicker">${title}</p><h1>${description}</h1></div>${levelMeta || ''}</div>${body}</section>`;
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
function getArcadeMemoryDeck(pairCount = 2) {
  let deck = null;
  try { deck = createMemoryDeck(pairCount); } catch {}
  if (deck && deck.length === pairCount * 2) return deck;
  const count = Math.max(2, Math.min(pairCount, ARCADE_FALLBACK_PICTURES.length));
  const pool = [...ARCADE_FALLBACK_PICTURES].sort(() => Math.random() - 0.5).slice(0, count);
  return [...pool, ...pool].sort(() => Math.random() - 0.5).map((item, index) => ({ ...item, cardId: `${item.id}-${index}` }));
}
function getArcadeListeningRound(choiceCount = 2) {
  let round = null;
  try { round = createListeningRound(choiceCount); } catch {}
  if (round && round.choices?.length === choiceCount) return round;
  const count = Math.max(2, Math.min(choiceCount, ARCADE_FALLBACK_PICTURES.length));
  const choices = [...ARCADE_FALLBACK_PICTURES].sort(() => Math.random() - 0.5).slice(0, count);
  const answer = choices[Math.floor(Math.random() * choices.length)];
  return { answer, choices };
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
  const MAX_LEVELS = 5;
  if (!state.arcadeState) {
    state.arcadeState = { level: 1, maxLevels: MAX_LEVELS, deck: getArcadeMemoryDeck(2), open: [], matched: [] };
  }
  const game = state.arcadeState;
  const pairGoal = Math.floor(game.deck.length / 2);
  area.innerHTML = arcadeFrame(
    '魔法翻翻乐',
    `翻开两张相同的卡片 (${game.matched.length} / ${pairGoal} 对)`,
    `<div class="memory-grid memory-pairs-${pairGoal}">${game.deck.map((card, index) => {
      const visible = game.open.includes(index) || game.matched.includes(card.id);
      return `<button class="memory-card ${visible ? 'open' : ''} ${game.matched.includes(card.id) ? 'matched' : ''}" type="button" data-memory-index="${index}" ${visible ? 'disabled' : ''}>${visible ? `<img src="${card.image}" alt="${card.label}" /><span>${card.label}</span>` : '<b>✦</b>'}</button>`;
    }).join('')}</div>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  bindArcadeBack();
  $$('[data-memory-index]', area).forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.memoryIndex);
    game.open.push(index);
    renderMemoryGame(area);
    if (game.open.length !== 2) return;
    const [first, second] = game.open;
    const isMatch = game.deck[first].id === game.deck[second].id;
    window.setTimeout(() => {
      if (isMatch) {
        game.matched.push(game.deck[first].id);
        game.open = [];
        const currentGoal = Math.floor(game.deck.length / 2);
        if (game.matched.length >= currentGoal) {
          if (game.level < game.maxLevels) {
            game.level += 1;
            const nextPairs = Math.min(2 + (game.level - 1), 6);
            game.deck = getArcadeMemoryDeck(nextPairs);
            game.matched = [];
            game.open = [];
            showToast(`🎉 第 ${game.level - 1} 关完成！进入第 ${game.level} 关（${nextPairs} 对卡片）`);
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
  if (!state.arcadeState) {
    state.arcadeState = { level: 1, maxLevels: MAX_LEVELS, ...getArcadeListeningRound(2) };
  }
  const game = state.arcadeState;
  area.innerHTML = arcadeFrame(
    '听音找一找',
    '听一听，找到正确图片',
    `<button class="arcade-listen" id="arcadeListen" type="button">再听一遍 <span>R</span></button><div class="arcade-picture-choices">${game.choices.map((item) => `<button type="button" data-arcade-choice="${item.id}"><img src="${item.image}" alt="${item.label}" /><b>${item.label}</b></button>`).join('')}</div>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  const replay = () => speak(game.answer.id);
  $('#arcadeListen').addEventListener('click', replay);
  window.setTimeout(replay, 120);
  bindArcadeBack();
  $$('[data-arcade-choice]', area).forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.arcadeChoice === game.answer.id) {
      button.classList.add('correct');
      window.setTimeout(() => {
        if (game.level < game.maxLevels) {
          game.level += 1;
          const choiceCount = Math.min(2 + (game.level - 1), 6);
          const nextRound = getArcadeListeningRound(choiceCount);
          game.answer = nextRound.answer;
          game.choices = nextRound.choices;
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
  const MAX_LEVELS = 5;
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
  window.setTimeout(() => speak(String(game.answer)), 120);
  $$('[data-number-choice]', area).forEach((button) => button.addEventListener('click', () => {
    if (Number(button.dataset.numberChoice) === game.answer) {
      button.classList.add('correct');
      window.setTimeout(() => {
        if (game.level < game.maxLevels) {
          game.level += 1;
          const nextRound = createNumberRound(game.level);
          game.answer = nextRound.answer;
          game.choices = nextRound.choices;
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
    `<button class="arcade-listen" id="arcadeColorListen" type="button">再听一遍 <span>R</span></button><div class="arcade-color-choices">${game.choices.map((item) => `<button style="--arcade-color:${item.color}" type="button" data-color-choice="${item.id}"><i></i><b>${item.label}</b></button>`).join('')}</div>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  const replay = () => speak(game.answer.id);
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
}
function arrowMoveResult(arrow, arrows, size) {
  const delta = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[arrow.direction];
  let row = arrow.row + delta[0]; let col = arrow.col + delta[1]; let steps = 1;
  while (row >= 0 && row < size && col >= 0 && col < size) {
    if (arrows.some((item) => item.id !== arrow.id && item.row === row && item.col === col)) return { blocked: true, steps, dx: delta[1], dy: delta[0] };
    row += delta[0]; col += delta[1]; steps += 1;
  }
  return { blocked: false, steps, dx: delta[1], dy: delta[0] };
}
function renderArrowGame(area) {
  const MAX_LEVELS = 3;
  if (!state.arcadeState) {
    const size = 3;
    state.arcadeState = {
      level: 1,
      maxLevels: MAX_LEVELS,
      size,
      arrows: createArrowBoard(size),
      cleared: 0,
      failures: 0,
      moving: null
    };
  }
  const game = state.arcadeState;
  area.innerHTML = arcadeFrame(
    '箭头快跑',
    `点击箭头冲向边框 (${game.size}×${game.size} 棋盘)`,
    `${arcadeStatus([['剩余', game.arrows.length, 'violet'], ['已消除', game.cleared, 'sky'], ['失误', `${game.failures}/3`, game.failures ? 'pink' : 'gold']])}<div class="arrow-grid" style="--arrow-grid:${game.size}">${game.arrows.map((arrow) => {
      const moving = game.moving?.id === arrow.id;
      const movement = moving ? game.moving : null;
      return `<button class="arrow-tile ${moving ? `moving ${movement.blocked ? 'blocked-move' : 'exit-move'}` : ''}" type="button" data-arrow-id="${arrow.id}" style="--arrow-move-x:${movement ? movement.dx * movement.steps * 100 : 0}%;--arrow-move-y:${movement ? movement.dy * movement.steps * 100 : 0}%"><span>${{ up: '↑', down: '↓', left: '←', right: '→' }[arrow.direction]}</span></button>`;
    }).join('')}</div><p class="arcade-rule">箭头会沿方向移动：碰到其它箭头算失误，成功冲出边框才会消除。</p>`,
    arcadeLevelProgress(game.level, game.maxLevels)
  );
  bindArcadeBack();
  $$('[data-arrow-id]', area).forEach((button) => button.addEventListener('click', () => {
    if (game.moving) return;
    const arrow = game.arrows.find((item) => item.id === button.dataset.arrowId);
    const movement = arrowMoveResult(arrow, game.arrows, game.size);
    game.moving = { id: arrow.id, ...movement };
    renderArrowGame(area);
    window.setTimeout(() => {
      if (movement.blocked) {
        game.failures += 1;
        if (game.failures >= 3) {
          state.arcadeState = null;
          showToast('撞到其它箭头了，本局重试！');
          renderArcade();
          return;
        }
      } else {
        game.arrows = game.arrows.filter((item) => item.id !== arrow.id);
        game.cleared += 1;
      }
      game.moving = null;
      if (!movement.blocked && !game.arrows.length) {
        if (game.level < game.maxLevels) {
          game.level += 1;
          const nextSize = game.level === 2 ? 4 : 5;
          game.size = nextSize;
          game.arrows = createArrowBoard(nextSize);
          game.failures = 0;
          showToast(`🎯 第 ${game.level - 1} 关全部冲出！进入第 ${game.level} 关（${nextSize}×${nextSize} 棋盘）`);
          renderArrowGame(area);
          return;
        }
        finishArcadeRound('箭头快跑', { arrowScore: game.cleared });
        return;
      }
      renderArrowGame(area);
    }, 420);
  }));
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
  if (state.lessonMode === 'review' && !state.completedThemes.includes(id)) { showToast('先完成这个主题的单词学习，再来复习吧。'); return; }
  state.activeTheme = id; state.round = 0; state.completed = false; state.roundLocked = false;
  persistProgress(); renderHome();
  if (goToLesson) setScreen('lesson');
}

function updateProgress() {
  const theme = currentTheme(); const total = currentRounds().length;
  $('#starTotal').textContent = 18 + state.stars;
  $('#parentStars').textContent = state.stars;
  $('#parentWords').textContent = masteredWordCount();
  $('#parentStreak').textContent = state.streak.count;
  $('#progressStars').textContent = `${Math.min(state.round, total)} / ${total}`;
  $('#progressLabel').textContent = state.completed ? (state.lessonMode === 'review' ? '魔法回顾完成啦！' : '魔法完成啦！') : `第 ${state.round + 1} 关，共 ${total} 关`;
  $('#progressFill').style.width = `${(Math.min(state.round, total) / total) * 100}%`;
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
  return currentTheme().id === 'hanzi' ? speakChinese(text, onend) : speak(text, onend);
}
function autoReadWordCard(word) {
  const card = $('.learn-word-card');
  const isHanzi = currentTheme().id === 'hanzi';
  const translation = WORD_TRANSLATIONS[word];
  card?.classList.add('is-speaking', isHanzi ? 'speaking-chinese' : 'speaking-english');
  // Hanzi cards read the character itself in Chinese. Other courses keep the
  // English-first, Chinese-explanation sequence.
  if (isHanzi) {
    speakChinese(word, () => card?.classList.remove('is-speaking', 'speaking-chinese'));
    return;
  }
  speak(word, () => {
    card?.classList.remove('speaking-english');
    card?.classList.add('speaking-chinese');
    window.setTimeout(() => speakChinese(translation, () => {
      card?.classList.remove('is-speaking', 'speaking-chinese');
    }), 120);
  });
}

function lessonPrimaryActionsMarkup(name = '') {
  return `<div class="lesson-action-stack">${name ? `<strong class="word-action-name">${escapeHtml(name)}</strong>` : ''}<div class="lesson-primary-actions"><button class="repeat-current-button" id="repeatCurrent" type="button" aria-label="再读一遍，可按 R 键触发"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4.5l5 4.5V4.5L7.5 9H3z" fill="currentColor"/><path d="M16 8.5c1.2 1 2 2.2 2 3.5s-.8 2.5-2 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M19 5.5c2.3 1.8 3.5 4.1 3.5 6.5s-1.2 4.7-3.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span>再读一遍</span><kbd aria-hidden="true">R</kbd></button><button class="primary-button" id="learnNext" type="button" disabled aria-disabled="true"><span class="learn-next-copy"><span id="learnNextLabel">继续</span></span></button></div></div>`;
}
function hanziLearnMarkup(game, recordingAction) {
  const parts = [...game.word];
  const group = activeContentGroup('hanzi');
  const totalWords = group.words.length;
  const related = parts.length > 1 ? parts : currentTheme().words.filter((item) => item !== game.word && item.includes(game.word)).slice(0, 2);
  const relatedMarkup = related.length ? related.map((item) => `<span>${item}</span>`).join('') : '<span>今天读一读</span>';
  return `<article class="hanzi-spellbook"><div class="hanzi-book-topline"><p class="hanzi-book-kicker">汉字图书塔 · 会说话的书页</p><button class="hanzi-spellbook-group-btn" id="hanziSpellbookGroupBtn" type="button" aria-label="查看本组汉字，共 ${totalWords} 个"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>查看本组汉字(${totalWords})</span></button></div><button class="hanzi-glyph" data-hanzi-length="${parts.length}" id="hanziSpeak" type="button" aria-label="朗读 ${game.word}"><b>${game.word}</b><small>点一下，听读音</small></button><div class="hanzi-writer-entry"><button class="hanzi-writer-entry-btn" id="openHanziWriterBtn" type="button" aria-label="练习写字与笔顺描红"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg><span>练习写字 (笔顺描红)</span></button></div><p class="hanzi-read-copy">${game.zh}</p>${hanziSceneMarkup(game.word)}<div class="hanzi-word-trail"><em>${parts.length > 1 ? '拆开看看' : '认识词组'}</em><div>${relatedMarkup}</div></div>${lessonPrimaryActionsMarkup()}${recordingAction}</article>`;
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

function openHanziGroupModal() {
  const modal = $('#hanziGroupModal');
  if (!modal) return;
  renderHanziGroupModal();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => $('#closeHanziGroupModal')?.focus(), 80);
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
    speakChinese(word, () => {
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
  const active = activeContentGroup('hanzi');
  const words = active.words;
  const groups = contentGroups('hanzi').filter((g) => g.name && g.words.length >= 2);
  const currentWord = currentRounds()[state.round]?.word;

  $('#hanziGroupModalTitle').textContent = active.name;
  $('#hanziGroupModalCount').textContent = `共 ${words.length} 字`;

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
          setActiveContentGroup('hanzi', targetId);
          saveContentConfiguration();
          applyAdminContent();
          state.round = 0;
          state.completed = false;
          state.roundLocked = false;
          persistProgress();
          renderHome();
          renderRound();
          renderHanziGroupModal();
          showToast(`已切换到“${activeContentGroup('hanzi').name}”分组。`);
        });
      });
    } else {
      tabsContainer.hidden = true;
      tabsContainer.replaceChildren();
    }
  }

  updateHanziGridGeometry(words.length);
  const grid = $('#hanziGroupWordsGrid');
  grid.innerHTML = words.map((word, index) => {
    const isCurrent = currentWord === word;
    const isMastered = Boolean(state.wordProgress[`hanzi:${word}`]?.mastered);
    const isLearned = state.learnedWords.includes(word) || Boolean(state.wordProgress[`hanzi:${word}`]?.learn);
    let cornerTag = '';
    if (isCurrent) {
      cornerTag = '<span class="hanzi-card-tag is-current">正在学 ⭐</span>';
    } else if (isMastered) {
      cornerTag = '<span class="hanzi-card-tag is-mastered">已掌握 ✓</span>';
    } else if (isLearned) {
      cornerTag = `<button class="hanzi-card-jump-btn" type="button" data-hanzi-jump-index="${index}" aria-label="学习 ${escapeHtml(word)}">学过 · 再学 ›</button>`;
    } else {
      cornerTag = `<button class="hanzi-card-jump-btn" type="button" data-hanzi-jump-index="${index}" aria-label="学习 ${escapeHtml(word)}">学这个 ›</button>`;
    }
    return `
      <div class="hanzi-fullscreen-card ${isCurrent ? 'is-current' : ''} ${isMastered ? 'is-mastered' : ''} ${isLearned ? 'is-learned' : ''}" data-hanzi-word="${escapeHtml(word)}" data-hanzi-length="${word.length}" tabindex="0" role="button" aria-label="${escapeHtml(word)}，点击听读音">
        <div class="hanzi-card-topline">
          <span class="hanzi-card-index">#${index + 1}</span>
          ${cornerTag}
        </div>
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
      speakChinese(word, () => card.classList.remove('is-speaking'));
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

function startHanziQuiz() {
  if (!currentHanziWriter) return;
  const currentChar = hanziWriterChars[hanziWriterCurrentCharIndex];
  $('#hanziWriterStatus').textContent = `跟着橙色笔画描红【${currentChar}】吧~`;

  currentHanziWriter.cancelQuiz();
  currentHanziWriter.showOutline();
  currentHanziWriter.hideCharacter();
  currentHanziWriter.quiz({
    onCorrectStroke: (strokeData) => {
      playSfx('ding');
      const totalStrokes = currentHanziWriter._character?.strokes?.length || (strokeData.strokeNum + 1);
      if (strokeData.strokeNum + 1 < totalStrokes) {
        $('#hanziWriterStatus').textContent = `第 ${strokeData.strokeNum + 1} 笔写对啦！⭐ 继续描橙色笔画`;
      } else {
        $('#hanziWriterStatus').textContent = `最后一笔写对啦！⭐`;
      }
    },
    onMistake: (strokeData) => {
      playSfx('wrong');
      $('#hanziWriterStatus').textContent = `笔画不太对哦，跟着橙色虚线再试一次吧~ (${strokeData.mistakesOnStroke + 1}次尝试)`;
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
  if (!['english', 'hanzi'].includes(kind)) { container.hidden = true; container.replaceChildren(); return; }
  const groups = contentGroups(kind).filter((group) => group.name && group.words.length >= 2); const active = activeContentGroup(kind);
  if (groups.length < 2) { container.hidden = true; container.replaceChildren(); return; }
  container.hidden = false;
  container.innerHTML = `<span>${kind === 'hanzi' ? '汉字分组' : '英文分组'}</span><div role="tablist" aria-label="${kind === 'hanzi' ? '汉字' : '英文'}学习分组">${groups.map((group) => `<button type="button" role="tab" data-lesson-group="${escapeHtml(group.id)}" aria-selected="${group.id === active.id}" class="${group.id === active.id ? 'active' : ''}">${escapeHtml(group.name)}</button>`).join('')}</div>`;
  $$('[data-lesson-group]', container).forEach((button) => button.addEventListener('click', () => {
    const group = groups.find((item) => item.id === button.dataset.lessonGroup); if (!group || group.id === active.id) return;
    setActiveContentGroup(kind, group.id); saveContentConfiguration(); applyAdminContent();
    state.round = 0; state.completed = false; state.roundLocked = false; persistProgress(); renderHome(); renderRound(); showToast(`开始学习“${group.name}”分组。`);
  }));
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
  speakForCurrentTheme(currentTheme().id === 'hanzi' ? game.word : (game.type === 'match' ? game.prompt : game.word));
}
function handleLessonShortcuts(event) {
  if (state.screen !== 'lesson' || isTypingTarget(event.target) || event.defaultPrevented) return;
  if ($('#hanziGroupModal')?.classList.contains('open')) return;
  if (event.key.toLowerCase() === 'r') { event.preventDefault(); replayCurrentPrompt(); return; }
  if ((event.key === 'Enter' || event.key === ' ') && !(event.target instanceof HTMLElement && event.target.closest('button, a'))) {
    const action = [...$$('#gameArea button.primary-button')].find((button) => !button.disabled && !button.hidden);
    if (action) { event.preventDefault(); action.click(); }
  }
}
let recitalPlaybackId = 0;
function playRecitalLines(lines, card) {
  const playbackId = ++recitalPlaybackId;
  window.speechSynthesis?.cancel();
  const readLine = (index) => {
    if (playbackId !== recitalPlaybackId || index >= lines.length) return;
    const lineNodes = $$('[data-recital-line]', card);
    lineNodes.forEach((line, lineIndex) => line.classList.toggle('speaking', lineIndex === index));
    const currentLine = lineNodes[index];
    const manuscript = currentLine?.closest('.recital-manuscript');
    if (currentLine && manuscript) manuscript.scrollTo({ top: currentLine.offsetTop - (manuscript.clientHeight - currentLine.offsetHeight) / 2, behavior: 'smooth' });
    speakChinese(lines[index], () => {
      if (playbackId !== recitalPlaybackId) return;
      if (index + 1 < lines.length) window.setTimeout(() => readLine(index + 1), 260);
      else lineNodes.forEach((line) => line.classList.remove('speaking'));
    });
  };
  readLine(0);
}
function renderRound() {
  const theme = currentTheme();
  renderLessonGroupSwitcher();
  renderTopbarContext();
  if (state.completed) return renderCompletion();
  state.roundLocked = false;
  const game = currentRounds()[state.round];
  const area = $('#gameArea');
  if (game.type === 'learn') {
    const recordingAction = state.recordingEnabled ? '<button class="record-practice" id="recordPractice" type="button">跟我说一说</button><div id="practicePlayback"></div>' : '';
    area.innerHTML = currentTheme().id === 'hanzi'
      ? hanziLearnMarkup(game, recordingAction)
      : `<div class="learn-word-card"><img src="${game.image}" alt="${game.word} 的图片" /><div><p>看一看，听一听</p><h2>${game.word}</h2><span>${game.zh}</span></div>${sentenceMarkup(game.word)}${lessonPrimaryActionsMarkup(`中文：${WORD_TRANSLATIONS[game.word] || game.word}`)}</div>${recordingAction}`;
    $('#learnNext').addEventListener('click', () => handleCorrect(game.word, 'learn'));
    $('#hanziSpeak')?.addEventListener('click', (event) => {
      const glyph = event.currentTarget;
      glyph.classList.add('speaking');
      speakChinese(game.word, () => glyph.classList.remove('speaking'));
    });
    $('#hanziSpellbookGroupBtn')?.addEventListener('click', openHanziGroupModal);
    $('#openHanziWriterBtn')?.addEventListener('click', () => openHanziWriter(game.word));
    $('#recordPractice')?.addEventListener('click', recordPractice);
    startLearnCountdown(3);
  } else if (game.type === 'recite') {
    const wholePiece = state.recitalMode === 'whole'; const piece = activeRecitalGroup(); const recitalText = wholePiece ? piece.lines.join('\n') : game.text; const lineLabel = wholePiece ? `整篇朗诵 · 共 ${piece.lines.length} 句` : game.lineLabel || '朗诵文本';
    const manuscript = wholePiece
      ? `<span class="recital-manuscript">${piece.lines.map((line, index) => `<span class="recital-line" data-recital-line="${index}">${escapeHtml(line)}</span>`).join('')}</span>`
      : `<span>“${escapeHtml(recitalText)}”</span>`;
    const recordingAction = state.recordingEnabled ? '<button class="record-practice" id="recordPractice" type="button">录下我的朗诵</button><div id="practicePlayback"></div>' : '';
    area.innerHTML = `<article class="recital-card"><div class="recital-curtain" aria-hidden="true"><i></i><i></i></div><p class="recital-kicker">朗诵小舞台</p><div class="recital-mode-switch" role="group" aria-label="朗诵方式"><button type="button" class="${wholePiece ? '' : 'active'}" data-recital-mode="line" aria-pressed="${!wholePiece}">单句朗诵</button><button type="button" class="${wholePiece ? 'active' : ''}" data-recital-mode="whole" aria-pressed="${wholePiece}">整篇朗诵</button></div><h2>${escapeHtml(game.title || game.word)}</h2><p class="recital-line-label">${escapeHtml(lineLabel)}</p><button class="recital-text ${wholePiece ? 'whole-piece' : ''}" id="reciteListen" type="button" aria-label="播放《${escapeHtml(game.title || game.word)}》朗诵">${manuscript}<small>${wholePiece ? '文稿可上下滚动；朗读时会自动定位到当前句' : '点文本，听露娜朗读'}</small></button><p class="recital-tip">${wholePiece ? '听完整篇后，试着一口气朗诵下来。' : game.zh}</p>${lessonPrimaryActionsMarkup()}${recordingAction}</article>`;
    const readText = () => wholePiece ? playRecitalLines(piece.lines, $('#reciteListen')) : (recitalPlaybackId += 1, speakChinese(recitalText));
    $('#reciteListen').addEventListener('click', readText);
    $$('[data-recital-mode]', area).forEach((button) => button.addEventListener('click', () => { const mode = button.dataset.recitalMode; if (mode !== state.recitalMode) { recitalPlaybackId += 1; state.recitalMode = mode; state.round = 0; state.completed = false; window.speechSynthesis?.cancel(); stopNativeTts(); renderRound(); } }));
    $('#learnNext').addEventListener('click', () => handleCorrect(game.word, state.lessonMode === 'review' ? 'review' : 'learn'));
    $('#recordPractice')?.addEventListener('click', recordPractice);
    startLearnCountdown(3); window.setTimeout(readText, 180);
  } else if (game.type === 'action') {
    area.innerHTML = `<div class="number-action-card"><img src="${game.image}" alt="拍手动作" /><div><p>数字动作</p><h2>${game.prompt}</h2><strong>${game.zh}</strong></div><button class="primary-button" id="actionDone" type="button">${game.actionLabel || '我做完啦'}</button></div>`;
    $('#actionDone').addEventListener('click', () => handleCorrect(game.word, 'action'));
    speak(game.prompt);
  } else if (game.type === 'listen') {
    area.innerHTML = `<div class="match-word-card"><img src="${game.image}" alt="${game.word} 的图片" /><div class="game-copy"><h2>听一听<br /><em>找一找</em></h2><strong class="match-translation">中文：${game.zh}</strong><p>先听一遍，再点图片。</p></div></div><button class="review-listen-action" id="reviewListenAction" type="button">听一听 <svg viewBox="0 0 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Zm12.5 2A4.5 4.5 0 0 0 14 8v2a2.5 2.5 0 0 1 0 4v2a4.5 4.5 0 0 0 2.5-4Z"/></svg></button><div class="picture-choice-row">${game.choices.map((choice) => `<button class="picture-choice" type="button" data-choice="${choice}"><img src="${wordImage(choice)}" alt="${(WORD_TRANSLATIONS[choice] || choice)}" /><b>${(WORD_TRANSLATIONS[choice] || choice)}</b></button>`).join('')}</div>`;
    $('#reviewListenAction').addEventListener('click', () => { speakForCurrentTheme(game.word); $$('.picture-choice', area).forEach((button) => button.classList.add('attention')); setTimeout(() => $$('.picture-choice', area).forEach((button) => button.classList.remove('attention')), 900); });
    $$('[data-choice]', area).forEach((button) => button.addEventListener('click', () => handleChoice(button, game)));
  } else {
    area.innerHTML = `<div class="match-word-card"><img src="${game.image}" alt="${game.word} 的图片" /><div class="game-copy"><h2>找一找<br /><em>对应单词</em></h2><strong class="match-translation">中文：${(WORD_TRANSLATIONS[game.word] || game.word)}</strong><p>${game.zh}</p></div></div><button class="review-listen-action" id="reviewListenAction" type="button">先听一遍，再选单词 <svg viewBox="0 0 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Zm12.5 2A4.5 4.5 0 0 0 14 8v2a4.5 4.5 0 0 1 0 4v2a4.5 2.5 0 0 0 2.5-4Z"/></svg></button><div class="word-choice-row">${game.choices.map((choice) => `<button class="word-choice ${theme.id}" type="button" data-choice="${choice}"><b>${choice}</b><span>点一个单词</span></button>`).join('')}</div>`;
    $('#reviewListenAction').addEventListener('click', () => { speakForCurrentTheme(game.word); $$('.word-choice', area).forEach((button) => button.classList.add('attention')); setTimeout(() => $$('.word-choice', area).forEach((button) => button.classList.remove('attention')), 900); });
    $$('[data-choice]', area).forEach((button) => button.addEventListener('click', () => handleChoice(button, game)));
  }
  bindSentenceButtons(area);
  $('#repeatCurrent')?.addEventListener('click', replayCurrentPrompt);
  addLessonShortcutHints(area);
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
  if (button.dataset.choice === game.correct) { button.classList.add('correct'); handleCorrect(game.word); }
  else { button.classList.add('try-again'); button.disabled = true; speakForCurrentTheme(currentTheme().id === 'hanzi' ? game.word : game.prompt); showToast('再听一次，露娜相信你！'); }
}
function showWordCelebration(word) {
  const overlay = document.createElement('div');
  overlay.className = 'word-celebration';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<div class="word-burst"></div><div class="celebration-word"><span>我认识了！</span><b>${word}</b><em>✦</em></div><i class="burst-star star-one">✦</i><i class="burst-star star-two">✦</i><i class="burst-star star-three">✦</i><i class="burst-star star-four">✦</i><i class="burst-confetti confetti-one"></i><i class="burst-confetti confetti-two"></i><i class="burst-confetti confetti-three"></i><i class="burst-confetti confetti-four"></i>`;
  $('#gameArea').append(overlay);
}
function handleCorrect(word, kind = 'match') {
  if (state.roundLocked) return;
  state.roundLocked = true; state.round += 1; state.stars += 1;
  if (kind === 'learn') { state.learnedWords = Array.from(new Set([...state.learnedWords, word])); showWordCelebration(word); }
  recordWordProgress(word, kind);
  refreshAchievements();
  setDailyTask('round'); playSuccessChime(); showToast(`你认识了 ${word}！`); persistProgress(); updateProgress();
  setTimeout(() => {
    if (state.round >= currentRounds().length) { if (state.lessonMode === 'review') completeReview(); else completeTheme(); }
    renderRound();
  }, kind === 'learn' ? 1350 : 850);
}
function completeReview() {
  state.completed = true;
  persistProgress();
  if (state.soundOn) playSfx('fanfare');
  triggerConfetti();
  showToast('魔法回顾完成，记得很棒！');
}
function completeTheme() {
  const theme = currentTheme(); state.completed = true;
  state.world[theme.id] = Math.max(state.world[theme.id] || 0, 2);
  state.completedThemes = Array.from(new Set([...state.completedThemes, theme.id]));
  state.ocOwned = Array.from(new Set([...state.ocOwned, ...theme.rewards]));
  saveOcAvatar(); setDailyTask('theme'); persistProgress(); $('#newDot').hidden = false;
  if (state.soundOn) playSfx('fanfare');
  triggerConfetti();
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
function renderWardrobe() {
  $('#ocAvatar').innerHTML = renderCharacterSVG(state.ocAvatar, 1.45);
  $('#ocCollectionCount').textContent = `${state.ocOwned.length + 1} / ${OC_WARDROBE.length + OC_PART_OPTIONS.hair.length}`;
  const category = OC_CATEGORY_META.find((item) => item.id === state.ocTab);
  $('#ocLookName').textContent = '点一点右边的装扮，给露娜换新造型。';
  renderOcTabs(); renderOcItems(); renderMagicHouseCounts();
}
function renderOcTabs() {
  $('#ocCategoryTabs').innerHTML = OC_CATEGORY_META.map((category) => `<button class="oc-category-tab ${state.ocTab === category.id ? 'active' : ''}" type="button" data-oc-tab="${category.id}">${wardrobeIcon(category.id)}<span>${category.label}</span></button>`).join('');
  $$('[data-oc-tab]').forEach((button) => button.addEventListener('click', () => { state.ocTab = button.dataset.ocTab; renderOcTabs(); renderOcItems(); }));
}
function renderOcItems() {
  const grid = $('#ocItemGrid');
  if (state.ocTab === 'hair') {
    grid.innerHTML = OC_PART_OPTIONS.hair.map((hair) => `<button class="oc-item-card ${state.ocAvatar.hair === hair.i ? 'equipped' : ''}" type="button" data-oc-hair="${hair.i}"><span class="oc-item-preview hair-preview">${renderCharacterSVG({ ...state.ocAvatar, hair: hair.i, outfit: {} }, .42)}</span><strong>${hair.name}</strong><small>${state.ocAvatar.hair === hair.i ? '正在使用' : '点一下试试'}</small></button>`).join('');
    $$('[data-oc-hair]').forEach((button) => button.addEventListener('click', () => { state.ocAvatar.hair = Number(button.dataset.ocHair); saveOcAvatar(); setDailyTask('dress'); renderWardrobe(); showToast('换了一个新发型！'); })); return;
  }
  const category = OC_CATEGORY_META.find((item) => item.id === state.ocTab);
  const items = OC_WARDROBE.filter((item) => item.slot === category.slot);
  grid.innerHTML = items.map((item) => { const owned = state.ocOwned.includes(item.id); const equipped = state.ocAvatar.outfit[category.slot] === item.id; return `<button class="oc-item-card ${owned ? '' : 'locked'} ${equipped ? 'equipped' : ''}" type="button" data-oc-item="${item.id}" ${owned ? '' : 'disabled'}><span class="oc-item-preview slot-${category.slot}">${owned ? wardrobeThumb(item.id) : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7a4 4 0 0 1 8 0v3"/><rect x="5" y="10" width="14" height="11" rx="2"/></svg>'}</span><strong>${item.name}</strong><small>${owned ? (equipped ? '正在使用' : '点一下试试') : '完成课程解锁'}</small></button>`; }).join('');
  $$('[data-oc-item]').forEach((button) => button.addEventListener('click', () => { state.ocAvatar.outfit[category.slot] = button.dataset.ocItem; saveOcAvatar(); setDailyTask('dress'); renderWardrobe(); showToast('露娜换好了新装扮！'); }));
}

function openReward() {
  const rewards = currentTheme().rewards;
  $('#rewardModal').classList.add('open'); $('#rewardModal').setAttribute('aria-hidden', 'false'); $('#rewardChest').classList.add('opening');
  if (state.soundOn) playSfx('victory');
  triggerConfetti();
  const firstReward = OC_WARDROBE.find((item) => item.id === rewards[0]);
  const lastReward = OC_WARDROBE.find((item) => item.id === rewards[rewards.length - 1]);
  const firstThumb = $('#ocRewardDress'); const lastThumb = $('#ocRewardWings');
  firstThumb.className = `oc-reward-thumb slot-${firstReward?.slot || 'default'}`;
  lastThumb.className = `oc-reward-thumb slot-${lastReward?.slot || 'default'}`;
  firstThumb.innerHTML = wardrobeThumb(rewards[0]); lastThumb.innerHTML = wardrobeThumb(rewards[rewards.length - 1]);
  $('#ocRewardName1').textContent = firstReward?.name || '新装扮';
  $('#ocRewardName2').textContent = lastReward?.name || '新装扮';
  speak(`A magic gift for you, ${childName()}!`); setTimeout(() => $('#claimReward').focus(), 650);
}
function closeReward() { $('#rewardModal').classList.remove('open'); $('#rewardModal').setAttribute('aria-hidden', 'true'); }
let parentGateAnswer = 0;
let parentModeEnabled = storageGet('luna-parent-mode-enabled') === 'true';
function renderParentModeState() {
  const button = $('#parentButton'); const status = $('#parentModeStatus');
  button.classList.toggle('enabled', parentModeEnabled); button.setAttribute('aria-pressed', String(parentModeEnabled));
  button.textContent = parentModeEnabled ? '家长模式已启用' : '给爸爸妈妈';
  if (status) status.textContent = parentModeEnabled ? '家长模式已启用：再次打开无需答题。' : '家长模式未启用。';
}
function setParentModeEnabled(enabled) {
  parentModeEnabled = enabled; saveText('luna-parent-mode-enabled', String(enabled)); renderParentModeState();
}
function speechRateLabel(rate = globalSpeechRate) { if (rate < .85) return '慢速'; if (rate > 1.15) return '快速'; return '标准'; }
function renderSpeechRateControl() {
  const input = $('#speechRate'); const label = $('#speechRateValue');
  if (!input || !label) return;
  input.value = String(globalSpeechRate); input.setAttribute('aria-valuetext', `${speechRateLabel()}，${globalSpeechRate.toFixed(2)} 倍`);
  label.textContent = `${speechRateLabel()} · ${globalSpeechRate.toFixed(2)}×`;
}
const DAILY_LIMIT_OPTIONS = [5, 10, 0];
function dailyLimitLabel(limit) { return limit ? `${limit} 分钟` : '不限时'; }
function renderDailyLimitControl() {
  const input = $('#dailyLimitRange'); const label = $('#dailyLimitValue');
  if (!input || !label) return;
  const limit = Number(state.study.limitMinutes || 0); const index = Math.max(0, DAILY_LIMIT_OPTIONS.indexOf(limit));
  input.value = String(index); input.setAttribute('aria-valuetext', dailyLimitLabel(DAILY_LIMIT_OPTIONS[index]));
  label.textContent = dailyLimitLabel(DAILY_LIMIT_OPTIONS[index]);
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
  $('#appVersion').textContent = `v${BUILD_INFO.version}`;
  updateProgress();
}
let parentActiveTab = 'overview';
function setParentTab(tab) {
  parentActiveTab = ['overview', 'settings', 'tools'].includes(tab) ? tab : 'overview';
  $$('.parent-tab').forEach((button) => { const active = button.dataset.parentTab === parentActiveTab; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  $$('.parent-tab-panel').forEach((panel) => { panel.hidden = panel.id !== `parentPanel${parentActiveTab[0].toUpperCase()}${parentActiveTab.slice(1)}`; });
}
function prepareParentGate() {
  const first = Math.floor(Math.random() * 7) + 7;
  const second = Math.floor(Math.random() * 6) + 3;
  parentGateAnswer = first + second;
  $('#parentGateQuestion').textContent = `请计算：${first} + ${second} = ?`;
  $('#parentGateAnswer').value = ''; $('#parentGateError').hidden = true;
  $('#parentGate').hidden = false; $('#parentContent').hidden = true;
}
function unlockParent() {
  setParentModeEnabled(true); $('#parentGate').hidden = true; $('#parentContent').hidden = false;
  renderParentProfileControls(); setParentTab('overview');
  $('#profileSelect').focus();
}
function openParent() {
  $('#parentModal').classList.add('open'); $('#parentModal').setAttribute('aria-hidden', 'false');
  if (parentModeEnabled) { unlockParent(); return; }
  prepareParentGate(); setTimeout(() => $('#parentGateAnswer').focus(), 100);
}
function closeParent() {
  $('#parentModal').classList.remove('open'); $('#parentModal').setAttribute('aria-hidden', 'true'); $('#parentButton').focus();
}
function disableParentMode() {
  setParentModeEnabled(false); closeParent(); showToast('家长模式已关闭；下次打开需要重新答题。');
}
function renderAdminContentSummary() {
  ['english', 'hanzi'].forEach((kind) => {
    const group = activeContentGroup(kind); const groups = contentGroups(kind);
    $(`#${kind}ConfigMeta`).textContent = `正在学习：${group.name} · ${groups.length} 个分组 · ${group.words.length} 项`;
  });
  const recital = activeRecitalGroup(); $('#recitalConfigMeta').textContent = `正在朗诵：《${recital.name}》· ${recital.lines.length} 句`;
}
function openAdmin() { $('#adminModal').classList.add('open'); $('#adminModal').setAttribute('aria-hidden', 'false'); $('#adminContent').hidden = false; renderAdminContentSummary(); setTimeout(() => $('#openEnglishConfig').focus(), 100); }
function closeAdmin() { $('#adminModal').classList.remove('open'); $('#adminModal').setAttribute('aria-hidden', 'true'); $('#parentButton').focus(); }
function groupTitle(kind) { return kind === 'hanzi' ? '汉字与词组' : '英文单词'; }
function groupWordLabel(kind) { return kind === 'hanzi' ? '汉字、词组或成语' : '英文单词'; }
function groupItemsPreview(group) { return group.words.length ? group.words.slice(0, 4).map((word) => `<span>${escapeHtml(word)}</span>`).join('') + (group.words.length > 4 ? `<i>+${group.words.length - 4}</i>` : '') : '<i>待写入内容</i>'; }
function renderContentGroupDirectory(kind) {
  const active = activeContentGroup(kind); const editing = editingContentGroup(kind); const groups = contentGroups(kind);
  $('#contentConfigSummary').innerHTML = `<div><b>${groups.length}</b><span>个分组</span></div><div><b>${groups.reduce((total, group) => total + group.words.length, 0)}</b><span>项内容</span></div><div><b>${active.words.length}</b><span>当前学习项</span></div>`;
  $('#contentGroupList').innerHTML = groups.map((group) => `<button class="content-group-card ${group.id === editing.id ? 'active' : ''}" type="button" data-content-group="${escapeHtml(group.id)}" aria-pressed="${group.id === editing.id}"><span class="content-group-card-head"><b>${escapeHtml(group.name || '未命名分组')}</b>${group.id === active.id ? '<em>正在学习</em>' : ''}</span><span class="content-group-card-meta">${group.words.length ? `${group.words.length} 项内容` : '待写入'}</span><span class="content-group-card-words">${groupItemsPreview(group)}</span></button>`).join('');
  $$('[data-content-group]', $('#contentGroupList')).forEach((button) => button.addEventListener('click', () => chooseContentGroup(button.dataset.contentGroup)));
}
function openContentConfig(kind) {
  const group = editingContentGroup(kind);
  $('#contentConfigType').value = kind; $('#contentConfigTitle').textContent = groupTitle(kind); $('#contentConfigDescription').textContent = `每个分组是一份独立的学习清单。新增分组会先以空白草稿显示；填写至少两项内容并保存后，才会成为${kind === 'hanzi' ? '汉字图书塔' : '单词森林'}当前使用的内容。`;
  renderContentGroupDirectory(kind);
  $('#contentGroupName').value = group.name; $('#contentGroupWords').value = group.words.join(kind === 'hanzi' ? '，' : ', ');
  $('#contentGroupNameLabel').textContent = `${kind === 'hanzi' ? '汉字' : '英文'}分组名称`; $('#contentGroupWordsLabel').textContent = `${groupWordLabel(kind)}（用逗号、分号或换行分隔）`;
  $('#contentConfigModal').classList.add('open'); $('#contentConfigModal').setAttribute('aria-hidden', 'false'); setTimeout(() => $('.content-group-card.active', $('#contentGroupList'))?.focus(), 80);
}
function closeContentConfig() { const kind = $('#contentConfigType').value; $('#contentConfigModal').classList.remove('open'); $('#contentConfigModal').setAttribute('aria-hidden', 'true'); if ($('#adminModal').classList.contains('open')) $(`#open${kind[0].toUpperCase()}${kind.slice(1)}Config`).focus(); else $('#parentButton').focus(); }
function selectedContentGroup(kind) { return editingContentGroup(kind); }
function refreshContentConfig(kind) { openContentConfig(kind); }
function chooseContentGroup(groupId) {
  const kind = $('#contentConfigType').value; const group = contentGroups(kind).find((item) => item.id === groupId) || editingContentGroup(kind);
  editingContentGroupIds[kind] = group.id; refreshContentConfig(kind);
}
function saveSelectedContentGroup() {
  const kind = $('#contentConfigType').value; const group = selectedContentGroup(kind); const name = $('#contentGroupName').value.trim().slice(0, 16); const words = normaliseContentWords(kind, $('#contentGroupWords').value);
  if (!name) { showToast('请为分组取一个名称。'); $('#contentGroupName').focus(); return; }
  if (words.length < 2) { showToast(`${kind === 'hanzi' ? '汉字' : '英文'}分组至少填写 2 项。`); $('#contentGroupWords').focus(); return; }
  group.name = name; group.words = words; setActiveContentGroup(kind, group.id); editingContentGroupIds[kind] = group.id; saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary();
  if (state.activeTheme === kind) { state.round = 0; state.completed = false; persistProgress(); }
  renderHome(); refreshContentConfig(kind); showToast(`“${name}”已保存，并设为正在学习。`);
}
function addContentGroup() {
  const kind = $('#contentConfigType').value; const groups = contentGroups(kind); const group = { id: `${kind}-${Date.now()}`, name: '', words: [] };
  groups.push(group); editingContentGroupIds[kind] = group.id; saveContentConfiguration(); refreshContentConfig(kind); $('#contentGroupName').focus(); showToast('已新增空白分组，请填写名称和学习内容。');
}
function deleteContentGroup() {
  const kind = $('#contentConfigType').value; const groups = contentGroups(kind);
  if (groups.length <= 1) { showToast('每种内容至少保留一个分组。'); return; }
  const group = selectedContentGroup(kind); const index = groups.findIndex((item) => item.id === group.id); const wasActive = group.id === subjectConfig(kind).activeGroupId; groups.splice(index, 1);
  if (wasActive) setActiveContentGroup(kind, (groups.find((item) => item.name && item.words.length >= 2) || groups[0]).id);
  editingContentGroupIds[kind] = (groups[Math.max(0, index - 1)] || groups[0]).id; saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary();
  if (state.activeTheme === kind) { state.round = 0; state.completed = false; persistProgress(); }
  renderHome(); refreshContentConfig(kind); showToast('分组已删除。');
}
function renderRecitalGroupList() {
  const active = activeRecitalGroup(); const groups = recitalGroups();
  $('#recitalGroupList').innerHTML = groups.map((group) => `<button class="content-group-card ${group.id === active.id ? 'active' : ''}" type="button" data-recital-group="${escapeHtml(group.id)}" aria-pressed="${group.id === active.id}"><span class="content-group-card-head"><b>${escapeHtml(group.name)}</b>${group.id === active.id ? '<em>正在朗诵</em>' : ''}</span><span class="content-group-card-meta">${group.lines.length} 句文本</span><span class="content-group-card-words">${group.lines.slice(0, 2).map((line) => `<span>${escapeHtml(line)}</span>`).join('')}${group.lines.length > 2 ? `<i>+${group.lines.length - 2}</i>` : ''}</span></button>`).join('');
  $$('[data-recital-group]', $('#recitalGroupList')).forEach((button) => button.addEventListener('click', () => chooseRecitalGroup(button.dataset.recitalGroup)));
}
function openRecitalConfig() {
  const group = activeRecitalGroup(); $('#recitalGroupTitle').value = group.name; $('#recitalGroupLines').value = group.lines.join('\n'); renderRecitalGroupList();
  $('#recitalConfigModal').classList.add('open'); $('#recitalConfigModal').setAttribute('aria-hidden', 'false'); setTimeout(() => $('.content-group-card.active', $('#recitalGroupList'))?.focus(), 80);
}
function closeRecitalConfig() { $('#recitalConfigModal').classList.remove('open'); $('#recitalConfigModal').setAttribute('aria-hidden', 'true'); $('#openRecitalConfig').focus(); }
function chooseRecitalGroup(id) { const group = recitalGroups().find((item) => item.id === id) || activeRecitalGroup(); setActiveRecitalGroup(group.id); saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary(); if (state.activeTheme === 'action') { state.round = 0; state.completed = false; persistProgress(); } renderHome(); openRecitalConfig(); showToast(`已切换到《${group.name}》，将按行朗诵。`); }
function saveRecitalGroup() {
  const group = activeRecitalGroup(); const name = $('#recitalGroupTitle').value.trim().slice(0, 24); const lines = normaliseRecitalLines($('#recitalGroupLines').value);
  if (!name) { showToast('请填写分组名称。'); $('#recitalGroupTitle').focus(); return; }
  if (!lines.length) { showToast('请至少添加一行朗诵文本。'); $('#recitalGroupLines').focus(); return; }
  group.name = name; group.lines = lines; saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary(); if (state.activeTheme === 'action') { state.round = 0; state.completed = false; persistProgress(); } renderHome(); openRecitalConfig(); showToast(`《${name}》已保存，共 ${lines.length} 句。`);
}
function addRecitalGroup() { const groups = recitalGroups(); const group = { id: `recital-${Date.now()}`, name: '新朗诵分组', lines: ['请填写第一句文本。'] }; groups.push(group); setActiveRecitalGroup(group.id); saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary(); openRecitalConfig(); $('#recitalGroupTitle').select(); showToast('已新增分组，请填写名称和每一句文本。'); }
function deleteRecitalGroup() { const groups = recitalGroups(); if (groups.length <= 1) { showToast('至少保留一篇朗诵文本。'); return; } const group = activeRecitalGroup(); groups.splice(groups.findIndex((item) => item.id === group.id), 1); setActiveRecitalGroup(groups[0].id); saveContentConfiguration(); applyAdminContent(); renderAdminContentSummary(); if (state.activeTheme === 'action') { state.round = 0; state.completed = false; persistProgress(); } renderHome(); openRecitalConfig(); showToast('朗诵分组已删除。'); }
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

$$('[data-screen]').forEach((button) => button.addEventListener('click', () => setScreen(button.dataset.screen)));
$$('[data-magic-house-tab]').forEach((button) => button.addEventListener('click', () => setMagicHouseTab(button.dataset.magicHouseTab)));
$('#topbarLessonTitle').addEventListener('click', () => { if (state.screen === 'arcade' && state.arcadeGameId) { clearTimeout(arcadeSequenceTimer); clearTimeout(whackTimer); clearTimeout(catchTimer); state.arcadeGameId = ''; state.arcadeState = null; renderTopbarContext(); renderArcade(); return; } if (state.screen === 'home') setScreen(state.homeContext === 'closet' ? 'closet' : state.homeContext === 'arcade' ? 'arcade' : 'lesson'); });
$('#magicHouse').addEventListener('click', () => { setScreen('closet'); showToast('欢迎来到魔法屋，给露娜换上新装吧！'); });
$('#soundToggle').addEventListener('click', () => { state.soundOn = !state.soundOn; $('#soundToggle').setAttribute('aria-pressed', String(state.soundOn)); $('#soundToggle').setAttribute('aria-label', state.soundOn ? '关闭声音' : '打开声音'); $('#soundToggle').classList.toggle('muted', !state.soundOn); if (!state.soundOn) { window.speechSynthesis?.cancel(); stopNativeTts(); stopWardrobeMusic(); } else if (state.screen === 'closet') startWardrobeMusic(); });
$('#parentButton').addEventListener('click', openParent); $('#closeParent').addEventListener('click', closeParent); $('#disableParentMode').addEventListener('click', disableParentMode);
$$('[data-parent-tab]').forEach((button) => button.addEventListener('click', () => setParentTab(button.dataset.parentTab)));
$('#parentGateForm').addEventListener('submit', (event) => { event.preventDefault(); if (Number($('#parentGateAnswer').value) === parentGateAnswer) unlockParent(); else { $('#parentGateError').hidden = false; $('#parentGateAnswer').select(); } });
$('#profileSelect').addEventListener('change', (event) => switchProfile(event.target.value));
$('#createProfile').addEventListener('click', () => { const input = $('#newProfileName'); const name = input.value.trim(); if (!name) { input.focus(); return; } const profile = createProfile(name); profiles.push(profile); input.value = ''; switchProfile(profile.id); showToast(`已为 ${profile.name} 建立新的学习档案。`); });
$('#dailyLimitRange').addEventListener('input', (event) => { const index = Number(event.target.value); state.study.limitMinutes = DAILY_LIMIT_OPTIONS[index]; renderDailyLimitControl(); });
$('#dailyLimitRange').addEventListener('change', () => { persistProgress(); showToast(state.study.limitMinutes ? `已设置每日 ${state.study.limitMinutes} 分钟探险时间。` : '已取消每日探险时间限制。'); });
$('#speechRate').addEventListener('input', (event) => { globalSpeechRate = clamp(Number(event.target.value), .5, 1.5); saveText('luna-global-speech-rate', String(globalSpeechRate)); renderSpeechRateControl(); });
$('#speechRate').addEventListener('change', () => { window.speechSynthesis?.cancel(); showToast(`全局朗读语速已设为${speechRateLabel()}。`); });
$('#recordingToggle').addEventListener('click', () => { state.recordingEnabled = !state.recordingEnabled; persistProgress(); renderParentProfileControls(); showToast(state.recordingEnabled ? '已开启录音跟读；录音只留在当前页面。' : '已关闭录音跟读。'); });
$('#adminButton').addEventListener('click', () => { closeParent(); openAdmin(); });
$('#closeAdmin').addEventListener('click', closeAdmin);
$('#openEnglishConfig').addEventListener('click', () => openContentConfig('english')); $('#openHanziConfig').addEventListener('click', () => openContentConfig('hanzi')); $('#openRecitalConfig').addEventListener('click', openRecitalConfig);
$('#closeContentConfig').addEventListener('click', closeContentConfig); $('#saveContentGroup').addEventListener('click', saveSelectedContentGroup); $('#addContentGroup').addEventListener('click', addContentGroup); $('#deleteContentGroup').addEventListener('click', deleteContentGroup);
$('#contentConfigModal').addEventListener('click', (event) => { if (event.target === $('#contentConfigModal')) closeContentConfig(); });
$('#closeRecitalConfig').addEventListener('click', closeRecitalConfig); $('#addRecitalGroup').addEventListener('click', addRecitalGroup); $('#saveRecitalGroup').addEventListener('click', saveRecitalGroup); $('#deleteRecitalGroup').addEventListener('click', deleteRecitalGroup); $('#recitalConfigModal').addEventListener('click', (event) => { if (event.target === $('#recitalConfigModal')) closeRecitalConfig(); });
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
$('#dailyWrapHome').addEventListener('click', () => { closeDailyWrapUp(); setScreen('home'); });
$('#dailyWrapCloset').addEventListener('click', () => { closeDailyWrapUp(); setScreen('closet'); });
$('#parentModal').addEventListener('click', (event) => { if (event.target === $('#parentModal')) closeParent(); });
$('#closeHanziGroupModal')?.addEventListener('click', closeHanziGroupModal);
$('#closeHanziGroupModalPrimary')?.addEventListener('click', closeHanziGroupModal);
$('#hanziGroupModal')?.addEventListener('click', (event) => { if (event.target === $('#hanziGroupModal')) closeHanziGroupModal(); });
$('#closeHanziWriterModal')?.addEventListener('click', closeHanziWriter);
$('#hanziWriterModal')?.addEventListener('click', (event) => { if (event.target === $('#hanziWriterModal')) closeHanziWriter(); });
$('#hanziWriterAnimateBtn')?.addEventListener('click', animateHanziWriter);
$('#hanziWriterQuizBtn')?.addEventListener('click', startHanziQuiz);
$('#hanziWriterResetBtn')?.addEventListener('click', () => {
  renderHanziWriterWord();
});
$('#resetProgress').addEventListener('click', () => { state.round = 0; state.completed = false; state.roundLocked = false; closeParent(); setScreen('home'); showToast('今天的挑战已经从第一关重新开始。'); });
window.addEventListener('resize', () => {
  if ($('#hanziGroupModal')?.classList.contains('open')) { updateHanziGridGeometry(activeContentGroup('hanzi').words.length); }
  if ($('#hanziWriterModal')?.classList.contains('open')) { renderHanziWriterWord(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDailyBoundary(); });
window.addEventListener('popstate', () => { const [,screen = 'home', theme] = location.hash.match(/^#([^/]+)\/?(.*)?/) || []; if (theme && THEMES[theme]) state.activeTheme = theme; setScreen(['home','lesson','closet','arcade'].includes(screen) ? screen : 'home', { push: false }); });
document.addEventListener('keydown', handleLessonShortcuts);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('#recitalConfigModal').classList.contains('open')) closeRecitalConfig(); else if (event.key === 'Escape' && $('#contentConfigModal').classList.contains('open')) closeContentConfig(); else if (event.key === 'Escape' && $('#parentModal').classList.contains('open')) closeParent(); else if (event.key === 'Escape' && $('#rewardModal').classList.contains('open')) closeReward(); else if (event.key === 'Escape' && $('#dailyModal').classList.contains('open')) closeDailyWrapUp(); else if (event.key === 'Escape' && $('#adminModal').classList.contains('open')) closeAdmin(); else if (event.key === 'Escape' && $('#hanziGroupModal')?.classList.contains('open')) closeHanziGroupModal(); else if (event.key === 'Escape' && $('#hanziWriterModal')?.classList.contains('open')) closeHanziWriter(); });

$('.app-shell').classList.add('home-active'); renderTopbarContext(); mountHomeMap(); renderWardrobe(); renderHome(); updateProgress(); renderParentModeState(); renderSpeechRateControl(); renderParentProfileControls(); if (location.hash) window.dispatchEvent(new PopStateEvent('popstate'));
