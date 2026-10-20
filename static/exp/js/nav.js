// Navbar: dropdown menus, the mobile menu and the active-link highlight.
(() => {
  'use strict';

  const nav = document.querySelector('.nav');
  if (!nav) return;
  const burger = nav.querySelector('.nav__burger');
  const dropdowns = [...nav.querySelectorAll('[aria-haspopup="true"]')];
  const toggles = [...dropdowns, burger];

  function setOpen(toggle, open) {
    toggle.setAttribute('aria-expanded', String(open));
    if (toggle === burger) nav.classList.toggle('nav--open', open);
  }

  function close() {
    for (const toggle of toggles) setOpen(toggle, false);
  }

  for (const toggle of dropdowns) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      for (const other of dropdowns) setOpen(other, false);
      setOpen(toggle, open);
    });
  }

  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    close();
    setOpen(burger, open);
  });

  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = toggles.find((t) => t.getAttribute('aria-expanded') === 'true');
    close();
    open?.focus();
  });

  for (const link of nav.querySelectorAll('.nav__link[href^="#"]')) {
    link.addEventListener('click', () => {
      nav.querySelector('.nav__link[aria-current]')?.removeAttribute('aria-current');
      link.setAttribute('aria-current', 'page');
      close();
    });
  }

  // Language choice: mark the selection and show its short code on the button.
  const langToggle = nav.querySelector('.nav__lang-toggle');
  const langLabel = nav.querySelector('.nav__lang-label');
  for (const option of nav.querySelectorAll('[data-lang]')) {
    option.addEventListener('click', () => {
      nav.querySelector('[data-lang][aria-checked="true"]')?.setAttribute('aria-checked', 'false');
      option.setAttribute('aria-checked', 'true');
      langLabel.textContent = option.dataset.lang.toUpperCase();
      langToggle.setAttribute('aria-label', `Language: ${option.textContent.trim()}`);
      close();
    });
  }
})();
