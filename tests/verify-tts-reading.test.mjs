import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { TTS_READING_RULES, applyTtsReading } from '../features/tts-reading.js';

const root = process.cwd();

test('多音字：古诗里的古音按教材读音朗读', () => {
  // 「白日依山尽」的尽读 jìn（到头了），引擎默认会读 jǐn
  assert.equal(applyTtsReading('白日依山尽，'), '白日依山进，');
  // 「处处闻啼鸟」的处读 chù（到处）
  assert.equal(applyTtsReading('处处闻啼鸟。'), '触触闻啼鸟。');
  // 「数不清」的数读 shǔ（动词）
  assert.equal(applyTtsReading('数不清的橡果'), '鼠不清的橡果');
  // 名字里的「澄」读 chéng
  assert.equal(applyTtsReading('我是今天的美食播报员 —— 王清澄。'), '我是今天的美食播报员 —— 王清成。');
});

test('多音字：只改例外，现代常用词不动', () => {
  const untouched = ['请他们将冰块尽快', '这件事很重要', '我会慢慢长大', '我们一起处理', '睡得很香',
    '他觉得有意思', '我对数学有兴趣', '我们重新造房子', '大熊吃力地爬上树', '小象感觉好多了',
    '花落知多少', '差点儿把牙磕掉', '不挑食，不浪费'];
  untouched.forEach((sentence) => assert.equal(applyTtsReading(sentence), sentence, `不该改：${sentence}`));
});

test('多音字：修正只作用于送给朗读引擎的文本，原文不被改动', () => {
  const original = '白日依山尽，黄河入海流。';
  const spoken = applyTtsReading(original);
  assert.equal(original, '白日依山尽，黄河入海流。');
  assert.notEqual(spoken, original);
  assert.equal(spoken.includes('尽'), false);
});

test('多音字：规则表里的替换字都是单一读音，不换成同音不同调', () => {
  // 替换字必须是「只有一个读音」的字，否则会把对的读成错的
  const risky = { 进: 'jìn', 触: 'chù', 鼠: 'shǔ', 霞: 'xiá', 航: 'háng', 脖: 'bó', 棋: 'qí',
    岳: 'yuè', 雪: 'xuè', 路: 'lù', 仓: 'cāng', 幸: 'xìng', 叫: 'jiào', 成: 'chéng' };
  TTS_READING_RULES.forEach((rule) => {
    const target = [...rule.to].filter((char) => risky[char]);
    assert.ok(target.length > 0, `规则「${rule.from} → ${rule.to}」没有用到已登记的单音字`);
    target.forEach((char) => assert.ok(risky[char], `替换字「${char}」未登记读音`));
  });
});

test('多音字：内容里已知的易错处都写进了规则', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.txt')) files.push(full);
    }
  };
  walk(join(root, 'data', 'recital'));
  assert.ok(files.length > 0, '没有找到朗诵内容');
  const known = [
    ['白日依山尽', '白日依山进'],
    ['处处闻啼鸟', '触触闻啼鸟'],
    ['数不清', '鼠不清'],
    ['王清澄', '王清成'],
  ];
  known.forEach(([from, to]) => {
    const hit = files.find((file) => readFileSync(file, 'utf8').includes(from));
    assert.ok(hit, `内容里找不到「${from}」`);
    assert.equal(applyTtsReading(from), to);
  });
});
