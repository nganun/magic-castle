import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSyncedContent, restoreOfficialContent } from '../features/content-sync.js';

const kind = 'hanzi';
const group = (id, overrides = {}) => ({ id, name: id, file: `${id}.txt`, directory: '课堂', image: false, notes: {}, words: ['天', '地'], ...overrides });
const local = (groups, extra = {}) => ({ [kind]: { activeGroupId: groups[0]?.id || '', deletedGroupIds: [], groups, ...extra } });

test('用户没改过的分组：采用官方新版', () => {
  const previous = { [kind]: { groups: [group('a', { words: ['天', '地'] })] } };
  const next = { [kind]: { groups: [group('a', { words: ['天', '地', '人'] })] } };
  const { content, summary } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([group('a', { words: ['天', '地'] })]) });
  assert.deepEqual(content[kind].groups[0].words, ['天', '地', '人']);
  assert.equal(summary.updated.length, 1);
  assert.equal(summary.keptLocal.length, 0);
});

test('用户改过的分组：保留本地内容并计入「保留本地修改」', () => {
  const previous = { [kind]: { groups: [group('a', { words: ['天', '地'] })] } };
  const next = { [kind]: { groups: [group('a', { words: ['天', '地', '人'] })] } };
  const { content, summary } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([group('a', { words: ['我', '的'] })]) });
  assert.deepEqual(content[kind].groups[0].words, ['我', '的']);
  assert.equal(summary.keptLocal.length, 1);
  assert.equal(summary.updated.length, 0);
});

test('官方新增的分组会被加进来', () => {
  const previous = { [kind]: { groups: [] } };
  const next = { [kind]: { groups: [group('b')] } };
  const { content, summary } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([]) });
  assert.equal(content[kind].groups.length, 1);
  assert.equal(summary.added.length, 1);
});

test('官方删除且用户没改过：一起删除；改过：保留', () => {
  const previous = { [kind]: { groups: [group('a'), group('b')] } };
  const next = { [kind]: { groups: [group('a')] } };
  const { content, summary } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([group('a'), group('b', { words: ['我', '的'] })]) });
  assert.deepEqual(content[kind].groups.map((item) => item.id), ['a', 'b']);
  assert.equal(summary.keptLocal.length, 1);
});

test('官方删掉、用户也没改过的分组会真的移除', () => {
  const previous = { [kind]: { groups: [group('a')] } };
  const next = { [kind]: { groups: [] } };
  const { content, summary } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([group('a')]) });
  assert.equal(content[kind].groups.length, 0);
  assert.equal(summary.removed.length, 1);
});

test('用户删过的分组不会被官方复活', () => {
  const previous = { [kind]: { groups: [] } };
  const next = { [kind]: { groups: [group('a')] } };
  const { content, summary } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([], { deletedGroupIds: ['a'] }) });
  assert.equal(content[kind].groups.length, 0);
  assert.equal(summary.added.length, 0);
});

test('用户自建的分组原样保留，也不算冲突', () => {
  const previous = { [kind]: { groups: [] } };
  const next = { [kind]: { groups: [] } };
  const mine = group('mine', { words: ['我', '的'] });
  const { content, summary } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([mine]) });
  assert.deepEqual(content[kind].groups.map((item) => item.id), ['mine']);
  assert.equal(summary.keptLocal.length, 0);
});

test('activeGroupId 属于用户：同步不会改动', () => {
  const previous = { [kind]: { groups: [group('a'), group('b')] } };
  const next = { [kind]: { groups: [group('a'), group('b')] } };
  const { content } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([group('a'), group('b')], { activeGroupId: 'b' }) });
  assert.equal(content[kind].activeGroupId, 'b');
});

test('老格式分组（没有 image 键、名称按旧 16 截断）不会被误判为「用户改过」', () => {
  const official = group('a', { name: '一二三四五六七八九十一二三四五六七八九十', image: false, words: ['天', '地'] });
  const legacy = { id: 'a', name: '一二三四五六七八九十一二三四五六七八九', words: ['天', '地'] }; // 旧版截断到 16
  const { content, summary } = mergeSyncedContent({
    previousOfficial: { [kind]: { groups: [official] } },
    nextOfficial: { [kind]: { groups: [official] } },
    local: local([legacy]),
  });
  assert.equal(summary.keptLocal.length, 0);
  assert.equal(content[kind].groups[0].image, false);
});

test('官方挪了目录时，目录跟随官方', () => {
  const previous = { [kind]: { groups: [group('a', { directory: '课堂' })] } };
  const next = { [kind]: { groups: [group('a', { directory: '主题' })] } };
  const { content } = mergeSyncedContent({ previousOfficial: previous, nextOfficial: next, local: local([group('a', { directory: '课堂' })]) });
  assert.equal(content[kind].groups[0].directory, '主题');
});

test('恢复官方内容：丢弃本地修改但保留删除记录与当前选择', () => {
  const official = { [kind]: { groups: [group('a'), group('b')] } };
  const localContent = local([group('a', { words: ['我', '的'] })], { deletedGroupIds: ['b'], activeGroupId: 'a' });
  const restored = restoreOfficialContent({ official, local: localContent });
  assert.deepEqual(restored[kind].groups.map((item) => item.id), ['a']);
  assert.equal(restored[kind].activeGroupId, 'a');
  assert.deepEqual(restored[kind].deletedGroupIds, ['b']);
});
