// Hands made of moving particles, shared by the hero, reach and hold scenes.
//
// One fixed canvas covers the viewport. Every particle has a home in the
// hero artwork, the reach artwork and the hold artwork (assets/points.bin,
// pre-built point data; all three drawn as an even halftone).
// Scrolling from the hero to the reach scene keeps each hand whole: it grows,
// turns and moves out to its side while its pose settles, and the spark
// between the fingertips travels to the middle and opens into the text.
// Scrolling back reverses it. Scrolling on to the hold scene lets the
// particles go one by one, fingertips first, each on its own curved,
// slightly turbulent path: the left hand becomes an open palm and the right
// hand becomes a slowly turning sphere floating above it. A pose with fewer
// points than its hand has particles leaves the spare ones dark there; they
// fade in or out on their flight. Every particle has a rank, and where a
// pose is drawn small the highest ranks fade out, so the dots keep their
// spacing instead of piling into a white blob.
//
// While the hold stage is pinned (js/steps.js) two more steps follow. Reason:
// the hand comes apart into rings around the sphere, which sinks to the
// middle of the screen; the rings orbit it, inner ones faster. Act: the
// sphere turns into a brain (assets/brain.bin, pre-built point data), the
// innermost ring dots fly in to fill it out and
// the rest burst outwards and fade, leaving the brain alone.
//
// Markup:
//   canvas[data-particles]   the stage; URL of the points file
//   canvas[data-brain]       URL of the brain file
//   [data-hands="from"]      hero box, the hero artwork fills its width
//   [data-hands="to"]        reach box, the reach artwork fills its width
//   [data-hands="hold"]      hold box, the hold artwork fills its width
// Options on all boxes:
//   data-source   artwork size, "2200x768"
//   data-origin   "x,y" in source px: where pulses start (the spark, on the hero)
// Options on the reach box:
//   data-reach    source px the two hands float towards each other
// Options on the hold box:
//   data-sphere   "x,y,radius" of the sphere in source px
// Both reach hands are levelled to the box's vertical middle, either side of
// the text. --gap (CSS, share of the source height) then lifts the left hand
// and lowers the right one, to stack them above and below the text on narrow
// screens.
//
// ~25k particles are splatted straight into one ImageData buffer, and only the
// area the hands cover is cleared and uploaded, so a frame stays at a few
// milliseconds even without GPU canvas acceleration.
(() => {
  'use strict';

  const canvas = document.querySelector('canvas[data-particles]');
  const from = document.querySelector('[data-hands="from"]');
  const to = document.querySelector('[data-hands="to"]');
  const hold = document.querySelector('[data-hands="hold"]');
  const copy = to.parentElement.querySelector('.reach__copy');
  if (!canvas || !from || !to || !hold) return;

  const POINTER_RADIUS = 210;
  const DUST_COUNT = 140;
  // Particle colour (cool white); only the alpha channel is accumulated.
  const TINT = 0x00fff4ec; // little-endian ABGR: r=236 g=244 b=255, a=0
  // Intro: points start in a loose cloud and gather into the hands.
  const GATHER_DELAY = 900;
  const GATHER_MS = 2200;
  const INTRO_END = GATHER_DELAY + GATHER_MS;
  // A pulse leaves the origin every 3.2 s once the hands have formed.
  const PULSE_MS = 3200;
  // Share of the scroll range the departures are spread over.
  const FLOW_SPREAD = 0.35;
  // Hero homes are stored shifted by this many source px (in points.bin).
  const HERO_PAD = 512;
  // CSS px of turbulence halfway through a flight, at artwork scale 0.5.
  const FLOW_SWIRL = 22;
  // Sphere: radians per ms around its tilted axis (one turn in ~26 s), the
  // tilt, and the brightness of its dots (they overlap far more than the
  // hand's, so they are dimmer).
  const SPIN = 0.00024;
  const TILT = 0.38;
  const SPHERE_GLOW = 0.36;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  // Artwork scale per pose from which every dot is shown: the halftone grid
  // is then ~2.9 CSS px apart in all three.
  const FULL_SCALE = [0.45, 0.56, 0.85];
  // Rings (in sphere radii): inner and outer edge, the thin rings near the
  // sphere (as a share of the span), the share of ring dots they take, and
  // how flat the ring plane looks (height / width).
  const RING_IN = 1.25;
  const RING_OUT = 5.6;
  const THIN_RINGS = [0.02, 0.09, 0.17, 0.27, 0.39];
  const THIN_SHARE = 0.42;
  const RING_FLAT = 0.22;
  // Radians per ms of the innermost ring; outer ones turn slower.
  const ORBIT = 0.00016;
  // The brain is tilted less than the sphere so it shows its side.
  const BRAIN_TILT = 0.16;
  // Brain size against the sphere's (the brain file is in sphere radii).
  const BRAIN_SCALE = 1.15;
  // In Act the brain grows to this share of the screen (width, height; the
  // width share doubles on portrait screens) and rocks around its side view
  // by this many radians, so its outline and folds stay readable.
  const BRAIN_FILL = [0.4, 0.6];
  const BRAIN_ROCK = 0.6;
  // In Act a smaller sphere (in sphere radii, not grown with the brain)
  // stays lit at the brain's centre, made of this many burst dots.
  const CORE_R = 0.7;
  const CORE_DOTS = 2600;

  // Per point: heroX, heroY, reachX, reachY (source px), x, y, vx, vy (CSS
  // px), phase, heroBrightness, reachBrightness, hand, stagger, current mix
  // 0..1, startX, startY, curl, delay, flow delay, flow rate, flow bow,
  // holdX, holdY (source px; the left hand only), holdBrightness, current
  // hold mix 0..1, sphere unit vector x, y, z (the right hand only), sphere
  // brightness this frame, rank (0..1, the highest are dropped first when a
  // pose is drawn small), 1 for the right-hand particles on the sphere, and
  // the poses the particle is dark in (bits 1 hero, 2 reach, 4 hold).
  // Then, for the Reason and Act steps: ring radius (share of the span),
  // ring start angle, ring brightness, current ring mix 0..1, current brain
  // mix 0..1, burst distance, ring visibility this frame (the sphere hides
  // the back of the rings), brain dot index (-1 if none), ring thickness
  // offset, orbit speed, burst lift and burst stagger. Last, for the burst
  // dots that form the small sphere in Act: 1 if so, and its unit vector.
  // Then how loose the dot is after the cursor scattered it, 0..1.
  const STRIDE = 49;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d');
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  const layout = (el) => {
    const [w, h] = el.dataset.source.split('x').map(Number);
    const [ox, oy] = (el.dataset.origin || `${w / 2},${h / 2}`).split(',').map(Number);
    return { w, h, ox, oy, rect: null, scale: 1 };
  };
  const A = layout(from);
  const B = layout(to);
  const C = layout(hold);
  const [SPHERE_X, SPHERE_Y, SPHERE_R] = hold.dataset.sphere.split(',').map(Number);
  const REACH = Number(to.dataset.reach || 0);
  const holdSection = hold.closest('section') || hold;

  let points = null;
  const keep = [1, 1, 1]; // per pose, rank below which particles are shown
  let keepMax = 1;
  let reachCentroids = null; // per hand, source px y of the reach pose
  const lift = [0, 0]; // per hand, source px the reach pose moves down by
  let dust = [];
  let width = 0; // viewport in CSS px
  let height = 0;
  let dpr = 1;
  let maxDpr = 2;
  let image = null;
  let pixels = null; // Uint32 view of image, for fast clears
  let alpha = null; // Uint8Clamped view of image, additions saturate at 255
  let kernels = null;
  let kernelRadius = 0;
  let gap = 0;
  let progress = 0; // 0 = hero pose, 1 = reach pose
  let progress2 = 0; // 0 = reach pose, 1 = hold pose
  let progress3 = 0; // 0 = hold pose, 1 = rings (Reason)
  let progress4 = 0; // 0 = rings, 1 = brain (Act)
  // Eased copies that move the sphere, its light and the brain as a whole.
  let sink = 0;
  let think = 0;
  // Hero to reach, eased a little behind the scroll: each hand moves, grows
  // and turns as one piece (see fitHands), while its pose settles.
  let part = 0;
  // Per hand: hero and reach centroids (source px) and the turn and scale
  // from one pose to the other (k = scale * (cos, sin) of the turn).
  let hands = null;
  const handMove = [{}, {}];
  // Centre of the reach copy, CSS px from the reach box: the hero spark
  // travels there and the copy grows out of it.
  const copyAt = { x: 0, y: 0 };
  let brain = null; // per brain dot: x, y, z (sphere radii), brightness
  let brainReach = { side: 1, up: 1 }; // its half width (any turn) and half height
  let brainGrow = 1; // its size this frame against the sphere's
  const brainDot = { x: 0, y: 0, glow: 0 };
  let running = false;
  let started = false;
  let formed = false;
  let held = false;
  let visibleFrom = false;
  let visibleTo = false;
  let visibleHold = false;
  let frame = 0;
  let start = 0;
  let last = 0;
  // Device-px box drawn last frame: cleared and re-uploaded next frame.
  let prevLeft = 0;
  let prevTop = 0;
  let prevRight = -1;
  let prevBottom = -1;
  // Box this frame draws.
  let boxLeft = 0;
  let boxTop = 0;
  let boxRight = -1;
  let boxBottom = -1;
  const frameTimes = [];
  const pointer = { x: -1e4, y: -1e4, active: false };

  // Dot footprint, precomputed for 4 sub-pixel offsets per axis so slow
  // drifting reads as smooth motion rather than whole-pixel steps.
  function makeKernels() {
    kernelRadius = Math.ceil(1.6 * dpr);
    const size = kernelRadius * 2 + 1;
    const core = (0.6 * dpr) ** 2 * 2;
    const halo = (1.5 * dpr) ** 2 * 2;
    kernels = [];
    for (let oy = 0; oy < 4; oy++) {
      for (let ox = 0; ox < 4; ox++) {
        const k = new Float32Array(size * size);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const d2 = (x - kernelRadius - ox / 4) ** 2 + (y - kernelRadius - oy / 4) ** 2;
            k[y * size + x] = 255 * (Math.exp(-d2 / core) + 0.14 * Math.exp(-d2 / halo));
          }
        }
        kernels.push(k);
      }
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    gap = parseFloat(getComputedStyle(to).getPropertyValue('--gap')) || 0;
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!width) return;
    image = ctx.createImageData(canvas.width, canvas.height);
    pixels = new Uint32Array(image.data.buffer);
    pixels.fill(TINT);
    alpha = image.data;
    prevRight = -1;
    prevBottom = -1;
    makeKernels();
    if (!running) tick(performance.now(), 1);
  }

  // Layout boxes in viewport px, read once per frame before any DOM write.
  function measure() {
    A.rect = from.getBoundingClientRect();
    B.rect = to.getBoundingClientRect();
    C.rect = hold.getBoundingClientRect();
    A.scale = A.rect.width / A.w;
    B.scale = B.rect.width / B.w;
    C.scale = C.rect.width / C.w;
    if (copy) {
      // Its transform scales about the centre, so the centre holds still.
      const r = copy.getBoundingClientRect();
      copyAt.x = r.left + r.width / 2 - B.rect.left;
      copyAt.y = r.top + r.height / 2 - B.rect.top;
    }
    // Below its full scale a pose fades out its highest-ranked particles.
    [A, B, C].forEach((pose, k) => (keep[k] = Math.min(1, (pose.scale / FULL_SCALE[k]) ** 2)));
    keepMax = Math.max(...keep) + 0.05;
    if (reachCentroids) {
      lift[0] = B.h * (0.5 - gap) - reachCentroids[0];
      lift[1] = B.h * (0.5 + gap) - reachCentroids[1];
    }
    // 0 while the hero sits still, 1 once the reach box is centred.
    const y = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const end = Math.min(maxScroll, y + B.rect.top + B.rect.height / 2 - height / 2);
    const begin = end * 0.12;
    progress = end > begin ? clamp01((y - begin) / (end - begin)) : 1;
    // Then 0 until the reach scene starts to leave, 1 once the hold section
    // reaches the top of the screen and its stage pins (js/steps.js).
    const section = holdSection.getBoundingClientRect();
    const end2 = Math.min(maxScroll, y + section.top);
    const begin2 = end + (end2 - end) * 0.12;
    progress2 = end2 > begin2 ? clamp01((y - begin2) / (end2 - begin2)) : 0;
    // While pinned: Reason is reached halfway through the pinned scroll, Act
    // at its end (the snap stops of js/snap.js).
    const pinned = section.height - window.innerHeight;
    const step = pinned > 0 ? clamp01(-section.top / pinned) : 0;
    progress3 = clamp01((step - 0.04) / 0.42);
    progress4 = clamp01((step - 0.54) / 0.42);
  }

  // The sphere's centre in CSS px: over the palm (with its hover), sinking
  // to the middle of the screen for Reason and Act.
  function sphereCentre(t) {
    const x = C.rect.left + SPHERE_X * C.scale;
    const y = C.rect.top + SPHERE_Y * C.scale + (reducedMotion.matches ? 0 : hoverY(t)) * (1 - sink);
    return { x: x + (width / 2 - x) * sink, y: y + (height / 2 - y) * sink };
  }

  // Where the artwork boxes sit for the current scroll, blended per pose.
  function box() {
    const lerp = (a, b, k) => a + (b - a) * k;
    const p = progress;
    const q = progress2;
    const left = lerp(lerp(A.rect.left, B.rect.left, p), C.rect.left, q);
    const top = lerp(lerp(A.rect.top, B.rect.top, p), C.rect.top, q);
    const w = lerp(lerp(A.rect.width, B.rect.width, p), C.rect.width, q);
    const h = lerp(lerp(A.rect.height, B.rect.height, p), C.rect.height, q);
    const scale = lerp(lerp(A.scale, B.scale, p), C.scale, q);
    const ox = lerp(lerp(A.rect.left + A.ox * A.scale, B.rect.left + B.ox * B.scale, p), C.rect.left + C.ox * C.scale, q);
    const oy = lerp(lerp(A.rect.top + A.oy * A.scale, B.rect.top + B.oy * B.scale, p), C.rect.top + C.oy * C.scale, q);
    return { left, top, w, h, scale, ox, oy };
  }

  // Least-squares turn and scale (a similarity) taking each hand's hero pose
  // to its reach pose, over the particles lit in both. What is left over per
  // particle is the change of pose, eased in on the way.
  function fitHands(out) {
    return [0, 1].map((hand) => {
      let n = 0;
      let hx = 0;
      let hy = 0;
      let rx = 0;
      let ry = 0;
      for (let i = 0; i < out.length; i += STRIDE) {
        if (out[i + 11] !== hand || (out[i + 31] & 3) !== 0) continue;
        hx += out[i];
        hy += out[i + 1];
        rx += out[i + 2];
        ry += out[i + 3];
        n++;
      }
      hx /= n;
      hy /= n;
      rx /= n;
      ry /= n;
      let re = 0;
      let im = 0;
      let norm = 0;
      for (let i = 0; i < out.length; i += STRIDE) {
        if (out[i + 11] !== hand || (out[i + 31] & 3) !== 0) continue;
        const ax = out[i] - hx;
        const ay = out[i + 1] - hy;
        const bx = out[i + 2] - rx;
        const by = out[i + 3] - ry;
        re += ax * bx + ay * by;
        im += ax * by - ay * bx;
        norm += ax * ax + ay * ay;
      }
      return { hx, hy, rx, ry, scale: Math.hypot(re, im) / norm, turn: Math.atan2(im, re) };
    });
  }

  function decode(buffer) {
    const view = new DataView(buffer);
    const count = Math.floor(buffer.byteLength / 18);
    const out = new Float32Array(count * STRIDE);
    const sums = [0, 0];
    const counts = [0, 0];
    let sphereDots = 0;
    for (let p = 0, i = 0; p < count; p++, i += STRIDE) {
      const o = p * 18;
      for (let f = 0; f < 4; f++) out[i + f] = view.getUint16(o + f * 2, true) / 16 - (f < 2 ? HERO_PAD : 0);
      out[i + 8] = Math.random() * Math.PI * 2;
      out[i + 9] = view.getUint8(o + 12) / 255;
      out[i + 10] = view.getUint8(o + 13) / 255;
      const hand = view.getUint8(o + 15);
      out[i + 11] = hand;
      out[i + 12] = view.getUint8(o + 16) / 255;
      out[i + 16] = (Math.random() - 0.5) * 0.5;
      out[i + 17] = Math.random() * GATHER_DELAY;
      // Fingertips leave first, loosened so neighbours do not move in lockstep.
      out[i + 18] = 0.65 * out[i + 12] + 0.35 * Math.random();
      // Per-frame catch-up rate: slow points trail behind as a stream.
      out[i + 19] = 0.04 + Math.random() * 0.07;
      // Paths bow the same way per hand, with a little spread.
      out[i + 20] = (hand === 0 ? 1 : -1) * (0.08 + Math.random() * 0.16) + (Math.random() - 0.5) * 0.1;
      if (hand === 0) {
        out[i + 21] = view.getUint16(o + 8, true) / 16;
        out[i + 22] = view.getUint16(o + 10, true) / 16;
        out[i + 23] = view.getUint8(o + 14) / 255;
      } else {
        // Sphere slot, dealt top to bottom in the order the reach hand runs.
        out[i + 21] = view.getUint16(o + 8, true);
        out[i + 30] = view.getUint8(o + 14) > 0 ? 1 : 0;
        sphereDots += out[i + 30];
      }
      out[i + 29] = view.getUint8(o + 17) / 256;
      const heldDark = hand === 0 ? out[i + 23] === 0 : out[i + 30] === 0;
      out[i + 31] = (out[i + 9] === 0 ? 1 : 0) | (out[i + 10] === 0 ? 2 : 0) | (heldDark ? 4 : 0);
      sums[hand] += out[i + 3];
      counts[hand]++;
    }
    reachCentroids = sums.map((sum, hand) => sum / counts[hand]);
    hands = fitHands(out);
    // The right hand becomes an even (Fibonacci) sphere. Particles not on it
    // share the slot of one that is and stay dark there.
    for (let i = 0; i < out.length; i += STRIDE) {
      if (out[i + 11] !== 1) continue;
      const k = out[i + 21];
      const y = 1 - (2 * (k + 0.5)) / sphereDots;
      const ring = Math.sqrt(1 - y * y);
      out[i + 25] = Math.cos(k * GOLDEN_ANGLE) * ring;
      out[i + 26] = y;
      out[i + 27] = Math.sin(k * GOLDEN_ANGLE) * ring;
    }
    layRings(out, sphereDots);
    return out;
  }

  // Ring places for every particle that is not on the sphere. The palm
  // unravels from the fingertips: the top of the hand goes to the thin inner
  // rings, the wrist (and the dots dark in the hold pose) to the wide disc.
  // The first of them in that order also fill out the brain.
  function layRings(out, sphereDots) {
    const order = [];
    for (let i = 0; i < out.length; i += STRIDE) {
      out[i + 39] = out[i + 30] === 1 ? out[i + 21] : -1;
      if (out[i + 30] === 1) continue;
      const lit = out[i + 11] === 0 && out[i + 23] > 0;
      order.push([lit ? out[i + 22] : 1e5 + out[i + 29], i]);
    }
    order.sort((a, b) => a[0] - b[0]);
    const thin = Math.round(order.length * THIN_SHARE);
    const fillers = brain ? brain.length / 4 - sphereDots : 0;
    const weights = THIN_RINGS.map((s) => RING_IN + s * (RING_OUT - RING_IN));
    const total = weights.reduce((sum, w) => sum + w, 0);
    const halton = (n, base) => {
      let f = 1;
      let r = 0;
      for (let k = n + 1; k > 0; k = Math.floor(k / base)) r += (f /= base) * (k % base);
      return r;
    };
    let ringIndex = 0;
    let ringStart = 0;
    order.forEach(([, i], j) => {
      if (j < thin) {
        while (ringIndex < THIN_RINGS.length - 1 && j - ringStart >= (thin * weights[ringIndex]) / total) {
          ringStart = j;
          ringIndex++;
        }
        const jitter = (Math.random() + Math.random() + Math.random() - 1.5) * 0.008;
        out[i + 32] = THIN_RINGS[ringIndex] + jitter;
        out[i + 33] = (j - ringStart) * GOLDEN_ANGLE;
        out[i + 34] = 0.62 + Math.random() * 0.2;
        out[i + 40] = (Math.random() - 0.5) * 0.004;
      } else {
        const d = j - thin;
        const s = 0.33 + 0.67 * Math.sqrt(halton(d, 2));
        out[i + 32] = s;
        out[i + 33] = halton(d, 3) * Math.PI * 2;
        // Soft bands with darker gaps, fading towards the rim.
        const band = (0.5 + 0.5 * Math.cos((s - 0.33) * Math.PI * 2 * 3.2)) ** 1.5;
        out[i + 34] = (0.2 + 0.32 * band) * (1 - 0.6 * clamp01((s - 0.8) / 0.2)) * (0.75 + Math.random() * 0.25);
        out[i + 40] = (Math.random() - 0.5) * 0.04;
      }
      const r = RING_IN + out[i + 32] * (RING_OUT - RING_IN);
      out[i + 41] = ORBIT * (RING_IN / r) ** 1.2;
      out[i + 37] = 0.55 + Math.random() * 0.9;
      out[i + 42] = (Math.random() - 0.5) * 1.4;
      out[i + 43] = Math.random() * 0.5;
      if (j < fillers) out[i + 39] = sphereDots + j;
    });
    // The burst dots kept longest on small screens form the small sphere,
    // dealt over it in strides so the ones dropped first thin it evenly.
    const burst = order.slice(fillers).map(([, i]) => i);
    burst.sort((a, b) => out[a + 29] - out[b + 29]);
    const core = Math.min(CORE_DOTS, burst.length);
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    let step = Math.round(core * 0.618);
    while (gcd(step, core) !== 1) step++;
    burst.slice(0, core).forEach((i, n) => {
      const k = (n * step) % core;
      const y = 1 - (2 * (k + 0.5)) / core;
      const ring = Math.sqrt(1 - y * y);
      out[i + 44] = 1;
      out[i + 45] = Math.cos(k * GOLDEN_ANGLE) * ring;
      out[i + 46] = y;
      out[i + 47] = Math.sin(k * GOLDEN_ANGLE) * ring;
    });
  }

  // Brain dots: int16 x, y, z (sphere radii * 8192) and a fold byte.
  function decodeBrain(buffer) {
    const view = new DataView(buffer);
    const count = Math.floor(buffer.byteLength / 7);
    const out = new Float32Array(count * 4);
    for (let p = 0; p < count; p++) {
      for (let f = 0; f < 3; f++) out[p * 4 + f] = (view.getInt16(p * 7 + f * 2, true) / 8192) * BRAIN_SCALE;
      out[p * 4 + 3] = view.getUint8(p * 7 + 6) / 255;
      brainReach.side = Math.max(brainReach.side, Math.hypot(out[p * 4], out[p * 4 + 2]));
      brainReach.up = Math.max(brainReach.up, Math.abs(out[p * 4 + 1]));
    }
    return out;
  }

  // Gather start: a loose oval cloud over the current pose, thinning out
  // towards its rim.
  function seedStarts() {
    measure();
    const b = box();
    const rx = b.w / 2 + 40;
    const ry = b.h / 2 + 40;
    const cx = b.left + b.w / 2;
    const cy = b.top + b.h / 2;
    for (let i = 0; i < points.length; i += STRIDE) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() ** 0.75;
      points[i + 14] = cx + Math.cos(angle) * r * rx;
      points[i + 15] = cy + Math.sin(angle) * r * ry;
      points[i + 4] = points[i + 14];
      points[i + 5] = points[i + 15];
    }
  }

  function makeDust() {
    dust = Array.from({ length: DUST_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      alpha: 0.12 + Math.random() * 0.3,
    }));
  }

  // How far the reach hands have floated towards each other, -1..1, eased
  // in after the intro so the float starts from rest.
  function reachWave(t) {
    if (!REACH || t < INTRO_END) return 0;
    const ramp = Math.min(1, (t - INTRO_END) / 2000);
    return Math.sin((t - INTRO_END) * 0.0008) * ramp;
  }

  // Over the palm the sphere levitates: a slower, deeper rise and fall (CSS
  // px) than the hands' own float.
  function hoverY(t) {
    return Math.sin(t * 0.00055 + 1.1) * 5 * Math.max(0.6, box().scale * 2);
  }

  // Brightness of a brain dot: its fold (gyri bright, sulci dim) times its
  // depth (the far side kept faint so the outline reads), a touch stronger
  // than the sphere since its dots are spread wider.
  function brainGlow(fold, depth, sphereGlow) {
    return sphereGlow * 3.5 * (0.05 + 0.95 * fold ** 2.2) * (0.1 + 0.9 * depth ** 1.6);
  }

  // Where a brain dot shows this frame, in sphere radii from the centre, and
  // its brightness (into brainDot, to spare an object per dot).
  function placeBrainDot(dot, cosB, sinB, cosT, sinT, sphereGlow) {
    const x1 = brain[dot] * cosB + brain[dot + 2] * sinB;
    const z1 = brain[dot + 2] * cosB - brain[dot] * sinB;
    const z2 = brain[dot + 1] * sinT + z1 * cosT;
    brainDot.x = x1 * brainGrow;
    brainDot.y = (brain[dot + 1] * cosT - z1 * sinT) * brainGrow;
    brainDot.glow = brainGlow(brain[dot + 3], clamp01((z2 / brainReach.side + 1) * 0.5), sphereGlow);
  }

  function update(t, dt, still) {
    // Idle motion, scaled with the artwork: a slow ripple shared by
    // neighbouring points, a small orbit per point and a gentle float per
    // hand. All of it is smooth sines, so the hands breathe instead of jitter.
    const idle = Math.max(0.6, box().scale * 2);
    const ripple = 2.8 * idle;
    const orbit = 1.6 * idle;
    const float = 3 * idle;
    const bob = [Math.sin(t * 0.00042) * float, Math.sin(t * 0.00042 + 2.4) * float];
    const sway = [Math.cos(t * 0.00031) * float * 0.5, Math.cos(t * 0.00031 + 1.7) * float * 0.5];
    const hover = hoverY(t) * (1 - sink);
    const px = pointer.x;
    const py = pointer.y;
    const pr = POINTER_RADIUS;
    const stiffness = 0.062 * dt;
    const damping = Math.pow(0.86, dt);
    const gathering = !still && t < INTRO_END;
    const reach = REACH * B.scale * reachWave(t);
    const swirl = FLOW_SWIRL * Math.max(A.scale, B.scale, C.scale) * 2;
    // The sphere sinks and becomes the brain as one piece, a little behind
    // the scroll so it glides.
    const ease = still ? 1 : Math.min(1, 0.06 * dt);
    sink += (easeInOut(progress3) - sink) * ease;
    think += (easeInOut(progress4) - think) * ease;
    if (Math.abs(sink - easeInOut(progress3)) < 1e-4) sink = easeInOut(progress3);
    if (Math.abs(think - easeInOut(progress4)) < 1e-4) think = easeInOut(progress4);
    part += (easeInOut(progress) - part) * (still ? 1 : Math.min(1, 0.07 * dt));
    if (Math.abs(part - easeInOut(progress)) < 1e-4) part = easeInOut(progress);
    // Each hand's centroid glides from its hero place to its reach place
    // (with the reach float); scale grows evenly and the turn follows.
    for (let hand = 0; hand < 2; hand++) {
      const fit = hands[hand];
      const move = handMove[hand];
      const side = hand === 0 ? 1 : -1;
      move.hx = A.rect.left + fit.hx * A.scale;
      move.hy = A.rect.top + fit.hy * A.scale;
      move.rx = B.rect.left + fit.rx * B.scale + side * reach;
      move.ry = B.rect.top + (fit.ry + lift[hand]) * B.scale - side * reach * 0.55;
      const scale = (fit.scale * B.scale) / A.scale;
      move.kx = scale * Math.cos(fit.turn);
      move.ky = scale * Math.sin(fit.turn);
      const now = scale ** part;
      move.ex = now * Math.cos(fit.turn * part);
      move.ey = now * Math.sin(fit.turn * part);
      move.cx = move.hx + (move.rx - move.hx) * part;
      move.cy = move.hy + (move.ry - move.hy) * part;
    }
    // Sphere: turn around a tilted axis and breathe a little.
    const spin = still ? 0.6 : t * SPIN;
    const cosS = Math.cos(spin);
    const sinS = Math.sin(spin);
    const tilt = TILT + (BRAIN_TILT - TILT) * think;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const sphereR = SPHERE_R * (still ? 1 : 1 + 0.018 * Math.sin(t * 0.0011));
    // A smaller sphere packs its dots closer: dim them so it stays a ball of
    // light rather than a white disc (full strength from 124 CSS px radius).
    const sphereGlow = SPHERE_GLOW * Math.min(1, Math.max(0.35, ((SPHERE_R * C.scale) / 124) ** 1.3));
    // Where the sphere has sunk to, from its place over the palm (CSS px).
    const centre = sphereCentre(t);
    const shiftX = (width / 2 - C.rect.left - SPHERE_X * C.scale) * sink;
    const shiftY = (height / 2 - C.rect.top - SPHERE_Y * C.scale) * sink;
    // Rings around the sunk sphere, kept inside the screen.
    const radius = SPHERE_R * C.scale;
    const ringIn = RING_IN * radius;
    const ringOut = Math.max(ringIn * 1.6, Math.min(RING_OUT * radius, width * 0.47));
    const coreR = CORE_R * radius;
    const burst = Math.max(width, height) * 0.5;
    const portrait = width < height ? 2 : 1;
    const fit = Math.min((width * BRAIN_FILL[0] * portrait) / 2 / brainReach.side, (height * BRAIN_FILL[1]) / 2 / brainReach.up);
    brainGrow = 1 + (Math.max(1, Math.min(fit, width * 0.46 / brainReach.side) / radius) - 1) * think;
    const rock = still ? 0 : Math.sin(t * 0.00035) * BRAIN_ROCK;
    const cosB = Math.cos(rock);
    const sinB = Math.sin(rock);
    const orbitT = still ? 0 : t;

    for (let i = 0; i < points.length; i += STRIDE) {
      const hand = points[i + 11];
      // Dropped in every pose at this size: not drawn, so not moved either.
      if (points[i + 29] > keepMax && points[i + 30] === 0) continue;
      const lag = Math.min(1, points[i + 19] * dt);
      const m = part;
      points[i + 13] = m;
      const goal2 = easeInOut(clamp01((progress2 - FLOW_SPREAD * points[i + 18]) / (1 - FLOW_SPREAD)));
      let m2 = points[i + 24];
      m2 = still ? goal2 : m2 + (goal2 - m2) * lag;
      if (Math.abs(goal2 - m2) < 1e-4) m2 = goal2;
      points[i + 24] = m2;
      // Reason unravels the hand fingertips first; Act bursts it nearly at
      // once, the brain filling in from the sphere.
      const member = points[i + 30] === 1;
      const goal3 = easeInOut(clamp01((progress3 - FLOW_SPREAD * points[i + 18]) / (1 - FLOW_SPREAD)));
      let m3 = points[i + 35];
      m3 = still ? goal3 : m3 + (goal3 - m3) * lag;
      if (Math.abs(goal3 - m3) < 1e-4) m3 = goal3;
      points[i + 35] = m3;
      const spread4 = member ? 0.3 * points[i + 18] : 0.3 * points[i + 43];
      const goal4 = easeInOut(clamp01((progress4 - spread4) / 0.7));
      let m4 = points[i + 36];
      m4 = still ? goal4 : m4 + (goal4 - m4) * lag;
      if (Math.abs(goal4 - m4) < 1e-4) m4 = goal4;
      points[i + 36] = m4;
      const dot = points[i + 39] * 4;
      const core = points[i + 44] === 1;

      // Hero home, then reach home: the hand carries the point (move, grow,
      // turn), and the point eases from where that leaves it to its reach
      // home, so the pose changes without the hand coming apart.
      const hx = A.rect.left + points[i] * A.scale;
      const hy = A.rect.top + points[i + 1] * A.scale;
      let tx = hx;
      let ty = hy;
      if (m > 0) {
        const move = handMove[hand];
        const dx = hx - move.hx;
        const dy = hy - move.hy;
        const rx = B.rect.left + points[i + 2] * B.scale;
        const ry = B.rect.top + (points[i + 3] + lift[hand]) * B.scale;
        const poseX = rx + (hand === 0 ? reach : -reach) - (move.rx + move.kx * dx - move.ky * dy);
        const poseY = ry - (hand === 0 ? reach : -reach) * 0.55 - (move.ry + move.ky * dx + move.kx * dy);
        tx = move.cx + move.ex * dx - move.ey * dy + poseX * m;
        ty = move.cy + move.ey * dx + move.ex * dy + poseY * m;
      }

      // On to the hold pose, from wherever the first flight has got to.
      let ux2 = 0;
      let uy2 = 0;
      if (m2 > 0 || hand === 1) {
        if (hand === 0) {
          ux2 = points[i + 21];
          uy2 = points[i + 22];
        } else {
          // On the sphere, or (for Act) on its brain dot.
          const vx = points[i + 25];
          const vy = points[i + 26];
          const vz = points[i + 27];
          const x1 = vx * cosS + vz * sinS;
          const z1 = vz * cosS - vx * sinS;
          const y2 = vy * cosT - z1 * sinT;
          const z2 = vy * sinT + z1 * cosT;
          ux2 = SPHERE_X + x1 * sphereR;
          uy2 = SPHERE_Y + y2 * sphereR;
          // Front dots bright, back dots faint, so it reads as a solid ball.
          const depth = 0.3 + 0.7 * (Math.max(-1, Math.min(1, z2 / (1.2 * BRAIN_SCALE))) + 1) * 0.5;
          points[i + 28] = sphereGlow * depth;
          if (member && m4 > 0) {
            placeBrainDot(dot, cosB, sinB, cosT, sinT, sphereGlow);
            ux2 += (SPHERE_X + brainDot.x * sphereR - ux2) * m4;
            uy2 += (SPHERE_Y + brainDot.y * sphereR - uy2) * m4;
            points[i + 28] += (brainDot.glow - points[i + 28]) * m4;
          }
        }
      }
      if (m2 > 0) {
        const cx = C.rect.left + ux2 * C.scale + (hand === 1 ? shiftX : 0);
        const cy = C.rect.top + uy2 * C.scale + (hand === 1 ? shiftY : 0);
        const dx = cx - tx;
        const dy = cy - ty;
        const arc = Math.sin(Math.PI * m2);
        const bow = -points[i + 20] * arc;
        const fx = tx;
        const fy = ty;
        tx = fx + dx * m2 - dy * bow;
        ty = fy + dy * m2 + dx * bow;
        if (!still && arc > 0.001) {
          const phase = points[i + 8];
          tx += Math.sin(ty * 0.011 + t * 0.0011 + phase) * swirl * arc;
          ty += Math.cos(tx * 0.009 - t * 0.0009 + phase * 1.7) * swirl * arc;
        }
      }

      // Reason: off the palm into its ring, orbiting the sunk sphere. Act:
      // on into the brain, or outwards in the burst.
      if (m3 > 0 && !member) {
        const r = ringIn + points[i + 32] * (ringOut - ringIn);
        const angle = points[i + 33] + orbitT * points[i + 41];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let gx = centre.x + cos * r;
        let gy = centre.y + sin * r * RING_FLAT + points[i + 40] * ringOut;
        // The near half of the rings (the lower one) passes in front of the
        // sphere; the far half goes behind it.
        let seen = 0.72 + 0.28 * (sin + 1) * 0.5;
        if (sin < 0) {
          const d = Math.hypot(gx - centre.x, gy - centre.y) / radius;
          seen *= clamp01((d - 0.86) / 0.2);
        }
        points[i + 38] = seen;
        if (m4 > 0) {
          let bx;
          let by;
          if (dot >= 0) {
            placeBrainDot(dot, cosB, sinB, cosT, sinT, sphereGlow);
            bx = centre.x + brainDot.x * radius;
            by = centre.y + brainDot.y * radius;
            points[i + 28] = brainDot.glow;
          } else if (core) {
            // The small sphere turns like the big one did.
            const vx = points[i + 45];
            const vy = points[i + 46];
            const vz = points[i + 47];
            const x1 = vx * cosS + vz * sinS;
            const z1 = vz * cosS - vx * sinS;
            bx = centre.x + x1 * coreR;
            by = centre.y + (vy * cosT - z1 * sinT) * coreR;
            points[i + 28] = sphereGlow * (0.3 + 0.7 * ((vy * sinT + z1 * cosT) + 1) * 0.5);
          } else {
            const far = r + points[i + 37] * burst;
            bx = centre.x + cos * far;
            by = centre.y + (sin * RING_FLAT + points[i + 42]) * far * 0.6;
          }
          const held = dot >= 0 || core;
          const k = held ? m4 : 1 - (1 - m4) ** 2;
          const arc = Math.sin(Math.PI * m4);
          const bow = points[i + 20] * arc * (held ? 1 : 0.3);
          const dx = bx - gx;
          const dy = by - gy;
          gx += dx * k - dy * bow;
          gy += dy * k + dx * bow;
        }
        const dx = gx - tx;
        const dy = gy - ty;
        const arc = Math.sin(Math.PI * m3);
        const bow = points[i + 20] * arc;
        const fx = tx;
        const fy = ty;
        tx = fx + dx * m3 - dy * bow;
        ty = fy + dy * m3 + dx * bow;
        if (!still && arc > 0.001) {
          const phase = points[i + 8];
          tx += Math.sin(ty * 0.011 + t * 0.0011 + phase) * swirl * arc;
          ty += Math.cos(tx * 0.009 - t * 0.0009 + phase * 1.7) * swirl * arc;
        }
      }

      // Settled in a pose it is dark in (or dropped from at this size): it
      // only needs to be in place for when it sets off, so skip the rest.
      const pose = m3 > 0 ? -1 : m2 === 1 ? 2 : m === 1 && m2 === 0 ? 1 : m === 0 && m2 === 0 ? 0 : -1;
      const gone = !member && m4 === 1 && dot < 0 && !core;
      if (still || gone || (pose >= 0 && (points[i + 31] & (1 << pose) || (points[i + 29] > keep[pose] + 0.05 && points[i + 30] === 0)))) {
        points[i + 4] = tx;
        points[i + 5] = ty;
        points[i + 6] = 0;
        points[i + 7] = 0;
        continue;
      }

      const phase = points[i + 8];
      // Ripple keyed to the point's home, so it travels across the hand as
      // a soft wave; the orbit speed varies per point.
      let ux = points[i] + (points[i + 2] - points[i]) * m;
      let uy = points[i + 1] + (points[i + 3] - points[i + 1]) * m;
      ux += (ux2 - ux) * m2;
      uy += (uy2 - uy) * m2;
      const speed = 0.0005 + 0.0006 * ((phase * 7.3) % 1);
      // The sphere keeps its round shape: less ripple and orbit on it, and
      // it hovers over the palm.
      // The open palm keeps its even dot spacing: less orbit on it too.
      // The rings stay crisp lines: almost no ripple once a dot is in one,
      // and no float. In the brain the dots are as calm as on the sphere.
      let calm = 1 - (hand === 1 ? 0.7 : 0.4) * m2;
      let still3 = member ? 1 - sink : 1;
      if (!member) {
        calm *= 1 - 0.88 * m3;
        still3 = 1 - m3;
        if (dot >= 0 || core) calm += (0.3 - calm) * m4;
      }
      const swayX = (sway[hand] + (sway[0] * 0.5 - sway[hand]) * m2 * hand) * still3;
      const bobY = (bob[hand] + (hover - bob[hand]) * m2 * hand) * still3;
      tx += (Math.sin(uy * 0.012 + ux * 0.004 + t * 0.0009) * ripple + Math.cos(t * speed + phase) * orbit) * calm + swayX;
      ty += (Math.cos(ux * 0.01 - uy * 0.004 - t * 0.0008) * ripple + Math.sin(t * speed + phase) * orbit) * calm + bobY;

      if (gathering) {
        const g = clamp01((t - points[i + 17]) / GATHER_MS);
        if (g < 1) {
          // Fly from the start point to the drifting home on a bowed path.
          // Velocity stays 0 so the spring takes over without a jolt.
          const ge = easeInOut(g);
          const sx = points[i + 14];
          const sy = points[i + 15];
          const dx = tx - sx;
          const dy = ty - sy;
          const len = Math.hypot(dx, dy) || 1;
          const bow = points[i + 16] * len * Math.sin(Math.PI * ge);
          points[i + 4] = sx + dx * ge - (dy / len) * bow;
          points[i + 5] = sy + dy * ge + (dx / len) * bow;
          continue;
        }
      }

      // A scattered dot pulls home weakly and glides longer, so the cloud
      // drifts back slowly instead of snapping shut behind the cursor.
      const loose = points[i + 48];
      const pull = stiffness * (1 - 0.8 * loose);
      let vx = points[i + 6] + (tx - points[i + 4]) * pull;
      let vy = points[i + 7] + (ty - points[i + 5]) * pull;
      if (loose > 0) points[i + 48] = loose < 0.002 ? 0 : loose * Math.pow(0.985, dt);

      if (pointer.active) {
        const dx = points[i + 4] - px;
        const dy = points[i + 5] - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < pr * pr && d2 > 0.01) {
          // Each dot takes its own share of the push, slanted off the radius
          // and shimmering, so the cursor scatters them instead of punching
          // a clean hole.
          const d = Math.sqrt(d2);
          const f = 1 - d / pr;
          const phase = points[i + 8];
          // Most dots barely budge and a few fly far, so the cloud sprays
          // out like dust and the middle never empties into a ring.
          const lift = 0.5 + 0.5 * Math.sin(phase * 3.7);
          const share = 0.06 + 0.94 * lift * lift * lift;
          const push = f * (0.6 + f) * 3.4 * share * dt;
          const slant = Math.sin(phase) * 1.1;
          const ux = dx / d;
          const uy = dy / d;
          const jitter = f * 0.9 * dt;
          vx += (ux - uy * slant) * push + Math.sin(t * 0.004 + phase * 5) * jitter;
          vy += (uy + ux * slant) * push + Math.cos(t * 0.0037 + phase * 7) * jitter;
          points[i + 48] = Math.max(points[i + 48], Math.min(1, f * 1.6 * share + 0.2));
        }
      }

      const drag = loose > 0 ? Math.pow(0.86 + 0.07 * loose, dt) : damping;
      vx *= drag;
      vy *= drag;
      points[i + 4] += vx * dt;
      points[i + 5] += vy * dt;
      points[i + 6] = vx;
      points[i + 7] = vy;
    }
  }

  function splat(x, y, intensity) {
    // x, y in device px inside the canvas.
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const r = kernelRadius;
    const w = canvas.width;
    if (ix - r < 0 || iy - r < 0 || ix + r >= w || iy + r >= canvas.height) return;
    if (ix - r < boxLeft) boxLeft = ix - r;
    if (ix + r > boxRight) boxRight = ix + r;
    if (iy - r < boxTop) boxTop = iy - r;
    if (iy + r > boxBottom) boxBottom = iy + r;
    const k = kernels[(((y - iy) * 4) | 0) * 4 + (((x - ix) * 4) | 0)];
    const size = r * 2 + 1;
    let ki = 0;
    for (let row = iy - r; row <= iy + r; row++) {
      let a = ((row * w + ix - r) << 2) + 3;
      for (let col = 0; col < size; col++, ki++, a += 4) alpha[a] += k[ki] * intensity;
    }
  }

  function render(now) {
    if (!image) return;
    const t = now - start;
    const w = canvas.width;
    // Clear only the rows drawn last frame.
    if (prevBottom >= prevTop) pixels.fill(TINT, prevTop * w, (prevBottom + 1) * w);
    boxLeft = w;
    boxTop = canvas.height;
    boxRight = -1;
    boxBottom = -1;

    const still = reducedMotion.matches;
    const show = points && (started || still) && (visibleFrom || visibleTo || visibleHold);
    if (show) {
      const b = box();
      const core = sphereCentre(t);
      const originX = b.ox + (core.x - b.ox) * sink;
      const originY = b.oy + (core.y - b.oy) * sink;
      const boxW = b.w;
      const boxH = b.h;
      const pulsing = !still && t > INTRO_END;
      const pulse = pulsing ? ((t - INTRO_END) % PULSE_MS) / PULSE_MS : 0;
      const pulseRadius = pulse * boxW * 0.6;
      const pulseFade = 1 - pulse;
      // Over the brain the pulse is a faint wave, so it does not ring it.
      const pulseLift = 0.6 * (1 - 0.75 * think);
      const gathering = !still && t < INTRO_END;
      const fadeIn = still ? 1 : Math.min(1, t / 500);
      // Dots keep their size when the artwork shrinks, so dim them to keep
      // small screens from washing out.
      // Below full scale the dots also dim a little (thinning alone leaves
      // small hands too bright); the hold pose as approved, with the sphere.
      const dimA = Math.min(1, Math.max(0.6, A.scale / FULL_SCALE[0]));
      const dimB = Math.min(1, Math.max(0.6, B.scale / FULL_SCALE[1]));
      const density = Math.min(1, Math.max(0.55, C.scale * 2));
      const holdDim = Math.min(1, Math.max(0.6, C.scale / FULL_SCALE[2])) * density;

      for (let i = 0; i < points.length; i += STRIDE) {
        const rank = points[i + 29];
        if (rank > keepMax && points[i + 30] === 0) continue;
        const e = points[i + 13];
        const e2 = points[i + 24];
        const hero = points[i + 9] * dimA * clamp01((keep[0] - rank) * 12 + 0.5);
        let a = hero + (points[i + 10] * dimB * clamp01((keep[1] - rank) * 12 + 0.5) - hero) * e;
        const rankFade = clamp01((keep[2] - rank) * 12 + 0.5);
        if (e2 > 0) {
          const held = points[i + 11] === 0 ? points[i + 23] * holdDim * rankFade : points[i + 28] * points[i + 30] * density;
          a += (held - a) * e2;
        }
        if (points[i + 30] === 0) {
          const e3 = points[i + 35];
          const e4 = points[i + 36];
          if (e3 > 0) a += (points[i + 34] * points[i + 38] * density * rankFade - a) * e3;
          if (e4 > 0) {
            if (points[i + 39] >= 0 || points[i + 44] === 1) a += (points[i + 28] * density - a) * e4;
            else a *= (1 - e4) ** 1.5;
          }
        }
        if (a < 0.004) continue;
        a *= 0.9;
        if (!still) {
          a *= 0.82 + 0.18 * Math.sin(t * 0.002 + points[i + 8] * 3);
          if (pulsing) {
            const dx = points[i + 4] - originX;
            const dy = points[i + 5] - originY;
            const ring = Math.abs(Math.sqrt(dx * dx + dy * dy) - pulseRadius);
            if (ring < 40) a += (1 - ring / 40) * pulseLift * pulseFade;
          }
          // In flight a point is a faint speck; it brightens as it lands.
          if (gathering) a *= 0.4 + 0.6 * easeInOut(clamp01((t - points[i + 17]) / GATHER_MS));
        }
        splat(points[i + 4] * dpr, points[i + 5] * dpr, a * fadeIn);
      }

      const dustIn = (still ? 1 : clamp01((t - INTRO_END + 600) / 1200)) * (1 - think);
      const dustDim = Math.min(1, Math.max(0.55, b.scale * 2));
      for (const d of dust) splat((b.left + d.x * boxW) * dpr, (b.top + d.y * boxH) * dpr, d.alpha * dustIn * dustDim);
    }

    // Upload the union of last frame's box (to erase it) and this frame's.
    const upLeft = Math.min(prevLeft, boxLeft);
    const upTop = Math.min(prevTop, boxTop);
    const upRight = Math.max(prevRight, boxRight);
    const upBottom = Math.max(prevBottom, boxBottom);
    prevLeft = boxLeft;
    prevTop = boxTop;
    prevRight = boxRight;
    prevBottom = boxBottom;
    if (upBottom >= upTop && upRight >= upLeft) {
      ctx.putImageData(image, 0, 0, upLeft, upTop, upRight - upLeft + 1, upBottom - upTop + 1);
    }
    if (show) {
      drawSpark(t);
      drawCore(t);
    }
  }

  // Glow between the hero fingertips. As the hands part it travels to the
  // middle of the reach copy, widening, and fades as the copy opens out of
  // it (markFormed shows the copy once it is nearly there).
  function drawSpark(t) {
    const still = reducedMotion.matches;
    const intro = still ? 1 : clamp01((t - INTRO_END + 700) / 900);
    const fade = intro * (1 - clamp01((part - 0.8) / 0.2));
    if (fade === 0) return;
    const beat = still ? 0.6 : 0.55 + 0.45 * Math.sin(t * 0.0025) ** 2;
    // Same pace as the hands' centroids, so it stays between them.
    const go = part;
    const x = A.rect.left + A.ox * A.scale;
    const y = A.rect.top + A.oy * A.scale;
    const r = 46 * Math.max(A.scale * 2, 0.6) * (1 + 1.4 * go);
    drawGlow(x + (B.rect.left + copyAt.x - x) * go, y + (B.rect.top + copyAt.y - y) * go, r, beat * fade, 0.15);
  }

  // Light of the sphere once it has formed over the palm: a wide halo, like
  // an orb lighting the dark, and a brighter core inside the dots.
  function drawCore(t) {
    const still = reducedMotion.matches;
    const fade = clamp01((progress2 - 0.75) / 0.25);
    if (fade === 0) return;
    const beat = still ? 0.6 : 0.6 + 0.4 * Math.sin(t * 0.0016) ** 2;
    const { x, y } = sphereCentre(t);
    const r = SPHERE_R * C.scale;
    // In the brain the light shrinks with the small sphere at its centre and
    // its halo dims, so the folds around it stay dark and crisp.
    const size = 1 + (CORE_R - 1) * think;
    drawGlow(x, y, r * 2.4 * size, 0.34 * beat * fade * (1 - 0.35 * think), 0.34);
    drawGlow(x, y, r * 0.98 * size, 0.75 * beat * fade, 0.42);
  }

  // Additive radial glow at x, y (CSS px), radius r.
  function drawGlow(cssX, cssY, cssR, strength, mid) {
    const x = cssX * dpr;
    const y = cssY * dpr;
    const r = Math.round(cssR * dpr);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255,244,246,${0.85 * strength})`);
    glow.addColorStop(mid, `rgba(255,128,140,${0.45 * strength})`);
    glow.addColorStop(1, 'rgba(230,57,70,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
    // Widen the box so the next frame's upload erases the glow too.
    prevLeft = Math.max(0, Math.min(prevLeft, Math.floor(x - r)));
    prevTop = Math.max(0, Math.min(prevTop, Math.floor(y - r)));
    prevRight = Math.min(canvas.width - 1, Math.max(prevRight, Math.ceil(x + r)));
    prevBottom = Math.min(canvas.height - 1, Math.max(prevBottom, Math.ceil(y + r)));
  }

  // Each scene's copy shows once the particles have (nearly) reached its
  // pose, and hides again when they leave, with some hysteresis.
  function markFormed(t) {
    const introDone = reducedMotion.matches || (started && t > INTRO_END - 700);
    const next = introDone && (formed ? part > 0.6 && progress2 < 0.35 : part >= 0.85 && progress2 < 0.2);
    if (next !== formed) {
      formed = next;
      to.classList.toggle('is-formed', formed);
    }
    const nextHeld = introDone && (held ? progress2 > 0.6 : progress2 >= 0.8);
    if (nextHeld !== held) {
      held = nextHeld;
      hold.classList.toggle('is-formed', held);
    }
  }

  function tick(now, dt) {
    if (!image) return;
    measure();
    if (points) update(now - start, dt, reducedMotion.matches);
    render(now);
    markFormed(now - start);
  }

  function loop(now) {
    if (!running) return;
    const elapsed = now - last;
    const dt = Math.min(3, elapsed / 16.67 || 1);
    last = now;
    // Slow devices drop to 1x canvas resolution.
    if (maxDpr > 1 && now - start > 2500) {
      frameTimes.push(elapsed);
      if (frameTimes.length === 60) {
        const median = frameTimes.sort((a, b) => a - b)[30];
        if (median > 24) {
          maxDpr = 1;
          canvas.dataset.quality = 'low';
          resize();
        }
        frameTimes.length = 0;
      }
    }
    tick(now, dt);
    frame = requestAnimationFrame(loop);
  }

  function play() {
    const visible = visibleFrom || visibleTo || visibleHold;
    if (points && visible && !started) {
      started = true;
      start = performance.now();
      seedStarts();
    }
    const shouldRun = visible && started && !document.hidden && !reducedMotion.matches;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frame);
    }
    if (!running) tick(performance.now(), 1);
  }

  // Without animation the pose still follows the scroll position.
  let stillFrame = 0;
  window.addEventListener(
    'scroll',
    () => {
      if (running || stillFrame) return;
      stillFrame = requestAnimationFrame(() => {
        stillFrame = 0;
        tick(performance.now(), 1);
      });
    },
    { passive: true },
  );
  window.addEventListener(
    'pointermove',
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => (pointer.active = false));
  document.addEventListener('visibilitychange', play);
  reducedMotion.addEventListener('change', play);
  new ResizeObserver(resize).observe(canvas);
  // Generous margins: the hands travel past their boxes while moving.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === from) visibleFrom = entry.isIntersecting;
        else if (entry.target === to) visibleTo = entry.isIntersecting;
        else visibleHold = entry.isIntersecting;
      }
      play();
    },
    { rootMargin: '25% 0px' },
  );
  observer.observe(from);
  observer.observe(to);
  observer.observe(hold);

  resize();
  const load = (url) =>
    fetch(url).then((res) => {
      if (!res.ok) throw new Error(`points: HTTP ${res.status}`);
      return res.arrayBuffer();
    });
  Promise.all([load(canvas.dataset.particles), load(canvas.dataset.brain)])
    .then(([buffer, brainBuffer]) => {
      brain = decodeBrain(brainBuffer);
      points = decode(buffer);
      makeDust();
      canvas.classList.add('is-ready');
      play();
    })
    .catch((err) => console.error(err));
})();
