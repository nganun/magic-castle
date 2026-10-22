import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCADE_HANZI_PICTURE_ITEMS, createMemoryDeck } from '../features/arcade-games.js';

test('魔法翻翻乐：每张图片只出现两次，且两个 id 完全相同', () => {
  const deck = createMemoryDeck(12);
  assert.equal(deck.length, 24);
  const count = new Map();
  deck.forEach((card) => count.set(card.id, (count.get(card.id) || 0) + 1));
  count.forEach((times, id) => assert.equal(times, 2, `${id} 出现了 ${times} 次`));
});

test('魔法翻翻乐：图案一样就必须能配对（不同 id 不能共用同一张图）', () => {
  // 这是踩过的坑：图标不够时循环取用同一张图却给了不同 id，
  // 孩子点到两张一样的图案却永远不判定成功。
  const deck = createMemoryDeck(ARCADE_HANZI_PICTURE_ITEMS.length + 20);
  const byImage = new Map();
  deck.forEach((card) => {
    const list = byImage.get(card.image) || [];
    list.push(card.id);
    byImage.set(card.image, list);
  });
  byImage.forEach((ids, image) => {
    assert.equal(new Set(ids).size, 1, `同一张图 ${image} 对应了多个 id：${ids.join(',')}`);
  });
});

test('魔法翻翻乐：图标不够时宁可少发牌，也不出四张一样的图', () => {
  const deck = createMemoryDeck(ARCADE_HANZI_PICTURE_ITEMS.length + 20);
  const byImage = new Map();
  deck.forEach((card) => byImage.set(card.image, (byImage.get(card.image) || 0) + 1));
  byImage.forEach((times, image) => assert.ok(times <= 2, `${image} 出现了 ${times} 次`));
  // 牌数 = 实际能发的对数 × 2
  assert.equal(deck.length, ARCADE_HANZI_PICTURE_ITEMS.length * 2);
});

test('魔法翻翻乐：牌组里每一对都能靠 id 找到对方', () => {
  const deck = createMemoryDeck(6);
  deck.forEach((card) => {
    const partners = deck.filter((other) => other.id === card.id);
    assert.equal(partners.length, 2);
    assert.equal(partners[0].image, partners[1].image);
  });
});
