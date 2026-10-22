// Built-in lesson catalog. Custom English, Hanzi, and recital content is layered in app.js.

import { numberTowerRounds } from './number-tower.js';

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
  number: { id: 'number', title: '数字高塔', subtitle: '数一数，算一算', words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'], rewards: ['hat_wizard', 'gl_star', 'top_sailor', 'held_book'],
    rounds: numberTowerRounds(),
    reviewRounds: [
      { type: 'match', chip: '魔法复习', prompt: 'Which number matches?', word: 'one', image: 'assets/learning/vocabulary/one.svg', zh: '看数量，选出对应的数字。', choices: ['one', 'two'], correct: 'one' },
      { type: 'listen', chip: '听音找一找', prompt: 'Find two!', word: 'two', image: 'assets/learning/vocabulary/two.svg', zh: '听一听，找到对应的数量图片。', choices: ['one', 'two'], correct: 'two' },
      { type: 'match', chip: '魔法复习', prompt: 'Which number matches?', word: 'three', image: 'assets/learning/vocabulary/three.svg', zh: '看数量，选出对应的数字。', choices: ['two', 'three'], correct: 'three' },
      { type: 'action', chip: '数字动作', prompt: 'Clap three times!', word: 'three', image: 'assets/learning/vocabulary/clap.svg', zh: '跟着露娜拍三下手，完成后点“我做完啦”。', actionLabel: '我做完啦' },
    ],
  },
};
}
