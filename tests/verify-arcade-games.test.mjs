import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chineseNumber } from '../features/utils.js';
import { ARCADE_COLOR_ITEMS, createListeningRound, createNumberRound } from '../features/arcade-games.js';

test('中文数字：0~100 的读法', () => {
  assert.equal(chineseNumber(0), '零');
  assert.equal(chineseNumber(1), '一');
  assert.equal(chineseNumber(9), '九');
  assert.equal(chineseNumber(10), '十');
  assert.equal(chineseNumber(11), '十一');
  assert.equal(chineseNumber(19), '十九');
  assert.equal(chineseNumber(20), '二十');
  assert.equal(chineseNumber(21), '二十一');
  assert.equal(chineseNumber(35), '三十五');
  assert.equal(chineseNumber(100), '一百');
});

test('数字泡泡：范围 0~100，各关逐级放大', () => {
  const ranges = [1, 2, 3, 4, 5].map((level) => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 200; i += 1) {
      const round = createNumberRound(level);
      round.choices.forEach((value) => { min = Math.min(min, value); max = Math.max(max, value); });
    }
    return { level, min, max };
  });
  ranges.forEach(({ level, min, max }) => {
    assert.equal(min, 0, `第 ${level} 关应能出现 0`);
    assert.ok(max <= [5, 10, 20, 50, 100][level - 1], `第 ${level} 关超过上限`);
  });
});

test('听音找一找：找汉字模式用汉字词，选项不重复', () => {
  const round = createListeningRound(4, 'hanzi');
  assert.equal(round.mode, 'hanzi');
  assert.equal(round.choices.length, 4);
  const ids = new Set(round.choices.map((item) => item.id));
  assert.equal(ids.size, 4);
  round.choices.forEach((item) => assert.ok(item.label, '汉字模式要有中文词'));
});

test('颜色魔法：每种颜色都有对应的颜色图片', () => {
  ARCADE_COLOR_ITEMS.forEach((item) => {
    assert.ok(item.image.endsWith('.svg'), `${item.label} 缺图片`);
    assert.ok(item.color, `${item.label} 缺色值`);
  });
  assert.ok(ARCADE_COLOR_ITEMS.length >= 6);
});
