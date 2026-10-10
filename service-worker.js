const CACHE_NAME = 'magic-castle-v1.0.15';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './styles/screens/adventure-map.css',
  './app.js',
  './features/map-route.js',
  './features/storage.js',
  './features/achievements.js',
  './features/theme-catalog.js',
  './features/content-catalog.js',
  './features/default-content.js',
  './features/build-info.js',
  './features/arcade-games.js',
  './features/audio-sfx.js',
  './features/confetti.js',
  './vendor/hanzi-writer/hanzi-writer.min.js',
  './vendor/hanzi-writer/default-chars.js',
  './vendor/hanzi-writer/default-chars.json',
  './manifest.webmanifest',
  './assets/icons/app-icon-192.png',
  './assets/icons/app-icon-512.png',
  './assets/icons/app-icon.svg',
  './assets/branding/magic-castle/magic-castle-logo.svg',
  './assets/scenes/adventure-map/magic-castle-adventure-map.jpeg',
  './assets/scenes/adventure-map/magic-castle-adventure-map-mobile.jpeg',
  './assets/ui/cloud-label.svg',
  './assets/audio/magic-house/background-loop.wav',
  './assets/fonts/castle-kai.woff2',
  './assets/characters/luna/character.js',
  './assets/characters/luna/wardrobe.js',
  './assets/characters/luna/wardrobe-data.js',
  './assets/learning/vocabulary/red.svg',
  './assets/learning/vocabulary/one.svg',
  './assets/learning/vocabulary/two.svg',
  './assets/learning/vocabulary/three.svg',
  './assets/learning/vocabulary/yellow.svg',
  './assets/learning/vocabulary/blue.svg',
  './assets/learning/vocabulary/cat.svg',
  './assets/learning/vocabulary/dog.svg',
  './assets/learning/vocabulary/rabbit.svg',
  './assets/learning/vocabulary/jump.svg',
  './assets/learning/vocabulary/clap.svg',
  './assets/learning/vocabulary/dance.svg',
  './assets/learning/hanzi/白色.svg',
  './assets/learning/hanzi/黑色.svg',
  './assets/learning/hanzi/红色.svg',
  './assets/learning/hanzi/绿色.svg',
  './assets/learning/hanzi/黄色.svg',
  './assets/learning/hanzi/紫色.svg',
  './assets/learning/hanzi/蓝色.svg',
  './assets/learning/hanzi/粉色.svg',
  './assets/learning/hanzi/西瓜.svg',
  './assets/learning/hanzi/蓝莓.svg',
  './assets/learning/hanzi/橙子.svg',
  './assets/learning/hanzi/草莓.svg',
  './assets/learning/hanzi/苹果.svg',
  './assets/learning/hanzi/哈密瓜.svg',
  './assets/learning/hanzi/葡萄.svg',
  './assets/learning/hanzi/芒果.svg',
  './assets/learning/hanzi/榴莲.svg',
  './assets/learning/hanzi/香蕉.svg',
  './assets/learning/hanzi/橘子.svg',
  './assets/learning/hanzi/红枣.svg',
  './assets/learning/hanzi/甘蔗.svg',
  './assets/learning/hanzi/胡萝卜.svg',
  './assets/learning/hanzi/西红柿.svg',
  './assets/learning/hanzi/土豆.svg',
  './assets/learning/hanzi/蘑菇.svg',
  './assets/learning/hanzi/南瓜.svg',
  './assets/learning/hanzi/黄瓜.svg',
  './assets/learning/hanzi/西兰花.svg',
  './assets/learning/hanzi/玉米.svg',
  './assets/learning/hanzi/茄子.svg',
  './assets/learning/hanzi/琬豆.svg',
  './assets/learning/hanzi/豌豆.svg',
  './assets/learning/hanzi/小狗.svg',
  './assets/learning/hanzi/小猫.svg',
  './assets/learning/hanzi/小猪.svg',
  './assets/learning/hanzi/鸭子.svg',
  './assets/learning/hanzi/大象.svg',
  './assets/learning/hanzi/长颈鹿.svg',
  './assets/learning/hanzi/熊猫.svg',
  './assets/learning/hanzi/兔子.svg',
  './assets/learning/hanzi/猴子.svg',
  './assets/learning/hanzi/鱼.svg',
  './assets/learning/hanzi/青蛙.svg',
  './assets/learning/hanzi/乌龟.svg',
  './assets/learning/hanzi/蝴蝶.svg',
  './assets/learning/hanzi/太阳.svg',
  './assets/learning/hanzi/月亮.svg',
  './assets/learning/hanzi/星星.svg',
  './assets/learning/hanzi/气球.svg',
  './assets/learning/hanzi/樱桃.svg',
  './assets/learning/hanzi/梨子.svg',
  './assets/learning/hanzi/狮子.svg',
  './vendor/match-3-game/index.html',
  './vendor/match-3-game/resources/style.css',
  './vendor/match-3-game/resources/app.js',
  './vendor/mini-games/whac-a-mole.html',
  './vendor/mini-games/library/fruit-catch.html',
  './vendor/mini-games/library/2048.html',
  './vendor/mini-games/library/hanoi.html',
  './vendor/mini-games/library/klotski.html',
  './vendor/mini-games/library/sudoku.html',
  './vendor/mini-games/library/bulls-and-cows.html',
  './vendor/mini-games/fruitninjia/index.html',
  './vendor/mini-games/fruitninjia/images/index.css',
  './vendor/mini-games/fruitninjia/scripts/all.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // CSS, JS, and vendor use network-first so visual and script fixes are never held behind an old offline cache.
  if (url.pathname.endsWith('/style.css') || url.pathname.endsWith('/styles/screens/adventure-map.css') || url.pathname.endsWith('/app.js') || url.pathname.includes('/features/') || url.pathname.includes('/vendor/')) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (!response.ok) return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
