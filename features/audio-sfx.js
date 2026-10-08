let audioCtx = null;

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('touchstart', unlock, true);
    window.removeEventListener('click', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('touchstart', unlock, true);
  window.addEventListener('click', unlock, true);
}

function playDing(ctx) {
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, t);
  osc1.frequency.exponentialRampToValueAtTime(1320, t + 0.12);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1760, t);

  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.36);
  osc2.stop(t + 0.36);
}

function playWrong(ctx) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(160, t + 0.18);

  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.23);
}

function playPop(ctx) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.09);
}

function playFanfare(ctx) {
  const notes = [
    { freq: 523.25, delay: 0.0, dur: 0.18 }, // C5
    { freq: 659.25, delay: 0.12, dur: 0.18 }, // E5
    { freq: 783.99, delay: 0.24, dur: 0.2 }, // G5
    { freq: 1046.5, delay: 0.36, dur: 0.55 }, // C6
  ];
  notes.forEach(({ freq, delay, dur }) => {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + dur + 0.01);
  });
}

export function playSfx(type) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (type === 'ding' || type === 'correct') {
      playDing(ctx);
    } else if (type === 'wrong') {
      playWrong(ctx);
    } else if (type === 'pop') {
      playPop(ctx);
    } else if (type === 'fanfare' || type === 'victory') {
      playFanfare(ctx);
    }
  } catch {
    // Gracefully ignore audio synthesis errors
  }
}
