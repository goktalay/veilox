// Veilox merkez paneli: giriş → Firmalar + Paketler yönetimi. Firma VERİLERİNE erişmez; yalnızca
// provisioning (firma oluştur / kur / askıya al / offline paket) ve paket vitrini yönetimi.
import { createGlobe } from './globe.js';

const $app = document.getElementById('app');
createGlobe(document.getElementById('globe'), { color: '111,182,255', size: 0.46, speed: 4, land: 0.55, grid: 0.16, back: 0.05 });

// ---------- küçük yardımcılar
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'width') el.style.width = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = c => { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : String(c)); };
  children.forEach(add);
  return el;
}
const clear = (el, ...c) => { el.replaceChildren(); c.flat(Infinity).forEach(x => x && el.append(x)); };

async function api(method, url, body) {
  const res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && url !== '/api/login') { renderLogin(); throw new Error('Oturum açılmamış'); }
  if (!res.ok) throw new Error(data?.detail || `İstek başarısız (${res.status})`);
  return data;
}

const nf = new Intl.NumberFormat('tr-TR');
const num = n => nf.format(n ?? 0);
const money = n => `${nf.format(n ?? 0)} ₺/ay`;
const dt = iso => (iso ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

let MODULES = [];
let PACKAGES = [];

const STATUS = {
  pending: ['Onay bekliyor', 'warn'], approved: ['Onaylandı', 'accent'], provisioning: ['Kuruluyor', 'sub'],
  active: ['Yayında', 'ok'], suspended: ['Askıda', 'muted'], offline: ['Offline', 'sub'], error: ['Hata', 'bad'],
};
const MODE = { online: 'Online', offline: 'Offline', both: 'Online + Offline' };

// ---------- bildirim / onay
function toast(msg, tone = '') {
  const t = h('div', { class: `toast ${tone}` }, msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4200);
}

function modal({ title, body, actions, onClose }) {
  const close = () => { wrap.remove(); onClose?.(); };
  const box = h('div', { class: 'modal glass' },
    h('div', { class: 'modal-head' }, h('h2', null, title), h('button', { class: 'x', onclick: close, 'aria-label': 'Kapat' }, '×')),
    h('div', { class: 'modal-body' }, body),
    actions ? h('div', { class: 'modal-foot' }, actions) : null);
  const wrap = h('div', { class: 'modal-wrap', onclick: e => { if (e.target === wrap) close(); } }, box);
  document.body.append(wrap);
  return { close, box };
}

const field = (label, control, hint) => h('label', { class: 'field' }, h('span', null, label), control, hint ? h('small', { class: 'muted' }, hint) : null);

// Modül seçici (gruplu kutucuklar)
function modulesPicker(selected) {
  const set = new Set(selected || []);
  const groups = {};
  MODULES.forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });
  const el = h('div', { class: 'mp' }, Object.entries(groups).map(([g, items]) => h('div', { class: 'mp-group' },
    h('h4', null, g),
    h('div', { class: 'mp-grid' }, items.map(m => {
      const cb = h('input', { type: 'checkbox', checked: set.has(m.key) });
      cb.addEventListener('change', () => { cb.checked ? set.add(m.key) : set.delete(m.key); });
      return h('label', { class: 'mp-item' }, cb, h('span', null, m.title));
    })))));
  el.getValue = () => MODULES.map(m => m.key).filter(k => set.has(k));
  el.setAll = on => { el.querySelectorAll('input').forEach(cb => { cb.checked = on; }); set.clear(); if (on) MODULES.forEach(m => set.add(m.key)); };
  return el;
}

