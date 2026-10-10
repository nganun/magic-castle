import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const previewDir = '/private/var/folders/bm/s13gndfn4f1d8lx3wpq38qh40000gn/T/opencode/hanzi-previews';

// =====================================================================
// 1. 橘子 (Realistic Mandarin Orange)
// =====================================================================
const orangeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <radialGradient id="orgGround" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fdba74" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#fffaf5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mandarinBody" cx="36%" cy="26%" r="70%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="16%" stop-color="#fdba74"/>
      <stop offset="42%" stop-color="#f97316"/>
      <stop offset="76%" stop-color="#ea580c"/>
      <stop offset="94%" stop-color="#c2410c"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </radialGradient>
    <radialGradient id="stemHollow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="75%" stop-color="#c2410c"/>
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="40%" stop-color="#22c55e"/>
      <stop offset="85%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
    <radialGradient id="crescentGrad" cx="42%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#fb923c"/>
      <stop offset="82%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </radialGradient>
  </defs>

  <rect width="240" height="180" rx="28" fill="#fffaf5"/>

  <!-- 漫反射软阴影与接触阴影 -->
  <ellipse cx="120" cy="154" rx="94" ry="14" fill="url(#orgGround)"/>
  <ellipse cx="80" cy="152" rx="48" ry="7" fill="#9a3412" opacity="0.35"/>
  <ellipse cx="154" cy="153" rx="44" ry="6" fill="#9a3412" opacity="0.32"/>

  <!-- 左后侧：完整大蜜橘 -->
  <g transform="translate(32, 54)">
    <ellipse cx="50" cy="56" rx="50" ry="40" fill="url(#mandarinBody)"/>
    <!-- 细腻油胞孔 -->
    <g fill="#9a3412" opacity="0.18">
      <circle cx="30" cy="48" r="0.8"/><circle cx="36" cy="42" r="0.8"/><circle cx="44" cy="47" r="0.8"/><circle cx="52" cy="40" r="0.8"/>
      <circle cx="64" cy="44" r="0.8"/><circle cx="72" cy="50" r="0.8"/><circle cx="24" cy="60" r="0.8"/><circle cx="32" cy="64" r="0.8"/>
      <circle cx="46" cy="68" r="0.8"/><circle cx="60" cy="66" r="0.8"/><circle cx="70" cy="64" r="0.8"/><circle cx="80" cy="60" r="0.8"/>
      <circle cx="28" cy="76" r="0.8"/><circle cx="40" cy="80" r="0.8"/><circle cx="54" cy="82" r="0.8"/><circle cx="68" cy="78" r="0.8"/>
    </g>
    <!-- 高光弧晕 -->
    <path d="M26 36 C16 50 18 70 30 82" stroke="#ffffff" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.45"/>
    <path d="M30 44 C24 54 26 66 32 76" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
    <!-- 顶部微凹果窝 -->
    <ellipse cx="50" cy="18" rx="10" ry="4" fill="url(#stemHollow)"/>
    <path d="M50 18 L46 14 L49 16 L51 13 L52 16 L56 15 L53 18 L55 21 L51 19 L48 22 Z" fill="#65a30d"/>
    <circle cx="50" cy="18" r="2.2" fill="#3f6212"/>
    <path d="M50 18 C49 8 41 2 35 -2" stroke="#4d7c0f" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M49 17 C48 9 42 3 37 0" stroke="#84cc16" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <!-- 鲜嫩绿叶 -->
    <g transform="translate(50, 16)">
      <path d="M0 0 C24 -14 42 -6 36 12 C18 16 6 8 0 0 Z" fill="url(#leafGrad)" stroke="#14532d" stroke-width="1.2"/>
      <path d="M2 1 C14 2 26 4 33 10" stroke="#86efac" stroke-width="1.4" fill="none" opacity="0.9"/>
      <path d="M10 2 C16 -2 22 -1 25 3 M18 4 C24 3 28 6 30 8 M8 2 C12 6 16 8 18 10" stroke="#86efac" stroke-width="0.8" fill="none" opacity="0.7"/>
    </g>
  </g>

  <!-- 前景：水灵通透、圆润多汁的月牙橘囊 -->
  <g transform="translate(136, 108) rotate(14)">
    <path d="M4 18 C16 -2 54 -2 72 16 C54 34 18 34 4 18 Z" fill="url(#crescentGrad)" stroke="#c2410c" stroke-width="2"/>
    <path d="M14 16 C26 4 48 4 62 16" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.75"/>
  </g>
  <g transform="translate(106, 124) rotate(-8)">
    <path d="M4 22 C18 -4 64 -4 84 20 C64 42 20 42 4 22 Z" fill="url(#crescentGrad)" stroke="#c2410c" stroke-width="2.2"/>
    <path d="M14 18 C30 2 58 2 74 18" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M18 19 C34 6 54 6 68 19" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g stroke="#ffffff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.95">
      <path d="M6 22 C24 28 50 28 72 24"/>
      <path d="M16 20 C24 14 36 18 52 24"/>
      <path d="M40 12 C46 18 54 24 64 26"/>
    </g>
    <ellipse cx="44" cy="24" rx="16" ry="5" fill="#ffffff" opacity="0.45"/>
  </g>
