export const ARCADE_BOARD_SIZE = 8;

export const ARCADE_GAMES = [
  { id: 'memory', name: '魔法翻翻乐', icon: '✦', description: '翻开卡片，找到一样的魔法伙伴。', meta: '关卡递增 · 每日奖励' },
  { id: 'listen', name: '听音找一找', icon: '◖', description: '听露娜读一读，点出正确图片。', meta: '关卡递增 · 每日奖励' },
  { id: 'numbers', name: '数字泡泡', icon: '123', description: '听到数字后，点破正确泡泡。', meta: '关卡递增 · 每日奖励' },
  { id: 'colors', name: '颜色魔法', icon: '●', description: '听到颜色后，点中正确魔法色。', meta: '关卡递增 · 每日奖励' },
  { id: 'rhythm', name: '星星节奏', icon: '♫', description: '记住闪亮顺序，跟着点一遍。', meta: '难度递增 · 挑战纪录' },
  { id: 'match', name: '魔法消消乐', icon: '✹', description: '点中相连的魔法宝石，连续消除。', meta: '约 2 分钟 · 挑战纪录' },
  { id: 'arrows', name: '箭头快跑', icon: '➜', description: '找出没有阻挡的箭头，全部消除。', meta: '关卡递增 · 挑战纪录' },
  { id: 'fruit', name: '水果魔法切切乐', icon: '✣', description: '滑动切开飞来的魔法水果，小心炸弹。', meta: '全屏横屏 · 挑战纪录' },
  { id: 'whack', name: '打地鼠', icon: '●', description: '看准了敲！别让地鼠跑掉。', meta: '反应力 · 每日奖励' },
  { id: 'catch', name: '接水果', icon: '⌒', description: '移动篮子，接住落下的水果。', meta: '反应力 · 每日奖励' },
  { id: 'lights', name: '点灯游戏', icon: '✦', description: '翻转灯光，熄灭全部魔法格。', meta: '关卡递增 · 每日奖励' },
  { id: 'tictactoe', name: '井字棋', icon: '○', description: '和露娜进行三连棋对战。', meta: '对战 · 每日奖励' },
  { id: 'game2048', name: '2048', icon: '2048', description: '合并数字到 2048。', meta: '益智 · 原始玩法' },
  { id: 'hanoi', name: '汉诺塔', icon: '△', description: '移动圆盘到目标柱。', meta: '逻辑 · 原始玩法' },
  { id: 'klotski', name: '华容道', icon: '▦', description: '移动方块，帮助主角离开。', meta: '益智 · 原始玩法' },
  { id: 'sudoku', name: '数独', icon: '4×4', description: '完成入门数独填数挑战。', meta: '逻辑 · 原始玩法' },
  { id: 'bulls', name: '猜数字', icon: '1234', description: '推理出隐藏的四位数字。', meta: '逻辑 · 原始玩法' },
];