// ---------- Giriş
function renderLogin(message) {
  const user = h('input', { class: 'input', type: 'email', autocomplete: 'username', required: true, placeholder: 'Kullanıcı adı' });
  const pass = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', required: true, placeholder: 'Şifre' });
  const err = h('div', { class: 'error', role: 'alert' }, message || '');
  const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Giriş');
  const form = h('form', { class: 'login glass' },
    h('div', { class: 'brand' }, h('span', { class: 'mark' }), h('b', null, 'HEPGO')),
    h('p', { class: 'muted center' }, 'Merkez paneli'),
    user, pass, err, btn);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    btn.disabled = true; err.textContent = '';
    try { await api('POST', '/api/login', { username: user.value, password: pass.value }); route(); }
    catch (ex) { err.textContent = ex.message; pass.value = ''; pass.focus(); }
    finally { btn.disabled = false; }
  });
  clear($app, h('div', { class: 'login-wrap' }, form));
  user.focus();
}

// ---------- Üst çubuk + sekmeler
function topbar(active) {
  const tab = (key, label) => h('a', { class: `tab ${active === key ? 'on' : ''}`, href: `#/${key}` }, label);
  return h('header', { class: 'topbar' },
    h('a', { class: 'brand small', href: '#/firmalar' }, h('span', { class: 'mark' }), h('b', null, 'HEPGO')),
    h('nav', { class: 'tabs' }, tab('firmalar', 'Firmalar'), tab('paketler', 'Paketler')),
    h('span', { class: 'grow' }),
    h('a', { class: 'btn ghost', href: '/', target: '_blank', rel: 'noopener' }, 'Tanıtım ↗'),
    h('button', { class: 'btn ghost', type: 'button', onclick: async () => { await api('POST', '/api/logout').catch(() => {}); renderLogin(); } }, 'Çıkış'));
}

// ---------- Firmalar
async function loadCommon() {
  if (!MODULES.length) MODULES = await api('GET', '/api/modules');
  PACKAGES = await api('GET', '/api/packages');
}

async function renderCompanies() {
  await loadCommon();
  const list = await api('GET', '/api/companies');
  const rows = list.map(companyRow);
  clear($app, topbar('firmalar'), h('main', { class: 'page' },
    h('div', { class: 'page-head' }, h('h1', { class: 'title' }, 'Firmalar'),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: () => companyForm() }, '+ Yeni firma')),
    h('p', { class: 'muted' }, `${list.length} firma`),
    h('div', { class: 'ctable glass' },
      h('div', { class: 'ct-head' }, h('span', null, 'Firma'), h('span', null, 'Paket / Mod'), h('span', null, 'Modül'),
        h('span', null, 'Ücret'), h('span', null, 'Durum'), h('span', null, 'Eylemler')),
      rows.length ? rows : h('div', { class: 'ct-empty muted' }, 'Henüz firma yok'))));
}