</svg>
`;

// =====================================================================
// 2. 甘蔗 (Realistic Sugarcane)
// =====================================================================
const sugarcaneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <radialGradient id="caneGround" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#f8fafc" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="caneSkin" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#150d1e"/>
      <stop offset="25%" stop-color="#341740"/>
      <stop offset="65%" stop-color="#230e2c"/>
      <stop offset="90%" stop-color="#17091d"/>
      <stop offset="100%" stop-color="#0a030d"/>
    </linearGradient>
    <linearGradient id="bloomWax" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.8"/>
      <stop offset="30%" stop-color="#f8fafc" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#e2e8f0" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="fleshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="25%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#fef08a"/>
      <stop offset="85%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <radialGradient id="fleshCut" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#fef9c3"/>
      <stop offset="85%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </radialGradient>
  </defs>

  <rect width="240" height="180" rx="28" fill="#f8fafc"/>
  <ellipse cx="120" cy="158" rx="88" ry="12" fill="url(#caneGround)"/>
  <ellipse cx="112" cy="157" rx="68" ry="6" fill="#1b0e22" opacity="0.25"/>

  <!-- 顶部生长挺拔、优美低垂的长甘蔗叶 -->
  <g stroke-linecap="round">
    <path d="M125 32 C100 8 60 4 18 16 C62 20 95 28 120 38 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>
    <path d="M122 35 C95 24 65 16 18 16" stroke="#bbf7d0" stroke-width="1.4" fill="none"/>
    <path d="M130 26 C136 4 125 -6 102 -8 C112 6 120 18 126 28 Z" fill="#15803d" stroke="#14532d" stroke-width="1"/>
    <path d="M127 26 C124 10 118 0 102 -8" stroke="#86efac" stroke-width="1.2" fill="none"/>
    <path d="M136 28 C165 4 205 2 236 10 C194 18 164 26 142 36 Z" fill="#16a34a" stroke="#15803d" stroke-width="1.2"/>
    <path d="M138 30 C170 18 202 12 236 10" stroke="#bbf7d0" stroke-width="1.4" fill="none"/>
  </g>

  <!-- 后方甘蔗 -->
  <g transform="translate(74, 20)">
    <rect x="0" y="0" width="16" height="38" rx="2" fill="url(#caneSkin)"/>
    <rect x="-1.5" y="38" width="19" height="5" rx="1.5" fill="url(#bloomWax)"/>
    <circle cx="3" cy="40.5" r="0.9" fill="#2e1065"/>
    <rect x="0" y="42" width="16" height="42" rx="2" fill="url(#caneSkin)"/>
    <rect x="-1.5" y="84" width="19" height="5" rx="1.5" fill="url(#bloomWax)"/>
    <circle cx="12" cy="86.5" r="0.9" fill="#2e1065"/>
    <rect x="0" y="88" width="16" height="44" rx="2" fill="url(#caneSkin)"/>
    <rect x="-1.5" y="132" width="19" height="5" rx="1.5" fill="url(#bloomWax)"/>
    <rect x="0" y="136" width="16" height="18" rx="2" fill="url(#caneSkin)"/>
  </g>

  <!-- 前方主甘蔗 -->
  <g transform="translate(104, 12)">
    <rect x="0" y="0" width="19" height="40" rx="2" fill="url(#caneSkin)"/>
    <rect x="-2" y="40" width="23" height="6" rx="2" fill="url(#bloomWax)"/>
    <line x1="-1" y1="43" x2="20" y2="43" stroke="#2e1065" stroke-width="0.8" opacity="0.6"/>
    <circle cx="5" cy="43" r="1.3" fill="#1b0e22"/><circle cx="5" cy="43" r="0.5" fill="#f8fafc"/>
    <circle cx="10" cy="44.5" r="0.4" fill="#64748b"/><circle cx="14" cy="44.5" r="0.4" fill="#64748b"/>
    <rect x="0" y="45" width="19" height="44" rx="2" fill="url(#caneSkin)"/>
    <line x1="4" y1="47" x2="4" y2="87" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.25"/>
    <rect x="-2" y="89" width="23" height="6" rx="2" fill="url(#bloomWax)"/>
    <line x1="-1" y1="92" x2="20" y2="92" stroke="#2e1065" stroke-width="0.8" opacity="0.6"/>
    <circle cx="14" cy="92" r="1.3" fill="#1b0e22"/><circle cx="14" cy="92" r="0.5" fill="#f8fafc"/>
    <rect x="0" y="94" width="19" height="44" rx="2" fill="url(#caneSkin)"/>
    <line x1="4" y1="96" x2="4" y2="136" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.25"/>
    <rect x="-2" y="138" width="23" height="6" rx="2" fill="url(#bloomWax)"/>
    <rect x="0" y="143" width="19" height="15" rx="2" fill="url(#caneSkin)"/>
  </g>

  <!-- 削皮甘蔗肉棒与翻开紫皮 -->
  <g transform="translate(142, 42) rotate(6)">
    <rect x="0" y="56" width="23" height="60" rx="2.5" fill="url(#caneSkin)"/>
    <rect x="-2" y="88" width="27" height="6" rx="2" fill="url(#bloomWax)"/>
    <circle cx="7" cy="91" r="1.2" fill="#1b0e22"/>
    <rect x="1" y="0" width="21" height="58" rx="2.5" fill="url(#fleshGrad)"/>
    <ellipse cx="11.5" cy="2" rx="10.5" ry="3.8" fill="url(#fleshCut)" stroke="#ca8a04" stroke-width="1.2"/>
    <circle cx="8" cy="2" r="0.6" fill="#ca8a04"/><circle cx="12" cy="2" r="0.6" fill="#ca8a04"/><circle cx="15" cy="2" r="0.6" fill="#ca8a04"/>
    <line x1="5" y1="5" x2="5" y2="56" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.95"/>
    <line x1="11" y1="5" x2="11" y2="56" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>
    <line x1="17" y1="5" x2="17" y2="56" stroke="#facc15" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="12" x2="8" y2="48" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.9"/>
    <line x1="14" y1="16" x2="14" y2="52" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.9"/>
    <path d="M1 58 C-10 50 -16 34 -12 20 C-9 32 -3 46 1 58 Z" fill="#23182c" stroke="#181124" stroke-width="1.5"/>
    <path d="M-12 20 C-9 30 -3 42 1 56" stroke="#f8fafc" stroke-width="1.2" fill="none" opacity="0.8"/>
    <path d="M22 58 C33 50 39 34 35 20 C32 32 26 46 22 58 Z" fill="#23182c" stroke="#181124" stroke-width="1.5"/>
    <path d="M35 20 C32 30 26 42 22 56" stroke="#f8fafc" stroke-width="1.2" fill="none" opacity="0.8"/>
  </g>

  <circle cx="136" cy="70" r="3" fill="#38bdf8" opacity="0.85"/>
  <circle cx="130" cy="80" r="2" fill="#38bdf8" opacity="0.85"/>
  <circle cx="186" cy="76" r="2.5" fill="#38bdf8" opacity="0.85"/>
</svg>
`;

