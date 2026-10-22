// Built-in lesson catalog. Custom English, Hanzi, and recital content is layered in app.js.

// 数字高塔课程：认数字 1~20 → 加减法（凑十入门 → 10 以内 → 20 以内含进位）。
// 插图生成器读取这份数据，保证「题图」和「题目」永远一致。
export const NUMBER_CURRICULUM = {
  numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  equations: [
    { a: 1, op: '+', b: 1 }, { a: 2, op: '+', b: 1 }, { a: 1, op: '+', b: 2 }, { a: 2, op: '+', b: 2 },
    { a: 3, op: '+', b: 2 }, { a: 4, op: '+', b: 1 }, { a: 5, op: '-', b: 2 }, { a: 6, op: '-', b: 3 },
    { a: 8, op: '+', b: 5 }, { a: 9, op: '+', b: 6 }, { a: 13, op: '-', b: 5 }, { a: 15, op: '-', b: 8 },
    { a: 12, op: '+', b: 7 },
  ],
  comparisons: [{ a: 3, b: 5 }, { a: 6, b: 4 }, { a: 2, b: 7 }, { a: 5, b: 5 }],
};

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const NUMBER_CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
export const numberWord = (count) => NUMBER_WORDS[count] || String(count);
export const numberChinese = (count) => NUMBER_CN[count] || String(count);
export const numberCardPath = (count) => `assets/learning/vocabulary/${numberWord(count)}.svg`;
export const mathCardPath = ({ a, op, b }) => `assets/learning/math/${op === '+' ? 'add' : 'sub'}-${a}-${b}.svg`;
export const compareCardPath = ({ a, b }) => `assets/learning/math/cmp-${a}-${b}.svg`;

function numberLearnRounds() {
  const rounds = [];
  const learnNumber = (count) => rounds.push({
    type: 'learn', chip: '认识数字', word: String(count), image: numberCardPath(count),
    zh: `这是数字 ${count}，${numberWord(count)}，${numberChinese(count)}。数一数，卡片上有 ${count} 颗星星。`,
  });
  const equation = ({ a, op, b }) => {
    const answer = op === '+' ? a + b : a - b;
    const distractors = [answer - 1, answer + 1].filter((value) => value >= 0);
    const choices = [String(distractors[0] ?? answer + 1), String(answer), String(distractors[1] ?? answer + 2)];
    return {
      type: 'match', chip: '看图算一算', word: String(answer), image: mathCardPath({ a, op, b }),
      prompt: `${a} ${op === '+' ? '加' : '减'} ${b} 等于几？`,
      zh: `数一数，左边 ${a} 个，右边 ${b} 个，一共几个？`,
      heading: ['算一算', '等于几'], action: '再选数字', hideTranslation: true,
      choices, correct: String(answer),
    };
  };
  const comparison = ({ a, b }) => ({
    type: 'match', chip: '比一比谁多', word: String(Math.max(a, b)), image: compareCardPath({ a, b }),
    prompt: '哪一边更多？', zh: '数一数，看看哪边的星星更多。',
    heading: ['比一比', '谁多'], action: '选多的一边', hideTranslation: true,
    choices: [String(a), String(b)], correct: String(a === b ? a : (a > b ? a : b)),
  });

  NUMBER_CURRICULUM.numbers.slice(0, 10).forEach(learnNumber);
  NUMBER_CURRICULUM.equations.slice(0, 4).forEach((item) => rounds.push(equation(item)));
  NUMBER_CURRICULUM.numbers.slice(10).forEach(learnNumber);
  NUMBER_CURRICULUM.equations.slice(4).forEach((item) => rounds.push(equation(item)));
  NUMBER_CURRICULUM.comparisons.forEach((item) => rounds.push(comparison(item)));
  return rounds;
}

