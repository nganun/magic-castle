// 学习内容文本源解析器：Node 构建脚本与浏览器 App 共用同一份实现，避免两边规则漂移。
//
// 目录结构：data/<类型>/[子目录/]<分组>.txt
//   - 类型目录：english（英文单词）、hanzi（汉字与词组）、recital（朗诵文本）
//   - 子目录：学期/单元，仅用于整理与工作台折叠展示
//   - 文件名：分组名，可用「01-」这类数字前缀决定同目录内的顺序（显示名里去掉前缀）
//   - 每行：一个词/词组（english、hanzi）或一句（recital）
//   - 指令行：# id: xxx（分组 id）、# 名称：xxx（显示名）、# 图片：开|关（看图识字开关）
//   - 行尾竖线：西瓜|一种绿色水果 —— 竖线后是可选注释，存入分组的 notes

export const CONTENT_KINDS = ['english', 'hanzi', 'recital'];
export const CONTENT_WORD_LIMIT = 24;
export const CONTENT_RECITAL_LINE_LIMIT = 120;

const ENGLISH_WORD = /^[a-z]{1,16}$/;
const HANZI_TERM = /^[\p{Script=Han}]{1,8}$/u;
const ORDER_PREFIX = /^(\d+)[-_.](.+)$/;
const DIRECTIVE = /^(id|name|image|名称|图片)\s*[:：]\s*(.+)$/i;

export function splitContentWords(value) {
  return String(value ?? '').split(/[，,；;\n]/).map((word) => word.trim()).filter(Boolean);
}
export function safeEnglishWords(value) {
  return splitContentWords(value).map((word) => word.toLowerCase()).filter((word) => ENGLISH_WORD.test(word)).slice(0, CONTENT_WORD_LIMIT);
}
export function safeHanzi(value) {
  return splitContentWords(value).filter((word) => HANZI_TERM.test(word)).slice(0, CONTENT_WORD_LIMIT);
}
export function normaliseContentWords(kind, words) {
  const list = Array.isArray(words) ? words.join(kind === 'hanzi' ? '，' : ',') : words;
  return kind === 'hanzi' ? safeHanzi(list) : safeEnglishWords(list);
}
export function normaliseRecitalLines(value) {
  return String(Array.isArray(value) ? value.join('\n') : value).split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, CONTENT_RECITAL_LINE_LIMIT);
}

// 由分组的 directory 字段建目录树：层级与名字全部来自内容，代码不写死任何关键词。
// 目录名可用 / 分层（古诗/春天），同名目录在不同路径下互不影响。
export function buildDirectoryTree(groups = []) {
  const root = { name: '', path: '', dirs: new Map(), groups: [] };
  groups.forEach((group) => {
    const segments = String(group.directory || '').split('/').map((part) => part.trim()).filter(Boolean);
    let node = root;
    segments.forEach((segment) => {
      if (!node.dirs.has(segment)) {
        node.dirs.set(segment, { name: segment, path: node.path ? `${node.path}/${segment}` : segment, dirs: new Map(), groups: [] });
      }
      node = node.dirs.get(segment);
    });
    node.groups.push(group);
  });
  return root;
}
// 取路径对应的节点；路径不存在时返回 null（调用方据此回到上一层）。
export function directoryNode(tree, path = []) {
  let node = tree;
  for (const segment of path) {
    node = node.dirs?.get(segment);
    if (!node) return null;
  }
  return node;
}

