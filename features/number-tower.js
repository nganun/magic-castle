// 数字高塔（number 主题）的课程数据、卡片标记与交互。
//
// 课程分成 7 关，每关 = 一张关卡封面 + 若干练习卡：
//   1 点亮数字梯   认识 1~10（金字塔数字板，点一下就念出来）
//   2 星星加法岛   10 以内加法
//   3 减去魔法阵   10 以内减法
//   4 双位数城堡   认识 11~20（十块 + 几个一）
//   5 进位加法塔   20 以内加法
//   6 退位减法塔   20 以内减法
//   7 跷跷板比一比 数一数，哪一边更多
//
// 插图生成器（scripts/generate-learning-images.mjs）读取这里的 NUMBER_CURRICULUM，
// 保证「题图」和「题目」永远一致；数字和算式不要再写第二份。

import { escapeHtml } from './utils.js';
import { lessonCardCurtainMarkup, lessonCardProgress, lessonPrimaryActionsMarkup } from './lesson-cards.js';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const NUMBER_CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

export const numberWord = (count) => NUMBER_WORDS[count] || String(count);
export const numberChinese = (count) => NUMBER_CN[count] || String(count);
export const numberCardPath = (count) => `assets/learning/vocabulary/${numberWord(count)}.svg`;
export const mathCardPath = ({ a, op, b }) => `assets/learning/math/${op === '+' ? 'add' : 'sub'}-${a}-${b}.svg`;
export const compareCardPath = ({ a, b }) => `assets/learning/math/cmp-${a}-${b}.svg`;

