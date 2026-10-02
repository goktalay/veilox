// Çizgisel dönen dünya (ortografik izdüşüm). Kıyı verisi: Natural Earth 1:110m (world-atlas),
// static/data/land.json içine gömülü. Arka yüz soluk, ön yüz belirgin çizilir.
let landPromise;
const loadLand = () => (landPromise ??= fetch('/static/data/land.json').then(r => r.json()).catch(() => []));

function graticule(step = 15) {
  const lines = [];
  for (let lon = -180; lon < 180; lon += step) {
    const l = [];
    for (let lat = -90; lat <= 90; lat += 2) l.push([lon, lat]);
    lines.push(l);
  }
  for (let lat = -90 + step; lat < 90; lat += step) {
    const l = [];
    for (let lon = -180; lon <= 180; lon += 2) l.push([lon, lat]);
    lines.push(l);
  }
  return lines;
}

/**
 * @param canvas  çizilecek <canvas>; boyutu CSS ile verilir
 * @param opts    color "r,g,b"; size: kısa kenara oranla yarıçap; speed: derece/sn; tilt: eksen eğimi (derece);
 *                land/grid/back: çizgi saydamlıkları
 */
export function createGlobe(canvas, opts = {}) {
  const o = { color: '29,79,145', size: 0.42, speed: 6, tilt: -20, land: 0.75, grid: 0.28, back: 0.07, ...opts };
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grid = graticule();
  let land = [];
  let rot = 20, raf = 0, last = 0, alive = true;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    draw();
  };

  function draw() {
    const w = canvas.width, h = canvas.height;
    const R = Math.min(w, h) * o.size, cx = w / 2, cy = h / 2;
    const t = o.tilt * Math.PI / 180, sinT = Math.sin(t), cosT = Math.cos(t);
    const r0 = rot * Math.PI / 180;
    const lw = Math.max(1, w / 1400);
    ctx.clearRect(0, 0, w, h);

    // [x, y, z] — z > 0 ön yüz
    const project = ([lon, lat]) => {
      const l = lon * Math.PI / 180 + r0, p = lat * Math.PI / 180;
      const cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l), sl = Math.sin(l);
      return [cx + R * cp * sl, cy - R * (cosT * sp - sinT * cp * cl), sinT * sp + cosT * cp * cl];
    };

    const stroke = (lines, front, alpha, width) => {
      ctx.beginPath();
      for (const line of lines) {
        let pen = false;
        for (const pt of line) {
          const [x, y, z] = project(pt);
          if ((z >= 0) === front) {
            pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            pen = true;
          } else {
            pen = false;
          }
        }
      }
      ctx.strokeStyle = `rgba(${o.color},${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    stroke(grid, false, o.back * 0.6, lw);
    stroke(land, false, o.back, lw);
    stroke(grid, true, o.grid, lw);
    stroke(land, true, o.land, lw * 1.4);

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${o.color},${Math.min(1, o.grid * 1.6)})`;
    ctx.lineWidth = lw * 1.4;
    ctx.stroke();
  }

  function frame(ts) {
    if (!alive) return;
    if (last) rot += o.speed * Math.min(0.1, (ts - last) / 1000);
    last = ts;
    draw();
    raf = requestAnimationFrame(frame);
  }

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (!document.hidden && !still && alive) raf = requestAnimationFrame(frame);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);
  loadLand().then(l => { land = l; draw(); });
  resize();
  if (!still) raf = requestAnimationFrame(frame);

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
