// 为「开启看图」的分组补齐插图：扫描 data/**，凡是开了 image 的分组，逐个词条检查插图是否缺失，
// 缺的就生成一份。已有的人工插图不会被覆盖（除非 --force）。
// 用法：node scripts/generate-learning-images.mjs [--force]
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const force = process.argv.includes('--force');
const GENERATED_MARK = 'generated-by:scripts/generate-learning-images.mjs'; // 只有带这个标记的文件才允许被 --force 覆盖
const hanziDir = resolve(root, 'assets/learning/hanzi');
const vocabularyDir = resolve(root, 'assets/learning/vocabulary');
const dataDir = resolve(root, 'data');

const COLOR_PALETTE = {
  red: { bg: '#fff1f3', main: '#ef5b68', light: '#ffb2bb' },
  green: { bg: '#e9f9ef', main: '#3fb56b', light: '#a7e6c0' },
  black: { bg: '#f2f1f6', main: '#34313d', light: '#7b7889' },
  white: { bg: '#f8f8fc', main: '#ffffff', light: '#f1eff9', outline: '#d7d5e6' },
  blue: { bg: '#eaf7ff', main: '#4aa8e0', light: '#a8dcf5' },
  purple: { bg: '#f5efff', main: '#8b5cf6', light: '#cbb6ff' },
  pink: { bg: '#fff0f7', main: '#f472b6', light: '#ffc3e2' },
  yellow: { bg: '#fff9df', main: '#f2c53d', light: '#ffe9a3' },
  orange: { bg: '#fff2e6', main: '#f3913c', light: '#ffc58c' },
  brown: { bg: '#f6efe8', main: '#8a5a34', light: '#c9a184' },
  gray: { bg: '#f2f4f7', main: '#8b93a1', light: '#cdd3dc' },
};

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const NUMBER_BG = { 4: '#fff1f4', 5: '#eefbf2', 6: '#f2f0ff', 7: '#fff8e6', 8: '#eaf7ff', 9: '#fdf0ff', 10: '#eefaf7' };
const NUMBER_CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十' };
const NUMBER_COLOR = { 1: '#ffcc4a', 2: '#ff9d6e', 3: '#68c8f4', 4: '#f472b6', 5: '#3fb56b', 6: '#8b5cf6', 7: '#f2c53d', 8: '#4aa8e0', 9: '#e86a92', 10: '#5aa469' };

const STAR = 'M0 -1 L0.24 -0.32 L0.95 -0.24 L0.38 0.18 L0.59 0.9 L0 0.47 L-0.59 0.9 L-0.38 0.18 L-0.95 -0.24 L-0.22 -0.32 Z';

function colorSvg(word) {
  const palette = COLOR_PALETTE[word];
  if (!palette) return null;
  const outline = palette.outline ? ` stroke="${palette.outline}" stroke-width="3"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img" aria-label="${word}"><rect width="240" height="180" rx="28" fill="${palette.bg}"/><circle cx="120" cy="90" r="55" fill="${palette.main}"${outline}/><path d="M92 65c15-17 41-22 59-4" fill="none" stroke="${palette.light}" stroke-width="9" stroke-linecap="round"/></svg>`;
}