function companyRow(c) {
  const [label, tone] = STATUS[c.status] || [c.status, ''];
  const act = [];
  const refresh = () => renderCompanies();
  const run = (fn) => async () => { try { await fn(); } catch (ex) { toast(ex.message, 'bad'); } };
  if (c.status === 'pending') act.push(h('button', { class: 'btn sm', onclick: run(async () => { await api('POST', `/api/companies/${c.id}/approve`); toast('Onaylandı'); refresh(); }) }, 'Onayla'));
  if (['approved', 'pending', 'suspended', 'error'].includes(c.status) && c.mode !== 'offline')
    act.push(h('button', { class: 'btn sm primary', onclick: run(() => provision(c)) }, c.status === 'error' ? 'Tekrar kur' : 'Kur'));
  if (c.mode === 'offline' || c.status === 'active' || c.status === 'offline')
    act.push(h('a', { class: 'btn sm', href: `/api/companies/${c.id}/offline-package` }, 'Offline paket'));
  if (['approved', 'offline', 'active', 'pending'].includes(c.status))
    act.push(h('button', { class: 'btn sm', onclick: run(() => downloadLink(c)) }, 'Kurulum linki'));
  if (c.status === 'active') {
    const url = c.url || (c.port ? `http://${location.hostname}:${c.port}/app` : null);
    if (url) act.push(h('a', { class: 'btn sm', href: url, target: '_blank', rel: 'noopener' }, 'Aç ↗'));
    act.push(h('button', { class: 'btn sm', onclick: run(async () => { await api('POST', `/api/companies/${c.id}/suspend`); toast('Askıya alındı'); refresh(); }) }, 'Askıya al'));
  }
  act.push(h('button', { class: 'btn sm ghost', onclick: () => companyForm(c) }, 'Düzenle'));
  act.push(h('button', { class: 'btn sm ghost danger', onclick: run(async () => {
    if (!confirm(`${c.name} silinsin mi? (Sunucu verisi korunur, yalnızca merkez kaydı silinir)`)) return;
    await api('DELETE', `/api/companies/${c.id}`); toast('Silindi'); refresh();
  }) }, 'Sil'));
  return h('div', { class: 'ct-row' },
    h('div', { class: 'ct-firma' }, h('b', null, c.name), h('span', { class: 'muted small' }, c.master_username),
      c.self_registered ? h('span', { class: 'pill s-sub' }, 'Self-kayıt') : null,
      c.error ? h('span', { class: 'muted small', title: c.error, style: 'color:var(--bad)' }, '⚠ ' + c.error.slice(0, 60)) : null),
    h('div', null, h('div', null, pkgName(c.package_id)), h('span', { class: 'muted small' }, MODE[c.mode] || c.mode)),
    h('div', null, num((c.modules || []).length)),
    h('div', null, c.monthly_fee ? money(c.monthly_fee) : '—'),
    h('div', null, h('span', { class: `badge ${tone}` }, label)),
    h('div', { class: 'row-actions' }, act));
}

const pkgName = id => (PACKAGES.find(p => p.id === id)?.name) || '—';

async function provision(c) {
  const r = await api('POST', `/api/companies/${c.id}/provision`);
  renderCompanies();
  modal({ title: 'Firma kuruldu', body: h('div', { class: 'done' },
    h('p', null, h('b', null, c.name), ' yayına alındı.'),
    r.url ? h('div', { class: 'kv' }, h('span', null, 'Adres'), h('b', null, h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.url))) : null,
    h('div', { class: 'kv' }, h('span', null, 'Bağlantı'), h('b', null, r.socket ? 'Unix soket (port yok)' : ('Port ' + r.port))),
    h('div', { class: 'kv' }, h('span', null, 'Servis'), h('b', null, r.service)),
    r.cloudflare_error ? h('div', { class: 'kv' }, h('span', null, 'Cloudflare'), h('b', { style: 'color:var(--warn)' }, r.cloudflare_error)) : null,
    r.admin_password ? h('div', { class: 'secret' }, h('span', null, 'Master geçici şifre'), h('code', null, r.admin_password),
      h('p', { class: 'muted small' }, 'Bu şifre bir daha gösterilmez; master’a iletin. İlk girişte değiştirilmeli.')) : null),
    actions: h('button', { class: 'btn primary', onclick: e => e.target.closest('.modal-wrap').remove() }, 'Tamam') });
}

async function downloadLink(c) {
  const r = await api('POST', `/api/companies/${c.id}/download-link`);
  const full = location.origin + r.url;
  const input = h('input', { class: 'input', value: full, readonly: true });
  modal({ title: 'Kurulum linki', body: h('div', { class: 'cform' },
    h('p', { class: 'muted small' }, `${c.name} master’ı bu linkle programın boş halini kendisi indirebilir. Link 7 gün geçerlidir.`),
    input,
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn', onclick: () => { input.select(); navigator.clipboard?.writeText(full); toast('Link kopyalandı'); } }, 'Kopyala'),
      h('a', { class: 'btn', href: r.url, target: '_blank', rel: 'noopener' }, 'Aç ↗'))),
    actions: h('button', { class: 'btn primary', onclick: e => e.target.closest('.modal-wrap').remove() }, 'Tamam') });
}

