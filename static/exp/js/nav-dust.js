// Navbar dust: scrolling down dissolves the navbar into particles that drift
// off like dust in the wind, left side first; scrolling back up gathers them
// again and hands over to the real navbar once every dot is home.
//
// The navbar is redrawn into an offscreen canvas (borders, text and icons,
// read from the live DOM), and its lit pixels become the particles, so the
// dust always matches what was on screen: hover state, current link, language.
// Each particle follows one path from its home (p = 0) to gone (p = 1);
// hiding plays it forwards, showing plays it backwards, and a change of mind
// halfway reverses from wherever the dust is.
//
// With reduced motion the navbar only fades.
(() => {
  'use strict';

  const nav = document.querySelector('.nav');
  if (!nav) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 760px)');

  // One trip from home to gone, ms.
  const DURATION = 1000;
  // Real navbar and dust cross-fade over this long at either end, ms.
  const HANDOFF = 140;
  // Room below the navbar for the dust to drift into, css px.
  const DRIFT_ROOM = 150;
  // Scrolling less than this between two scroll events is ignored, css px.
  const SCROLL_NOISE = 6;
  // Near the top the navbar always shows, css px.
  const TOP_ZONE = 60;
  // Each particle starts leaving at its share of SWEEP, left to right, plus
  // up to JITTER at random, then takes SPAN of the trip to fade out.
  const SWEEP = 0.45;
  const JITTER = 0.12;
  const SPAN = 1 - SWEEP - JITTER;
  const ALPHA_LEVELS = 8;
  const DOT = 1.3;

  const canvas = document.createElement('canvas');
  canvas.className = 'nav-dust';
  canvas.setAttribute('aria-hidden', 'true');
  nav.after(canvas);
  const ctx = canvas.getContext('2d');
  const scratch = document.createElement('canvas');
  const sctx = scratch.getContext('2d', { willReadFrequently: true });

  // Icons are drawn from images of their SVG, prepared once.
  const icons = new Map();
  for (const svg of nav.querySelectorAll('svg')) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('color', getComputedStyle(svg).color);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    icons.set(svg, img);
  }

  let dpr = 1;
  let width = 0;
  let height = 0;
  let count = 0;
  let px = new Float32Array(0);
  let py = new Float32Array(0);
  let delay = new Float32Array(0);
  let windX = new Float32Array(0);
  let windY = new Float32Array(0);
  let phase = new Float32Array(0);
  let alpha = new Float32Array(0);
  let blue = new Uint8Array(0);

  let p = 0;
  let target = 0;
  let last = 0;
  let handoffStart = 0;
  let leaveStart = 0;
  let running = false;

  // Shown down to its ancestors inside the navbar (the navbar itself may be
  // the one fading out).
  function shown(el) {
    for (let node = el; node && node !== nav; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    }
    return true;
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
  }

  // Redraws the navbar as it looks now into the scratch canvas.
  function paint() {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, scratch.width, scratch.height);
    for (const el of [nav, ...nav.querySelectorAll('*')]) {
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
      if (el !== nav && !shown(el)) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const cs = getComputedStyle(el);

      if (el instanceof SVGSVGElement) {
        const img = icons.get(el);
        if (img && img.complete && img.naturalWidth) sctx.drawImage(img, rect.left, rect.top, rect.width, rect.height);
        continue;
      }

      const bw = parseFloat(cs.borderTopWidth);
      if (bw > 0 && cs.borderTopStyle !== 'none') {
        // Hairline borders are boosted so the pill shapes still read as dust.
        sctx.strokeStyle = cs.borderTopColor;
        sctx.globalAlpha = 1;
        sctx.lineWidth = Math.max(bw, 1.2);
        const color = cs.borderTopColor.match(/[\d.]+/g);
        if (color && color.length === 4 && +color[3] < 0.3) {
          sctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},0.3)`;
        }
        roundRect(sctx, rect.left + bw / 2, rect.top + bw / 2, rect.width - bw, rect.height - bw, parseFloat(cs.borderTopLeftRadius) || 0);
        sctx.stroke();
      }

      const bg = cs.backgroundColor.match(/[\d.]+/g);
      if (bg && (bg.length === 3 || +bg[3] > 0.2) && +bg[0] + +bg[1] + +bg[2] > 300) {
        sctx.fillStyle = cs.backgroundColor;
        roundRect(sctx, rect.left, rect.top, rect.width, rect.height, parseFloat(cs.borderTopLeftRadius) || 0);
        sctx.fill();
      }

      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        if (!box.width) continue;
        sctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        sctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
        sctx.fillStyle = cs.color;
        sctx.textBaseline = 'middle';
        sctx.fillText(node.textContent.trim(), box.left, box.top + box.height / 2);
      }

      // The burger's three lines are pseudo-elements.
      if (el.classList.contains('nav__burger')) {
        sctx.fillStyle = cs.color;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        for (const dy of [-5, 0, 5]) sctx.fillRect(cx - 8, cy + dy - 0.75, 16, 1.5);
      }
    }
  }

  // Turns the lit pixels of the painted navbar into particles.
  function sample() {
    const navRect = nav.getBoundingClientRect();
    width = window.innerWidth;
    height = Math.ceil(navRect.bottom + DRIFT_ROOM);
    scratch.width = width;
    scratch.height = height;
    paint();
    const data = sctx.getImageData(0, 0, width, height).data;
    const lit = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = (data[i + 3] / 255) * (Math.max(data[i], data[i + 1], data[i + 2]) / 255);
        if (a > 0.12) lit.push(x, y, a, data[i + 2] > data[i] + 50 ? 1 : 0);
      }
    }
    const max = narrow.matches ? 4500 : 11000;
    const keep = Math.min(1, max / (lit.length / 4));
    const xs = [];
    for (let k = 0; k < lit.length; k += 4) if (Math.random() < keep) xs.push(k);
    count = xs.length;
    px = new Float32Array(count);
    py = new Float32Array(count);
    delay = new Float32Array(count);
    windX = new Float32Array(count);
    windY = new Float32Array(count);
    phase = new Float32Array(count);
    alpha = new Float32Array(count);
    blue = new Uint8Array(count);
    const left = navRect.left;
    const span = Math.max(1, navRect.width);
    for (let n = 0; n < count; n++) {
      const k = xs[n];
      px[n] = lit[k] + Math.random() - 0.5;
      py[n] = lit[k + 1] + Math.random() - 0.5;
      alpha[n] = Math.min(1, lit[k + 2] * 1.15);
      blue[n] = lit[k + 3];
      delay[n] = ((lit[k] - left) / span) * SWEEP + Math.random() * JITTER;
      windX[n] = 50 + Math.random() * 170;
      windY[n] = -(10 + Math.random() * 40) + Math.random() * 90;
      phase[n] = Math.random() * Math.PI * 2;
    }
    resize();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  const buckets = Array.from({ length: ALPHA_LEVELS * 2 }, () => []);

  function draw(fade) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (fade <= 0) return;
    for (const b of buckets) b.length = 0;
    for (let n = 0; n < count; n++) {
      const local = Math.min(1, Math.max(0, (p - delay[n]) / SPAN));
      const a = alpha[n] * (1 - local ** 1.3) * fade;
      if (a < 0.03) continue;
      const e = local ** 1.7;
      const swirl = Math.sin(phase[n] + local * 5) * 14 * e;
      const x = px[n] + windX[n] * e + swirl;
      const y = py[n] + windY[n] * e + Math.cos(phase[n] + local * 4) * 6 * e;
      buckets[blue[n] * ALPHA_LEVELS + Math.min(ALPHA_LEVELS - 1, Math.floor(a * ALPHA_LEVELS))].push(x, y);
    }
    for (let b = 0; b < buckets.length; b++) {
      const list = buckets[b];
      if (!list.length) continue;
      const level = ((b % ALPHA_LEVELS) + 0.5) / ALPHA_LEVELS;
      ctx.fillStyle = b >= ALPHA_LEVELS ? `rgba(141,184,255,${level})` : `rgba(236,244,255,${level})`;
      for (let k = 0; k < list.length; k += 2) ctx.fillRect(list[k] - DOT / 2, list[k + 1] - DOT / 2, DOT, DOT);
    }
  }

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;
    const step = dt / DURATION;
    p = target > p ? Math.min(target, p + step) : Math.max(target, p - step);

    if (p === 0 && target === 0) {
      // Home: the real navbar is back; the dust fades out over it.
      if (!handoffStart) {
        handoffStart = now;
        nav.classList.remove('nav--gone');
        nav.inert = false;
      }
      const fade = 1 - (now - handoffStart) / HANDOFF;
      draw(fade);
      if (fade <= 0) {
        running = false;
        return;
      }
    } else if (p === 1 && target === 1) {
      draw(0);
      running = false;
      return;
    } else {
      // Leaving home: the dust fades in as the real navbar fades out.
      draw(leaveStart ? Math.min(1, (now - leaveStart) / HANDOFF) : 1);
    }
    requestAnimationFrame(frame);
  }

  function run() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function closeMenus() {
    for (const toggle of nav.querySelectorAll('[aria-haspopup="true"][aria-expanded="true"]')) {
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  function hide() {
    if (target === 1 || nav.classList.contains('nav--open')) return;
    closeMenus();
    if (document.activeElement && nav.contains(document.activeElement)) document.activeElement.blur();
    target = 1;
    if (reducedMotion.matches) {
      p = 1;
      nav.classList.add('nav--gone');
      nav.inert = true;
      return;
    }
    leaveStart = 0;
    if (p === 0) {
      if (!running) sample();
      leaveStart = performance.now();
    }
    handoffStart = 0;
    nav.classList.add('nav--gone');
    nav.inert = true;
    run();
  }

  function show() {
    if (target === 0) return;
    target = 0;
    if (reducedMotion.matches) {
      p = 0;
      nav.classList.remove('nav--gone');
      nav.inert = false;
      return;
    }
    // From fully gone, measure again: the page may have been resized.
    if (p === 1 && !running) sample();
    handoffStart = 0;
    leaveStart = 0;
    run();
  }

  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < TOP_ZONE) show();
      else if (delta > SCROLL_NOISE) hide();
      else if (delta < -SCROLL_NOISE) show();
      else return;
      lastY = y;
    },
    { passive: true },
  );
})();
