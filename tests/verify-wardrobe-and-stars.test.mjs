import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED_WARDROBE_UNLOCK_SEQUENCE, OC_WARDROBE, HAIR_UNLOCK_ITEMS, getUnlockedWardrobeItems } from '../assets/characters/luna/wardrobe-data.js';

test('Luna 饰品与发型解锁：按 5 颗星解锁 1 件，初始化 0 星 0 饰品/非默认发型', () => {
  assert.equal(getUnlockedWardrobeItems(0).length, 0);
  assert.equal(getUnlockedWardrobeItems(4).length, 0);
  assert.deepEqual(getUnlockedWardrobeItems(5), ['hair_0']);
  assert.deepEqual(getUnlockedWardrobeItems(10), ['hair_0', 'hat_crown']);
  assert.deepEqual(getUnlockedWardrobeItems(15), ['hair_0', 'hat_crown', 'top_starter']);
  assert.equal(getUnlockedWardrobeItems(58 * 5).length, 58);
  assert.equal(getUnlockedWardrobeItems(500).length, 58);
});

test('Luna 饰品解锁：序列覆盖所有 50 个装扮 + 8 款可解锁发型且无重复', () => {
  assert.equal(FIXED_WARDROBE_UNLOCK_SEQUENCE.length, 58);
  const unique = new Set(FIXED_WARDROBE_UNLOCK_SEQUENCE);
  assert.equal(unique.size, 58);
  const wardrobeIds = new Set(OC_WARDROBE.map((item) => item.id));
  const hairIds = new Set(HAIR_UNLOCK_ITEMS.map((item) => item.id));
  for (const id of FIXED_WARDROBE_UNLOCK_SEQUENCE) {
    assert.ok(wardrobeIds.has(id) || hairIds.has(id), `装扮或发型 ${id} 不在已知库中`);
  }
});