// =====================================================================
// 3. 哈密瓜 (Realistic Hami Melon) - 居中饱满构图
// =====================================================================
const melonSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <radialGradient id="melonGround" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#f8fafc" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="melonRind" cx="38%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="25%" stop-color="#e2e8b0"/>
      <stop offset="55%" stop-color="#9bb36e"/>
      <stop offset="85%" stop-color="#60793c"/>
      <stop offset="100%" stop-color="#3d5224"/>
    </radialGradient>
    <linearGradient id="sliceFlesh" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#2d3d18"/>
      <stop offset="8%" stop-color="#4d7c0f"/>
      <stop offset="22%" stop-color="#bef264"/>
      <stop offset="38%" stop-color="#fef08a"/>
      <stop offset="62%" stop-color="#fb923c"/>
      <stop offset="90%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </linearGradient>
  </defs>

  <rect width="240" height="180" rx="28" fill="#f8fafc"/>

  <!-- 桌面大阴影 -->
  <ellipse cx="120" cy="154" rx="96" ry="14" fill="url(#melonGround)"/>
  <ellipse cx="80" cy="152" rx="54" ry="7.5" fill="#3d5224" opacity="0.35"/>
  <ellipse cx="156" cy="153" rx="50" ry="6.5" fill="#ea580c" opacity="0.3"/>

  <!-- 左后侧：完整大哈密瓜（更饱满大颗，居中自然） -->
  <g transform="translate(26, 52) rotate(-5)">
    <ellipse cx="58" cy="50" rx="58" ry="42" fill="url(#melonRind)"/>

    <!-- 天然浅纵沟 -->
    <g stroke="#3d5224" stroke-width="2" fill="none" opacity="0.24">
      <path d="M12 50 C26 30 50 22 80 22 C98 22 108 32 114 50"/>
      <path d="M12 50 C26 70 50 78 80 78 C98 78 108 68 114 50"/>
      <path d="M18 36 C38 18 70 16 98 26"/>
      <path d="M18 64 C38 82 70 84 98 74"/>
    </g>

    <!-- 细腻自然网纹 -->
    <g stroke="#ffffff" stroke-width="0.85" fill="none" opacity="0.82" stroke-linecap="round">
      <path d="M16 50 C26 40 40 44 52 38 C64 44 76 38 88 44 C98 38 106 46 112 50"/>
      <path d="M20 40 C32 34 44 38 56 30 C66 36 78 28 88 34 C98 26 106 36 110 42"/>
      <path d="M24 60 C36 54 48 60 60 52 C70 58 82 50 94 56 C102 48 108 56 110 60"/>
      <path d="M30 28 C42 22 54 26 66 20 C76 24 88 18 98 24"/>
      <path d="M30 72 C42 68 54 74 66 68 C76 72 88 66 98 72"/>
      <path d="M26 40 L24 60 M40 46 L38 54 M54 38 L52 60 M68 44 L66 52 M82 36 L80 58 M96 42 L94 50"/>
      <path d="M34 32 L30 40 M48 36 L44 46 M62 28 L58 38 M76 34 L72 44 M90 26 L86 36 M102 32 L98 42"/>
    </g>

    <path d="M32 30 C50 20 78 20 96 30" stroke="#ffffff" stroke-width="3.5" fill="none" opacity="0.5" stroke-linecap="round"/>

    <!-- T 字木质瓜蒂 -->
    <g transform="translate(0, 50)">
      <path d="M8 0 C-2 -2 -6 -8 -12 -12" stroke="#78350f" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M-12 -12 L-16 -16 M-12 -12 L-8 -18" stroke="#a16207" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M-4 -4 C-6 -2 -10 -2 -12 2 C-14 6 -10 8 -8 6" stroke="#ca8a04" stroke-width="1.2" fill="none"/>
    </g>
  </g>

  <!-- 前景：厚实饱满的切片红心哈密瓜牙（大方厚实） -->
  <g transform="translate(94, 114) rotate(-3)">
    <path d="M0 36 C38 64 94 64 132 34 C96 14 38 14 0 36 Z" fill="url(#sliceFlesh)" stroke="#274008" stroke-width="1.8"/>
    <path d="M0 36 C38 64 94 64 132 34" stroke="#274008" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M2 35 C40 61 92 61 130 33" stroke="#65a30d" stroke-width="2" fill="none" stroke-linecap="round"/>

    <path d="M14 32 C46 16 88 16 122 28" stroke="#fed7aa" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path d="M26 30 C54 18 82 18 110 28" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.95"/>

    <path d="M36 28 C54 25 78 25 98 28" stroke="#c2410c" stroke-width="1.5" fill="none" stroke-dasharray="2 3" opacity="0.75"/>
    <circle cx="54" cy="27" r="1.6" fill="#ffffff" opacity="0.9"/>
    <circle cx="78" cy="26" r="1.8" fill="#ffffff" opacity="0.95"/>
  </g>
