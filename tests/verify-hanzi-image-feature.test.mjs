import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { parseContentFiles } from '../features/content-files.js';

const root = process.cwd();
const dataDir = resolve(root, 'data');
const svgDir = resolve(root, 'assets/learning/hanzi');

function collectContentFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) collectContentFiles(full, files);
    else if (entry.name.endsWith('.txt') && full !== resolve(dataDir, 'version.txt')) {
      files.push({ path: relative(dataDir, full).split(sep).join('/'), text: readFileSync(full, 'utf8') });
    }
  }
  return files;
}

test('所有汉字插图 SVG 格式合法', () => {
  const svgFiles = readdirSync(svgDir).filter((file) => file.endsWith('.svg'));
  assert.ok(svgFiles.length > 0);
  for (const file of svgFiles) {
    const content = readFileSync(resolve(svgDir, file), 'utf8');
    assert(content.startsWith('<svg'), `${file} does not start with <svg`);
    assert(content.includes('</svg>'), `${file} does not have </svg>`);
    assert(content.includes('viewBox="0 0 240 180"'), `${file} viewBox mismatch`);
  }
});

test('data/** 解析结果与 features/default-content.js 一致', async () => {
  const parsed = parseContentFiles(collectContentFiles(dataDir), { resourceVersion: Number(readFileSync(resolve(dataDir, 'version.txt'), 'utf8').trim()) });
  assert.equal(parsed.errors.length, 0);
  const generated = await import(resolve(root, 'features/default-content.js'));
  const synced = generated.DEFAULT_LEARNING_CONTENT;
  ['english', 'hanzi', 'recital'].forEach((kind) => {
    assert.deepEqual(
      synced[kind].groups.map((group) => ({ id: group.id, name: group.name, image: Boolean(group.image), directory: group.directory, items: group.words || group.lines })),
      parsed.kinds[kind].groups.map((group) => ({ id: group.id, name: group.name, image: Boolean(group.image), directory: group.directory, items: group.words || group.lines })),
      `${kind} 内容与 data/** 不一致`,
    );
  });
});

test('看图识字分组里的每个词都有对应插图', () => {
  const parsed = parseContentFiles(collectContentFiles(dataDir), { resourceVersion: 0 });
  const imageGroups = parsed.kinds.hanzi.groups.filter((group) => group.image);
  assert.equal(imageGroups.length, 4, '应有 4 个带插图的汉字分组');
  for (const group of imageGroups) {
    for (const word of group.words) {
      assert(existsSync(resolve(svgDir, `${word}.svg`)), `分组 ${group.id} 的「${word}」缺少插图`);
    }
  }
});
