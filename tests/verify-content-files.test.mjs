import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { buildDefaultLearningContent, buildDirectoryTree, contentFromEntries, directoryNode, parseContentFile, parseContentFiles, repairTruncatedName } from '../features/content-files.js';

const root = process.cwd();

test('指令行解析：id / 名称 / 图片，普通注释忽略', () => {
  const parsed = parseContentFile('hanzi/主题/水果.txt', [
    '# id: fruit',
    '# 名称：水果乐园',
    '# 图片：开',
    '# 这只是注释',
    '西瓜',
  ].join('\n'));
  assert.equal(parsed.kind, 'hanzi');
  assert.equal(parsed.group.id, 'fruit');
  assert.equal(parsed.group.name, '水果乐园');
  assert.equal(parsed.group.image, true);
  assert.deepEqual(parsed.group.words, ['西瓜']);
  assert.equal(parsed.errors.length, 0);
});

test('未写指令时，id 取相对路径（去掉数字前缀），名称取文件名', () => {
  const parsed = parseContentFile('recital/古诗/01-春晓.txt', '春眠不觉晓，\n处处闻啼鸟。');
  assert.equal(parsed.group.id, 'recital/古诗/春晓');
  assert.equal(parsed.group.name, '春晓');
  assert.equal(parsed.group.directory, '古诗');
  assert.equal(parsed.group.file, 'recital/古诗/01-春晓.txt');
});

test('竖线注释被剥离进 notes，词条本身保持干净', () => {
  const parsed = parseContentFile('english/基础/颜色.txt', 'red|红色\ngreen|绿色\nblue');
  assert.deepEqual(parsed.group.words, ['red', 'green', 'blue']);
  assert.deepEqual(parsed.group.notes, { red: '红色', green: '绿色' });
});

test('english/hanzi 去重（保留首次），recital 不去重', () => {
  const hanzi = parseContentFile('hanzi/课堂/甲.txt', '消息\n消息\n花');
  assert.deepEqual(hanzi.group.words, ['消息', '花']);
  assert.equal(hanzi.warnings.length, 1);
  const recital = parseContentFile('recital/故事/甲.txt', '你看看我，我看看你，\n你看看我，我看看你，');
  assert.deepEqual(recital.group.lines, ['你看看我，我看看你，', '你看看我，我看看你，']);
  assert.equal(recital.warnings.length, 0);
});

test('非法词条跳过并告警（recital 自由文本不受影响）', () => {
  const english = parseContentFile('english/基础/甲.txt', 'red\n这不是单词');
  assert.deepEqual(english.group.words, ['red']);
  assert.equal(english.warnings.length, 1);
  const recital = parseContentFile('recital/故事/甲.txt', '今天我们吃的是：\n土豆烧鸡，清炒笋瓜；');
  assert.equal(recital.group.lines.length, 2);
  assert.equal(recital.warnings.length, 0);
});

test('未知类型目录报错', () => {
  const parsed = parseContentFile('poetry/甲.txt', '一行');
  assert.equal(parsed.errors.length, 1);
  assert.equal(parsed.group, null);
});

test('分组 id 重复时报错', () => {
  const parsed = parseContentFiles([
    { path: 'hanzi/甲.txt', text: '# id: same\n天' },
    { path: 'hanzi/乙.txt', text: '# id: same\n地' },
  ]);
  assert.equal(parsed.errors.length, 1);
  assert.match(parsed.errors[0].message, /重复/);
});

test('数字前缀决定同目录内的顺序', () => {
  const parsed = parseContentFiles([
    { path: 'hanzi/主题/02-水果.txt', text: '西瓜' },
    { path: 'hanzi/主题/01-颜色.txt', text: '白色' },
    { path: 'hanzi/课堂/01-甲.txt', text: '天' },
  ]);
  const ids = parsed.kinds.hanzi.groups.map((group) => group.id);
  assert.deepEqual(ids, ['hanzi/课堂/甲', 'hanzi/主题/颜色', 'hanzi/主题/水果']);
});

