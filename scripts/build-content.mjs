// 学习内容构建：解析 data/** 文本源 → 生成内置内容模块 + 分发用清单与文本文件。
// 用法：node scripts/build-content.mjs
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildDefaultLearningContent, parseContentFiles } from '../features/content-files.js';

export async function buildContent({ root = process.cwd() } = {}) {
  const dataDir = resolve(root, 'data');
  const distContentDir = resolve(root, 'dist/content');

  async function collectTextFiles(dir) {
    const found = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) found.push(...await collectTextFiles(full));
      else if (entry.name.endsWith('.txt') && full !== resolve(dataDir, 'version.txt')) found.push(full);
    }
    return found;
  }

  const versionText = await readFile(resolve(dataDir, 'version.txt'), 'utf8').catch(() => '0');
  const resourceVersion = Number(versionText.trim()) || 0;

  const files = (await collectTextFiles(dataDir)).sort();
  const parsedFiles = [];
  for (const file of files) {
    const path = relative(dataDir, file).split(sep).join('/');
    parsedFiles.push({ path, text: await readFile(file, 'utf8') });
  }

  const parsed = parseContentFiles(parsedFiles, { resourceVersion });
  if (parsed.warnings.length) {
    console.warn(`内容解析告警 ${parsed.warnings.length} 条：`);
    parsed.warnings.forEach((warning) => console.warn(`  - ${warning.path}${warning.line ? `:${warning.line}` : ''} ${warning.message}`));
  }
  if (parsed.errors.length) {
    console.error(`内容解析失败 ${parsed.errors.length} 条：`);
    parsed.errors.forEach((error) => console.error(`  - ${error.path}${error.line ? `:${error.line}` : ''} ${error.message}`));
    process.exit(1);
  }

  const content = buildDefaultLearningContent(parsed);
  await writeFile(
    resolve(root, 'features/default-content.js'),
    `// Generated from data/**. Do not edit directly.\nexport const DEFAULT_LEARNING_CONTENT = ${JSON.stringify(content, null, 2)};\n`,
  );

  await rm(distContentDir, { recursive: true, force: true });
  const manifestFiles = [];
  for (const { path, text } of parsedFiles) {
    const target = resolve(distContentDir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text, 'utf8');
    manifestFiles.push({
      path,
      sha256: createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex'),
      bytes: Buffer.byteLength(text, 'utf8'),
    });
  }
  await writeFile(
    resolve(distContentDir, 'manifest.json'),
    `${JSON.stringify({ resourceVersion, generatedAt: new Date().toISOString(), files: manifestFiles }, null, 2)}\n`,
  );

  const groupCount = Object.values(content).filter((kind) => kind && kind.groups).reduce((sum, kind) => sum + kind.groups.length, 0);
  console.log(`内容构建完成：版本 v${resourceVersion}，${parsedFiles.length} 个内容文件，${groupCount} 个分组`);
  return content;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildContent();