function numberSvg(word, count) {
  const bg = NUMBER_BG[count] || '#f2f0ff';
  const color = NUMBER_COLOR[count] || '#ffd447';
  const dark = '#e2a900';
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const spacing = Math.min(120 / columns, 100 / rows) * 0.95;
  const radius = spacing / 2.7;
  const centerX = 170;
  const centerY = 90;
  // 描边写在缩放前的坐标系里，再按半径换算，最终线宽固定在 2.4 单位左右（否则会被 scale 放大成一团）
  const stroke = 2.4 / radius;
  const stars = [];
  for (let index = 0; index < count; index += 1) {
    const inRow = columns;
    const row = Math.floor(index / inRow);
    const column = index % inRow;
    const rowCount = Math.min(inRow, count - row * inRow);
    const x = centerX + (column - (rowCount - 1) / 2) * spacing;
    const y = centerY + (row - (rows - 1) / 2) * spacing;
    stars.push(`<path d="${STAR}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${radius.toFixed(2)})" fill="${color}" stroke="${dark}" stroke-width="${stroke.toFixed(3)}" stroke-linejoin="round"/>`);
  }
  const fontSize = count > 9 ? 54 : 74;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img" aria-label="${NUMBER_CN[count]}个彩色魔法星星和数字${NUMBER_CN[count]}"><rect width="240" height="180" rx="28" fill="${bg}"/><rect x="20" y="24" width="54" height="132" rx="20" fill="#f1e8ff"/><text x="47" y="118" text-anchor="middle" font-family="Nunito, sans-serif" font-size="${fontSize}" font-weight="900" fill="#7652d2">${count}</text>${stars.join('')}</svg>`;
}

function wordCardSvg(word) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img" aria-label="${word}"><rect width="240" height="180" rx="28" fill="#f6f0ff"/><rect x="24" y="34" width="192" height="112" rx="20" fill="#fff" stroke="#e0cef7" stroke-width="4"/><text x="120" y="108" text-anchor="middle" font-family="Nunito, sans-serif" font-size="${word.length > 6 ? 34 : 44}" font-weight="900" fill="#6b4a9c">${word}</text></svg>`;
}

function hanziCardSvg(word) {
  const chars = [...word];
  const size = chars.length > 1 ? (chars.length > 3 ? 34 : 44) : 76;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img" aria-label="${word}"><rect width="240" height="180" rx="28" fill="#fff8ec"/><rect x="26" y="26" width="188" height="128" rx="20" fill="#fffdf8" stroke="#f0dcc0" stroke-width="4"/><text x="120" y="${chars.length > 1 ? 112 : 128}" text-anchor="middle" font-family="KaiTi, STKaiti, 'Songti SC', serif" font-size="${size}" font-weight="700" fill="#6b4a9c">${word}</text></svg>`;
}

async function collectGroups() {
  const groups = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.txt')) {
        const text = await readFile(full, 'utf8');
        const image = /^\s*#\s*(image|图片)\s*[:：]\s*(on|true|开|1)\s*$/im.test(text);
        if (!image) continue;
        const kind = full.startsWith(resolve(dataDir, 'hanzi')) ? 'hanzi' : full.startsWith(resolve(dataDir, 'english')) ? 'english' : null;
        if (!kind) continue;
        const items = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => line.split('|')[0].trim()).filter(Boolean);
        groups.push({ kind, dir: full, items });
      }
    }
  };
  await walk(dataDir);
  return groups;
}

const created = [];
const skipped = [];
for (const group of await collectGroups()) {
  const targetDir = group.kind === 'hanzi' ? hanziDir : vocabularyDir;
  await mkdir(targetDir, { recursive: true });
  for (const item of group.items) {
    const target = resolve(targetDir, `${item}.svg`);
    // 已存在时：默认跳过；--force 也只覆盖"本脚本生成的占位图"，手工画的插图永远不动。
    if (existsSync(target)) {
      const existing = readFileSync(target, 'utf8');
      if (!force || !existing.includes(GENERATED_MARK)) { skipped.push(item); continue; }
    }
    let svg = null;
    if (group.kind === 'english') svg = colorSvg(item) || (NUMBER_WORDS[item] ? numberSvg(item, NUMBER_WORDS[item]) : wordCardSvg(item));
    else svg = hanziCardSvg(item);
    if (!svg) continue;
    await writeFile(target, `<!-- ${GENERATED_MARK} -->\n${svg}\n`, 'utf8');
    created.push(`${group.kind}/${item}`);
  }
}
console.log(`生成插图 ${created.length} 个：${created.join('、') || '（无）'}`);
console.log(`已存在跳过 ${skipped.length} 个。`);