// 解析与比较分组时统一口径：只覆盖用户真正能改的字段。
export function normaliseGroupRecord(kind, raw = {}) {
  const name = String(raw.name ?? '').trim().slice(0, 24);
  const record = { id: String(raw.id ?? ''), name, image: Boolean(raw.image) };
  if (kind === 'recital') record.lines = normaliseRecitalLines(raw.lines);
  else record.words = [...new Set(normaliseContentWords(kind, raw.words))]; // 词表按集合语义比较
  return record;
}
// 旧版本把分组名称截断到 16 字，存在本机的旧名称是官方名称的前缀。
// 这种情况按"被截断"处理：比较时视为一致，显示时补回完整名称。
export function repairTruncatedName(localName, officialName) {
  const local = String(localName ?? '').trim();
  const official = String(officialName ?? '').trim();
  if (!local) return official;
  if (!official) return local;
  if (local !== official && official.startsWith(local)) return official;
  return local;
}
export function sameGroupContent(kind, left, right) {
  const a = normaliseGroupRecord(kind, left);
  const b = normaliseGroupRecord(kind, right);
  const sameName = a.name === b.name || (a.name && b.name && (b.name.startsWith(a.name) || a.name.startsWith(b.name)));
  return a.id === b.id && sameName && a.image === b.image
    && JSON.stringify(a.words ?? a.lines ?? []) === JSON.stringify(b.words ?? b.lines ?? []);
}

export function splitContentPath(path) {
  const parts = String(path ?? '').split('/').filter(Boolean);
  const kind = parts[0] || '';
  const file = parts[parts.length - 1] || '';
  const directory = parts.slice(1, -1).join('/');
  return { kind, file, directory };
}
export function splitFileName(file) {
  const base = String(file ?? '').replace(/\.[^.]+$/, '');
  const match = base.match(ORDER_PREFIX);
  if (match) return { order: Number(match[1]), name: match[2] };
  return { order: null, name: base };
}
export function groupIdFromPath(path) {
  const { kind, file, directory } = splitContentPath(path);
  const { name } = splitFileName(file);
  return [kind, ...(directory ? directory.split('/') : []), name].filter(Boolean).join('/');
}

function parseDirective(line) {
  const body = line.replace(/^#\s*/, '');
  const match = body.match(DIRECTIVE);
  if (!match) return null;
  const key = match[1].toLowerCase();
  const value = match[2].trim();
  if (key === 'id') return { key: 'id', value };
  if (key === 'name' || key === '名称') return { key: 'name', value };
  const on = /^(开|on|true|yes|1)$/i.test(value);
  const off = /^(关|off|false|no|0)$/i.test(value);
  if (on || off) return { key: 'image', value: on };
  return { key: 'invalid', value };
}

function keepItem(kind, item, errors, warnings, path, line) {
  if (kind === 'recital') return true; // 朗诵是自由文本句子，不做词形校验
  if (kind === 'hanzi') {
    if (!HANZI_TERM.test(item)) {
      warnings.push({ path, line, message: `「${item}」不是 1~8 个汉字，已跳过` });
      return false;
    }
    return true;
  }
  if (!ENGLISH_WORD.test(item.toLowerCase())) {
    warnings.push({ path, line, message: `「${item}」不是合法英文单词，已跳过` });
    return false;
  }
  return true;
}

export function parseContentFile(path, text) {
  const { kind, file, directory } = splitContentPath(path);
  const errors = [];
  const warnings = [];
  if (!CONTENT_KINDS.includes(kind)) {
    errors.push({ path, line: 0, message: `未知的内容类型目录「${kind}」，只支持 ${CONTENT_KINDS.join(' / ')}` });
    return { kind: '', file: path, directory: '', group: null, errors, warnings };
  }
  let id = '';
  let name = '';
  let image = null;
  const items = [];
  String(text ?? '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith('#')) {
      const directive = parseDirective(line);
      if (!directive) return;
      if (directive.key === 'id') id = directive.value;
      else if (directive.key === 'name') name = directive.value;
      else if (directive.key === 'image') image = directive.value;
      else warnings.push({ path, line: index + 1, message: `无法识别的指令：${line}` });
      return;
    }
    const divider = line.indexOf('|');
    const item = (divider === -1 ? line : line.slice(0, divider)).trim();
    const note = (divider === -1 ? '' : line.slice(divider + 1)).trim();
    if (!item) return;
    if (!keepItem(kind, item, errors, warnings, path, index + 1)) return;
    items.push({ item, note });
  });

  const { order, name: baseName } = splitFileName(file);
  const notes = {};
  const seen = new Set();
  const values = [];
  items.forEach(({ item, note }) => {
    if (kind !== 'recital') {
      if (seen.has(item)) {
        warnings.push({ path, file, message: `重复的「${item}」已跳过` });
        return;
      }
      seen.add(item);
    }
    values.push(item);
    if (note) notes[item] = note;
  });

  const group = {
    id: id || groupIdFromPath(path),
    name: name || baseName,
    file: path,
    directory,
    order: order ?? Number.MAX_SAFE_INTEGER,
    image: kind === 'hanzi' ? Boolean(image) : false,
    notes,
  };
  if (kind === 'recital') group.lines = values;
  else group.words = values;
  return { kind, file: path, directory, group, errors, warnings };
}

