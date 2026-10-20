import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildContent } from './build-content.mjs';

const root = process.cwd();
const webDir = resolve(root, 'dist');
const packageMetadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const entries = [
  'index.html',
  'app.js',
  'style.css',
  'service-worker.js',
  'manifest.webmanifest',
  '.nojekyll',
  'assets',
  'features',
  'styles',
  'vendor',
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
// 内容构建必须排在拷贝之前：它会重写 features/default-content.js（内置内容），
// 而 features/ 目录随后整包拷进 dist/；dist/content/ 则是内容同步的下载目录。
await buildContent({ root });
await writeFile(resolve(root, 'features/build-info.js'), `// Generated from package.json. Do not edit directly.\nexport const BUILD_INFO = ${JSON.stringify({ version: packageMetadata.version, releaseRepository: 'nganun/magic-castle', contentBaseUrl: packageMetadata.contentBaseUrl || 'https://nganun.github.io/magic-castle/content' }, null, 2)};\n`);
await Promise.all(entries.map((entry) => cp(resolve(root, entry), resolve(webDir, entry), { recursive: true })));
console.log(`Built web bundle in ${webDir}`);
