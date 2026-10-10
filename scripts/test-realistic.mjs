import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const root = resolve(process.cwd(), 'assets/learning/hanzi');

// ==========================================
// 逼真实物级：橘子 (Realistic Mandarin Orange)
// 包含：
// 1. 真实球体光影渐变 (radialGradient)
// 2. 真实细密橘皮油胞毛孔质感
// 3. 真实果蒂、木质果柄、带叶脉的鲜嫩绿叶
// 4. 实物级剥开的半透明饱满月牙橘瓣（带橘络白丝、半透明果肉囊粒、湿润光泽）
// 5. 真实剥下的橘皮（外层细腻橙红带毛孔，内层白软海绵层）
// ==========================================
const realisticOrangeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <!-- 背景温暖底光 -->
    <radialGradient id="orgGround" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fdba74" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#fed7aa" stop-opacity="0"/>
    </radialGradient>

    <!-- 橘子主球体立体光照渐变：受光面暖黄亮橙，向背光面渐变到深红橙，带环境反光 -->
    <radialGradient id="mandarinBody" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="15%" stop-color="#fb923c"/>
      <stop offset="60%" stop-color="#ea580c"/>
      <stop offset="88%" stop-color="#c2410c"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </radialGradient>

    <!-- 顶部微凹阴影 -->
    <radialGradient id="stemHollow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#9a3412"/>
      <stop offset="80%" stop-color="#c2410c"/>
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>

    <!-- 绿叶真实立体叶脉渐变 -->
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="45%" stop-color="#22c55e"/>
      <stop offset="85%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>

    <!-- 橘瓣半透明果肉立体渐变 -->
    <linearGradient id="pulpGrad" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="30%" stop-color="#fdba74"/>
      <stop offset="70%" stop-color="#fb923c"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>

    <!-- 橘瓣水润高光 -->
    <linearGradient id="pulpGlint" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#fef9c3" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- 剥下橘皮内壁浅黄白海绵层渐变 -->
    <linearGradient id="pithGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#ffedd5"/>
      <stop offset="100%" stop-color="#fed7aa"/>
    </linearGradient>
  </defs>

  <!-- 柔和浅米底 -->
  <rect width="240" height="180" rx="28" fill="#fffaf5"/>
  <ellipse cx="120" cy="154" rx="88" ry="14" fill="url(#orgGround)"/>
  <ellipse cx="112" cy="153" rx="65" ry="8" fill="#ea580c" opacity="0.18"/>

  <!-- ================= 1. 完整真实蜜橘 ================= -->
  <g transform="translate(42, 34)">
    <!-- 蜜橘扁圆身轮廓（横宽 94，纵高 78，两极平、腰腹鼓，极度符合真实蜜橘） -->
    <ellipse cx="48" cy="56" rx="47" ry="39" fill="url(#mandarinBody)"/>

    <!-- 真实橘皮密布的细腻油胞毛孔（微小半透明暖色质感颗粒点） -->
    <g fill="#9a3412" opacity="0.25">
      <circle cx="28" cy="46" r="0.8"/><circle cx="34" cy="40" r="0.8"/><circle cx="42" cy="45" r="0.8"/><circle cx="50" cy="38" r="0.8"/>
      <circle cx="62" cy="42" r="0.8"/><circle cx="70" cy="48" r="0.8"/><circle cx="22" cy="58" r="0.8"/><circle cx="30" cy="62" r="0.8"/>
      <circle cx="44" cy="66" r="0.8"/><circle cx="58" cy="64" r="0.8"/><circle cx="68" cy="62" r="0.8"/><circle cx="78" cy="58" r="0.8"/>
      <circle cx="26" cy="74" r="0.8"/><circle cx="38" cy="78" r="0.8"/><circle cx="52" cy="80" r="0.8"/><circle cx="66" cy="76" r="0.8"/>
      <circle cx="36" cy="86" r="0.8"/><circle cx="48" cy="88" r="0.8"/><circle cx="58" cy="86" r="0.8"/>
    </g>

    <!-- 侧面大范围柔和水润弧光（柔和高光晕） -->
    <path d="M22 36 C10 50 12 70 24 84" stroke="#fef08a" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.55"/>
    <path d="M26 44 C18 54 20 68 28 78" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.75"/>

    <!-- 顶部中央真实凹坑阴影（果蒂窝） -->
    <ellipse cx="47" cy="18" rx="10" ry="4" fill="url(#stemHollow)"/>

    <!-- 绿色五角星形花萼（小果蒂星片） -->
    <path d="M47 18 L43 14 L46 16 L48 13 L49 16 L53 15 L50 18 L52 21 L48 19 L45 22 Z" fill="#65a30d"/>
    <circle cx="47" cy="18" r="2.5" fill="#3f6212"/>

    <!-- 木质果柄与带叶脉鲜嫩绿叶 -->
    <!-- 木柄（棕绿木质纹理） -->
    <path d="M47 18 C46 8 38 2 32 -2" stroke="#4d7c0f" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M46 17 C45 9 39 3 34 0" stroke="#84cc16" stroke-width="1.2" stroke-linecap="round" fill="none"/>

    <!-- 真实水滴形翠绿橘叶（立体主脉、羽状侧脉） -->
    <g transform="translate(47, 16)">
      <!-- 叶身 -->
      <path d="M0 0 C24 -14 42 -6 36 12 C18 16 6 8 0 0 Z" fill="url(#leafGrad)" stroke="#14532d" stroke-width="1.2"/>
      <!-- 主脉 -->
      <path d="M2 1 C14 2 26 4 33 10" stroke="#86efac" stroke-width="1.4" fill="none" opacity="0.9"/>
      <!-- 细侧脉 -->
      <path d="M10 2 C16 -2 22 -1 25 3 M18 4 C24 3 28 6 30 8 M8 2 C12 6 16 8 18 10" stroke="#86efac" stroke-width="0.8" fill="none" opacity="0.7"/>
    </g>
  </g>

  <!-- ================= 2. 真实剥下的橘皮 ================= -->
  <!-- 垫在右侧月牙橘瓣下方的真实剥开橘皮片（外层橙红、内层白软海绵层、带纤维边缘） -->
  <g transform="translate(108, 98)">
    <!-- 外层橙皮露出一角 -->
    <path d="M12 36 C-6 30 -16 12 -8 -4 C6 12 22 26 48 30 Z" fill="#ea580c"/>
    <!-- 内层浅白黄海绵层（白络纤维感） -->
    <path d="M10 34 C-4 28 -12 12 -6 -2 C4 10 20 24 44 28 Z" fill="url(#pithGrad)" stroke="#fed7aa" stroke-width="1"/>
    <!-- 橘皮内壁上的丝状白络 -->
    <path d="M-2 4 C6 14 16 20 30 24 M4 10 C12 18 22 22 36 25" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.8"/>
  </g>

  <!-- ================= 3. 真实实物级月牙橘瓣 ================= -->
  <!-- 瓣 1（后侧微倾，饱满多汁，半透明橙红） -->
  <g transform="translate(138, 70) rotate(14)">
    <!-- 弧形月牙果囊外廓 -->
    <path d="M0 16 C18 -6 52 -6 68 16 C50 30 16 30 0 16 Z" fill="url(#pulpGrad)" stroke="#c2410c" stroke-width="1.8"/>
    <!-- 半透明果肉颗粒内部水润光晕 -->
    <path d="M10 14 C26 2 44 2 54 14" stroke="url(#pulpGlint)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- 薄膜微纹理 -->
    <path d="M6 16 C22 24 44 24 60 18" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.6"/>
  </g>

  <!-- 瓣 2（前景主橘瓣！最大、最圆润、晶莹饱满、带有清晰白色橘络） -->
  <g transform="translate(112, 94) rotate(-6)">
    <!-- 真实饱满月牙囊瓣外形 -->
    <path d="M0 18 C20 -8 60 -8 78 18 C58 32 18 32 0 18 Z" fill="url(#pulpGrad)" stroke="#c2410c" stroke-width="2"/>
    
    <!-- 透光薄膜内的水灵果粒晶莹高光条 -->
    <path d="M12 16 C30 2 52 2 66 16" stroke="url(#pulpGlint)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M16 17 C32 6 48 6 60 17" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>

    <!-- 真实橘子最显著的灵魂——纵横交错附着的白色细丝“橘络”（网状微细纤维） -->
    <g stroke="#ffffff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.95">
      <path d="M4 18 C16 22 28 25 42 25 C54 25 64 22 72 18"/>
      <path d="M14 18 C22 12 34 16 46 22"/>
      <path d="M36 10 C42 16 48 22 56 24"/>
      <path d="M26 24 C32 28 40 28 48 24"/>
    </g>

    <!-- 底部水灵湿润反光光晕点 -->
    <ellipse cx="38" cy="22" rx="14" ry="4" fill="#ffffff" opacity="0.35"/>
  </g>
