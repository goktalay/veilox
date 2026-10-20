// Hold scene: while its stage is pinned, scrolling steps the description
// through Learn, Reason and Act. The section is taller than the screen
// (styles.css) and each step takes an equal share of the pinned scroll.
(() => {
  'use strict';

  const detail = document.querySelector('[data-steps]');
  if (!detail) return;
  const section = detail.closest('section');
  const labels = [...detail.querySelectorAll('.hold__step')];
  const texts = [...detail.querySelectorAll('.hold__text')];
  const count = texts.length;
  let current = -1;
  let frame = 0;

  function show(step) {
    if (step === current) return;
    current = step;
    labels.forEach((el, i) => el.classList.toggle('is-active', i === step));
    texts.forEach((el, i) => el.classList.toggle('is-active', i === step));
    detail.style.setProperty('--step', count > 1 ? step / (count - 1) : 0);
    detail.dataset.step = String(step);
  }

  function update() {
    frame = 0;
    const rect = section.getBoundingClientRect();
    const range = rect.height - window.innerHeight;
    const t = range > 0 ? -rect.top / range : 0;
    show(Math.max(0, Math.min(count - 1, Math.floor(t * count))));
  }

  const schedule = () => frame || (frame = requestAnimationFrame(update));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
})();