</svg>
`;

// =====================================================================
// 4. 芒果 (Realistic Mango)
// =====================================================================
const mangoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <radialGradient id="mangoGround" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fdba74" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#fffaf5" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mangoSkin" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="20%" stop-color="#f97316"/>
      <stop offset="55%" stop-color="#facc15"/>
      <stop offset="85%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="30%" stop-color="#fef08a"/>
      <stop offset="70%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <linearGradient id="cubeSide" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>

  <rect width="240" height="180" rx="28" fill="#fffaf5"/>

  <!-- 地面接触阴影 -->
  <ellipse cx="120" cy="154" rx="90" ry="14" fill="url(#mangoGround)"/>
  <ellipse cx="80" cy="152" rx="46" ry="7" fill="#b45309" opacity="0.32"/>
  <ellipse cx="152" cy="153" rx="42" ry="6" fill="#b45309" opacity="0.3"/>

  <!-- 熟透大芒果 -->
  <g transform="translate(34, 52) rotate(-6)">
    <path d="M44 6 C64 6 88 18 90 44 C92 70 80 88 66 96 C56 102 48 100 44 98 C32 92 14 74 14 48 C14 24 26 6 44 6 Z" 
          fill="url(#mangoSkin)" stroke="#c2410c" stroke-width="2"/>
    <path d="M28 24 C22 38 22 58 30 72" stroke="#ffffff" stroke-width="4.5" fill="none" opacity="0.45" stroke-linecap="round"/>
    <path d="M32 32 C28 44 28 56 34 66" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.75" stroke-linecap="round"/>
    <ellipse cx="44" cy="7" rx="5" ry="2.5" fill="#9a3412"/>
    <path d="M44 7 C45 0 48 -6 50 -10" stroke="#78350f" stroke-width="3" stroke-linecap="round" fill="none"/>
    <g transform="translate(46, 4)">
      <path d="M0 0 C16 -12 36 -6 38 10 C24 12 10 6 0 0 Z" fill="#15803d" stroke="#14532d" stroke-width="1.2"/>
      <path d="M2 1 C14 2 26 4 34 8" stroke="#86efac" stroke-width="1.2" fill="none"/>
    </g>
  </g>

  <!-- 前景：十字花刀芒果花 -->
  <g transform="translate(112, 102)">
    <path d="M6 32 C12 56 76 56 86 32 C82 14 10 14 6 32 Z" fill="#f97316" stroke="#c2410c" stroke-width="1.8"/>
    <path d="M8 30 C14 52 74 52 84 30 C80 16 12 16 8 30 Z" fill="#facc15"/>

    <!-- 后排 -->
    <g transform="translate(18, 12)">
      <polygon points="0,7 9,2 18,7 9,12" fill="url(#cubeTop)"/>
      <polygon points="0,7 9,12 9,17 0,12" fill="url(#cubeSide)"/>
      <polygon points="9,12 18,7 18,12 9,17" fill="#92400e"/>
      <circle cx="9" cy="6" r="1.2" fill="#ffffff" opacity="0.9"/>
    </g>
    <g transform="translate(36, 10)">
      <polygon points="0,7 9,2 18,7 9,12" fill="url(#cubeTop)"/>
      <polygon points="0,7 9,12 9,17 0,12" fill="url(#cubeSide)"/>
      <polygon points="9,12 18,7 18,12 9,17" fill="#92400e"/>
      <circle cx="9" cy="6" r="1.2" fill="#ffffff" opacity="0.9"/>
    </g>
    <g transform="translate(54, 13)">
      <polygon points="0,7 9,2 18,7 9,12" fill="url(#cubeTop)"/>
      <polygon points="0,7 9,12 9,17 0,12" fill="url(#cubeSide)"/>
      <polygon points="9,12 18,7 18,12 9,17" fill="#92400e"/>
      <circle cx="9" cy="6" r="1.2" fill="#ffffff" opacity="0.9"/>
    </g>

    <!-- 中排 -->
    <g transform="translate(12, 24)">
      <polygon points="0,9 11,3 22,9 11,15" fill="url(#cubeTop)"/>
      <polygon points="0,9 11,15 11,21 0,15" fill="url(#cubeSide)"/>
      <polygon points="11,15 22,9 22,15 11,21" fill="#92400e"/>
      <circle cx="11" cy="8" r="1.5" fill="#ffffff" opacity="0.95"/>
    </g>
    <g transform="translate(34, 22)">
      <polygon points="0,10 12,3 24,10 12,17" fill="url(#cubeTop)"/>
      <polygon points="0,10 12,17 12,24 0,17" fill="url(#cubeSide)"/>
      <polygon points="12,17 24,10 24,17 12,24" fill="#92400e"/>
      <circle cx="12" cy="9" r="1.8" fill="#ffffff" opacity="0.95"/>
    </g>
    <g transform="translate(58, 26)">
      <polygon points="0,9 11,3 22,9 11,15" fill="url(#cubeTop)"/>
      <polygon points="0,9 11,15 11,21 0,15" fill="url(#cubeSide)"/>
      <polygon points="11,15 22,9 22,15 11,21" fill="#92400e"/>
      <circle cx="11" cy="8" r="1.5" fill="#ffffff" opacity="0.95"/>
    </g>

    <!-- 前排 -->
    <g transform="translate(22, 36)">
      <polygon points="0,7 9,2 18,7 9,12" fill="url(#cubeTop)"/>
      <polygon points="0,7 9,12 9,17 0,12" fill="url(#cubeSide)"/>
      <polygon points="9,12 18,7 18,12 9,17" fill="#92400e"/>
      <circle cx="9" cy="6" r="1.2" fill="#ffffff" opacity="0.9"/>
    </g>
    <g transform="translate(42, 35)">
      <polygon points="0,8 10,2 20,8 10,14" fill="url(#cubeTop)"/>
      <polygon points="0,8 10,14 10,20 0,14" fill="url(#cubeSide)"/>
      <polygon points="10,14 20,8 20,14 10,20" fill="#92400e"/>
      <circle cx="10" cy="7" r="1.3" fill="#ffffff" opacity="0.9"/>
    </g>
  </g>
</svg>
`;