function companyForm(c) {
  const edit = !!c;
  const name = h('input', { class: 'input', value: c?.name || '', placeholder: 'Firma adı' });
  const master = h('input', { class: 'input', type: 'email', value: c?.master_username || '', placeholder: 'master@firma.com' });
  const mname = h('input', { class: 'input', value: c?.master_name || '', placeholder: 'Master kullanıcı adı soyadı' });
  const url = h('input', { class: 'input', value: c?.url || '', placeholder: 'https://firma.app (opsiyonel)' });
  const pass = h('input', { class: 'input', type: 'text', placeholder: edit ? '(değiştirmek için doldurun)' : 'Boşsa otomatik üretilir' });
  const mode = h('select', { class: 'input' }, ['online', 'offline'].map(m => h('option', { value: m, selected: c?.mode === m }, MODE[m])));
  const pkgSel = h('select', { class: 'input' }, h('option', { value: '' }, '— Paket seç (opsiyonel) —'),
    PACKAGES.map(p => h('option', { value: p.slug, selected: pkgName(c?.package_id) === p.name }, `${p.name} · ${money(p.monthly_fee)}`)));
  const note = h('textarea', { class: 'input area', rows: 2, placeholder: 'Not (opsiyonel)' }, c?.note || '');
  let pickerRef = modulesPicker(c?.modules || []);
  const pickBox = h('div', null, pickerRef);
  pkgSel.addEventListener('change', () => {   // paket seçilince modüller o paketin modülleriyle dolar
    const p = PACKAGES.find(x => x.slug === pkgSel.value);
    pickerRef = modulesPicker(p ? p.modules : []);
    clear(pickBox, pickerRef);
  });
  const err = h('div', { class: 'error' });
  const save = h('button', { class: 'btn primary', type: 'submit' }, edit ? 'Kaydet' : 'Oluştur');
  const form = h('form', { class: 'cform' },
    field('Firma adı', name),
    field('Master e-posta', master, 'Bu kişi firmanın master (sahip) kullanıcısı olur'),
    field('Master ad soyad', mname),
    h('div', { class: 'two' }, field('Kurulum', mode), field('Paket', pkgSel)),
    field('Master şifresi', pass, 'Online kurulumda .env’e yazılır; boşsa güçlü şifre üretilir'),
    field('Adres (URL)', url),
    h('div', { class: 'field' }, h('span', null, 'Modüller'), pickBox),
    field('Not', note), err, h('div', { class: 'form-foot' }, save));
  const m = modal({ title: edit ? 'Firmayı düzenle' : 'Yeni firma', body: form });
  form.addEventListener('submit', async e => {
    e.preventDefault(); save.disabled = true; err.textContent = '';
    const payload = { name: name.value, master_username: master.value, master_name: mname.value, url: url.value,
      mode: mode.value, package_slug: pkgSel.value, modules: pickerRef.getValue(), password: pass.value, note: note.value };
    try {
      if (edit) await api('PUT', `/api/companies/${c.id}`, payload);
      else await api('POST', '/api/companies', payload);
      m.close(); toast(edit ? 'Güncellendi' : 'Firma oluşturuldu'); renderCompanies();
    } catch (ex) { err.textContent = ex.message; save.disabled = false; }
  });
  name.focus();
}

// ---------- Paketler
async function renderPackages() {
  await loadCommon();
  clear($app, topbar('paketler'), h('main', { class: 'page' },
    h('div', { class: 'page-head' }, h('h1', { class: 'title' }, 'Paketler'),
      h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: () => packageForm() }, '+ Yeni paket')),
    h('p', { class: 'muted' }, 'Tanıtım sayfasında görünen paketler ve aylık ücretleri'),
    h('div', { class: 'pkg-grid' }, PACKAGES.length ? PACKAGES.map(packageCard) : h('div', { class: 'muted' }, 'Paket yok'))));
}