test('被旧版截断的名称会补回完整名称', () => {
  assert.equal(repairTruncatedName('一二三四五六七八九十一二三四五', '一二三四五六七八九十一二三四五六七八九十'), '一二三四五六七八九十一二三四五六七八九十');
  assert.equal(repairTruncatedName('', '官方名称'), '官方名称');
  assert.equal(repairTruncatedName('我自己起的名字', '官方名称'), '我自己起的名字');
});

test('目录树由 directory 字段现算：层级、名字都不写死', () => {
  const groups = [
    { id: 'a', name: '美食播报', directory: '故事' },
    { id: 'b', name: '三只小猫', directory: '故事' },
    { id: 'c', name: '春晓', directory: '古诗' },
    { id: 'd', name: '春', directory: '古诗/春天' },
    { id: 'e', name: '没分类的', directory: '' },
    { id: 'f', name: '儿歌里的故事', directory: '儿歌/故事' },
  ];
  const tree = buildDirectoryTree(groups);
  assert.deepEqual([...tree.dirs.keys()], ['故事', '古诗', '儿歌']);
  assert.equal(tree.groups.length, 1);           // 没目录的放在根层
  assert.equal(tree.dirs.get('故事').groups.length, 2);
  assert.equal(tree.dirs.get('古诗').dirs.get('春天').groups[0].id, 'd');
  // 同名目录在不同路径下互不影响
  assert.equal(tree.dirs.get('儿歌').dirs.get('故事').groups[0].id, 'f');
  assert.notEqual(tree.dirs.get('儿歌').dirs.get('故事'), tree.dirs.get('故事'));
  // 路径查找
  assert.equal(directoryNode(tree, ['古诗', '春天']).groups[0].id, 'd');
  assert.equal(directoryNode(tree, ['不存在']), null);
  assert.equal(directoryNode(tree, []), tree);
});

test('内置内容结构与旧的 default-learning-content.json 对齐', () => {
  const content = buildDefaultLearningContent(parseContentFiles([], { resourceVersion: 4 }));
  assert.equal(content.resourceVersion, 4);
  assert.deepEqual(Object.keys(content).sort(), ['english', 'hanzi', 'recital', 'resourceVersion']);
  ['english', 'hanzi', 'recital'].forEach((kind) => {
    assert.ok(Array.isArray(content[kind].groups));
    assert.ok(Array.isArray(content[kind].deletedGroupIds));
  });
});

test('contentFromEntries 能还原 kind 分层结构', () => {
  const restored = contentFromEntries([
    { kind: 'hanzi', file: 'hanzi/甲.txt', group: { id: 'a', name: '甲', file: 'hanzi/甲.txt', directory: '', image: false, notes: {}, words: ['天'] } },
  ]);
  assert.equal(restored.hanzi.groups.length, 1);
  assert.equal(restored.hanzi.groups[0].id, 'a');
  assert.equal(restored.english.groups.length, 0);
});

test('仓库里的 data/** 能解析出 21 个分组，且与生成的默认内容一致', async () => {
  const dataDir = resolve(root, 'data');
  const files = [];
  const walk = async (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.txt') && full !== resolve(dataDir, 'version.txt')) {
        files.push({ path: relative(dataDir, full).split(sep).join('/'), text: readFileSync(full, 'utf8') });
      }
    }
  };
  await walk(dataDir);
  const parsed = parseContentFiles(files, { resourceVersion: Number(readFileSync(resolve(dataDir, 'version.txt'), 'utf8').trim()) });
  assert.equal(parsed.errors.length, 0);
  const total = Object.values(parsed.kinds).reduce((sum, entry) => sum + entry.groups.length, 0);
  assert.ok(total >= 21, '分组数量不应少于迁移时的 21 个');
  const built = buildDefaultLearningContent(parsed);
  const generated = await import(resolve(root, 'features/default-content.js'));
  assert.deepEqual(
    Object.keys(built).map((kind) => [kind, kind === 'resourceVersion' ? built[kind] : built[kind].groups.map((group) => group.id)]),
    Object.keys(generated.DEFAULT_LEARNING_CONTENT).map((kind) => [kind, kind === 'resourceVersion' ? generated.DEFAULT_LEARNING_CONTENT[kind] : generated.DEFAULT_LEARNING_CONTENT[kind].groups.map((group) => group.id)]),
  );
});
