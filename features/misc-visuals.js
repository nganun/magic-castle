// 彩虹花园（综合认知）：形状、颜色等几何与色彩矢量图生成器

export const SHAPE_VISUALS = {
  '三角形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <polygon points="100,16 186,182 14,182" fill="#ff7675" stroke="#d63031" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '正方形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <rect x="16" y="16" width="168" height="168" rx="18" fill="#74b9ff" stroke="#0984e3" stroke-width="8" />
  </svg>`,
  '长方形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <rect x="12" y="32" width="176" height="136" rx="18" fill="#55efc4" stroke="#00b894" stroke-width="8" />
  </svg>`,
  '圆形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <circle cx="100" cy="100" r="86" fill="#ffeaa7" stroke="#fdcb6e" stroke-width="8" />
  </svg>`,
  '半圆形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <path d="M 14 136 A 86 86 0 0 1 186 136 Z" fill="#a29bfe" stroke="#6c5ce7" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '梯形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <polygon points="52,26 148,26 186,176 14,176" fill="#fab1a0" stroke="#e17055" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '椭圆形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <ellipse cx="100" cy="100" rx="88" ry="64" fill="#81ecec" stroke="#00cec9" stroke-width="8" />
  </svg>`,
  '五角星': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <polygon points="100,16 126,72 188,72 138,110 156,174 100,136 44,174 62,110 12,72 74,72" fill="#fdcb6e" stroke="#e1b12c" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '心形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <path d="M100 176 C32 122 14 76 42 42 C68 12 95 32 100 48 C105 32 132 12 158 42 C186 76 168 122 100 176 Z" fill="#ff7675" stroke="#d63031" stroke-width="8" stroke-linejoin="round" />
  </svg>`
};

export const COLOR_VISUALS = {
  '红色': '#ef4444',
  '蓝色': '#3b82f6',
  '白色': '#ffffff',
  '黑色': '#1e293b',
  '绿色': '#22c55e',
  '黄色': '#facc15',
  '紫色': '#a855f7',
  '粉色': '#ec4899',
  '橙色': '#f97316',
  '天蓝': '#38bdf8',
  '棕色': '#8d5b4c',
  '灰色': '#94a3b8',
};

export function getMiscVisual(word) {
  const clean = String(word || '').trim();
  if (SHAPE_VISUALS[clean]) {
    return { type: 'shape', svg: SHAPE_VISUALS[clean] };
  }
  if (COLOR_VISUALS[clean]) {
    const hex = COLOR_VISUALS[clean];
    const isWhite = clean === '白色';
    const isYellow = clean === '黄色';
    const stroke = isWhite ? '#cbd5e1' : (isYellow ? '#ca8a04' : hex);
    const strokeWidth = isWhite ? 6 : 4;
    const svg = `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
      <circle cx="100" cy="100" r="86" fill="${hex}" stroke="${stroke}" stroke-width="${strokeWidth}" />
    </svg>`;
    return { type: 'color', svg, hex };
  }
  // 通用几何标识卡
  const fallbackSvg = `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <rect x="40" y="40" width="120" height="120" rx="28" fill="#e0e7ff" stroke="#818cf8" stroke-width="6" />
    <text x="100" y="118" font-size="52" font-weight="bold" fill="#4f46e5" text-anchor="middle" font-family="sans-serif">✦</text>
  </svg>`;
  return { type: 'generic', svg: fallbackSvg };
}