function packageCard(p) {
  return h('section', { class: 'card glass pkg' },
    h('div', { class: 'pkg-top' }, h('h3', null, p.name), p.visible ? null : h('span', { class: 'badge muted' }, 'Gizli')),
    h('div', { class: 'pkg-price' }, money(p.monthly_fee)),
    h('p', { class: 'muted small' }, p.description || ''),
    h('div', { class: 'kv' }, h('span', null, 'Mod'), h('b', null, MODE[p.mode] || p.mode)),
    h('div', { class: 'kv' }, h('span', null, 'Modül'), h('b', null, `${p.modules.length} adet`)),
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn sm', onclick: () => packageForm(p) }, 'Düzenle'),
      h('button', { class: 'btn sm ghost danger', onclick: async () => { if (confirm(`${p.name} silinsin mi?`)) { await api('DELETE', `/api/packages/${p.id}`); toast('Silindi'); renderPackages(); } } }, 'Sil')));
}

function packageForm(p) {
  const edit = !!p;
  const name = h('input', { class: 'input', value: p?.name || '', placeholder: 'Paket adı' });
  const desc = h('textarea', { class: 'input area', rows: 2, placeholder: 'Tanıtım açıklaması' }, p?.description || '');
  const fee = h('input', { class: 'input', type: 'number', min: '0', step: '50', value: p?.monthly_fee ?? 0 });
  const mode = h('select', { class: 'input' }, ['online', 'offline', 'both'].map(m => h('option', { value: m, selected: p?.mode === m }, MODE[m])));
  const visible = h('input', { type: 'checkbox', checked: p ? !!p.visible : true });
  const sort = h('input', { class: 'input', type: 'number', value: p?.sort ?? 0 });
  const picker = modulesPicker(p?.modules || []);
  const err = h('div', { class: 'error' });
  const save = h('button', { class: 'btn primary', type: 'submit' }, edit ? 'Kaydet' : 'Oluştur');
  const form = h('form', { class: 'cform' },
    field('Paket adı', name), field('Açıklama', desc),
    h('div', { class: 'two' }, field('Aylık ücret (₺)', fee), field('Mod', mode)),
    h('div', { class: 'two' }, h('label', { class: 'field inline' }, visible, h('span', null, 'Tanıtımda görünür')), field('Sıra', sort)),
    h('div', { class: 'field' }, h('span', null, 'Modüller'), picker), err, h('div', { class: 'form-foot' }, save));
  const m = modal({ title: edit ? 'Paketi düzenle' : 'Yeni paket', body: form });
  form.addEventListener('submit', async e => {
    e.preventDefault(); save.disabled = true; err.textContent = '';
    const payload = { name: name.value, description: desc.value, monthly_fee: Number(fee.value) || 0,
      mode: mode.value, visible: visible.checked, sort: Number(sort.value) || 0, modules: picker.getValue() };
    try {
      if (edit) await api('PUT', `/api/packages/${p.id}`, payload);
      else await api('POST', '/api/packages', payload);
      m.close(); toast(edit ? 'Güncellendi' : 'Paket oluşturuldu'); renderPackages();
    } catch (ex) { err.textContent = ex.message; save.disabled = false; }
  });
  name.focus();
}

// ---------- Yönlendirme
async function route() {
  const tab = (location.hash.replace(/^#\//, '').split('/')[0]) || 'firmalar';
  try {
    if (tab === 'paketler') await renderPackages();
    else await renderCompanies();
    window.scrollTo(0, 0);
  } catch (ex) {
    if (ex.message !== 'Oturum açılmamış') clear($app, topbar('firmalar'), h('main', { class: 'page' }, h('div', { class: 'card glass' }, ex.message)));
  }
}
window.addEventListener('hashchange', route);

(async () => { try { await api('GET', '/api/me'); route(); } catch { /* giriş ekranı */ } })();
