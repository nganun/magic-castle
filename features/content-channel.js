// 学习内容远程通道：从 GitHub Pages 拉取内容清单与文本文件，缓存成本机官方快照。
// 只负责网络与存储，不做合并（合并在 content-sync.js 里）。

import { parseContentFile } from './content-files.js';

export const REMOTE_CONTENT_STORAGE_KEY = 'luna-remote-content-v1';

export function contentUrl(baseUrl, path) {
  const segments = String(path).split('/').filter(Boolean).map((part) => encodeURIComponent(part));
  return `${String(baseUrl).replace(/\/+$/, '')}/${segments.join('/')}`;
}

export function diffManifest(previousFiles = [], nextFiles = []) {
  const previous = new Map(previousFiles.map((file) => [file.path, file]));
  const next = new Map(nextFiles.map((file) => [file.path, file]));
  const changed = [];
  const added = [];
  next.forEach((file, path) => {
    const before = previous.get(path);
    if (!before) added.push(path);
    else if (before.sha256 !== file.sha256) changed.push(path);
  });
  const removed = [...previous.keys()].filter((path) => !next.has(path));
  return { changed, added, removed };
}

async function request(url, { fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`请求失败（${response.status}）`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchManifest(baseUrl, options = {}) {
  const url = `${contentUrl(baseUrl, 'manifest.json')}?t=${Date.now()}`;
  const response = await request(url, options);
  const manifest = await response.json();
  if (!manifest || !Array.isArray(manifest.files)) throw new Error('内容清单格式不对');
  return manifest;
}

export async function fetchContentFile(baseUrl, path, options = {}) {
  const url = `${contentUrl(baseUrl, path)}?t=${Date.now()}`;
  const response = await request(url, options);
  return response.text();
}

export async function sha256Of(text, { subtle = globalThis.crypto?.subtle } = {}) {
  if (!subtle) return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// 用新下载的文件替换旧快照里的同源分组，得到完整的官方内容。
export function mergeEntries(previousEntries = [], downloaded = [], removedPaths = []) {
  const entries = previousEntries.filter((entry) => !removedPaths.includes(entry.file));
  downloaded.forEach(({ path, group }) => {
    const index = entries.findIndex((entry) => entry.file === path);
    if (index >= 0) entries.splice(index, 1);
    if (group) entries.push({ kind: group.kind ?? group.file.split('/')[0], file: path, group });
  });
  return entries;
}

/**
 * 拉取清单 → 下载变化的文本文件 → 校验 → 合并成完整的官方快照。
 * 任一步失败都抛出异常，调用方保留原有内容不动。
 */
export async function syncRemoteContent({ baseUrl, previousSnapshot = null, fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const manifest = await fetchManifest(baseUrl, { fetchImpl, timeoutMs });
  const previousFiles = previousSnapshot?.manifest?.files || [];
  const { changed, added, removed } = diffManifest(previousFiles, manifest.files);
  const wanted = [...changed, ...added];
  if (!wanted.length && !removed.length) {
    return { manifest, entries: previousSnapshot?.entries || [], changed: false, changedFiles: [], removedFiles: [] };
  }

  const fileMap = new Map(manifest.files.map((file) => [file.path, file]));
  const downloaded = [];
  const warnings = [];
  for (const path of wanted) {
    const text = await fetchContentFile(baseUrl, path, { fetchImpl, timeoutMs });
    const expected = fileMap.get(path)?.sha256;
    if (expected) {
      const actual = await sha256Of(text);
      if (actual && actual !== expected) throw new Error(`内容校验失败：${path}`);
      if (!actual) warnings.push(`未能校验 ${path}（当前环境不支持哈希计算）`);
    }
    const parsed = parseContentFile(path, text);
    if (parsed.errors.length) throw new Error(`内容格式错误：${parsed.errors[0].message}`);
    downloaded.push({ path, group: parsed.group ? { ...parsed.group, kind: parsed.kind } : null });
  }

  const entries = mergeEntries(previousSnapshot?.entries || [], downloaded, removed);
  return { manifest, entries, changed: true, changedFiles: wanted, removedFiles: removed, warnings };
}