export const ARCADE_HANZI_PICTURE_ITEMS = [
  { id: 'turtle', label: '乌龟', image: 'assets/learning/hanzi/乌龟.svg' },
  { id: 'rabbit', label: '兔子', image: 'assets/learning/hanzi/兔子.svg' },
  { id: 'pumpkin', label: '南瓜', image: 'assets/learning/hanzi/南瓜.svg' },
  { id: 'cantaloupe', label: '哈密瓜', image: 'assets/learning/hanzi/哈密瓜.svg' },
  { id: 'potato', label: '土豆', image: 'assets/learning/hanzi/土豆.svg' },
  { id: 'elephant', label: '大象', image: 'assets/learning/hanzi/大象.svg' },
  { id: 'sun', label: '太阳', image: 'assets/learning/hanzi/太阳.svg' },
  { id: 'dog', label: '小狗', image: 'assets/learning/hanzi/小狗.svg' },
  { id: 'pig', label: '小猪', image: 'assets/learning/hanzi/小猪.svg' },
  { id: 'cat', label: '小猫', image: 'assets/learning/hanzi/小猫.svg' },
  { id: 'star', label: '星星', image: 'assets/learning/hanzi/星星.svg' },
  { id: 'moon', label: '月亮', image: 'assets/learning/hanzi/月亮.svg' },
  { id: 'pear', label: '梨子', image: 'assets/learning/hanzi/梨子.svg' },
  { id: 'durian', label: '榴莲', image: 'assets/learning/hanzi/榴莲.svg' },
  { id: 'cherry', label: '樱桃', image: 'assets/learning/hanzi/樱桃.svg' },
  { id: 'mandarin', label: '橘子', image: 'assets/learning/hanzi/橘子.svg' },
  { id: 'orange', label: '橙子', image: 'assets/learning/hanzi/橙子.svg' },
  { id: 'balloon', label: '气球', image: 'assets/learning/hanzi/气球.svg' },
  { id: 'panda', label: '熊猫', image: 'assets/learning/hanzi/熊猫.svg' },
  { id: 'lion', label: '狮子', image: 'assets/learning/hanzi/狮子.svg' },
  { id: 'monkey', label: '猴子', image: 'assets/learning/hanzi/猴子.svg' },
  { id: 'corn', label: '玉米', image: 'assets/learning/hanzi/玉米.svg' },
  { id: 'wandou', label: '琬豆', image: 'assets/learning/hanzi/琬豆.svg' },
  { id: 'sugarcane', label: '甘蔗', image: 'assets/learning/hanzi/甘蔗.svg' },
  { id: 'white', label: '白色', image: 'assets/learning/hanzi/白色.svg' },
  { id: 'pink', label: '粉色', image: 'assets/learning/hanzi/粉色.svg' },
  { id: 'purple', label: '紫色', image: 'assets/learning/hanzi/紫色.svg' },
  { id: 'jujube', label: '红枣', image: 'assets/learning/hanzi/红枣.svg' },
  { id: 'red', label: '红色', image: 'assets/learning/hanzi/红色.svg' },
  { id: 'green', label: '绿色', image: 'assets/learning/hanzi/绿色.svg' },
  { id: 'carrot', label: '胡萝卜', image: 'assets/learning/hanzi/胡萝卜.svg' },
  { id: 'mango', label: '芒果', image: 'assets/learning/hanzi/芒果.svg' },
  { id: 'apple', label: '苹果', image: 'assets/learning/hanzi/苹果.svg' },
  { id: 'eggplant', label: '茄子', image: 'assets/learning/hanzi/茄子.svg' },
  { id: 'strawberry', label: '草莓', image: 'assets/learning/hanzi/草莓.svg' },
  { id: 'grape', label: '葡萄', image: 'assets/learning/hanzi/葡萄.svg' },
  { id: 'blue', label: '蓝色', image: 'assets/learning/hanzi/蓝色.svg' },
  { id: 'blueberry', label: '蓝莓', image: 'assets/learning/hanzi/蓝莓.svg' },
  { id: 'mushroom', label: '蘑菇', image: 'assets/learning/hanzi/蘑菇.svg' },
  { id: 'butterfly', label: '蝴蝶', image: 'assets/learning/hanzi/蝴蝶.svg' },
  { id: 'broccoli', label: '西兰花', image: 'assets/learning/hanzi/西兰花.svg' },
  { id: 'watermelon', label: '西瓜', image: 'assets/learning/hanzi/西瓜.svg' },
  { id: 'tomato', label: '西红柿', image: 'assets/learning/hanzi/西红柿.svg' },
  { id: 'pea', label: '豌豆', image: 'assets/learning/hanzi/豌豆.svg' },
  { id: 'giraffe', label: '长颈鹿', image: 'assets/learning/hanzi/长颈鹿.svg' },
  { id: 'frog', label: '青蛙', image: 'assets/learning/hanzi/青蛙.svg' },
  { id: 'banana', label: '香蕉', image: 'assets/learning/hanzi/香蕉.svg' },
  { id: 'fish', label: '鱼', image: 'assets/learning/hanzi/鱼.svg' },
  { id: 'duck', label: '鸭子', image: 'assets/learning/hanzi/鸭子.svg' },
  { id: 'cucumber', label: '黄瓜', image: 'assets/learning/hanzi/黄瓜.svg' },
  { id: 'yellow', label: '黄色', image: 'assets/learning/hanzi/黄色.svg' },
  { id: 'black', label: '黑色', image: 'assets/learning/hanzi/黑色.svg' },
];

export const ARCADE_PICTURE_ITEMS = [
  { id: 'cat', label: '小猫', image: 'assets/learning/vocabulary/cat.svg' },
  { id: 'dog', label: '小狗', image: 'assets/learning/vocabulary/dog.svg' },
  { id: 'rabbit', label: '小兔子', image: 'assets/learning/vocabulary/rabbit.svg' },
  { id: 'clap', label: '拍手', image: 'assets/learning/vocabulary/clap.svg' },
  { id: 'dance', label: '跳舞', image: 'assets/learning/vocabulary/dance.svg' },
  { id: 'jump', label: '跳跃', image: 'assets/learning/vocabulary/jump.svg' },
  { id: 'one', label: '一', image: 'assets/learning/vocabulary/one.svg' },
  { id: 'two', label: '二', image: 'assets/learning/vocabulary/two.svg' },
  { id: 'three', label: '三', image: 'assets/learning/vocabulary/three.svg' },
];