export const NUMBER_CURRICULUM = {
  stages: [
    {
      id: 'ladder-1-10',
      name: '点亮数字梯',
      goal: '认识 1 到 10，点一点数字，露娜念给你听',
      kind: 'board',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    {
      id: 'add-10',
      name: '星星加法岛',
      goal: '10 以内加法：把两堆星星合起来，一共几颗',
      kind: 'quiz',
      equations: [
        { a: 1, op: '+', b: 1 }, { a: 2, op: '+', b: 2 }, { a: 3, op: '+', b: 2 },
        { a: 4, op: '+', b: 3 }, { a: 5, op: '+', b: 3 }, { a: 6, op: '+', b: 4 },
      ],
    },
    {
      id: 'sub-10',
      name: '减去魔法阵',
      goal: '10 以内减法：把星星拿走，还剩几颗',
      kind: 'quiz',
      equations: [
        { a: 3, op: '-', b: 1 }, { a: 5, op: '-', b: 2 }, { a: 7, op: '-', b: 3 },
        { a: 9, op: '-', b: 4 }, { a: 10, op: '-', b: 4 }, { a: 9, op: '-', b: 2 },
      ],
    },
    {
      id: 'castle-11-20',
      name: '双位数城堡',
      goal: '认识 11 到 20：十个一是一组，再加几个一',
      kind: 'board',
      numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    },
    {
      id: 'add-20',
      name: '进位加法塔',
      goal: '20 以内加法：先凑成十，再加剩下的',
      kind: 'quiz',
      equations: [
        { a: 7, op: '+', b: 4 }, { a: 8, op: '+', b: 5 }, { a: 9, op: '+', b: 6 },
        { a: 10, op: '+', b: 6 }, { a: 8, op: '+', b: 9 }, { a: 10, op: '+', b: 9 },
      ],
    },
    {
      id: 'sub-20',
      name: '退位减法塔',
      goal: '20 以内减法：不够减，就先把十拿回来',
      kind: 'quiz',
      equations: [
        { a: 13, op: '-', b: 5 }, { a: 15, op: '-', b: 8 }, { a: 14, op: '-', b: 5 },
        { a: 11, op: '-', b: 5 }, { a: 12, op: '-', b: 7 }, { a: 10, op: '-', b: 7 },
      ],
    },
    {
      id: 'compare',
      name: '跷跷板比一比',
      goal: '数一数星星，哪一边的更多',
      kind: 'quiz',
      comparisons: [{ a: 3, b: 5 }, { a: 6, b: 4 }, { a: 2, b: 7 }, { a: 8, b: 5 }],
    },
  ],
};

// 金字塔排布：1 个 + 2 个 + 3 个 + 4 个 = 10，正好一关 10 个数字
function pyramidRows(numbers) {
  const rows = [];
  let index = 0;
  let size = 1;
  while (index < numbers.length) {
    const row = numbers.slice(index, index + size);
    index += size;
    size += 1;
    rows.push(row);
  }
  return rows;
}

// 数量表示：1~10 数圆点；11~20 用「十 + 几个一」。圆点每行最多 5 个（CSS 控制）。
function quantityMarkup(count) {
  const tens = count > 10 ? Math.floor(count / 10) : 0;
  const ones = count > 10 ? count % 10 : count;
  const ten = tens ? `<i class="number-quantity-ten">${'十'.repeat(tens)}</i>` : '';
  const dots = ones ? `<i class="number-dots">${'<s></s>'.repeat(ones)}</i>` : '';
  return `<span class="number-quantity">${ten}${dots}</span>`;
}

function numberTile(count) {
  return `<button class="number-pyramid-step" type="button" data-number="${count}" aria-label="数字 ${count}，${numberChinese(count)}">
      <b>${count}</b>${quantityMarkup(count)}
    </button>`;
}

function equationRound({ a, op, b }) {
  const answer = op === '+' ? a + b : a - b;
  const pool = [answer - 1, answer, answer + 1].filter((value) => value >= 0);
  // 正确答案在中间或最后，不固定在第一个
  const offset = (a % 2) * 2;
  const options = pool.slice(offset).concat(pool.slice(0, offset));
  return {
    type: 'quiz', kind: 'equation', a, op, b,
    image: mathCardPath({ a, op, b }),
    prompt: `${a} ${op === '+' ? '加' : '减'} ${b} 等于几？`,
    zh: op === '+' ? `左边 ${a} 颗，右边 ${b} 颗，合起来一共几颗？` : `本来有 ${a} 颗，拿走 ${b} 颗，还剩几颗？`,
    equation: `${a} ${op === '+' ? '+' : '−'} ${b} = ?`,
    // 选项：数字 + 对应数量的星星（不显示汉字）
    choices: options.map((value) => ({ value: String(value), label: String(value), count: value })),
    correct: String(answer),
    word: String(answer),
    toast: `答对啦！${numberChinese(answer)}`,
  };
}

function compareRound({ a, b }) {
  const answer = a === b ? 'left' : (a > b ? 'left' : 'right');
  return {
    type: 'quiz', kind: 'compare', a, b,
    image: compareCardPath({ a, b }),
    prompt: '哪一边的星星更多？',
    zh: '数一数，看哪边的星星更多，再点它。',
    equation: `${a} 和 ${b}，哪边多？`,
    // 选项：哪一边 + 该边的数字与星星数
    choices: [
      { value: 'left', label: String(a), side: '左边', count: a },
      { value: 'right', label: String(b), side: '右边', count: b },
    ],
    correct: answer,
    word: String(Math.max(a, b)),
    toast: '答对啦！你数得真准',
  };
}

function stageRounds(stage) {
  if (stage.kind === 'board') {
    return [{
      type: 'board', stage, numbers: stage.numbers,
      prompt: stage.goal,
      zh: stage.goal,
      word: `${stage.numbers[0]}-${stage.numbers[stage.numbers.length - 1]}`,
      celebration: { title: '全部点亮啦！', word: `${stage.numbers[0]}~${stage.numbers[stage.numbers.length - 1]}` },
      toast: `${stage.name}完成！全部数字都点亮啦！`,
    }];
  }
  if (stage.equations) return stage.equations.map(equationRound);
  return stage.comparisons.map(compareRound);
}

/** 数字高塔的整套回合：每关一张封面卡 + 该关的练习卡。 */
export function numberTowerRounds() {
  const rounds = [];
  const stages = NUMBER_CURRICULUM.stages;
  stages.forEach((stage, stageIndex) => {
    const content = stageRounds(stage);
    const meta = { index: stageIndex + 1, total: stages.length, name: stage.name, size: content.length + 1 };
    rounds.push({
      type: 'stage', stage: { ...meta, step: 1 },
      word: stage.name, title: stage.name, goal: stage.goal, prompt: stage.goal,
      preview: stage.numbers ? stage.numbers.slice(0, 3).map(numberCardPath) : (content[0]?.image ? [content[0].image] : []),
      celebration: { title: '闯关成功！', word: stage.name },
      toast: `开始${stage.name}！`,
    });
    content.forEach((round, index) => {
      rounds.push({ ...round, stage: { ...meta, step: index + 2 } });
    });
  });
  return rounds;
}

function numberTowerChip(label) {
  return `<span class="lesson-group-chip is-static">${escapeHtml(label)}</span>`;
}

/** 关卡封面卡：告诉小朋友这是第几关、要做什么。 */
export function numberStageCardMarkup({ stage, title, goal, preview = [] }) {
  const previews = preview.map((src) => `<img src="${src}" alt="" />`).join('');
  return `<article class="number-stage-card">
      ${lessonCardCurtainMarkup()}
      <div class="lesson-card-topline"><p class="lesson-card-kicker">数字高塔</p><span class="lesson-card-actions">${numberTowerChip(`共 ${stage.total} 关`)}</span></div>
      ${lessonCardProgress()}
      <div class="number-stage-badge">第 ${stage.index} 关</div>
      <h2>${escapeHtml(title)}</h2>
      <p class="number-stage-goal">${escapeHtml(goal)}</p>
      ${previews ? `<div class="number-stage-preview">${previews}</div>` : ''}
      ${lessonPrimaryActionsMarkup()}
    </article>`;
}

/** 数字板卡：金字塔式排列，点一下念一个数字，全部点亮才能继续。 */
export function numberBoardCardMarkup({ stage, title, goal, numbers, hint }) {
  const rows = pyramidRows(numbers).map((row) => `<div class="number-pyramid-row" style="--count:${row.length}">${row.map(numberTile).join('')}</div>`).join('');
  return `<article class="number-tower-card">
      ${lessonCardCurtainMarkup()}
      <div class="lesson-card-topline"><p class="lesson-card-kicker">第 ${stage.index} 关 · ${escapeHtml(title)}</p><span class="lesson-card-actions">${numberTowerChip(`${numbers.length} 个数字`)}</span></div>
      ${lessonCardProgress()}
      <p class="number-tower-goal">${escapeHtml(goal)}</p>
      <div class="number-pyramid">${rows}</div>
      <div class="number-spotlight is-empty" id="numberSpotlight" aria-live="polite">
        <div class="number-spotlight-empty">${escapeHtml(hint)}</div>
      </div>
      <div class="number-tower-meter"><span class="number-tower-meter-label">已点亮 <b id="numberLitCount">0</b>/${numbers.length}</span><span class="number-tower-meter-stars" id="numberTowerStars" aria-hidden="true"></span></div>
      ${lessonPrimaryActionsMarkup()}
    </article>`;
}

export function numberSpotlightMarkup(count) {
  return `<img src="${numberCardPath(count)}" alt="数字 ${count} 的星星卡片" />
    <span class="number-spotlight-word"><b>${escapeHtml(numberWord(count))}</b><em>${escapeHtml(numberChinese(count))}</em></span>`;
}

/** 练习卡：算式题或比多少题。 */
export function numberQuizCardMarkup({ stage, title, image, equation, prompt, hint, choices }) {
  const options = choices.map((choice) => `<button class="number-quiz-choice" type="button" data-choice="${escapeHtml(choice.value)}">
      ${choice.side ? `<span class="number-quiz-side">${escapeHtml(choice.side)}</span>` : ''}
      <b>${escapeHtml(choice.label)}</b>
      ${typeof choice.count === 'number' ? quantityMarkup(choice.count) : ''}
    </button>`).join('');
  return `<article class="number-quiz-card">
      ${lessonCardCurtainMarkup()}
      <div class="lesson-card-topline"><p class="lesson-card-kicker">第 ${stage.index} 关 · ${escapeHtml(title)}</p><span class="lesson-card-actions">${numberTowerChip('算一算')}</span></div>
      ${lessonCardProgress()}
      <div class="number-quiz-stage">
        <img class="number-quiz-figure" src="${image}" alt="${escapeHtml(prompt)}" />
        <div class="number-quiz-copy">
          <h2>${escapeHtml(equation)}</h2>
          <p>${escapeHtml(hint)}</p>
          <button class="number-quiz-listen" id="reviewListenAction" type="button" aria-label="再读一遍题目">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Zm12.5 2A4.5 4.5 0 0 0 14 8v2a4.5 4.5 0 0 1 0 4v2a4.5 2.5 0 0 0 2.5-4Z"/></svg>
            <span>再读一遍</span>
          </button>
        </div>
      </div>
      <div class="number-quiz-choices">${options}</div>
    </article>`;
}

/**
 * 数字板交互：点一下数字 → 高亮 + 聚光灯 + 念读音；全部点亮后放开「继续」。
 * speakWord / speakChinese 由 app.js 注入（朗读要复用 App 里的语音设置）。
 */
export function bindNumberBoard(root, { speakWord, speakChinese, onLight, onComplete }) {
  const steps = [...root.querySelectorAll('.number-pyramid-step')];
  const spotlight = root.querySelector('#numberSpotlight');
  const counter = root.querySelector('#numberLitCount');
  const stars = root.querySelector('#numberTowerStars');
  const lit = new Set();
  const total = steps.length;

  const renderMeter = () => {
    if (counter) counter.textContent = String(lit.size);
    if (stars) stars.textContent = '★'.repeat(lit.size);
    steps.forEach((step) => step.classList.toggle('is-lit', lit.has(Number(step.dataset.number))));
  };

  steps.forEach((step) => {
    step.addEventListener('click', () => {
      const count = Number(step.dataset.number);
      const first = !lit.has(count);
      lit.add(count);
      if (spotlight) {
        spotlight.classList.remove('is-empty');
        spotlight.innerHTML = numberSpotlightMarkup(count);
      }
      step.classList.add('is-speaking');
      window.setTimeout(() => step.classList.remove('is-speaking'), 700);
      speakWord(numberWord(count), () => speakChinese(numberChinese(count)));
      if (first) {
        onLight?.(count);
        renderMeter();
        if (lit.size === total) onComplete?.();
      }
    });
  });

  renderMeter();
  return { lit, total };
}
