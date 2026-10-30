if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
  const origCreateObjectURL = window.URL.createObjectURL.bind(window.URL);
  window.URL.createObjectURL = function (obj) {
    if (obj instanceof ArrayBuffer || ArrayBuffer.isView(obj)) {
      return origCreateObjectURL(new Blob([obj], { type: 'image/png' }));
    }
    return origCreateObjectURL(obj);
  };
}

import { GameScene } from './scene/GameScene.js';

import './libs/matter-plugin-fix.js';


// Get viewport from wx in mini-game env, otherwise from window
function getViewport() {
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    const info = wx.getSystemInfoSync();
    return {
      dpr: info.pixelRatio || 1,
      width: info.windowWidth || info.screenWidth || 375,
      height: info.windowHeight || info.screenHeight || 667,
    };
  }
  if (typeof window !== 'undefined') {
    return {
      dpr: window.devicePixelRatio || 1,
      width: window.innerWidth || 375,
      height: window.innerHeight || 667,
    };
  }
  return { dpr: 1, width: 375, height: 667 };
}

const vp = getViewport();
export const DPR = Number(vp.dpr.toFixed(1));
export const WIDTH = Math.round(vp.width);
export const HEIGHT = Math.round(vp.height);

export class Main {
  constructor() {
    const config = {
      type: Phaser.CANVAS,
      parent: 'phaser-example',
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.NONE,
        width: WIDTH,
        height: HEIGHT,
      },
      render: {
        pixelArt: false,
        roundPixels: true,
      },
      backgroundColor: '#bde0fe',
      fps: {
        target: 60,
        forceSetTimeOut: true,
      },
      physics: {
        default: 'matter',
        matter: {
          gravity: { y: 1.0 },
          positionIterations: 10,
          velocityIterations: 8,
          constraintIterations: 4,
        },
      },
    };

    if (typeof window !== 'undefined' && window.canvas) {
      config.canvas = window.canvas;
    } else if (typeof GameGlobal !== 'undefined' && GameGlobal.canvas) {
      config.canvas = GameGlobal.canvas;
    }

    // eslint-disable-next-line no-new
    new Phaser.Game(config);
  }
}

if (typeof document !== 'undefined' && typeof wx === 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Main());
  } else {
    new Main();
  }
}

