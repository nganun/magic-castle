import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { contentFromEntries } from '../features/content-files.js';
import { mergeSyncedContent } from '../features/content-sync.js';
import { contentUrl, diffManifest, syncRemoteContent } from '../features/content-channel.js';

const root = process.cwd();
const contentDir = resolve(root, 'dist/content');
const TYPES = { '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };

function startServer() {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/content\//, '');
    try {
      const body = await readFile(join(contentDir, path));
      response.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/plain' });
      response.end(body);
    } catch {
      response.writeHead(404); response.end('not found');
    }
  });
  return new Promise((resolveServer) => server.listen(0, () => resolveServer({ server, baseUrl: `http://localhost:${server.address().port}/content` })));
}

test('端到端：从内容清单下载文本文件并合并，服务器返回的内容应与内置内容一致', async () => {
  const { server, baseUrl } = await startServer();
  try {
    // 第一次同步：没有本机快照，应下载全部文件
    const first = await syncRemoteContent({ baseUrl });
    assert.equal(first.changed, true);
    assert.equal(first.changedFiles.length, first.manifest.files.length);
    assert.ok(first.manifest.files.length >= 21, '内容文件数量不应少于迁移时的 21 个');
    const official = contentFromEntries(first.entries);
    const built = (await import(resolve(root, 'features/default-content.js'))).DEFAULT_LEARNING_CONTENT;
    ['english', 'hanzi', 'recital'].forEach((kind) => {
      assert.equal(official[kind].groups.length, built[kind].groups.length, `${kind} 的分组数应与内置内容一致`);
    });

    // 第二次同步：清单没变，应判定为无变化
    const second = await syncRemoteContent({ baseUrl, previousSnapshot: { manifest: first.manifest, entries: first.entries } });
    assert.equal(second.changed, false);

    // 拿官方内容与内置内容合并：内容一致 → 不应有新增/更新/冲突
    const { summary } = mergeSyncedContent({ previousOfficial: built, nextOfficial: official, local: built });
    assert.equal(summary.added.length, 0);
    assert.equal(summary.updated.length, 0);
    assert.equal(summary.keptLocal.length, 0);
    assert.equal(summary.removed.length, 0);
  } finally {
    server.close();
  }
});

test('内容清单与远端不一致时，只下载变化的文件', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const first = await syncRemoteContent({ baseUrl });
    const changed = diffManifest(first.manifest.files, first.manifest.files.map((file) => ({ ...file, sha256: 'changed' })));
    assert.equal(changed.changed.length, first.manifest.files.length);
    assert.equal(changed.added.length, 0);
    assert.equal(changed.removed.length, 0);
  } finally {
    server.close();
  }
});

test('下载地址按段编码（目录名含中文）', () => {
  assert.equal(contentUrl('https://example.com/content', 'hanzi/主题/01-颜色.txt'), 'https://example.com/content/hanzi/%E4%B8%BB%E9%A2%98/01-%E9%A2%9C%E8%89%B2.txt');
  assert.equal(contentUrl('https://example.com/content/', 'a/b.txt'), 'https://example.com/content/a/b.txt');
});
