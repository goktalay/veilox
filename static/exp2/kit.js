// Mastertool site kiti (mastertool.download, sshmasters.com, ftpmasters.com, hepgo.com — dosya her sitede birebir aynı):
// 1) arka planda yavaşça dönen soft vektör dünya (kara noktaları: Natural Earth 110m, kamu malı), 2) gece/gündüz teması,
// 3) 8 dil (tr, en, fr, de, es, ar [sağdan sola], zh, ru). Yükleme: <script src=".../kit.js" data-site="sm" data-i18n="/i18n" defer>.
// Çeviri: sayfadaki metin birimleri (yalnız satır içi öğeler içeren bloklar) ve title/alt/placeholder/aria-label öznitelikleri, Türkçe
// kaynak metin anahtar olarak /i18n/<site>.<dil>.json sözlüğünden çevrilir; Türkçe kaynak sayfanın kendisidir. Uygulama kodu için
// window.mtKit.t('Metin {x}', {x}) — sözlük data-dicts ile ek yüklenir. Hareket prefers-reduced-motion'da durur; betik yüklenmezse
// sayfa Türkçe ve koyu/açık varsayılanıyla aynen çalışır.
(() => {
  'use strict';
  const me = document.currentScript;
  const SITE = me?.dataset.site || 'sm';
  const BASE = (me?.dataset.i18n || '/i18n').replace(/\/$/, '');
  const DICTS = [SITE, ...((me?.dataset.dicts || '').split(',').map(s => s.trim()).filter(Boolean))];
  const LANGS = [['tr', 'Türkçe'], ['en', 'English'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'], ['ar', 'العربية'], ['zh', '中文'], ['ru', 'Русский']];
  const CODES = LANGS.map(l => l[0]);
  const SITES = ['mastertool.download', 'sshmasters.com', 'ftpmasters.com', 'sqlmaster.app', 'notepadmaster.com', 'convertmaster.app', 'hepgo.com'];
  const root = document.documentElement;
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* özel kip */ } } };
  const qs = new URLSearchParams(location.search);

  // ---------- tema ----------
  const mq = matchMedia('(prefers-color-scheme: dark)');
  let themePref = qs.get('theme') || store.get('mt-theme') || 'auto';
  if (!['auto', 'light', 'dark'].includes(themePref)) themePref = 'auto';
  const resolved = () => (themePref === 'auto' ? (mq.matches ? 'dark' : 'light') : themePref);
  const applyTheme = () => { root.dataset.theme = resolved(); root.style.colorScheme = resolved(); dispatchEvent(new Event('mt-theme')); };
  applyTheme();
  mq.addEventListener?.('change', () => themePref === 'auto' && applyTheme());

  // ---------- dil ----------
  const pick = () => {
    const q = qs.get('lang'); if (CODES.includes(q)) return q;
    const s = store.get('mt-lang'); if (CODES.includes(s)) return s;
    for (const l of navigator.languages || [navigator.language || '']) { const c = (l || '').slice(0, 2).toLowerCase(); if (CODES.includes(c)) return c; }
    return 'en';
  };
  let lang = pick();
  if (qs.has('lang') || qs.has('theme')) {   // site geçişinde taşınan tercihler kaydedilir, adres temizlenir
    if (qs.has('lang') && CODES.includes(qs.get('lang'))) store.set('mt-lang', qs.get('lang'));
    if (qs.has('theme')) store.set('mt-theme', themePref);
    qs.delete('lang'); qs.delete('theme');
    history.replaceState(history.state, '', location.pathname + (qs.toString() ? `?${qs}` : '') + location.hash);
  }
  const setDir = () => { root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr'; };
  setDir();

  let dict = {};
  const cache = {};
  const norm = s => s.replace(/\s+/g, ' ').trim();
  // Sayfa betikleri başlıkları animasyon için kelimelere bölebilir (<span class="w">kelime</span>); anahtar bölünmemiş metindir,
  // çeviri aynı biçimde yeniden bölünür (animasyonsuz, görünür).
  const W_RE = /<span class="w" aria-hidden="true"(?: style="[^"]*")?>([^<]*)<\/span>/g;   // GSAP satır içi stil ekleyebilir
  const unitKey = h => norm(h.replace(W_RE, '$1'));
  const isSplit = h => h.includes('<span class="w" aria-hidden="true"');
  const resplit = h => h.split(/<br\s*\/?>/i).map(l => l.trim().split(/\s+/).filter(Boolean)
    .map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ')).join('<br>');
  async function load(l) {
    if (l === 'tr') return {};
    if (cache[l]) return cache[l];
    const parts = await Promise.all(DICTS.map(d => fetch(`${BASE}/${d}.${l}.json`, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).catch(() => ({}))));
    return (cache[l] = Object.assign({}, ...parts));
  }
  function t(s, vars) {
    let out = (lang !== 'tr' && dict[s]) || s;
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return out;
  }

  // metin birimleri: doğrudan metin taşıyan ve yalnız satır içi öğeler içeren en dış öğe; diğerlerinde tek tek metin düğümleri
  const INLINE = new Set(['A', 'B', 'STRONG', 'EM', 'I', 'KBD', 'CODE', 'SPAN', 'BR', 'SMALL', 'SUP', 'SUB', 'U', 'MARK', 'ABBR', 'TIME', 'S', 'Q']);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'SVG', 'CANVAS', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'NOSCRIPT', 'TEMPLATE', 'PRE', 'IFRAME', 'svg']);
  const ATTRS = ['title', 'alt', 'placeholder', 'aria-label'];
  const orig = new WeakMap();       // öğe/metin düğümü → Türkçe kaynak
  const origAttr = new WeakMap();   // öğe → {öznitelik: kaynak}
  const hasText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
  const allInline = el => [...el.querySelectorAll('*')].every(c => INLINE.has(c.tagName));
  const skip = el => SKIP.has(el.tagName) || el.hasAttribute('data-noi18n') || el.getAttribute('translate') === 'no';
  function walk(el, units, texts) {
    if (skip(el)) return;
    if ((hasText(el) || el.querySelector(':scope > span.w')) && allInline(el)) { units.push(el); return; }
    for (const n of el.childNodes) {
      if (n.nodeType === 1) walk(n, units, texts);
      else if (n.nodeType === 3 && n.nodeValue.trim()) texts.push(n);
    }
  }
  function attrEls(scope) {
    return [...scope.querySelectorAll(ATTRS.map(a => `[${a}]`).join(','))].filter(e => !e.closest('[data-noi18n],[translate=no]'));
  }
  function collect(scope = document.body) {   // çeviri anahtarları (çıkarma aracı da bunu kullanır)
    const units = [], texts = [], keys = new Set();
    walk(scope, units, texts);
    units.forEach(e => keys.add(unitKey(orig.get(e) ?? e.innerHTML)));
    texts.forEach(n => keys.add(norm(orig.get(n) ?? n.nodeValue)));
    attrEls(scope).forEach(e => ATTRS.forEach(a => e.hasAttribute(a) && e.getAttribute(a).trim() && keys.add(norm(origAttr.get(e)?.[a] ?? e.getAttribute(a)))));
    const meta = document.querySelectorAll('meta[name=description],meta[property="og:title"],meta[property="og:description"]');
    meta.forEach(m => keys.add(norm(origAttr.get(m)?.content ?? m.content)));
    keys.add(norm(origAttr.get(document)?.title ?? document.title));
    keys.delete('');
    return [...keys];
  }
  function translate(scope = document.body) {
    const units = [], texts = [];
    walk(scope, units, texts);
    for (const e of units) {
      if (!orig.has(e)) orig.set(e, e.innerHTML);
      const k = unitKey(orig.get(e));
      let v = lang === 'tr' ? orig.get(e) : dict[k];
      if (v != null && lang !== 'tr' && isSplit(orig.get(e))) v = resplit(v);
      if (v != null && e.innerHTML !== v) e.innerHTML = v;
      else if (v == null && lang !== 'tr' && e.innerHTML !== orig.get(e)) e.innerHTML = orig.get(e);
    }
    for (const n of texts) {
      if (!orig.has(n)) orig.set(n, n.nodeValue);
      const src = orig.get(n), k = norm(src);
      const v = lang === 'tr' ? src : dict[k] != null ? src.replace(k, dict[k]) : src;
      if (n.nodeValue !== v) n.nodeValue = v;
    }
    const doAttr = (e, a, get, set) => {
      const o = origAttr.get(e) || {}; if (!(a in o)) { o[a] = get(); origAttr.set(e, o); }
      const k = norm(o[a]); set(lang === 'tr' ? o[a] : (dict[k] ?? o[a]));
    };
    attrEls(scope).forEach(e => ATTRS.forEach(a => e.hasAttribute(a) && doAttr(e, a, () => e.getAttribute(a), v => e.setAttribute(a, v))));
    if (scope === document.body) {
      document.querySelectorAll('meta[name=description],meta[property="og:title"],meta[property="og:description"]')
        .forEach(m => doAttr(m, 'content', () => m.content, v => { m.content = v; }));
      doAttr(document, 'title', () => document.title, v => { document.title = v; });
    }
  }
  let observing = false;
  const mo = new MutationObserver(recs => {
    if (observing) return;
    observing = true;
    try { for (const r of recs) r.addedNodes.forEach(n => { if (n.nodeType === 1 && !n.closest?.('[data-noi18n]')) translate(n); }); } finally { observing = false; }
  });
  async function setLang(l, save = true) {
    if (!CODES.includes(l)) return;
    lang = l; if (save) store.set('mt-lang', l);
    dict = await load(l);
    setDir();
    observing = true;
    try { translate(); } finally { observing = false; }
    shotLang();
    syncControls();
    dispatchEvent(new CustomEvent('mt-lang', { detail: l }));
  }

  // ---------- denetimler (dil seçici + tema düğmesi) ----------
  const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const ICON_GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
  let ctl;
  function controls() {
    ctl = document.createElement('div');
    ctl.className = 'mtk-ctl'; ctl.setAttribute('data-noi18n', '');
    ctl.innerHTML = `<label class="mtk-lang" title="Language">${ICON_GLOBE}<span class="mtk-cur"><span class="n"></span><span class="c"></span></span><select aria-label="Language">${LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></label>
      <button type="button" class="mtk-theme"></button>`;
    ctl.querySelector('select').onchange = e => setLang(e.target.value);
    ctl.querySelector('.mtk-theme').onclick = () => {
      themePref = resolved() === 'dark' ? 'light' : 'dark'; store.set('mt-theme', themePref); applyTheme(); syncControls();
    };
    const slot = document.querySelector('[data-kit-controls]');
    if (slot) slot.append(ctl); else { ctl.classList.add('mtk-float'); document.body.append(ctl); }
    syncControls();
  }
  function syncControls() {
    if (!ctl) return;
    ctl.querySelector('select').value = lang;
    ctl.querySelector('.mtk-cur .n').textContent = LANGS.find(l => l[0] === lang)[1];
    ctl.querySelector('.mtk-cur .c').textContent = lang.toUpperCase();
    const b = ctl.querySelector('.mtk-theme'), dark = resolved() === 'dark';
    b.innerHTML = dark ? ICON_SUN : ICON_MOON;
    const lbl = { tr: ['Gündüz moduna geç', 'Gece moduna geç'], en: ['Switch to light mode', 'Switch to dark mode'], fr: ['Passer en mode clair', 'Passer en mode sombre'],
      de: ['Zum hellen Modus wechseln', 'Zum dunklen Modus wechseln'], es: ['Cambiar a modo claro', 'Cambiar a modo oscuro'], ar: ['التبديل إلى الوضع الفاتح', 'التبديل إلى الوضع الداكن'],
      zh: ['切换到浅色模式', '切换到深色模式'], ru: ['Светлая тема', 'Тёмная тема'] }[lang];
    b.title = b.ariaLabel = dark ? lbl[0] : lbl[1];
  }

  // Mastertool düğmesi: uygulama sitelerinde sağ üst köşede, animasyonlu; tıklanınca mastertool.download yeni pencerede açılır
  const MT_MARK = '<svg class="mtk-mt-ic" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="mtkg" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>'
    + '<rect x="2" y="2" width="28" height="28" rx="8" fill="url(#mtkg)"/><path d="M8.5 22.5V10l7.5 7.5 7.5-7.5v12.5" fill="none" '
    + 'stroke="#06101c" stroke-opacity=".28" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path class="mtk-mt-m" d="M8.5 22.5V10l7.5 7.5 7.5-7.5v12.5" fill="none" '
    + 'stroke="#06101c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="100"/></svg>';
  function mtButton() {
    const slot = document.querySelector('[data-mt-button]');
    if (!slot) return;
    const a = document.createElement('a');
    a.className = 'mtk-mt'; a.href = 'https://mastertool.download/'; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('data-noi18n', ''); a.title = 'Mastertool — SSH Master · FTP Masters · SQL Master · Notepad Master · Convert Master';
    a.innerHTML = `<span class="mtk-mt-in">${MT_MARK}<span class="mtk-mt-tx">Mastertool</span><svg class="mtk-mt-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    slot.replaceWith(a);
  }

  // siteler arası geçişte dil ve tema taşınır
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href]'); if (!a) return;
    let u; try { u = new URL(a.href, location.href); } catch { return; }
    if (u.host === location.host || !SITES.some(s => u.hostname === s || u.hostname.endsWith(`.${s}`))) return;
    u.searchParams.set('lang', lang); if (themePref !== 'auto') u.searchParams.set('theme', themePref);
    a.href = u.toString();
  }, true);

  // ---------- dönen dünya ----------
  const PTS = '-166,-306,-166,-270,-166,-234,-166,-198,-166,-162,-166,-126,-166,-90,-166,-54,-166,-18,-166,18,-166,54,-166,90,-166,126,-166,162,-166,198,-166,234,-166,270,-166,306,-161,-291,-161,-263,-161,-235,-161,-208,-161,-180,-161,-152,-161,-125,-161,-97,-161,-42,-161,-14,-161,14,-161,42,-161,69,-161,97,-161,125,-161,152,-161,180,-161,208,-161,235,-161,263,-161,291,-161,318,-157,-305,-157,-284,-157,-262,-157,-240,-157,-218,-157,-196,-157,-175,-157,-65,-157,-44,-157,-22,-157,0,-157,22,-157,44,-157,65,-157,87,-157,109,-157,131,-157,153,-157,175,-157,196,-157,218,-157,240,-157,262,-157,284,-157,305,-157,327,-153,-277,-153,-258,-153,-240,-153,-222,-153,-203,-153,-185,-153,-166,-153,-148,-153,-37,-153,-18,-153,0,-153,18,-153,37,-153,55,-153,74,-153,92,-153,111,-153,129,-153,148,-153,166,-153,185,-153,203,-153,222,-153,240,-153,258,-153,277,-153,295,-153,314,-148,-192,-148,-176,-148,-160,-148,-144,-148,-128,-148,-16,-148,0,-148,16,-148,32,-148,48,-148,64,-148,80,-148,96,-148,112,-148,128,-148,144,-148,160,-148,176,-148,192,-148,208,-148,224,-148,240,-148,256,-148,272,-148,288,-148,304,-148,320,-144,-141,-144,-127,-144,-14,-144,0,-144,14,-144,28,-144,42,-144,56,-144,71,-144,85,-144,99,-144,113,-144,127,-144,155,-144,169,-144,184,-144,198,-144,212,-144,226,-144,240,-144,254,-144,268,-144,282,-144,296,-144,311,-144,325,-144,339,-139,-139,-139,-126,-139,63,-139,76,-139,88,-139,101,-139,114,-139,126,-139,139,-139,164,-139,177,-139,189,-139,202,-139,215,-139,227,-139,240,-139,253,-139,265,-139,278,-139,291,-139,303,-139,316,-135,103,-135,114,-135,171,-135,183,-135,194,-135,206,-135,217,-135,229,-135,240,-135,251,-135,263,-135,274,-135,286,-109,-144,-109,-136,-104,-150,-104,-143,-104,-121,-100,-151,-100,-144,-100,-137,-95,-147,-95,-141,-95,-134,-91,-144,-91,-138,-91,338,-87,-145,-87,-139,-87,-133,-87,345,-82,-146,-82,-140,-82,-135,-82,345,-82,351,-78,-142,-78,-136,-78,-130,-78,-125,-78,351,-73,-143,-73,-137,-73,-132,-73,-126,-73,-121,-73,-115,-73,280,-73,286,-73,291,-73,297,-69,-144,-69,-139,-69,-133,-69,-128,-69,-123,-69,-117,-69,-112,-69,235,-69,272,-69,277,-69,283,-69,288,-69,293,-69,299,-65,-138,-65,-133,-65,-128,-65,-123,-65,-117,-65,-112,-65,-107,-65,39,-65,44,-65,50,-65,55,-65,232,-65,237,-65,243,-65,248,-65,269,-65,274,-65,279,-65,284,-65,290,-65,295,-65,300,-60,-139,-60,-134,-60,-129,-60,-124,-60,-119,-60,-114,-60,-109,-60,-104,-60,38,-60,43,-60,48,-60,53,-60,58,-60,231,-60,236,-60,241,-60,246,-60,251,-60,256,-60,261,-60,266,-60,271,-60,276,-60,281,-60,286,-60,292,-60,297,-60,302,-56,-139,-56,-134,-56,-129,-56,-124,-56,-119,-56,-114,-56,-109,-56,-104,-56,-99,-56,35,-56,40,-56,45,-56,50,-56,55,-56,60,-56,65,-56,228,-56,233,-56,238,-56,243,-56,248,-56,253,-56,258,-56,263,-56,268,-56,273,-56,278,-56,283,-56,288,-56,293,-56,298,-56,303,-51,-137,-51,-132,-51,-127,-51,-122,-51,-118,-51,-113,-51,-108,-51,-103,-51,-98,-51,34,-51,39,-51,44,-51,49,-51,54,-51,59,-51,64,-51,230,-51,235,-51,240,-51,245,-51,250,-51,255,-51,260,-51,264,-51,269,-51,274,-51,279,-51,284,-51,289,-51,294,-51,299,-51,304,-47,-137,-47,-132,-47,-127,-47,-122,-47,-118,-47,-113,-47,-108,-47,-103,-47,-98,-47,-94,-47,31,-47,36,-47,41,-47,46,-47,50,-47,55,-47,60,-47,65,-47,70,-47,89,-47,94,-47,228,-47,233,-47,238,-47,242,-47,247,-47,252,-47,257,-47,262,-47,266,-47,271,-47,276,-47,281,-47,286,-47,290,-47,295,-47,300,-43,-140,-43,-135,-43,-130,-43,-126,-43,-121,-43,-116,-43,-111,-43,-107,-43,-102,-43,-97,-43,-92,-43,-88,-43,-83,-43,31,-43,36,-43,40,-43,45,-43,50,-43,54,-43,59,-43,64,-43,69,-43,88,-43,92,-43,234,-43,239,-43,244,-43,249,-43,253,-43,258,-43,263,-43,268,-43,272,-43,277,-43,282,-43,287,-43,291,-43,296,-38,-139,-38,-135,-38,-130,-38,-125,-38,-121,-38,-116,-38,-111,-38,-107,-38,-102,-38,-98,-38,-93,-38,-88,-38,-84,-38,28,-38,33,-38,37,-38,42,-38,46,-38,51,-38,56,-38,60,-38,65,-38,70,-38,93,-38,98,-38,246,-38,251,-38,255,-38,260,-38,265,-38,269,-38,274,-38,279,-38,283,-38,288,-38,293,-34,-142,-34,-138,-34,-133,-34,-128,-34,-124,-34,-119,-34,-115,-34,-110,-34,-105,-34,-101,-34,-96,-34,-92,-34,-87,-34,-83,-34,28,-34,32,-34,37,-34,41,-34,46,-34,50,-34,55,-34,60,-34,64,-34,69,-34,73,-34,78,-34,92,-34,96,-34,248,-34,252,-34,257,-34,261,-34,266,-34,271,-34,275,-34,284,-34,289,-34,358,-29,-148,-29,-144,-29,-139,-29,-134,-29,-130,-29,-125,-29,-121,-29,-116,-29,-112,-29,-107,-29,-103,-29,-98,-29,-93,-29,-89,-29,-84,-29,-80,-29,25,-29,30,-29,34,-29,39,-29,43,-29,48,-29,52,-29,57,-29,62,-29,66,-29,71,-29,75,-29,80,-29,98,-29,253,-29,262,-29,267,-29,285,-29,289,-25,-151,-25,-146,-25,-142,-25,-137,-25,-133,-25,-128,-25,-124,-25,-119,-25,-115,-25,-110,-25,-106,-25,-101,-25,-97,-25,-92,-25,-88,-25,-83,-25,-79,-25,29,-25,34,-25,38,-25,43,-25,47,-25,52,-25,56,-25,61,-25,65,-25,70,-25,74,-25,79,-25,263,-25,268,-25,272,-25,286,-21,-152,-21,-148,-21,-143,-21,-139,-21,-134,-21,-130,-21,-125,-21,-121,-21,-116,-21,-112,-21,-107,-21,-103,-21,-98,-21,-94,-21,-89,-21,-85,-21,-80,-21,-76,-21,27,-21,31,-21,36,-21,40,-21,45,-21,49,-21,54,-21,58,-21,63,-21,67,-21,72,-21,76,-21,80,-21,300,-16,-158,-16,-153,-16,-149,-16,-144,-16,-140,-16,-136,-16,-131,-16,-127,-16,-122,-16,-118,-16,-113,-16,-109,-16,-104,-16,-100,-16,-96,-16,-91,-16,-87,-16,-82,-16,-78,-16,-73,-16,29,-16,33,-16,38,-16,42,-16,47,-16,51,-16,56,-16,60,-16,64,-16,69,-16,73,-16,78,-16,224,-16,229,-16,278,-16,282,-16,287,-16,296,-12,-159,-12,-155,-12,-150,-12,-146,-12,-141,-12,-137,-12,-133,-12,-128,-12,-124,-12,-119,-12,-115,-12,-110,-12,-106,-12,-102,-12,-97,-12,-93,-12,-88,-12,-84,-12,-80,-12,-75,-12,-71,-12,27,-12,31,-12,35,-12,40,-12,44,-12,49,-12,53,-12,57,-12,62,-12,66,-12,71,-12,75,-12,269,-12,278,-12,283,-12,287,-12,292,-12,300,-7,-159,-7,-155,-7,-150,-7,-146,-7,-141,-7,-137,-7,-133,-7,-128,-7,-124,-7,-119,-7,-115,-7,-110,-7,-106,-7,-102,-7,-97,-7,-93,-7,-88,-7,-84,-7,-80,-7,22,-7,27,-7,31,-7,35,-7,40,-7,44,-7,49,-7,53,-7,57,-7,62,-7,66,-7,71,-7,75,-7,80,-7,208,-7,230,-7,243,-7,269,-7,274,-7,278,-7,283,-7,287,-7,305,-3,-160,-3,-156,-3,-151,-3,-147,-3,-143,-3,-138,-3,-134,-3,-130,-3,-125,-3,-121,-3,-116,-3,-112,-3,-108,-3,-103,-3,-99,-3,-94,-3,20,-3,24,-3,29,-3,33,-3,37,-3,42,-3,46,-3,50,-3,55,-3,59,-3,64,-3,68,-3,72,-3,77,-3,81,-3,204,-3,209,-3,222,-3,226,-3,230,-3,239,-3,244,-3,266,1,-156,1,-151,1,-147,1,-143,1,-138,1,-134,1,-130,1,-125,1,-121,1,-116,1,-112,1,-108,1,-103,1,20,1,24,1,29,1,33,1,37,1,42,1,46,1,50,1,55,1,59,1,64,1,68,1,72,1,77,1,81,1,86,1,200,1,204,1,222,1,226,1,230,1,235,1,244,1,248,1,257,6,-155,6,-150,6,-146,6,-141,6,-137,6,-133,6,-128,6,-124,6,-119,6,-115,6,-110,6,-106,6,22,6,27,6,31,6,35,6,40,6,44,6,49,6,53,6,57,6,62,6,66,6,71,6,75,6,80,6,84,6,88,6,93,6,199,6,203,6,225,6,230,6,234,10,-155,10,-150,10,-146,10,-141,10,-137,10,-133,10,-128,10,-124,10,-119,10,-115,10,-110,10,-106,10,-18,10,-13,10,-4,10,13,10,18,10,22,10,27,10,31,10,35,10,40,10,44,10,49,10,53,10,57,10,62,10,66,10,71,10,75,10,80,10,84,10,88,10,93,10,194,10,203,10,234,15,-153,15,-149,15,-144,15,-140,15,-136,15,-131,15,-127,15,-122,15,-118,15,-24,15,-20,15,-16,15,-11,15,-7,15,-2,15,2,15,7,15,11,15,16,15,20,15,24,15,29,15,33,15,38,15,42,15,47,15,51,15,56,15,60,15,64,15,69,15,73,15,78,15,82,15,87,15,91,15,96,15,162,15,251,19,-165,19,-148,19,-139,19,-134,19,-130,19,-125,19,-27,19,-22,19,-18,19,-13,19,-9,19,-4,19,0,19,4,19,9,19,13,19,18,19,22,19,27,19,31,19,36,19,40,19,45,19,49,19,54,19,58,19,63,19,67,19,72,19,76,19,80,19,85,19,89,19,94,19,98,19,157,19,161,19,210,19,237,19,246,23,-169,23,-29,23,-25,23,-20,23,-16,23,-11,23,-7,23,-2,23,2,23,7,23,11,23,16,23,20,23,25,23,29,23,34,23,38,23,43,23,47,23,52,23,56,23,61,23,65,23,70,23,74,23,79,23,83,23,101,23,155,23,209,23,214,23,218,28,-181,28,-177,28,-172,28,-168,28,-32,28,-27,28,-23,28,-18,28,-14,28,-9,28,-5,28,0,28,5,28,9,28,14,28,18,28,23,28,27,28,32,28,36,28,41,28,45,28,50,28,54,28,59,28,63,28,68,28,72,28,77,28,82,28,91,28,95,28,149,28,154,28,158,28,199,28,204,28,208,28,213,28,217,28,245,32,-193,32,-188,32,-183,32,-179,32,-32,32,-28,32,-23,32,-18,32,-14,32,-9,32,-5,32,0,32,5,32,9,32,14,32,18,32,23,32,28,32,32,32,37,32,41,32,46,32,50,32,55,32,60,32,64,32,69,32,73,32,78,32,87,32,92,32,96,32,101,32,151,32,156,32,161,32,197,32,202,32,206,32,211,32,216,32,243,37,-204,37,-200,37,-195,37,-190,37,-186,37,-181,37,-177,37,-149,37,-144,37,-28,37,-23,37,-19,37,-14,37,-9,37,-5,37,0,37,5,37,9,37,14,37,19,37,23,37,28,37,33,37,37,37,42,37,46,37,51,37,56,37,60,37,65,37,70,37,74,37,84,37,88,37,93,37,98,37,102,37,107,37,111,37,149,37,153,37,158,37,163,37,167,37,190,37,195,37,200,37,204,37,209,37,242,41,-207,41,-202,41,-198,41,-179,41,-151,41,-33,41,-28,41,-24,41,-19,41,-14,41,-9,41,-5,41,0,41,5,41,9,41,14,41,19,41,24,41,28,41,33,41,38,41,42,41,47,41,52,41,56,41,61,41,66,41,71,41,80,41,85,41,89,41,94,41,99,41,104,41,108,41,113,41,146,41,151,41,155,41,160,41,165,41,169,41,188,41,193,41,198,41,202,41,207,41,212,45,-210,45,-205,45,-200,45,-167,45,-162,45,-29,45,-24,45,-19,45,-14,45,-10,45,-5,45,0,45,5,45,10,45,14,45,19,45,24,45,29,45,33,45,38,45,43,45,48,45,52,45,57,45,62,45,67,45,72,45,81,45,86,45,91,45,95,45,100,45,105,45,110,45,114,45,143,45,148,45,153,45,157,45,162,45,167,45,172,45,176,45,186,45,191,45,195,45,200,45,205,45,210,45,215,45,219,45,224,45,229,50,-212,50,-207,50,-202,50,-197,50,-27,50,-22,50,-17,50,-12,50,-7,50,-2,50,2,50,7,50,12,50,17,50,22,50,27,50,32,50,36,50,41,50,46,50,51,50,56,50,61,50,66,50,75,50,80,50,85,50,90,50,95,50,100,50,139,50,144,50,148,50,153,50,158,50,163,50,168,50,173,50,178,50,182,50,187,50,192,50,197,50,202,50,207,50,212,50,216,50,221,50,226,50,231,50,236,54,-224,54,-219,54,-215,54,-210,54,-205,54,-200,54,-195,54,-22,54,-17,54,-12,54,-7,54,-2,54,2,54,7,54,12,54,17,54,22,54,27,54,32,54,37,54,42,54,47,54,52,54,57,54,62,54,67,54,76,54,81,54,86,54,91,54,96,54,111,54,116,54,121,54,126,54,131,54,136,54,141,54,145,54,150,54,155,54,160,54,165,54,170,54,175,54,180,54,185,54,190,54,195,54,200,54,205,54,210,54,215,54,219,54,224,54,229,54,234,54,239,59,-222,59,-217,59,-211,59,-206,59,-201,59,-196,59,-191,59,-181,59,-166,59,-20,59,-15,59,-10,59,-5,59,0,59,5,59,10,59,15,59,20,59,25,59,30,59,35,59,40,59,45,59,50,59,55,59,60,59,65,59,70,59,76,59,81,59,86,59,91,59,96,59,106,59,111,59,116,59,121,59,126,59,131,59,136,59,141,59,146,59,151,59,156,59,161,59,166,59,171,59,176,59,181,59,186,59,191,59,196,59,201,59,206,59,211,59,217,59,222,59,227,59,232,59,237,59,242,63,-224,63,-219,63,-213,63,-208,63,-203,63,-198,63,-193,63,-188,63,-183,63,-177,63,-172,63,-167,63,-18,63,-13,63,-8,63,-3,63,3,63,8,63,13,63,18,63,23,63,28,63,44,63,49,63,69,63,75,63,80,63,85,63,90,63,95,63,100,63,105,63,111,63,116,63,121,63,126,63,131,63,136,63,141,63,147,63,152,63,157,63,162,63,167,63,172,63,177,63,183,63,188,63,193,63,198,63,203,63,208,63,213,63,219,63,224,63,229,63,234,63,239,67,-236,67,-230,67,-225,67,-220,67,-214,67,-209,67,-204,67,-199,67,-193,67,-188,67,-183,67,-177,67,-172,67,-167,67,-161,67,-13,67,-8,67,-3,67,3,67,8,67,13,67,19,67,71,67,77,67,82,67,87,67,93,67,98,67,103,67,109,67,114,67,119,67,124,67,130,67,135,67,140,67,146,67,151,67,156,67,161,67,167,67,172,67,177,67,183,67,188,67,193,67,199,67,204,67,209,67,214,67,220,67,225,67,230,67,236,67,241,67,262,67,267,72,-238,72,-233,72,-227,72,-222,72,-217,72,-211,72,-206,72,-200,72,-195,72,-189,72,-184,72,-179,72,-173,72,-168,72,-162,72,-157,72,-152,72,0,72,5,72,11,72,16,72,76,72,81,72,87,72,92,72,97,72,103,72,108,72,114,72,119,72,125,72,130,72,135,72,141,72,146,72,152,72,157,72,162,72,168,72,173,72,179,72,184,72,189,72,195,72,200,72,206,72,211,72,217,72,222,72,227,72,233,72,238,72,254,72,276,72,282,76,-246,76,-240,76,-234,76,-229,76,-223,76,-218,76,-212,76,-207,76,-201,76,-195,76,-190,76,-184,76,-179,76,-173,76,-167,76,-162,76,-156,76,-151,76,-17,76,-11,76,-6,76,45,76,56,76,61,76,67,76,73,76,78,76,84,76,89,76,95,76,100,76,106,76,112,76,117,76,123,76,128,76,134,76,140,76,145,76,151,76,156,76,162,76,167,76,173,76,179,76,184,76,190,76,195,76,201,76,207,76,212,76,218,76,223,76,229,76,234,76,251,76,257,76,279,81,-248,81,-242,81,-236,81,-230,81,-225,81,-219,81,-213,81,-207,81,-202,81,-196,81,-190,81,-184,81,-179,81,-173,81,-167,81,-161,81,-156,81,-150,81,-17,81,-12,81,-6,81,0,81,17,81,40,81,46,81,58,81,63,81,69,81,75,81,81,81,86,81,92,81,98,81,104,81,109,81,115,81,121,81,127,81,132,81,138,81,144,81,150,81,156,81,161,81,167,81,173,81,179,81,184,81,190,81,196,81,202,81,207,81,213,81,219,81,225,81,230,81,236,81,248,81,253,81,282,85,-244,85,-238,85,-232,85,-226,85,-220,85,-214,85,-208,85,-202,85,-196,85,-190,85,-184,85,-179,85,-173,85,-167,85,-161,85,-155,85,-149,85,-143,85,-18,85,-12,85,-6,85,0,85,6,85,18,85,24,85,42,85,48,85,54,85,83,85,89,85,95,85,101,85,107,85,113,85,119,85,125,85,131,85,137,85,143,85,149,85,155,85,161,85,167,85,173,85,179,85,184,85,190,85,196,85,202,85,208,85,214,85,220,85,226,85,232,85,238,85,244,85,250,85,256,85,262,85,280,85,286,89,-245,89,-239,89,-233,89,-227,89,-220,89,-214,89,-208,89,-202,89,-196,89,-189,89,-183,89,-177,89,-171,89,-164,89,-158,89,-152,89,-146,89,-140,89,-127,89,3,89,9,89,16,89,22,89,34,89,40,89,47,89,53,89,78,89,84,89,90,89,96,89,102,89,109,89,115,89,121,89,127,89,133,89,140,89,146,89,152,89,158,89,164,89,171,89,177,89,183,89,189,89,196,89,202,89,208,89,214,89,220,89,227,89,233,89,239,89,245,89,251,89,258,89,264,89,270,94,-248,94,-241,94,-235,94,-228,94,-222,94,-215,94,-209,94,-202,94,-196,94,-190,94,-183,94,-177,94,-170,94,-164,94,-158,94,-151,94,-145,94,-138,94,-132,94,-106,94,-3,94,3,94,10,94,16,94,22,94,29,94,35,94,42,94,48,94,55,94,61,94,68,94,74,94,80,94,87,94,93,94,100,94,106,94,112,94,119,94,125,94,132,94,138,94,145,94,151,94,158,94,164,94,170,94,177,94,183,94,190,94,196,94,202,94,209,94,215,94,222,94,228,94,235,94,241,94,248,94,254,94,260,94,267,94,273,94,286,98,-249,98,-242,98,-236,98,-229,98,-222,98,-215,98,-209,98,-202,98,-195,98,-188,98,-182,98,-175,98,-168,98,-161,98,-155,98,-148,98,-141,98,-114,98,-108,98,0,98,7,98,13,98,20,98,27,98,34,98,40,98,47,98,54,98,61,98,67,98,74,98,81,98,87,98,94,98,101,98,108,98,114,98,121,98,128,98,135,98,141,98,148,98,155,98,161,98,168,98,175,98,182,98,188,98,195,98,202,98,209,98,215,98,222,98,229,98,236,98,242,98,249,98,256,98,262,98,269,98,276,103,-251,103,-244,103,-236,103,-229,103,-222,103,-215,103,-208,103,-201,103,-194,103,-187,103,-180,103,-173,103,-166,103,-159,103,-152,103,-145,103,-138,103,-131,103,-124,103,-116,103,-4,103,11,103,18,103,25,103,32,103,39,103,46,103,53,103,60,103,67,103,74,103,81,103,88,103,95,103,102,103,109,103,116,103,124,103,131,103,138,103,145,103,152,103,159,103,166,103,173,103,180,103,187,103,194,103,201,103,208,103,215,103,222,103,229,103,236,103,244,103,251,103,258,103,265,103,272,103,279,103,286,103,314,107,-252,107,-245,107,-238,107,-230,107,-223,107,-215,107,-208,107,-200,107,-193,107,-186,107,-178,107,-171,107,-156,107,-148,107,-141,107,-134,107,-126,107,-119,107,-15,107,0,107,15,107,22,107,30,107,37,107,45,107,52,107,59,107,67,107,74,107,82,107,89,107,96,107,104,107,111,107,119,107,126,107,134,107,141,107,148,107,156,107,163,107,171,107,178,107,186,107,193,107,200,107,208,107,215,107,223,107,230,107,238,107,245,107,252,107,260,107,267,107,275,107,319,111,-262,111,-254,111,-247,111,-239,111,-231,111,-223,111,-215,111,-207,111,-200,111,-192,111,-184,111,-176,111,-153,111,-145,111,-137,111,-129,111,-121,111,-4,111,20,111,27,111,43,111,51,111,59,111,67,111,74,111,82,111,90,111,98,111,106,111,113,111,121,111,129,111,137,111,145,111,153,111,160,111,168,111,176,111,184,111,192,111,200,111,207,111,215,111,223,111,231,111,239,111,247,111,254,111,262,111,270,111,317,116,-314,116,-306,116,-265,116,-257,116,-248,116,-240,116,-232,116,-223,116,-215,116,-207,116,-199,116,-190,116,-149,116,-141,116,-132,116,-8,116,25,116,33,116,50,116,58,116,66,116,74,116,83,116,91,116,99,116,108,116,116,116,124,116,132,116,141,116,149,116,157,116,166,116,174,116,182,116,190,116,199,116,207,116,215,116,223,116,232,116,240,116,248,116,257,116,265,116,273,116,323,120,-320,120,-312,120,-303,120,-285,120,-277,120,-268,120,-259,120,-250,120,-241,120,-233,120,-224,120,-215,120,-206,120,-198,120,-154,120,-145,120,13,120,22,120,31,120,48,120,66,120,75,120,83,120,92,120,101,120,110,120,119,120,127,120,136,120,145,120,154,120,162,120,171,120,180,120,189,120,198,120,206,120,215,120,224,120,233,120,241,120,250,120,259,120,268,120,277,120,285,120,294,120,303,120,329,125,-327,125,-317,125,-308,125,-298,125,-289,125,-279,125,-270,125,-261,125,-251,125,-242,125,-232,125,-223,125,-213,125,-204,125,-194,125,-166,125,-99,125,-90,125,14,125,24,125,33,125,43,125,52,125,62,125,71,125,81,125,90,125,99,125,109,125,118,125,128,125,137,125,147,125,156,125,166,125,175,125,185,125,194,125,204,125,213,125,223,125,232,125,242,125,251,125,261,125,270,125,279,125,289,125,298,125,308,125,317,125,336,125,346,129,-314,129,-303,129,-293,129,-283,129,-273,129,-262,129,-252,129,-242,129,-231,129,-221,129,-211,129,-201,129,-190,129,-180,129,-170,129,-139,129,-98,129,-87,129,-36,129,26,129,36,129,57,129,67,129,77,129,87,129,98,129,108,129,118,129,129,129,139,129,149,129,159,129,170,129,180,129,190,129,201,129,211,129,221,129,231,129,242,129,252,129,262,129,273,129,283,129,293,129,303,129,314,129,324,129,334,129,345,129,355,133,-354,133,-343,133,-321,133,-310,133,-299,133,-288,133,-277,133,-266,133,-255,133,-244,133,-233,133,-222,133,-210,133,-199,133,-188,133,-177,133,-166,133,-144,133,-133,133,-100,133,-89,133,-78,133,33,133,44,133,55,133,66,133,78,133,100,133,111,133,122,133,133,133,155,133,166,133,177,133,188,133,199,133,210,133,222,133,233,133,244,133,255,133,266,133,277,133,288,133,299,133,310,133,321,133,332,133,343,133,354,138,-329,138,-317,138,-305,138,-293,138,-281,138,-268,138,-256,138,-244,138,-220,138,-207,138,-183,138,-171,138,-146,138,-98,138,-85,138,-73,138,-61,138,37,138,49,138,61,138,73,138,122,138,159,138,171,138,183,138,195,138,207,138,220,138,232,138,244,138,256,138,268,138,281,138,293,138,305,138,317,138,329,138,342,138,354,142,-312,142,-245,142,-231,142,-217,142,-190,142,-177,142,-163,142,-149,142,-95,142,-82,142,-68,142,-54,142,109,142,136,142,149,142,163,142,177,142,190,142,204,142,217,142,231,142,245,142,258,142,272,142,285,142,299,147,-245,147,-199,147,-184,147,-169,147,-107,147,-92,147,-77,147,-61,147,169,147,184,147,199,147,214,147,230,151,-228,151,-176,151,-105,151,-88,151,-70,151,-53,151,123,151,193,151,211,151,281,155,-226,155,-165,155,-123,155,-103,155,-82,155,-62,155,-41,160,-149,160,-124,160,-99,160,-74,160,-50,160,25,160,50,160,199,164,-147,164,-115,164,-82';
  function globe() {
    const host = document.querySelector('[data-globe]');
    if (!host) return;
    const cv = document.createElement('canvas');
    cv.className = 'mtk-globe'; cv.setAttribute('aria-hidden', 'true');
    host.prepend(cv);
    const ctx = cv.getContext('2d');
    const raw = PTS.split(',').map(Number), P = [];
    for (let i = 0; i < raw.length; i += 2) {
      const la = raw[i] / 2 * Math.PI / 180, lo = raw[i + 1] / 2 * Math.PI / 180;
      P.push([Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)]);
    }
    const GRID = [];
    for (let la = -60; la <= 60; la += 30) { const r = []; for (let lo = 0; lo <= 360; lo += 6) r.push([la, lo]); GRID.push(r); }
    for (let lo = 0; lo < 360; lo += 30) { const r = []; for (let la = -90; la <= 90; la += 6) r.push([la, lo]); GRID.push(r); }
    const gridV = GRID.map(r => r.map(([la, lo]) => { const a = la * Math.PI / 180, b = lo * Math.PI / 180; return [Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)]; }));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const tilt = 0.38, ct = Math.cos(tilt), st = Math.sin(tilt);
    let rot = 0.6, W = 0, H = 0, dpr = 1, visible = true, last = 0, col = [34, 211, 238], col2 = [99, 102, 241];
    const parse = v => { const m = /#([0-9a-f]{6})/i.exec(v || ''); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
    const colors = () => { const cs = getComputedStyle(host); col = parse(cs.getPropertyValue('--globe')) || col; col2 = parse(cs.getPropertyValue('--globe2')) || col2; };
    const size = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; };
    const proj = (v, cx, cy, R) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      const x = v[0] * c - v[2] * s, z0 = v[0] * s + v[2] * c, y = v[1] * ct - z0 * st, z = v[1] * st + z0 * ct;
      return [cx + x * R, cy - y * R, z];
    };
    function draw() {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const R = Math.min(W, H) * 0.46, cx = W / 2, cy = H / 2;
      const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.15);
      g.addColorStop(0, `rgba(${col},0.10)`); g.addColorStop(0.7, `rgba(${col2},0.05)`); g.addColorStop(1, `rgba(${col2},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, 7); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${col},0.22)`; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(${col},0.08)`;
      for (const r of gridV) {
        ctx.beginPath(); let pen = false;
        for (const v of r) { const [x, y, z] = proj(v, cx, cy, R); if (z > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; }
        ctx.stroke();
      }
      const dot = Math.max(1, R / 230);
      for (const v of P) {
        const [x, y, z] = proj(v, cx, cy, R);
        if (z < -0.15) continue;
        const a = z > 0 ? 0.25 + 0.55 * z : 0.06;
        const m = (y - (cy - R)) / (2 * R);
        ctx.fillStyle = `rgba(${col.map((c, i) => Math.round(c + (col2[i] - c) * m))},${a})`;
        ctx.beginPath(); ctx.arc(x, y, dot * (z > 0 ? 1 + 0.5 * z : 0.8), 0, 7); ctx.fill();
      }
    }
    function frame(ts) {
      if (visible && !reduce.matches && !document.hidden) {
        if (ts - last > 33) { rot += (ts - (last || ts)) * 0.00009; last = ts; draw(); }
      } else last = 0;
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
    new ResizeObserver(() => { size(); draw(); }).observe(cv);
    addEventListener('mt-theme', () => { colors(); draw(); });
    reduce.addEventListener?.('change', draw);
    colors(); size(); draw();
    requestAnimationFrame(frame);
  }

  // ---- ekran görüntüsü galerisi: tıklayınca büyüt, ok tuşları / düğmelerle gez, Esc ile kapat
  // Ekran görüntüleri: uygulamanın İngilizce arayüzüyle çekilmiş sürümü varsa (data-shot-en) Türkçe dışı dillerde o gösterilir
  function shotLang() {
    const en = lang !== 'tr';
    document.querySelectorAll('[data-shot-en]').forEach(e => ['src', 'srcset', 'href'].forEach(a => {
      const v = e.getAttribute(a);
      if (!v) return;
      const tr = v.replace(/(\/shots\/[0-9a-z._-]+?)-en(-800)?\.webp/g, '$1$2.webp');
      e.setAttribute(a, en ? tr.replace(/(\/shots\/[0-9a-z._-]+?)(-800)?\.webp/g, '$1-en$2.webp') : tr);
    }));
  }

  function lightbox() {
    const links = [...document.querySelectorAll('[data-gallery] a[data-lightbox]')];
    if (!links.length) return;
    let box = null, idx = 0;
    const show = i => {
      idx = (i + links.length) % links.length;
      const a = links[idx], cap = a.parentElement.querySelector('figcaption');
      box.querySelector('img').src = a.href;
      box.querySelector('img').alt = a.querySelector('img')?.alt || '';
      box.querySelector('p').textContent = cap ? [...cap.children].map(c => c.textContent).join(' — ') : (a.querySelector('img')?.alt || '');
    };
    const close = () => { box?.remove(); box = null; document.removeEventListener('keydown', key); };
    const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + (root.dir === 'rtl' ? -1 : 1)); else if (e.key === 'ArrowLeft') show(idx + (root.dir === 'rtl' ? 1 : -1)); };
    links.forEach((a, i) => a.addEventListener('click', e => {
      e.preventDefault();
      box = document.createElement('div'); box.className = 'mtk-lb'; box.setAttribute('role', 'dialog'); box.setAttribute('data-noi18n', '');
      box.innerHTML = '<img alt=""><p></p><button class="x" aria-label="×">×</button><button class="pv" aria-label="‹">‹</button><button class="nx" aria-label="›">›</button>';
      box.addEventListener('click', ev => { if (ev.target === box) close(); });
      box.querySelector('.x').onclick = close;
      box.querySelector('.pv').onclick = () => show(idx - 1);
      box.querySelector('.nx').onclick = () => show(idx + 1);
      document.body.append(box); document.addEventListener('keydown', key);
      show(i);
    }));
  }

  // ---------- Google Analytics: yalnız ziyaretçinin açık izniyle (KVKK / GDPR) ----------
  // Ölçüm kimliği sunucuda yalnız tanıtım sayfalarına <meta name="mt-ga"> olarak eklenir; hesap, giriş, şifre sıfırlama,
  // doğrulama ve kişisel indirme sayfalarında hiç yoktur. İzin verilmeden Google'a hiçbir istek gitmez, çerez yazılmaz.
  const GA = document.querySelector('meta[name="mt-ga"]')?.content || '';
  const PRIV = document.querySelector('meta[name="mt-privacy"]')?.content || '/gizlilik';
  const CKEY = 'mt-consent';   // 'yes' | 'no'
  const gaOn = () => typeof window.gtag === 'function';
  function gaLoad() {
    if (!/^G-[A-Z0-9]{4,16}$/.test(GA) || gaOn()) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };   // eslint-disable-line prefer-rest-params
    window.gtag('js', new Date());
    window.gtag('config', GA, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const sc = document.createElement('script');
    sc.async = true; sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
    document.head.append(sc);
  }
  function gaClear() {   // izin geri alınınca analiz çerezlerini sil (alan adı ve üst alan adı için)
    const h = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => /^_ga/.test(n)).forEach(n => {
      ['', `; domain=${h}`, `; domain=.${h}`].forEach(d => { document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`; });
    });
  }
  function consentBar(force) {
    if (!GA) return;
    const v = store.get(CKEY);
    if (!force && v === 'yes') return gaLoad();
    if (!force && v === 'no') return;
    document.querySelector('.mtk-consent')?.remove();
    const bar = document.createElement('div');
    bar.className = 'mtk-consent'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = `<p>Siteyi geliştirmek için ziyaretleri Google Analytics ile anonim olarak saymak istiyoruz. İzin verirseniz analiz çerezleri kullanılır; adınız, e-postanız ya da hesap bilgileriniz gönderilmez.</p>
      <div class="c-act"><a href="${PRIV}">Gizlilik ve çerezler</a><button type="button" data-c="no">Reddet</button><button type="button" class="ok" data-c="yes">Kabul et</button></div>`;
    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      const yes = b.dataset.c === 'yes';
      store.set(CKEY, yes ? 'yes' : 'no');
      bar.remove();
      if (yes) gaLoad();
      else if (gaOn() || v === 'yes') { gaClear(); location.reload(); }   // daha önce açıktı: yüklenmiş betiği bırakmamak için sayfa yenilenir
    });
    document.body.append(bar);
  }
  function consentLinks() {   // alt bilgiye "Gizlilik ve çerezler" ve "Çerez tercihleri" (izni sonradan değiştirmek için)
    if (!GA) return;
    const f = document.querySelector('footer .wrap') || document.querySelector('footer');
    if (!f || f.querySelector('[data-cookie-prefs]')) return;
    const sp = document.createElement('span');
    sp.className = 'mtk-cprefs';
    sp.innerHTML = `<a href="${PRIV}">Gizlilik ve çerezler</a> · <a href="#" data-cookie-prefs>Çerez tercihleri</a>`;
    f.append(sp);
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-cookie-prefs]')) { e.preventDefault(); consentBar(true); return; }
    if (!gaOn()) return;
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const ev = /(^|\/)(kayit|register)(\?|$)/.test(href) ? 'sign_up_click'
      : /(^|\/)(giris|login)(\?|$)/.test(href) ? 'login_click'
      : a.closest('[data-mt-button]') || /mastertool\.download/.test(href) ? 'mastertool_click' : '';
    if (ev) window.gtag('event', ev, { link_url: a.href, link_text: (a.textContent || '').trim().slice(0, 60) });
  });

  window.mtKit = { t, setLang, collect, get lang() { return lang; }, get theme() { return resolved(); }, langs: LANGS, consent: () => consentBar(true) };
  const start = async () => {
    controls(); mtButton(); globe(); lightbox();
    dict = await load(lang);
    shotLang();
    observing = true;
    try { translate(); } finally { observing = false; }
    mo.observe(document.body, { childList: true, subtree: true });
    consentLinks(); consentBar(false);
    dispatchEvent(new CustomEvent('mt-lang', { detail: lang }));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
