// Veilox tanıtım: ürünü anlatır (özellikler + örnek görseller, özellikle toplantı gibi yenilikçi sistemler),
// fiyatlandırmayı gösterir, self-servis kayıt sunar. TR/EN dil + gece/gündüz tema. Tümü tek sayfada.
const $ = (s, r = document) => r.querySelector(s);
const svg = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('tr-TR');

let lang = (() => { try { return localStorage.getItem('veilox.lang') || (navigator.language || '').startsWith('en') ? localStorage.getItem('veilox.lang') || 'tr' : 'tr'; } catch { return 'tr'; } })();
if (lang !== 'en') lang = 'tr';
let theme = (() => { try { return localStorage.getItem('veilox.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } })();

const T = {
  tr: {
    nav: ['Özellikler', 'Toplantı', 'Fiyatlar', 'Güvenlik'], login: 'Merkez girişi', create: 'Firmanı oluştur',
    heroPill: 'Üretimden sahaya, toplantıdan ofise tek platform',
    heroH: ['Fabrikanızı ', 'tek ekrandan', ' yönetin.'],
    heroLead: 'Üretim, iş emri, stok, satın alma, saha ve uçuş; görüntülü toplantı, mesajlaşma, telsiz ve yapay zeka asistanı; hatta uygulama içi ofis belgeleri — hepsi gerçek zamanlı ve tek yerde. Bulutta barındırın ya da kendi sunucunuza kurun.',
    heroCta: ['Firmanı oluştur', 'Özellikleri gör'],
    heroPoints: ['Canlı üretim ve yazıcı takibi', 'Görüntülü toplantı ve telsiz', 'Yapay zeka asistanı'],
    stats: [['20+', 'modül tek çatı altında'], ['Canlı', 'üretim, yazıcı ve sunucu durumu'], ['Online / Offline', 'bulut ya da kendi sunucunuz'], ['TR / EN', 'çok dilli arayüz']],
    featEye: 'Özellikler', featH: 'Fabrikanın her köşesi için bir modül',
    featP: 'Her kullanıcı yalnızca rolünün gerektirdiği modülleri görür. İster bulutta, ister kendi sunucunuzda.',
    rowsEye: 'Yenilikçi sistemler', meetEye: 'Görüntülü toplantı',
    pricingEye: 'Fiyatlandırma', pricingH: 'Size uygun paket', pricingP: 'Aylık, taahhütsüz. İhtiyacınız olan modülleri seçin; bulut ya da kendi sunucunuza kurulum.',
    perMonth: '/ay', free: 'Ücretsiz', start: 'Bu paketle başla', modsN: n => `${n} modül`,
    modeOnline: 'Bulut (online)', modeOffline: 'Kendi sunucunuz (offline)', modeBoth: 'Bulut veya kendi sunucunuz',
    secEye: 'Güvenlik', secH: 'Veriniz sizde, kontrol sizde',
    secP: 'İsterseniz kendi sunucunuzda çalışır. Her işlem kayıt altındadır; her kullanıcı yalnızca yetkili olduğu bilgiyi görür.',
    ctaH: 'Firmanızı dakikalar içinde kurun', ctaP: 'Kaydolun, size özel master hesabınızla hemen başlayın.',
    regTitle: 'Firmanızı oluşturun', regSub: p => p ? `Seçilen paket: ${p}` : 'Paket seçmeden de kaydolabilirsiniz.',
    regName: 'Firma adı', regMail: 'Master e-posta', regMailHint: 'Bu hesap firmanızın sahibi (master) olur.',
    regFull: 'Ad soyad', regPass: 'Şifre (en az 10 karakter)', regBtn: 'Kaydı tamamla',
    regOk: 'Kaydınız alındı ✓', regOkP: 'Onaylandığında firmanız kurulacak ve giriş bilgileriniz iletilecektir.', close: 'Kapat',
    foot: 'Fabrika Yönetim Sistemi',
  },
  en: {
    nav: ['Features', 'Meetings', 'Pricing', 'Security'], login: 'Console sign-in', create: 'Create your company',
    heroPill: 'From production to the field, meetings to the office — one platform',
    heroH: ['Run your factory ', 'from one screen', '.'],
    heroLead: 'Production, work orders, stock, purchasing, field & flight; video meetings, chat, push-to-talk radio and an AI assistant; even in-app office documents — all real-time, in one place. Host it in the cloud or on your own server.',
    heroCta: ['Create your company', 'See features'],
    heroPoints: ['Live production & printer tracking', 'Video meetings & radio', 'AI assistant'],
    stats: [['20+', 'modules under one roof'], ['Live', 'production, printer & server status'], ['Online / Offline', 'cloud or your own server'], ['TR / EN', 'multilingual interface']],
    featEye: 'Features', featH: 'A module for every corner of the factory',
    featP: 'Each user sees only the modules their role requires. In the cloud or on your own server.',
    rowsEye: 'Innovative systems', meetEye: 'Video meetings',
    pricingEye: 'Pricing', pricingH: 'A plan that fits', pricingP: 'Monthly, no commitment. Pick the modules you need; cloud or on-premise install.',
    perMonth: '/mo', free: 'Free', start: 'Start with this plan', modsN: n => `${n} modules`,
    modeOnline: 'Cloud (online)', modeOffline: 'Your own server (offline)', modeBoth: 'Cloud or your own server',
    secEye: 'Security', secH: 'Your data, your control',
    secP: 'Runs on your own server if you want. Every action is logged; each user sees only what they are authorized to.',
    ctaH: 'Set up your company in minutes', ctaP: 'Sign up and start right away with your own master account.',
    regTitle: 'Create your company', regSub: p => p ? `Selected plan: ${p}` : 'You can register without picking a plan.',
    regName: 'Company name', regMail: 'Master email', regMailHint: 'This account becomes your company owner (master).',
    regFull: 'Full name', regPass: 'Password (min 10 characters)', regBtn: 'Complete registration',
    regOk: 'Registration received ✓', regOkP: 'Once approved, your company will be set up and your credentials shared.', close: 'Close',
    foot: 'Factory Management System',
  },
};

// [ikon, trBaşlık, trAçıklama, enBaşlık, enAçıklama, renk, yumuşak]
const FEATURES = [
  ['<path d="M3 21h18M5 21V9l5 3V9l5 3V5l4 2v14"/>', 'Üretim ve iş emirleri', 'Sipariş → üretim → depo → montaj → kalibrasyon akışı; parça bazında takip.', 'Production & work orders', 'Order → production → warehouse → assembly → calibration; part-level tracking.', '#2f6fed', '#eaf1ff'],
  ['<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17v4h10v-4"/>', '3B yazıcı odası', 'Yazıcıların canlı durumu, 3B oda görünümü, doğrudan G-code gönderimi.', '3D printer room', 'Live printer status, 3D room view, direct G-code dispatch.', '#7c5cf5', '#f1ecff'],
  ['<path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12z"/>', 'Görüntülü toplantı ve mesajlaşma', 'Davet koduyla toplantı, ekran paylaşımı, el kaldırma; sohbet, sesli arama ve telsiz.', 'Video meetings & messaging', 'Meetings by invite code, screen share, raise hand; chat, voice calls and radio.', '#ec4899', '#fdebf4'],
  ['<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', 'Belge Yönetim (ofis)', 'Uygulama içi Excel, Word ve Sunum; paylaşım izni ve sürüm geçmişiyle — dış programsız.', 'Document suite (office)', 'In-app Excel, Word and Slides; with sharing permissions and version history — no external apps.', '#0ea5a4', '#e3f7f6'],
  ['<path d="M12 3l2.5 2.5M12 3L9.5 5.5M12 3v6"/><rect x="4" y="9" width="16" height="11" rx="2"/>', 'Endüstriyel tasarım', 'Proje, montaj ve alt çizimler; STEP dosyaları için uygulama içi 3B önizleme, sürüm geçmişi.', 'Industrial design', 'Projects, assemblies and sub-drawings; in-app 3D preview for STEP files, version history.', '#9333ea', '#f4e8fd'],
  ['<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>', 'Stok, satın alma ve MRP', 'Çoklu depo, kritik stok uyarıları, talep-teklif, Mikro ERP aktarımı.', 'Stock, purchasing & MRP', 'Multi-warehouse, critical-stock alerts, requests-quotes, Micro ERP sync.', '#16a34a', '#e6f7ec'],
  ['<path d="M2 16l20-7-7 13-3-6z"/>', 'Saha ve uçuş', 'Saha görevleri, araç ve yol kaydı, GPS’li bina kontrolü, uçuş logu analizi.', 'Field & flight', 'Field tasks, vehicle & route logs, GPS building patrol, flight-log analysis.', '#0284c7', '#e2f2fb'],
  ['<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/>', 'İK, sekreterya ve temizlik', 'Özlük dosyaları, izinler; misafir/kargo/telefon; günlük temizlik çeklisti.', 'HR, secretariat & cleaning', 'Personnel files, leaves; guests/cargo/calls; daily cleaning checklist.', '#f59e0b', '#fff4e0'],
  ['<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', 'Yapay zeka asistanı', 'Yetkinize göre salt-okunur sorgular; değişiklikler yönetici onayıyla.', 'AI assistant', 'Read-only queries scoped to your permissions; changes via admin approval.', '#dc2626', '#fdecec'],
];

// Yenilikçi sistem satırları (örnek görsellerle); ilk sırada toplantı sistemi
const ROWS = [
  { eye: { tr: 'Görüntülü toplantı', en: 'Video meetings' }, img: ['/static/img/landing/mob-meet.webp', '/static/img/landing/tab-messages.webp'], solo: false,
    h: { tr: 'Zoom tarzı toplantı, ekibinizin içinde', en: 'Zoom-style meetings, inside your team' },
    p: { tr: 'Davet koduyla görüntülü toplantı; şirket dışından katılımcılar yalnızca bir linkle, giriş yapmadan katılır. Bekleme odası, ekran paylaşımı, el kaldırma sırası, toplantı içi sohbet ve kayıtların metne çevrilmesi.', en: 'Video meetings by invite code; external guests join with just a link, no sign-in. Waiting room, screen share, raise-hand queue, in-meeting chat and transcript of recordings.' },
    ticks: { tr: ['Bekleme odası ve katılımcı kabulü', 'Ekran paylaşımı ve el kaldırma', 'Kayıtların metne çevrilmesi'], en: ['Waiting room & admit guests', 'Screen share & raise hand', 'Transcripts of recordings'] } },
  { eye: { tr: 'Yazıcı odası', en: 'Printer room' }, img: ['/static/img/landing/shots/printers.webp'], solo: true, rev: true,
    h: { tr: 'Onlarca 3B yazıcı, tek bakışta', en: 'Dozens of 3D printers, at a glance' },
    p: { tr: 'Yazıcılar ağdan otomatik bulunur, durumları saniyeler içinde okunur. Kayıtsız baskı ya da hata anında uyarı düşer; yazıcıya doğrudan G-code gönderilir.', en: 'Printers are auto-discovered on the network and polled within seconds. Unregistered prints or errors raise instant alerts; send G-code straight to the printer.' },
    ticks: { tr: ['Liste ve 3B oda görünümü', 'Doğrudan G-code gönderimi', 'Hata ve uyumsuzluk uyarıları'], en: ['List & 3D room view', 'Direct G-code dispatch', 'Error & mismatch alerts'] } },
  { eye: { tr: 'Ofis belgeleri', en: 'Office documents' }, img: ['/static/img/landing/shots/belge-word.webp'], solo: true,
    h: { tr: 'Excel, Word ve Sunum — uygulama içinde', en: 'Excel, Word & Slides — in the app' },
    p: { tr: 'Dış programa gerek yok. Belgelerinizi oluşturun, otomatik kaydedin; kime görüntüleme, kime düzenleme izni vereceğinizi seçin. Her kaydetmede sürüm geçmişi tutulur.', en: 'No external apps needed. Create documents, auto-save; choose who can view and who can edit. Version history is kept on every save.' },
    ticks: { tr: ['Excel / Word / Sunum', 'Görüntüleme & düzenleme izni', 'Sürüm geçmişi ve geri yükleme'], en: ['Excel / Word / Slides', 'View & edit permissions', 'Version history & restore'] } },
  { eye: { tr: 'Yapay zeka', en: 'Artificial intelligence' }, img: ['/static/img/landing/mob-assistant.webp'], solo: true, rev: true,
    h: { tr: 'Sorun, sistem cevaplasın', en: 'Ask, the system answers' },
    p: { tr: 'Köşedeki asistana “bugün kaç parça teslim edildi?” diye sorun; yalnızca sizin yetkili olduğunuz verilerle cevap verir. Bir kaydın değişmesini isterseniz talebi yöneticinin onayına gönderir.', en: 'Ask the corner assistant “how many parts shipped today?”; it answers only with data you are allowed to see. Want a record changed? It routes the request to admin approval.' },
    ticks: { tr: ['Yetkiye göre salt-okunur sorgular', 'Değişiklikler yönetici onayıyla', 'Kişiye özel karakter'], en: ['Permission-scoped read-only queries', 'Changes via admin approval', 'Personalized character'] } },
];

// Gerçek ekran görüntüleri galerisi (tüm özellikler)
const S = '/static/img/landing/shots/';
const GALLERY = [
  { img: S + 'dashboard.webp', tr: 'Kişisel pano', en: 'Personal dashboard' },
  { img: S + 'printers.webp', tr: 'Yazıcı yönetimi', en: 'Printer management' },
  { img: S + 'orders.webp', tr: 'İş emri yönetimi', en: 'Work orders' },
  { img: S + 'reports.webp', tr: 'Raporlar (22+)', en: 'Reports (22+)' },
  { img: S + 'belge-list.webp', tr: 'Belge Yönetim', en: 'Document suite' },
  { img: S + 'belge-excel.webp', tr: 'Uygulama içi Excel', en: 'In-app spreadsheet' },
  { img: S + 'meet.webp', tr: 'Görüntülü toplantı', en: 'Video meetings' },
  { img: S + 'field.webp', tr: 'Saha yönetimi', en: 'Field management' },
];

const SEC = {
  tr: [['Şifre ve giriş kuralları', 'Karmaşıklık, geçerlilik, yeniden kullanım engeli, deneme kilidi, PIN.'],
       ['Rol tabanlı erişim', 'Modüller ve veriler role göre açılır; gizli belgeler yönetimden bile saklanabilir.'],
       ['KVKK ve veri sahipliği', 'Şirket verisini yalnızca master tek pakette indirir; merkez firmanızın verisini göremez.'],
       ['Gece yedekleme', 'Veritabanı ve dosyalar her gece otomatik yedeklenir.']],
  en: [['Password & login rules', 'Complexity, expiry, reuse block, attempt lockout, PIN.'],
       ['Role-based access', 'Modules and data open by role; confidential files can be hidden even from management.'],
       ['Data ownership & privacy', 'Only the master downloads all company data; the console cannot see your data.'],
       ['Nightly backups', 'Database and files are backed up automatically every night.']],
};

function page() {
  const t = T[lang];
  const sun = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>');
  const moon = svg('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>');
  const feat = FEATURES.map((f, i) => `<div class="feat reveal fc${i}">
    <div class="feat-ic">${svg(f[0])}</div><b>${esc(lang === 'tr' ? f[1] : f[3])}</b><p>${esc(lang === 'tr' ? f[2] : f[4])}</p></div>`).join('');
  const rows = ROWS.map(r => {
    const media = r.img.length > 1
      ? `<div class="row-media"><div class="tablet"><div class="tablet-screen"><img class="shot" src="${r.img[1]}" alt="" loading="lazy"></div></div><div class="phone phone-mini"><div class="phone-screen"><img class="shot" src="${r.img[0]}" alt="" loading="lazy"></div></div></div>`
      : `<div class="row-media"><div class="laptop"><div class="laptop-screen"><img class="shot" src="${r.img[0]}" alt="" loading="lazy"></div><div class="laptop-base"></div></div></div>`;
    const copy = `<div class="row-copy"><span class="eyebrow">${esc(r.eye[lang])}</span><h3>${esc(r.h[lang])}</h3><p>${esc(r.p[lang])}</p>
      <ul class="ticks">${r.ticks[lang].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return `<div class="row ${r.rev ? 'row-rev' : ''} reveal" ${r.eye.tr === 'Görüntülü toplantı' ? 'id="meet"' : ''}>${media}${copy}</div>`;
  }).join('');
  return `
  <header class="nav" id="nav"><div class="wrap nav-in">
    <a class="brand" href="/"><img src="/static/favicon.svg" alt="" class="brand-logo"><span class="brand-txt"><b>VEILOX</b><span>${esc(t.foot)}</span></span></a>
    <nav class="nav-links"><a href="#ozellikler">${t.nav[0]}</a><a href="#meet">${t.nav[1]}</a><a href="#ekran">${lang === 'tr' ? 'Ekranlar' : 'Screens'}</a><a href="#fiyatlar">${t.nav[2]}</a><a href="#guvenlik">${t.nav[3]}</a></nav>
    <div class="nav-ctl">
      <button class="icon-btn" id="langBtn" title="Dil / Language">${lang === 'tr' ? 'EN' : 'TR'}</button>
      <button class="icon-btn" id="themeBtn" title="Tema">${theme === 'dark' ? sun : moon}</button>
      <a class="btn btn-ghost" href="/panel">${esc(t.login)}</a>
      <button class="btn btn-primary" id="createBtn">${esc(t.create)}</button>
    </div>
  </div></header>
  <main>
    <section class="hero"><div class="hero-glow"></div><div class="wrap hero-grid">
      <div class="hero-copy reveal">
        <span class="pill"><i></i> ${esc(t.heroPill)}</span>
        <h1>${esc(t.heroH[0])}<span class="grad">${esc(t.heroH[1])}</span>${esc(t.heroH[2])}</h1>
        <p class="lead">${esc(t.heroLead)}</p>
        <div class="hero-cta"><button class="btn btn-primary btn-lg" id="createBtn2">${esc(t.heroCta[0])}</button><a class="btn btn-ghost btn-lg" href="#ozellikler">${esc(t.heroCta[1])}</a></div>
        <ul class="hero-points">${t.heroPoints.map(p => `<li>${svg('<path d="M5 12l4 4 10-10"/>')}${esc(p)}</li>`).join('')}</ul>
      </div>
      <div class="hero-visual reveal">
        <div class="laptop"><div class="laptop-screen"><img class="shot" src="/static/img/landing/shots/dashboard.webp" alt="" loading="eager"></div><div class="laptop-base"></div></div>
        <div class="phone phone-hero"><div class="phone-screen"><img class="shot" src="/static/img/landing/mob-meet.webp" alt=""></div></div>
      </div>
    </div></section>

    <section class="stats wrap reveal">${t.stats.map(s => `<div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join('')}</section>

    <section class="section" id="ozellikler"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.featEye)}</span><h2>${esc(t.featH)}</h2><p>${esc(t.featP)}</p></div>
      <div class="features">${feat}</div>
    </div></section>

    <section class="section section-tint"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.rowsEye)}</span><h2>${esc(lang === 'tr' ? 'Rakiplerde olmayan, işinize değen özellikler' : 'Standout features that actually help')}</h2></div>
      <div class="rows">${rows}</div>
    </div></section>

    <section class="section" id="ekran"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(lang === 'tr' ? 'Ekran görüntüleri' : 'Screenshots')}</span><h2>${esc(lang === 'tr' ? 'Tüm özellikler, gerçek ekranlar' : 'All features, real screens')}</h2><p>${esc(lang === 'tr' ? 'Uygulamadan birebir görüntüler.' : 'Actual in-app captures.')}</p></div>
      <div class="gallery">${GALLERY.map(g => `<figure class="shot-card reveal"><img class="shot" src="${g.img}" alt="${esc(g[lang])}" loading="lazy"><figcaption>${esc(g[lang])}</figcaption></figure>`).join('')}</div>
    </div></section>

    <section class="pricing section" id="fiyatlar"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.pricingEye)}</span><h2>${esc(t.pricingH)}</h2><p>${esc(t.pricingP)}</p></div>
      <div class="price-grid" id="priceGrid"><p class="muted">…</p></div>
    </div></section>

    <section class="section section-dark" id="guvenlik"><div class="wrap">
      <div class="sec-head light reveal"><span class="eyebrow">${esc(t.secEye)}</span><h2>${esc(t.secH)}</h2><p>${esc(t.secP)}</p></div>
      <div class="sec-grid">${SEC[lang].map((s, i) => `<div class="sec-card reveal">${svg('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>')}<b>${esc(s[0])}</b><p>${esc(s[1])}</p></div>`).join('')}</div>
    </div></section>

    <section class="cta wrap reveal"><div class="cta-card"><div><h2>${esc(t.ctaH)}</h2><p>${esc(t.ctaP)}</p></div>
      <button class="btn btn-white btn-lg" id="createBtn3">${esc(t.create)}</button></div></section>
  </main>
  <footer class="foot"><div class="wrap foot-in">
    <div class="foot-brand"><img src="/static/favicon.svg" alt=""><span>VEILOX</span></div>
    <div class="foot-meta">© <span>${new Date().getFullYear()}</span> · ${esc(t.foot)}</div>
  </div></footer>`;
}

const modeLabel = m => ({ online: T[lang].modeOnline, offline: T[lang].modeOffline, both: T[lang].modeBoth }[m] || m);
const money = n => (n ? `${nf.format(n)} ₺` : T[lang].free);

async function fillPricing() {
  let pkgs = [];
  try { pkgs = await (await fetch('/api/public/packages')).json(); } catch { /* */ }
  const grid = $('#priceGrid');
  if (!grid) return;
  if (!pkgs.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = pkgs.map(p => `<div class="price-card reveal">
    <h3>${esc(p.name)}</h3>
    <div class="price-amt">${money(p.monthly_fee)}<span>${esc(T[lang].perMonth)}</span></div>
    <span class="price-mode">${esc(modeLabel(p.mode))}</span>
    <p class="price-desc">${esc(p.description || '')}</p>
    <div class="price-mods">${esc(T[lang].modsN(p.modules.length))}</div>
    <button class="btn btn-primary" data-pkg="${esc(p.slug)}" data-pkgname="${esc(p.name)}">${esc(T[lang].start)}</button>
  </div>`).join('');
  grid.querySelectorAll('[data-pkg]').forEach(b => b.addEventListener('click', () => registerModal(b.dataset.pkg, b.dataset.pkgname)));
  $('#nav') && revealAll();
}

function registerModal(slug, pkgName) {
  const t = T[lang];
  const wrap = document.createElement('div');
  wrap.className = 'vx-modal-wrap';
  wrap.innerHTML = `<div class="vx-modal">
    <button class="vx-x" type="button" aria-label="×">×</button>
    <h3>${esc(t.regTitle)}</h3>
    <p class="price-desc">${esc(t.regSub(pkgName))}</p>
    <form><label class="vx-field"><span>${esc(t.regName)}</span><input class="vx-input" name="company" required></label>
    <label class="vx-field"><span>${esc(t.regMail)}</span><input class="vx-input" type="email" name="email" required><small class="muted">${esc(t.regMailHint)}</small></label>
    <label class="vx-field"><span>${esc(t.regFull)}</span><input class="vx-input" name="full"></label>
    <label class="vx-field"><span>${esc(t.regPass)}</span><input class="vx-input" type="password" name="pass" minlength="10" required></label>
    <div class="vx-err"></div><button class="btn btn-primary btn-lg vx-submit" type="submit">${esc(t.regBtn)}</button></form></div>`;
  document.body.appendChild(wrap);
  const box = $('.vx-modal', wrap), close = () => wrap.remove();
  $('.vx-x', wrap).addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  const form = $('form', wrap), err = $('.vx-err', wrap), btn = $('button[type=submit]', wrap);
  form.addEventListener('submit', async e => {
    e.preventDefault(); btn.disabled = true; err.textContent = '';
    try {
      const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: form.company.value, master_username: form.email.value, master_name: form.full.value, password: form.pass.value, package_slug: slug || '' }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || 'Hata');
      box.innerHTML = `<button class="vx-x" type="button">×</button><h3>${esc(t.regOk)}</h3><p class="price-desc">${esc(d.message || t.regOkP)}</p><p class="muted">${esc(t.regOkP)}</p><button class="btn btn-primary btn-lg vx-submit">${esc(t.close)}</button>`;
      box.querySelector('.btn-primary').addEventListener('click', close);
      box.querySelector('.vx-x').addEventListener('click', close);
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  });
}

function revealAll() {
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' }) : null;
  document.querySelectorAll('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));
}

function render() {
  document.documentElement.lang = lang;
  document.documentElement.dataset.theme = theme;
  $('#app').innerHTML = page();
  ['createBtn', 'createBtn2', 'createBtn3'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => registerModal('', '')); });
  $('#langBtn').addEventListener('click', () => { lang = lang === 'tr' ? 'en' : 'tr'; try { localStorage.setItem('veilox.lang', lang); } catch { /* */ } render(); });
  $('#themeBtn').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('veilox.theme', theme); } catch { /* */ } render(); });
  const nav = $('#nav'); const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  revealAll();
  fillPricing();
}

render();