export function createBuiltInThemes() {
  return {
  color: { id: 'color', title: '色彩魔法', subtitle: '颜色魔法', words: ['red', 'yellow', 'blue'], rewards: ['hat_crown', 'top_dress', 'bottom_tutu', 'shoes_glass', 'back_wings'],
    rounds: [
      { type: 'learn', chip: '认识单词', word: 'red', image: 'assets/learning/vocabulary/red.svg', zh: '看一看，这是 red。' },
      { type: 'learn', chip: '认识单词', word: 'yellow', image: 'assets/learning/vocabulary/yellow.svg', zh: '看一看，这是 yellow。' },
      { type: 'learn', chip: '认识单词', word: 'blue', image: 'assets/learning/vocabulary/blue.svg', zh: '看一看，这是 blue。' },
    ],
    reviewRounds: [
      { type: 'match', chip: '魔法复习', prompt: 'Which word matches?', word: 'red', image: 'assets/learning/vocabulary/red.svg', zh: '看图片，选出对应的英文单词。', choices: ['red', 'blue'], correct: 'red' },
      { type: 'listen', chip: '听音找一找', prompt: 'Find yellow!', word: 'yellow', image: 'assets/learning/vocabulary/yellow.svg', zh: '听一听，找到对应的图片。', choices: ['yellow', 'red'], correct: 'yellow' },
      { type: 'match', chip: '魔法复习', prompt: 'Which word matches?', word: 'blue', image: 'assets/learning/vocabulary/blue.svg', zh: '看图片，选出对应的英文单词。', choices: ['yellow', 'blue'], correct: 'blue' },
    ],
  },
  animal: { id: 'animal', title: '动物花园', subtitle: '动物花园', words: ['cat', 'dog', 'rabbit'], rewards: ['hat_straw', 'held_bear', 'back_butterfly', 'shoes_sandal'],
    rounds: [
      { type: 'learn', chip: '认识单词', word: 'cat', image: 'assets/learning/vocabulary/cat.svg', zh: '看一看，这是 cat。' },
      { type: 'learn', chip: '认识单词', word: 'dog', image: 'assets/learning/vocabulary/dog.svg', zh: '看一看，这是 dog。' },
      { type: 'learn', chip: '认识单词', word: 'rabbit', image: 'assets/learning/vocabulary/rabbit.svg', zh: '看一看，这是 rabbit。' },
    ],
    reviewRounds: [
      { type: 'match', chip: '魔法复习', prompt: 'Which word matches?', word: 'cat', image: 'assets/learning/vocabulary/cat.svg', zh: '看图片，选出对应的英文单词。', choices: ['cat', 'dog'], correct: 'cat' },
      { type: 'listen', chip: '听音找一找', prompt: 'Find dog!', word: 'dog', image: 'assets/learning/vocabulary/dog.svg', zh: '听一听，找到对应的图片。', choices: ['rabbit', 'dog'], correct: 'dog' },
      { type: 'match', chip: '魔法复习', prompt: 'Which word matches?', word: 'rabbit', image: 'assets/learning/vocabulary/rabbit.svg', zh: '看图片，选出对应的英文单词。', choices: ['cat', 'rabbit'], correct: 'rabbit' },
    ],
  },
  action: { id: 'action', title: '朗诵小舞台', subtitle: '朗诵小舞台', words: ['春晓', '登鹳雀楼', '静夜思'], rewards: ['hat_cap', 'top_sport', 'bottom_shorts', 'shoes_sport', 'held_balloon'],
    rounds: [
      { type: 'recite', chip: '跟读朗诵', word: '春晓', text: '春眠不觉晓，处处闻啼鸟。', zh: '先听一听，再把这一句朗读出来。' },
      { type: 'recite', chip: '跟读朗诵', word: '登鹳雀楼', text: '白日依山尽，黄河入海流。', zh: '读得慢一点，让每个字都清楚。' },
      { type: 'recite', chip: '跟读朗诵', word: '静夜思', text: '床前明月光，疑是地上霜。', zh: '试着用好听的声音完整读一遍。' },
    ],
    reviewRounds: [
      { type: 'recite', chip: '朗诵回顾', word: '春晓', text: '春眠不觉晓，处处闻啼鸟。', zh: '再读一次，听听自己的节奏。' },
      { type: 'recite', chip: '朗诵回顾', word: '登鹳雀楼', text: '白日依山尽，黄河入海流。', zh: '再读一次，注意停顿。' },
      { type: 'recite', chip: '朗诵回顾', word: '静夜思', text: '床前明月光，疑是地上霜。', zh: '再读一次，把句子读完整。' },
    ],
  },
  number: { id: 'number', title: '数字高塔', subtitle: '数一数，算一算', words: ['one', 'two', 'three', 'four', 'five'], rewards: ['hat_wizard', 'gl_star', 'top_sailor', 'held_book'],
    rounds: numberLearnRounds(),
    reviewRounds: [
      { type: 'match', chip: '魔法复习', prompt: 'Which number matches?', word: 'one', image: 'assets/learning/vocabulary/one.svg', zh: '看数量，选出对应的数字。', choices: ['one', 'two'], correct: 'one' },
      { type: 'listen', chip: '听音找一找', prompt: 'Find two!', word: 'two', image: 'assets/learning/vocabulary/two.svg', zh: '听一听，找到对应的数量图片。', choices: ['one', 'two'], correct: 'two' },
      { type: 'match', chip: '魔法复习', prompt: 'Which number matches?', word: 'three', image: 'assets/learning/vocabulary/three.svg', zh: '看数量，选出对应的数字。', choices: ['two', 'three'], correct: 'three' },
      { type: 'action', chip: '数字动作', prompt: 'Clap three times!', word: 'three', image: 'assets/learning/vocabulary/clap.svg', zh: '跟着露娜拍三下手，完成后点“我做完啦”。', actionLabel: '我做完啦' },
    ],
  },
};
}