</svg>
`;

// ==========================================
// 逼真实物级：甘蔗 (Realistic Sugarcane)
// 包含：
// 1. 真实黑皮果蔗（深紫黑带青黑沉稳质感，非纯亮紫塑料管）
// 2. 真实节环白粉霜带（厚厚一层蜡质白粉霜环）、环上小芽眼与细小根点圈
// 3. 真实甘蔗长宽比（细长高大长杆，从左下向右上斜倚贯穿）
// 4. 真实削皮甘蔗肉（乳白浅黄、纵向密集木质粗纤维丝、多汁微透光甘蔗肉棒）
// 5. 真实卷开的紫黑外坚硬蔗皮（外墨紫黑带蜡霜，内青白浅黄）
// 6. 真实顶生披针形禾本科长甘蔗叶（带明显浅白中脉）
// ==========================================
const realisticSugarcaneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <!-- 地面阴影渐变 -->
    <radialGradient id="caneGround" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#f1f5f9" stop-opacity="0"/>
    </radialGradient>

    <!-- 真实黑皮甘蔗外皮立体圆柱渐变：暗墨紫黑向深紫褐过渡，侧边带有自然弱反光 -->
    <linearGradient id="caneSkin" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#181124"/>
      <stop offset="25%" stop-color="#3b1d4a"/>
      <stop offset="65%" stop-color="#2a1535"/>
      <stop offset="90%" stop-color="#1b0e22"/>
      <stop offset="100%" stop-color="#0f0714"/>
    </linearGradient>

    <!-- 真实白蜡粉霜环渐变（甘蔗节环处著名的白粉层） -->
    <linearGradient id="bloomWax" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.8"/>
      <stop offset="35%" stop-color="#f8fafc" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#e2e8f0" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.7"/>
    </linearGradient>

    <!-- 削皮甘蔗肉真实多汁多纤维渐变 -->
    <linearGradient id="fleshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="25%" stop-color="#fef9c3"/>
      <stop offset="65%" stop-color="#fef08a"/>
      <stop offset="90%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>

    <!-- 甘蔗肉顶截面导管孔微质感 -->
    <radialGradient id="fleshCut" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="75%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </radialGradient>
  </defs>

  <rect width="240" height="180" rx="28" fill="#f8fafc"/>
  <ellipse cx="120" cy="158" rx="88" ry="12" fill="url(#caneGround)"/>

  <!-- ================= 1. 顶部生长舒展的甘蔗长叶 ================= -->
  <!-- 狭长披针形叶片，中央贯穿一条明显的浅绿中脉 -->
  <g stroke-linecap="round">
    <!-- 左大叶（向左下自然优美低垂） -->
    <path d="M125 32 C100 8 60 4 18 16 C62 20 95 28 120 38 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>
    <path d="M122 35 C95 24 65 16 18 16" stroke="#bbf7d0" stroke-width="1.4" fill="none"/>

    <!-- 直立中顶叶 -->
    <path d="M130 26 C136 4 125 -6 102 -8 C112 6 120 18 126 28 Z" fill="#15803d" stroke="#14532d" stroke-width="1"/>
    <path d="M127 26 C124 10 118 0 102 -8" stroke="#86efac" stroke-width="1.2" fill="none"/>

    <!-- 右大叶（向右侧飘逸下垂） -->
    <path d="M136 28 C165 4 205 2 236 10 C194 18 164 26 142 36 Z" fill="#16a34a" stroke="#15803d" stroke-width="1.2"/>
    <path d="M138 30 C170 18 202 12 236 10" stroke="#bbf7d0" stroke-width="1.4" fill="none"/>
  </g>

  <!-- ================= 2. 两根挺拔细长的真实黑皮甘蔗长杆 ================= -->
  <!-- 后方甘蔗（稍细，墨紫黑带自然白蜡霜粉） -->
  <g transform="translate(74, 20)">
    <!-- 节 1 -->
    <rect x="0" y="0" width="16" height="38" rx="2" fill="url(#caneSkin)"/>
    <rect x="-1.5" y="38" width="19" height="5" rx="1.5" fill="url(#bloomWax)"/>
    <circle cx="3" cy="40.5" r="0.9" fill="#2e1065"/>
    <!-- 节 2 -->
    <rect x="0" y="42" width="16" height="42" rx="2" fill="url(#caneSkin)"/>
    <rect x="-1.5" y="84" width="19" height="5" rx="1.5" fill="url(#bloomWax)"/>
    <circle cx="12" cy="86.5" r="0.9" fill="#2e1065"/>
    <!-- 节 3 -->
    <rect x="0" y="88" width="16" height="44" rx="2" fill="url(#caneSkin)"/>
    <rect x="-1.5" y="132" width="19" height="5" rx="1.5" fill="url(#bloomWax)"/>
    <!-- 节 4 -->
    <rect x="0" y="136" width="16" height="18" rx="2" fill="url(#caneSkin)"/>
  </g>

  <!-- 前方主甘蔗（高大挺直、真实节环结构：凸起节环、凹陷缢痕、厚蜡粉白霜、小芽眼与细根点） -->
  <g transform="translate(104, 12)">
    <!-- 节 1（顶节自然圆滑接叶头） -->
    <rect x="0" y="0" width="19" height="40" rx="2" fill="url(#caneSkin)"/>
    <!-- 节环白粉霜带 1 -->
    <rect x="-2" y="40" width="23" height="6.5" rx="2" fill="url(#bloomWax)"/>
    <line x1="-1" y1="43" x2="20" y2="43" stroke="#2e1065" stroke-width="0.8" opacity="0.6"/>
    <circle cx="5" cy="43" r="1.3" fill="#1b0e22"/><circle cx="5" cy="43" r="0.5" fill="#f8fafc"/> <!-- 芽眼 -->
    <circle cx="10" cy="44.5" r="0.4" fill="#64748b"/><circle cx="14" cy="44.5" r="0.4" fill="#64748b"/> <!-- 根点 -->

    <!-- 节 2 -->
    <rect x="0" y="45" width="19" height="44" rx="2" fill="url(#caneSkin)"/>
    <!-- 真实微弱纵向蜡粉纹路 -->
    <line x1="4" y1="47" x2="4" y2="87" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.25"/>
    <!-- 节环白粉霜带 2 -->
    <rect x="-2" y="89" width="23" height="6.5" rx="2" fill="url(#bloomWax)"/>
    <line x1="-1" y1="92" x2="20" y2="92" stroke="#2e1065" stroke-width="0.8" opacity="0.6"/>
    <circle cx="14" cy="92" r="1.3" fill="#1b0e22"/><circle cx="14" cy="92" r="0.5" fill="#f8fafc"/>

    <!-- 节 3 -->
    <rect x="0" y="94" width="19" height="44" rx="2" fill="url(#caneSkin)"/>
    <line x1="4" y1="96" x2="4" y2="136" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.25"/>
    <!-- 节环白粉霜带 3 -->
    <rect x="-2" y="138" width="23" height="6.5" rx="2" fill="url(#bloomWax)"/>

    <!-- 节 4（底节入地） -->
    <rect x="0" y="143" width="19" height="15" rx="2" fill="url(#caneSkin)"/>
  </g>

  <!-- ================= 3. 真实削皮甘蔗肉（经典水果摊削皮实景） ================= -->
  <!-- 右侧甘蔗：上半截削去了紫黑硬壳，露出一整段金黄多汁、纵向粗纤维清晰可见的甜甘蔗肉，两片紫皮如卷刀皮般自然向下卷开！ -->
  <g transform="translate(142, 42) rotate(6)">
    <!-- 1. 下半节（保留真实黑皮甘蔗身与白霜环） -->
    <rect x="0" y="56" width="23" height="60" rx="2.5" fill="url(#caneSkin)"/>
    <!-- 节环白粉霜 -->
    <rect x="-2" y="88" width="27" height="6.5" rx="2" fill="url(#bloomWax)"/>
    <circle cx="7" cy="91" r="1.2" fill="#1b0e22"/>

    <!-- 2. 上半截：削好皮的真实甘蔗肉圆柱（多汁、浅黄微透、粗纤维纵向排列） -->
    <rect x="1" y="0" width="21" height="58" rx="2.5" fill="url(#fleshGrad)"/>
    
    <!-- 顶部甘蔗肉圆形刀切截面（带微小导管孔轮廓与纤维点） -->
    <ellipse cx="11.5" cy="2" rx="10.5" ry="3.8" fill="url(#fleshCut)" stroke="#ca8a04" stroke-width="1.2"/>
    <circle cx="8" cy="2" r="0.6" fill="#ca8a04"/><circle cx="12" cy="2" r="0.6" fill="#ca8a04"/><circle cx="15" cy="2" r="0.6" fill="#ca8a04"/>

    <!-- 真实多汁甘蔗粗纤维丝纵向纹理（甘蔗特有的蔗糖粗纤维束） -->
    <line x1="5" y1="5" x2="5" y2="56" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
    <line x1="11" y1="5" x2="11" y2="56" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="17" y1="5" x2="17" y2="56" stroke="#facc15" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="12" x2="8" y2="48" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
    <line x1="14" y1="16" x2="14" y2="52" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>

    <!-- 3. 真实削皮刀削开、向两侧自然卷曲翻开的紫黑外蔗皮（外墨紫黑带蜡粉，内青白浅黄） -->
    <!-- 左翻皮瓣 -->
    <path d="M1 58 C-10 50 -16 34 -12 20 C-9 32 -3 46 1 58 Z" fill="#23182c" stroke="#181124" stroke-width="1.5"/>
    <path d="M-12 20 C-9 30 -3 42 1 56" stroke="#f8fafc" stroke-width="1.2" fill="none" opacity="0.8"/>
    
    <!-- 右翻皮瓣 -->
    <path d="M22 58 C33 50 39 34 35 20 C32 32 26 46 22 58 Z" fill="#23182c" stroke="#181124" stroke-width="1.5"/>
    <path d="M35 20 C32 30 26 42 22 56" stroke="#f8fafc" stroke-width="1.2" fill="none" opacity="0.8"/>
  </g>

  <!-- 削皮时迸出的晶莹清甜甘蔗汁小水珠 -->
  <circle cx="136" cy="70" r="3" fill="#38bdf8" opacity="0.85"/>
  <circle cx="130" cy="80" r="2" fill="#38bdf8" opacity="0.85"/>
  <circle cx="186" cy="76" r="2.5" fill="#38bdf8" opacity="0.85"/>
</svg>
`;

await writeFile(resolve(root, '橘子.svg'), realisticOrangeSvg.trim() + '\n', 'utf8');
await writeFile(resolve(root, '甘蔗.svg'), realisticSugarcaneSvg.trim() + '\n', 'utf8');

// 渲染为真实高清 PNG
const previewDir = '/private/var/folders/bm/s13gndfn4f1d8lx3wpq38qh40000gn/T/opencode/hanzi-previews';
execSync(`/opt/homebrew/bin/resvg -w 480 -h 360 "${resolve(root, '橘子.svg')}" "${resolve(previewDir, '橘子_realistic.png')}"`);
execSync(`/opt/homebrew/bin/resvg -w 480 -h 360 "${resolve(root, '甘蔗.svg')}" "${resolve(previewDir, '甘蔗_realistic.png')}"`);
console.log('Saved realistic 橘子 and 甘蔗!');