// =====================================================================
// 5. 榴莲 (Realistic Durian) - 完美落地、绝美金枕头
// =====================================================================
const durianSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <radialGradient id="durianGround" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#f8fafc" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="durianShell" cx="36%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="30%" stop-color="#ca8a04"/>
      <stop offset="65%" stop-color="#854d0e"/>
      <stop offset="90%" stop-color="#4d7c0f"/>
      <stop offset="100%" stop-color="#2d3d18"/>
    </radialGradient>
    <radialGradient id="durianPulp" cx="42%" cy="26%" r="75%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#fef08a"/>
      <stop offset="55%" stop-color="#fde047"/>
      <stop offset="85%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </radialGradient>
  </defs>

  <rect width="240" height="180" rx="28" fill="#f8fafc"/>

  <!-- 桌面大阴影 -->
  <ellipse cx="120" cy="154" rx="92" ry="14" fill="url(#durianGround)"/>
  <ellipse cx="74" cy="152" rx="48" ry="7" fill="#365314" opacity="0.35"/>
  <ellipse cx="154" cy="153" rx="46" ry="6" fill="#ca8a04" opacity="0.32"/>

  <!-- 左后侧：完整金枕头大榴莲（稳稳坐落于桌面） -->
  <g transform="translate(26, 42)">
    <!-- 粗木柄 -->
    <path d="M52 14 C51 4 48 -4 44 -10" stroke="#78350f" stroke-width="7" stroke-linecap="round" fill="none"/>
    <ellipse cx="44" cy="-10" rx="4.5" ry="2.5" fill="#a16207" stroke="#451a03" stroke-width="1.2"/>

    <!-- 壳主体 -->
    <ellipse cx="50" cy="64" rx="46" ry="52" fill="url(#durianShell)"/>

    <!-- 5 条天然纵向瓣裂凹线 -->
    <g stroke="#2d3d18" stroke-width="1.6" fill="none" opacity="0.45">
      <path d="M50 14 C38 34 34 78 46 114"/>
      <path d="M50 14 C60 34 66 78 54 114"/>
      <path d="M50 14 C22 40 18 76 26 104"/>
      <path d="M50 14 C76 40 80 76 74 104"/>
    </g>

    <!-- 轮廓向外凸出硬刺 -->
    <g fill="#ca8a04" stroke="#713f12" stroke-width="1">
      <polygon points="32,16 28,8 38,14"/>
      <polygon points="42,14 40,5 48,12"/>
      <polygon points="52,12 54,3 60,12"/>
      <polygon points="62,16 66,6 70,16"/>
      <polygon points="18,24 10,20 18,32"/>
      <polygon points="12,38 4,36 12,46"/>
      <polygon points="8,54 0,54 8,64"/>
      <polygon points="8,72 0,74 10,82"/>
      <polygon points="12,90 4,94 14,100"/>
      <polygon points="84,28 92,24 86,38"/>
      <polygon points="88,46 96,44 90,56"/>
      <polygon points="90,68 98,70 90,78"/>
      <polygon points="88,88 96,92 88,100"/>
    </g>

    <!-- 壳面立体三棱小金字塔刺 -->
    <g transform="translate(14, 18)">
      <polygon points="10,12 14,4 18,12" fill="#fde047"/><polygon points="18,12 14,4 22,10" fill="#713f12"/>
      <polygon points="26,10 30,2 34,10" fill="#fde047"/><polygon points="34,10 30,2 38,8" fill="#713f12"/>
      <polygon points="42,12 46,4 50,12" fill="#fde047"/><polygon points="50,12 46,4 54,10" fill="#713f12"/>
      <polygon points="8,28 12,20 16,28" fill="#fde047"/><polygon points="16,28 12,20 20,26" fill="#713f12"/>
      <polygon points="24,26 28,18 32,26" fill="#fde047"/><polygon points="32,26 28,18 36,24" fill="#713f12"/>
      <polygon points="40,28 44,20 48,28" fill="#fde047"/><polygon points="48,28 44,20 52,26" fill="#713f12"/>
      <polygon points="6,46 10,38 14,46" fill="#fde047"/><polygon points="14,46 10,38 18,44" fill="#713f12"/>
      <polygon points="22,44 26,36 30,44" fill="#fde047"/><polygon points="30,44 26,36 34,42" fill="#713f12"/>
      <polygon points="38,46 42,38 46,46" fill="#fde047"/><polygon points="46,46 42,38 50,44" fill="#713f12"/>
      <polygon points="8,64 12,56 16,64" fill="#fde047"/><polygon points="16,64 12,56 20,62" fill="#713f12"/>
      <polygon points="24,62 28,54 32,62" fill="#fde047"/><polygon points="32,62 28,54 36,60" fill="#713f12"/>
      <polygon points="12,80 16,72 20,80" fill="#fde047"/><polygon points="20,80 16,72 24,78" fill="#713f12"/>
      <polygon points="28,78 32,70 36,78" fill="#fde047"/><polygon points="36,78 32,70 40,76" fill="#713f12"/>
    </g>
  </g>

  <!-- 前景：一整大瓣极度肥美金黄的月牙奶油榴莲肉瓣 -->
  <g transform="translate(98, 114) rotate(-4)">
    <path d="M0 24 C14 -4 76 -6 102 16 C108 34 86 46 64 46 C34 46 12 44 0 24 Z" 
          fill="url(#durianPulp)" stroke="#ca8a04" stroke-width="2.2"/>
    
    <path d="M14 18 C28 4 72 4 88 18 C92 28 80 36 62 38" stroke="#ffffff" stroke-width="4.5" fill="none" opacity="0.75" stroke-linecap="round"/>
    <path d="M20 20 C34 6 66 6 80 20" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.95" stroke-linecap="round"/>

    <path d="M24 24 C34 26 44 24 50 22" stroke="#ca8a04" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M36 34 C46 36 56 34 62 32" stroke="#ca8a04" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M58 24 C66 26 74 24 80 22" stroke="#ca8a04" stroke-width="1.6" fill="none" stroke-linecap="round"/>

    <circle cx="36" cy="18" r="2.2" fill="#ffffff" opacity="0.95"/>
    <circle cx="68" cy="16" r="2.5" fill="#ffffff" opacity="0.95"/>
  </g>
