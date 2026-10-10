import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert';

const root = process.cwd();

// 1. 验证所有 44 个 SVG 的 XML 格式合法性
const svgDir = resolve(root, 'assets/learning/hanzi');
const svgFiles = readdirSync(svgDir).filter(f => f.endsWith('.svg'));
console.log(`Checking ${svgFiles.length} SVG files...`);

for (const file of svgFiles) {
  const content = readFileSync(resolve(svgDir, file), 'utf8');
  assert(content.startsWith('<svg'), `${file} does not start with <svg`);
  assert(content.includes('</svg>'), `${file} does not have </svg>`);
  assert(content.includes('viewBox="0 0 240 180"'), `${file} viewBox mismatch`);
}
console.log('✓ All SVGs are well-formed!');

// 2. 验证 default-learning-content.json 与 features/default-content.js 同步一致
const rawJson = JSON.parse(readFileSync(resolve(root, 'data/default-learning-content.json'), 'utf8'));
const defaultModule = await import(resolve(root, 'features/default-content.js'));
const syncedContent = defaultModule.DEFAULT_LEARNING_CONTENT;

assert.deepStrictEqual(syncedContent.hanzi.groups.map(g => ({ id: g.id, image: g.image })),
  rawJson.hanzi.groups.map(g => ({ id: g.id, image: g.image })),
  'Default learning content is synced');
console.log('✓ features/default-content.js is in sync with data/default-learning-content.json');

// 3. 验证 4 个带有 image: true 的分组，其所有词都在 SVG 列表中
const imageGroups = rawJson.hanzi.groups.filter(g => g.image);
assert.strictEqual(imageGroups.length, 4, 'Should have 4 image groups');
for (const group of imageGroups) {
  for (const word of group.words) {
    const expectedSvg = resolve(svgDir, `${word}.svg`);
    assert(readFileSync(expectedSvg), `Missing SVG for word ${word} in group ${group.id}`);
  }
}
console.log('✓ All words in image: true groups have corresponding SVGs!');

console.log('All tests passed successfully!');
