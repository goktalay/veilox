// Scene snapping: a wheel gesture or a key press glides the page to the next
// resting point (the hero, the reach scene, then each step of the hold
// scene), so the screen always lands exactly on a scene. Resting points come
// from [data-snap]: a section's top, or for data-snap="n" n points spread
// over the scroll its pinned stage takes. Touch screens snap natively
// (styles.css); anything else that leaves the page between two points (the
// scrollbar, a link) settles to the nearest one when it stops.
(() => {
  'use strict';

  const sections = [...document.querySelectorAll('[data-snap]')];
  if (!sections.length) return;
  const touch = window.matchMedia('(hover: none) and (pointer: coarse)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // A wheel event this long after the previous one starts a new gesture.
  const GESTURE_GAP = 180;
  let animating = false;
  let animEnd = 0;
  let lastWheel = 0;
  let lastDelta = 0;
  let settleTimer = 0;

  function stops() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    const list = [];
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const count = parseInt(section.dataset.snap, 10) || 1;
      const range = Math.max(0, rect.height - window.innerHeight);
      for (let k = 0; k < count; k++) list.push(y + rect.top + (count > 1 ? (range * k) / (count - 1) : 0));
    }
    return [...new Set(list.map((v) => Math.round(Math.min(max, Math.max(0, v)))))].sort((a, b) => a - b);
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  function glide(target) {
    const from = window.scrollY;
    const distance = target - from;
    if (Math.abs(distance) < 2) return;
    if (reducedMotion.matches) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return;
    }
    const duration = Math.min(1250, Math.max(800, 500 + Math.abs(distance) * 0.45));
    const start = performance.now();
    animating = true;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo({ top: from + distance * ease(t), behavior: 'instant' });
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        animEnd = performance.now();
        // Let this frame's scroll events pass before settling resumes.
        requestAnimationFrame(() => (animating = false));
      }
    };
    requestAnimationFrame(step);
  }

  function go(direction) {
    const list = stops();
    const y = window.scrollY;
    const next = direction > 0 ? list.find((v) => v > y + 2) : [...list].reverse().find((v) => v < y - 2);
    if (next !== undefined) glide(next);
  }

  function settle() {
    if (animating || touch.matches) return;
    const y = window.scrollY;
    const nearest = stops().reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
    glide(nearest);
  }

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || touch.matches || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      if (document.querySelector('.nav--open')) return;
      event.preventDefault();
      if (!event.deltaY) return;
      const now = performance.now();
      const delta = Math.abs(event.deltaY);
      const gap = now - lastWheel;
      // A new gesture: a pause that did not end in a slowing trackpad
      // momentum (its deltas only ever shrink), a long pause, or a fresh
      // push once the last glide is over.
      const fresh =
        (gap > GESTURE_GAP && delta >= lastDelta) ||
        gap > 600 ||
        (now - animEnd > 250 && delta >= 40 && delta > lastDelta * 1.2);
      lastWheel = now;
      lastDelta = delta;
      if (!animating && fresh) go(Math.sign(event.deltaY));
    },
    { passive: false },
  );

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target.closest && target.closest('input, textarea, select, [contenteditable]')) return;
    const space = event.key === ' ';
    if (space && target.closest && target.closest('a, button, [role="button"]')) return;
    let direction = 0;
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || (space && !event.shiftKey)) direction = 1;
    else if (event.key === 'ArrowUp' || event.key === 'PageUp' || (space && event.shiftKey)) direction = -1;
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const list = stops();
      glide(event.key === 'Home' ? list[0] : list[list.length - 1]);
      return;
    }
    if (!direction) return;
    event.preventDefault();
    if (!animating) go(direction);
  });

  // The hero's "Scroll down" cue glides to the next scene like a wheel step;
  // touch screens follow the link and snap natively.
  document.addEventListener('click', (event) => {
    if (touch.matches || !event.target.closest || !event.target.closest('[data-snap-next]')) return;
    event.preventDefault();
    if (!animating) go(1);
  });

  // Scrolling that did not come from a glide settles once it stops.
  const queueSettle = () => {
    if (animating) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 'onscrollend' in window ? 60 : 200);
  };
  if ('onscrollend' in window) window.addEventListener('scrollend', queueSettle);
  else window.addEventListener('scroll', queueSettle, { passive: true });
})();
