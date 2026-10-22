import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { NUMBER_CURRICULUM, numberTowerRounds, numberWord, numberChinese } from '../features/number-tower.js';

const STAGE_NAMES = ['点亮数字梯', '星星加法岛', '减去魔法阵', '双位数城堡', '进位加法塔', '退位减法塔', '跷跷板比一比'];

test('数字高塔课程：7 关，顺序与教学目标一致', () => {
  const stages = NUMBER_CURRICULUM.stages;
  assert.equal(stages.length, 7);
  assert.deepEqual(stages.map((stage) => stage.name), STAGE_NAMES);
  // 第 1 关认 1~10，第 4 关认 11~20
  assert.deepEqual(stages[0].numbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(stages[3].numbers, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  // 加减法关只出算式，比一比关只出对比
  assert.ok(stages[1].equations.every((item) => item.op === '+'));
  assert.ok(stages[2].equations.every((item) => item.op === '-'));
  assert.ok(stages[4].equations.every((item) => item.op === '+'));
  assert.ok(stages[5].equations.every((item) => item.op === '-'));
  assert.ok(stages[6].comparisons.length > 0);
});

test('算式不越界：10 以内关不进位，20 以内关结果不超过 20', () => {
  const stages = NUMBER_CURRICULUM.stages;
  for (const item of stages[1].equations) assert.ok(item.a + item.b <= 10, `${item.a}+${item.b} 超过 10`);
  for (const item of stages[2].equations) assert.ok(item.a - item.b >= 0 && item.a <= 10);
  for (const item of stages[4].equations) assert.ok(item.a + item.b <= 20, `${item.a}+${item.b} 超过 20`);
  for (const item of stages[5].equations) assert.ok(item.a - item.b >= 0 && item.a <= 20);
  // 进位加法与退位减法各留几道需要「凑十」的题
  assert.ok(stages[4].equations.some((item) => item.a % 10 + item.b % 10 >= 10));
  assert.ok(stages[5].equations.some((item) => item.a % 10 < item.b));
});

test('回合表：每关一张封面卡 + 该关练习，关号连续', () => {
  const rounds = numberTowerRounds();
  const covers = rounds.filter((round) => round.type === 'stage');
  assert.equal(covers.length, 7);
  covers.forEach((cover, index) => {
    assert.equal(cover.stage.index, index + 1);
    assert.equal(cover.stage.total, 7);
    assert.equal(cover.stage.name, STAGE_NAMES[index]);
    assert.equal(cover.stage.step, 1);
  });
  // 数字板各 10 个数字，练习卡按关卡挂到同一关
  const boards = rounds.filter((round) => round.type === 'board');
  assert.equal(boards.length, 2);
  boards.forEach((board) => assert.equal(board.numbers.length, 10));
  rounds.filter((round) => round.type === 'quiz').forEach((quiz) => {
    assert.ok(quiz.stage.index >= 1 && quiz.stage.index <= 7);
    assert.ok(quiz.stage.step > 1);
  });
});

test('练习卡：正确答案一定在选项里，选项不重复', () => {
  numberTowerRounds().filter((round) => round.type === 'quiz').forEach((quiz) => {
    const values = quiz.choices.map((choice) => choice.value);
    assert.ok(values.includes(quiz.correct), `正确答案 ${quiz.correct} 不在选项里`);
    assert.equal(new Set(values).size, values.length, '选项有重复');
    assert.ok(quiz.image && quiz.equation && quiz.prompt && quiz.zh);
    // 选项只给数字和对应数量（星星数），不再显示汉字
    quiz.choices.forEach((choice) => {
      assert.equal(choice.sub, undefined, '选项里不该再有汉字');
      assert.equal(typeof choice.count, 'number', '选项要带对应数量');
    });
    if (quiz.kind === 'equation') {
      quiz.choices.forEach((choice) => assert.equal(choice.count, Number(choice.value)));
    } else {
      // 比多少：左边右边各自显示自己的数字
      assert.deepEqual(quiz.choices.map((choice) => choice.count).sort(), [quiz.a, quiz.b].sort());
      assert.ok(quiz.choices.every((choice) => choice.side));
    }
  });
});

test('数字与算式的插图文件都在仓库里（题图与题目同源）', () => {
  for (const stage of NUMBER_CURRICULUM.stages) {
    for (const count of stage.numbers || []) {
      assert.ok(existsSync(`assets/learning/vocabulary/${numberWord(count)}.svg`), `缺数字牌 ${count}`);
    }
    for (const item of stage.equations || []) {
      const name = `${item.op === '+' ? 'add' : 'sub'}-${item.a}-${item.b}.svg`;
      assert.ok(existsSync(`assets/learning/math/${name}`), `缺算式图 ${name}`);
    }
    for (const item of stage.comparisons || []) {
      assert.ok(existsSync(`assets/learning/math/cmp-${item.a}-${item.b}.svg`), `缺对比图 ${item.a}-${item.b}`);
    }
  }
});

test('数字读音：1~20 的英文与中文一一对应', () => {
  assert.equal(numberWord(1), 'one');
  assert.equal(numberWord(20), 'twenty');
  assert.equal(numberChinese(1), '一');
  assert.equal(numberChinese(10), '十');
  assert.equal(numberChinese(11), '十一');
  assert.equal(numberChinese(20), '二十');
});