export function compareContentGroups(left, right) {
  if (left.kind !== right.kind) return CONTENT_KINDS.indexOf(left.kind) - CONTENT_KINDS.indexOf(right.kind);
  if (left.directory !== right.directory) return left.directory.localeCompare(right.directory, 'zh-Hans-CN');
  const orderLeft = left.order ?? Number.MAX_SAFE_INTEGER;
  const orderRight = right.order ?? Number.MAX_SAFE_INTEGER;
  if (orderLeft !== orderRight) return orderLeft - orderRight;
  return left.file.localeCompare(right.file, 'zh-Hans-CN');
}

export function parseContentFiles(files, options = {}) {
  const kinds = { english: { groups: [] }, hanzi: { groups: [] }, recital: { groups: [] } };
  const errors = [];
  const warnings = [];
  const byId = new Map();
  files.forEach(({ path, text }) => {
    const parsed = parseContentFile(path, text);
    errors.push(...parsed.errors);
    warnings.push(...parsed.warnings);
    if (!parsed.group) return;
    const previous = byId.get(parsed.group.id);
    if (previous) {
      errors.push({ path, line: 0, message: `分组 id「${parsed.group.id}」重复（与 ${previous} 冲突）` });
      return;
    }
    byId.set(parsed.group.id, path);
    kinds[parsed.kind].groups.push({ kind: parsed.kind, ...parsed.group });
  });
  Object.values(kinds).forEach((entry) => entry.groups.sort(compareContentGroups));
  return { resourceVersion: Number(options.resourceVersion ?? 0), kinds, errors, warnings };
}

// 解析结果 → 打进 APK 的内置内容（形状与旧的 data/default-learning-content.json 对齐，
// 分组上多出 file / directory / order / notes 四个字段）。
export function buildDefaultLearningContent(parsed) {
  const build = (kind) => {
    const groups = (parsed.kinds[kind]?.groups || []).map(({ kind: _kind, ...group }) => group);
    return { activeGroupId: groups[0]?.id ?? '', deletedGroupIds: [], groups };
  };
  return {
    resourceVersion: parsed.resourceVersion,
    english: build('english'),
    hanzi: build('hanzi'),
    recital: build('recital'),
  };
}

// 官方内容（远端快照）→ 与内置内容同形的 kind 分层结构。
export function contentFromEntries(entries = []) {
  const kinds = { english: [], hanzi: [], recital: [] };
  entries.forEach((entry) => {
    if (!entry?.group || !kinds[entry.kind]) return;
    kinds[entry.kind].push({ kind: entry.kind, ...entry.group });
  });
  Object.values(kinds).forEach((groups) => groups.sort(compareContentGroups));
  return {
    english: { groups: kinds.english.map(({ kind: _kind, ...group }) => group) },
    hanzi: { groups: kinds.hanzi.map(({ kind: _kind, ...group }) => group) },
    recital: { groups: kinds.recital.map(({ kind: _kind, ...group }) => group) },
  };
}