export const ARCADE_COLOR_ITEMS = [
  { id: 'red', label: '红色', image: 'assets/learning/vocabulary/red.svg', color: '#ef6274' },
  { id: 'yellow', label: '黄色', image: 'assets/learning/vocabulary/yellow.svg', color: '#f4c952' },
  { id: 'blue', label: '蓝色', image: 'assets/learning/vocabulary/blue.svg', color: '#75a8f0' },
  { id: 'green', label: '绿色', image: 'assets/learning/vocabulary/rabbit.svg', color: '#48c269' },
  { id: 'pink', label: '粉色', image: 'assets/learning/vocabulary/clap.svg', color: '#f06eb0' },
  { id: 'purple', label: '紫色', image: 'assets/learning/vocabulary/dance.svg', color: '#8d5cd6' },
  { id: 'orange', label: '橙色', image: 'assets/learning/vocabulary/jump.svg', color: '#ff8c37' },
  { id: 'sky', label: '天蓝', image: 'assets/learning/vocabulary/cat.svg', color: '#3ec9f5' },
];

export const RHYTHM_COLORS = ['violet', 'gold', 'sky', 'pink'];
export const MATCH_TILES = ['star', 'moon', 'gem', 'flower'];

export function shuffled(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function createMemoryDeck(pairCount = 2) {
  const source = ARCADE_HANZI_PICTURE_ITEMS.length ? ARCADE_HANZI_PICTURE_ITEMS : ARCADE_PICTURE_ITEMS;
  let pool = [];
  if (pairCount <= source.length) {
    pool = shuffled(source).slice(0, pairCount);
  } else {
    while (pool.length < pairCount) {
      pool.push(...shuffled(source));
    }
    pool = pool.slice(0, pairCount).map((item, i) => ({ ...item, id: `${item.id}_${i}` }));
  }
  return shuffled([...pool, ...pool].map((item, index) => ({ ...item, cardId: `${item.id}-${index}` })));
}

export function createListeningRound(choiceCount = 3) {
  const count = Math.max(2, Math.min(choiceCount, ARCADE_PICTURE_ITEMS.length));
  const choices = shuffled(ARCADE_PICTURE_ITEMS).slice(0, count);
  const answer = choices[Math.floor(Math.random() * choices.length)];
  return { answer, choices };
}

export function createColorRound(choiceCount = 3) {
  const count = Math.max(2, Math.min(choiceCount, ARCADE_COLOR_ITEMS.length));
  const choices = shuffled(ARCADE_COLOR_ITEMS).slice(0, count);
  const answer = choices[Math.floor(Math.random() * choices.length)];
  return { answer, choices };
}

export function createNumberRound(level = 1) {
  const config = [
    { max: 5, count: 3 },
    { max: 10, count: 4 },
    { max: 20, count: 5 },
    { max: 50, count: 6 },
    { max: 100, count: 7 },
  ][Math.min(level - 1, 4)] || { max: 10, count: 3 };

  const answer = Math.floor(Math.random() * config.max) + 1;
  const pool = new Set([answer]);
  while (pool.size < config.count) {
    pool.add(Math.floor(Math.random() * config.max) + 1);
  }
  return { answer, choices: shuffled([...pool]) };
}

export function nextRhythmColor() {
  return RHYTHM_COLORS[Math.floor(Math.random() * RHYTHM_COLORS.length)];
}

export function createMatchBoard() {
  const board = Array(ARCADE_BOARD_SIZE ** 2).fill(null);
  const palette = shuffled(MATCH_TILES);
  for (let row = 0; row < ARCADE_BOARD_SIZE; row += 1) {
    for (let col = 0; col < ARCADE_BOARD_SIZE; col += 1) {
      const block = Math.floor(row / 2) * 4 + Math.floor(col / 2);
      board[row * ARCADE_BOARD_SIZE + col] = palette[block % palette.length];
    }
  }
  return board;
}

export function createArrowBoard(size = ARCADE_BOARD_SIZE) {
  const arrows = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const direction = row === 0 ? 'up' : row === size - 1 ? 'down' : col === 0 ? 'left' : col === size - 1 ? 'right' : (row + col) % 2 ? 'up' : 'left';
      arrows.push({ id: `a-${size}-${row}-${col}`, row, col, direction });
    }
  }
  return shuffled(arrows);
}

export const FRUIT_TYPES = ['apple', 'orange', 'berry', 'melon'];
export function createFruitWave(count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    id: `fruit-${Date.now()}-${index}`,
    type: index === count - 1 && Math.random() < 0.35 ? 'bomb' : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)],
    x: 15 + (index * 17 + Math.floor(Math.random() * 10)) % 70,
    y: 24 + (Math.floor(index / 3) * 34) + Math.floor(Math.random() * 12),
    sliced: false,
  }));
}

export function createLightsBoard(size = 4) {
  const board = Array(size * size).fill(false);
  const toggles = shuffled(Array.from({ length: Math.min(size * 2, size * size) }, (_, index) => index));
  const flip = (index) => {
    const row = Math.floor(index / size); const col = index % size;
    [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].forEach(([r, c]) => {
      if (r >= 0 && r < size && c >= 0 && c < size) board[r * size + c] = !board[r * size + c];
    });
  };
  toggles.forEach(flip);
  return board;
}

export function nextArcadeLane() { return Math.floor(Math.random() * 3); }