</svg>
`;

const root = resolve(process.cwd(), 'assets/learning/hanzi');
await writeFile(resolve(root, '橘子.svg'), orangeSvg.trim() + '\n', 'utf8');
await writeFile(resolve(root, '甘蔗.svg'), sugarcaneSvg.trim() + '\n', 'utf8');
await writeFile(resolve(root, '哈密瓜.svg'), melonSvg.trim() + '\n', 'utf8');
await writeFile(resolve(root, '芒果.svg'), mangoSvg.trim() + '\n', 'utf8');
await writeFile(resolve(root, '榴莲.svg'), durianSvg.trim() + '\n', 'utf8');

execSync(`/opt/homebrew/bin/resvg -w 480 -h 360 "${resolve(root, '橘子.svg')}" "${resolve(previewDir, '橘子_real8.png')}"`);
execSync(`/opt/homebrew/bin/resvg -w 480 -h 360 "${resolve(root, '甘蔗.svg')}" "${resolve(previewDir, '甘蔗_real8.png')}"`);
execSync(`/opt/homebrew/bin/resvg -w 480 -h 360 "${resolve(root, '哈密瓜.svg')}" "${resolve(previewDir, '哈密瓜_real8.png')}"`);
execSync(`/opt/homebrew/bin/resvg -w 480 -h 360 "${resolve(root, '芒果.svg')}" "${resolve(previewDir, '芒果_real8.png')}"`);
execSync(`/opt/homebrew/bin/resvg -w 480 -h 360 "${resolve(root, '榴莲.svg')}" "${resolve(previewDir, '榴莲_real8.png')}"`);

console.log('Saved realistic 5 fruits v8 successfully!');
