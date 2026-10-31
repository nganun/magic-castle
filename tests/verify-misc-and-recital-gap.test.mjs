import test from 'node:test';
import assert from 'node:assert/strict';
import { getMiscVisual, COLOR_VISUALS, SHAPE_VISUALS } from '../features/misc-visuals.js';

test('彩虹花园：颜色卡片大圆实色填充与轮廓', () => {
  for (const [name, hex] of Object.entries(COLOR_VISUALS)) {
    const visual = getMiscVisual(name);
    assert.equal(visual.type, 'color');
    assert.equal(visual.hex, hex);
    assert.ok(visual.svg.includes(`<circle cx="100" cy="100" r="86"`), `${name} 应该包含居中大圆`);
    assert.ok(visual.svg.includes(`fill="${hex}"`), `${name} 大圆应该填充对应的颜色 hex (${hex})`);
    assert.ok(!visual.svg.includes('radialGradient'), `${name} 不应使用半透明渐变`);
  }
  // 白色具有浅灰外边框以防在白底上看不见
  const whiteVisual = getMiscVisual('白色');
  assert.ok(whiteVisual.svg.includes('stroke="#cbd5e1"'));
});

test('彩虹花园：形状卡片保留椭圆形与基础形状', () => {
  assert.ok(SHAPE_VISUALS['椭圆形']);
  const ellipse = getMiscVisual('椭圆形');
  assert.equal(ellipse.type, 'shape');
  assert.ok(ellipse.svg.includes('<ellipse'));
});
