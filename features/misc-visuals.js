// 彩虹花园（综合认知）：形状、颜色等几何与色彩矢量图生成器

export const SHAPE_VISUALS = {
  '三角形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <polygon points="100,28 175,162 25,162" fill="#ff7675" stroke="#d63031" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '正方形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <rect x="36" y="36" width="128" height="128" rx="14" fill="#74b9ff" stroke="#0984e3" stroke-width="8" />
  </svg>`,
  '长方形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <rect x="22" y="55" width="156" height="90" rx="14" fill="#55efc4" stroke="#00b894" stroke-width="8" />
  </svg>`,
  '圆形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <circle cx="100" cy="100" r="68" fill="#ffeaa7" stroke="#fdcb6e" stroke-width="8" />
  </svg>`,
  '半圆形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <path d="M 28 120 A 72 72 0 0 1 172 120 Z" fill="#a29bfe" stroke="#6c5ce7" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '梯形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <polygon points="62,45 138,45 178,155 22,155" fill="#fab1a0" stroke="#e17055" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '椭圆形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <ellipse cx="100" cy="100" rx="76" ry="50" fill="#81ecec" stroke="#00cec9" stroke-width="8" />
  </svg>`,
  '五角星': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <polygon points="100,24 122,78 180,78 133,112 151,168 100,134 49,168 67,112 20,78 78,78" fill="#fdcb6e" stroke="#e1b12c" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
  '心形': `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
    <path d="M100 162 C40 115 25 75 48 45 C70 18 95 38 100 52 C105 38 130 18 152 45 C175 75 160 115 100 162 Z" fill="#ff7675" stroke="#d63031" stroke-width="8" stroke-linejoin="round" />
  </svg>`
};

export const COLOR_VISUALS = {
  '红色': '#ef4444',
  '蓝色': '#3b82f6',
  '白色': '#f8fafc',
  '黑色': '#1e293b',
  '绿色': '#22c55e',
  '黄色': '#eab308',
  '紫色': '#a855f7',
  '粉色': '#ec4899',
  '橙色': '#f97316',
  '天蓝': '#38bdf8',
  '棕色': '#8b5cf6',
  '灰色': '#94a3b8',
};

export function getMiscVisual(word) {
  const clean = String(word || '').trim();
  if (SHAPE_VISUALS[clean]) {
    return { type: 'shape', svg: SHAPE_VISUALS[clean] };
  }
  if (COLOR_VISUALS[clean]) {
    const hex = COLOR_VISUALS[clean];
    const isLight = clean === '白色' || clean === '黄色';
    const border = isLight ? '#cbd5e1' : hex;
    const svg = `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="grad-${encodeURIComponent(clean)}" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${hex}" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="70" fill="url(#grad-${encodeURIComponent(clean)})" stroke="${border}" stroke-width="6" />
      <circle cx="75" cy="75" r="16" fill="#ffffff" opacity="0.45" />
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
