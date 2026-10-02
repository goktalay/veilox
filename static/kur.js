// Veilox kurulum sayfası: master, merkezden aldığı linkle firmasının BOŞ programını indirir.
import { createGlobe } from './globe.js';

const $ = document.getElementById('kur');
createGlobe(document.getElementById('globe'), { color: '111,182,255', size: 0.5, speed: 3, land: 0.5, grid: 0.14, back: 0.05 });

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  children.forEach(c => { if (c || c === 0) el.append(c instanceof Node ? c : String(c)); });
  return el;
}

const token = location.pathname.split('/kur/')[1] || '';
const MODE = { online: 'Bulut (online)', offline: 'Kendi sunucunuz (offline)', both: 'Esnek' };

async function render() {
  let info;
  try {
    const r = await fetch(`/api/kur/${encodeURIComponent(token)}`);
    info = await r.json();
    if (!r.ok) throw new Error(info?.detail || 'Bağlantı geçersiz');
  } catch (ex) {
    $.replaceChildren(h('div', { class: 'kur-wrap' }, h('div', { class: 'kur-box glass' },
      h('div', { class: 'brand' }, h('span', { class: 'mark' }), h('b', null, 'VEILOX')),
      h('h2', null, 'Bağlantı geçersiz'), h('p', { class: 'muted' }, ex.message))));
    return;
  }
  $.replaceChildren(h('div', { class: 'kur-wrap' }, h('div', { class: 'kur-box glass' },
    h('div', { class: 'brand' }, h('span', { class: 'mark' }), h('b', null, 'VEILOX')),
    h('h2', null, info.company),
    h('p', { class: 'muted' }, 'Fabrika Yönetim Sistemi — kurulum paketi (boş, verisiz).'),
    h('div', { class: 'kv' }, h('span', null, 'Kurulum türü'), h('b', null, MODE[info.mode] || info.mode)),
    h('div', { class: 'kv' }, h('span', null, 'Modül sayısı'), h('b', null, info.module_count)),
    h('a', { class: 'btn primary', href: `/api/kur/${encodeURIComponent(token)}/download`, download: '' }, '⬇ Kurulum paketini indir'),
    h('p', { class: 'muted small' }, 'Pakette Windows (run.bat) ve Linux (run.sh) başlatıcılar ile KUR.txt yer alır. İlk giriş bilgileriniz KUR.txt içindedir.'))));
}

render();
