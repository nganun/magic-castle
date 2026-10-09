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

export function createMemoryDeck(pairCount = 3) {
  const count = Math.max(2, Math.min(pairCount, ARCADE_PICTURE_ITEMS.length));
  const pool = shuffled(ARCADE_PICTURE_ITEMS).slice(0, count);
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
