const COLORS = ['#ff4d4f', '#ffa940', '#ffec3d', '#73d13d', '#36cfc9', '#4096ff', '#9254de', '#f759ab'];

export function triggerConfetti() {
  if (typeof document === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const particles = [];
  const count = Math.min(80, Math.floor(width / 10));

  for (let i = 0; i < count; i++) {
    const isStar = i % 3 === 0;
    particles.push({
      x: width * (0.3 + Math.random() * 0.4),
      y: height * 0.65,
      vx: (Math.random() - 0.5) * 16,
      vy: -10 - Math.random() * 14,
      size: isStar ? 8 + Math.random() * 8 : 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      vRotation: (Math.random() - 0.5) * 0.2,
      wobble: Math.random() * Math.PI * 2,
      vWobble: 0.1 + Math.random() * 0.1,
      gravity: 0.38,
      drag: 0.96,
      opacity: 1,
      isStar,
    });
  }

  const startTime = performance.now();
  const duration = 2400;

  function drawStar(c, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    c.beginPath();
    c.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      c.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      c.lineTo(x, y);
      rot += step;
    }
    c.lineTo(cx, cy - outerRadius);
    c.closePath();
    c.fill();
  }

  function frame(now) {
    const elapsed = now - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, width, height);
    const progress = elapsed / duration;
    const fadeOut = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

    for (const p of particles) {
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRotation;
      p.wobble += p.vWobble;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, fadeOut);

      if (p.isStar) {
        drawStar(ctx, 0, 0, 5, p.size, p.size * 0.45);
      } else {
        const scaleX = Math.cos(p.wobble);
        ctx.scale(scaleX, 1);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
