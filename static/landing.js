// Veilox tanıtım: ürünü anlatır (özellikler + örnek görseller), fiyatlandırmayı gösterir, self-servis kayıt sunar.
// 7 dil (TR/EN/DE/FR/ES/AR/RU) + gece/gündüz tema. Arapça RTL. Tümü tek sayfada.
const $ = (s, r = document) => r.querySelector(s);
const svg = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('tr-TR');

// Desteklenen diller (kod, görünen ad) + sağdan-sola yazılanlar
const LANGS = [['tr', 'Türkçe'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['ar', 'العربية'], ['ru', 'Русский']];
const RTL = new Set(['ar']);
const LANG_CODES = LANGS.map(l => l[0]);

function detectLang() {
  try {
    const saved = localStorage.getItem('veilox.lang');
    if (saved && LANG_CODES.includes(saved)) return saved;
    for (const nav of (navigator.languages || [navigator.language || ''])) {
      const code = (nav || '').slice(0, 2).toLowerCase();
      if (LANG_CODES.includes(code)) return code;   // tarayıcı dili bizim dillerden biriyse otomatik seç
    }
  } catch { /* */ }
  return 'tr';
}
let lang = detectLang();
// Çok dilli metin seç: istenen dil → İngilizce → Türkçe (eksik çeviri güvenli şekilde düşer)
const L = o => (o == null ? '' : (typeof o === 'string' ? o : (o[lang] ?? o.en ?? o.tr ?? '')));

let site = { central: false, merkez_url: null };
let theme = (() => { try { return localStorage.getItem('veilox.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } })();

// ---- Arayüz metinleri (sabit etiketler) ----
const T = {
  tr: {
    nav: ['Özellikler', 'Toplantı', 'Paketler', 'Güvenlik'], navMods: 'Modüller', navScreens: 'Ekranlar',
    login: 'Merkez girişi', create: 'Firma girişi', apply: 'Hemen başvurun',
    heroPill: 'Üretimden sahaya, toplantıdan ofise tek platform',
    heroH: ['Fabrikanızı ', 'tek ekrandan', ' yönetin.'],
    heroLead: 'Üretim, iş emri, stok, satın alma, saha ve uçuş; görüntülü toplantı, mesajlaşma, telsiz ve yapay zeka asistanı; hatta uygulama içi ofis belgeleri — hepsi gerçek zamanlı ve tek yerde. Bulutta barındırın ya da kendi sunucunuza kurun.',
    heroCta: ['Hemen başvurun', 'Özellikleri gör'],
    heroPoints: ['Canlı üretim ve yazıcı takibi', 'Görüntülü toplantı ve telsiz', 'Yapay zeka asistanı'],
    stats: [['20+', 'modül tek çatı altında'], ['Canlı', 'üretim, yazıcı ve sunucu durumu'], ['Online / Offline', 'bulut ya da kendi sunucunuz'], ['7 dil', 'çok dilli arayüz']],
    featEye: 'Özellikler', featH: 'Fabrikanın her köşesi için bir modül',
    featP: 'Her kullanıcı yalnızca rolünün gerektirdiği modülleri görür. İster bulutta, ister kendi sunucunuzda.',
    modEye: 'Modüller', modH: 'Fabrikanın her işi için bir modül', modP: 'Yirmiden fazla modül tek platformda, gerçek zamanlı. Her kullanıcı yalnızca rolünün gerektirdiğini görür.',
    rowsEye: 'Yenilikçi sistemler', rowsH: 'Rakiplerde olmayan, işinize değen özellikler',
    screensEye: 'Ekran görüntüleri', screensH: 'Tüm özellikler, gerçek ekranlar', screensP: 'Uygulamadan birebir görüntüler.',
    pricingEye: 'Paketler', pricingH: 'Size uygun paket', pricingP: 'İhtiyacınıza uygun paketi seçin; bulut ya da kendi sunucunuza kurulum. Açık beta döneminde tüm paketler ücretsiz.',
    perMonth: '/ay', free: 'Ücretsiz', beta: 'Açık beta', start: 'Bu paketle başla', modsN: n => `${n} modül`,
    compareH: 'Modül karşılaştırması', compareP: 'Hangi paket hangi modülleri içerir', moduleCol: 'Modül', inc: 'var', exc: 'yok',
    modeOnline: 'Bulut (online)', modeOffline: 'Kendi sunucunuz (offline)', modeBoth: 'Bulut veya kendi sunucunuz',
    secEye: 'Güvenlik', secH: 'Veriniz sizde, kontrol sizde',
    secP: 'İsterseniz kendi sunucunuzda çalışır. Her işlem kayıt altındadır; her kullanıcı yalnızca yetkili olduğu bilgiyi görür.',
    ctaH: 'Firmanızı dakikalar içinde kurun', ctaP: 'Kaydolun, size özel master hesabınızla hemen başlayın.',
    foot: 'HEPGO ERP',
  },
  en: {
    nav: ['Features', 'Meetings', 'Packages', 'Security'], navMods: 'Modules', navScreens: 'Screens',
    login: 'Console sign-in', create: 'Company sign-in', apply: 'Apply now',
    heroPill: 'From production to the field, meetings to the office — one platform',
    heroH: ['Run your factory ', 'from one screen', '.'],
    heroLead: 'Production, work orders, stock, purchasing, field & flight; video meetings, chat, push-to-talk radio and an AI assistant; even in-app office documents — all real-time, in one place. Host it in the cloud or on your own server.',
    heroCta: ['Apply now', 'See features'],
    heroPoints: ['Live production & printer tracking', 'Video meetings & radio', 'AI assistant'],
    stats: [['20+', 'modules under one roof'], ['Live', 'production, printer & server status'], ['Online / Offline', 'cloud or your own server'], ['7 languages', 'multilingual interface']],
    featEye: 'Features', featH: 'A module for every corner of the factory',
    featP: 'Each user sees only the modules their role requires. In the cloud or on your own server.',
    modEye: 'Modules', modH: 'A module for every job in the factory', modP: 'Twenty-plus modules on one real-time platform. Each user sees only what their role needs.',
    rowsEye: 'Innovative systems', rowsH: 'Standout features that actually help',
    screensEye: 'Screenshots', screensH: 'All features, real screens', screensP: 'Actual in-app captures.',
    pricingEye: 'Packages', pricingH: 'A plan that fits', pricingP: 'Pick the plan that fits; cloud or on-premise install. All plans are free during open beta.',
    perMonth: '/mo', free: 'Free', beta: 'Open beta', start: 'Start with this plan', modsN: n => `${n} modules`,
    compareH: 'Module comparison', compareP: 'Which modules each plan includes', moduleCol: 'Module', inc: 'yes', exc: 'no',
    modeOnline: 'Cloud (online)', modeOffline: 'Your own server (offline)', modeBoth: 'Cloud or your own server',
    secEye: 'Security', secH: 'Your data, your control',
    secP: 'Runs on your own server if you want. Every action is logged; each user sees only what they are authorized to.',
    ctaH: 'Set up your company in minutes', ctaP: 'Sign up and start right away with your own master account.',
    foot: 'ERP',
  },
  de: {
    nav: ['Funktionen', 'Meetings', 'Pakete', 'Sicherheit'], navMods: 'Module', navScreens: 'Bildschirme',
    login: 'Zentrale-Anmeldung', create: 'Firmen-Anmeldung', apply: 'Jetzt bewerben',
    heroPill: 'Von der Produktion zum Außendienst, vom Meeting zum Büro — eine Plattform',
    heroH: ['Führen Sie Ihre Fabrik ', 'über einen Bildschirm', '.'],
    heroLead: 'Produktion, Arbeitsaufträge, Lager, Einkauf, Außendienst & Flug; Videokonferenzen, Chat, Push-to-Talk-Funk und ein KI-Assistent; sogar Office-Dokumente in der App — alles in Echtzeit, an einem Ort. In der Cloud oder auf Ihrem eigenen Server.',
    heroCta: ['Jetzt bewerben', 'Funktionen ansehen'],
    heroPoints: ['Live-Produktions- und Druckerverfolgung', 'Videokonferenzen & Funk', 'KI-Assistent'],
    stats: [['20+', 'Module unter einem Dach'], ['Live', 'Produktions-, Drucker- & Serverstatus'], ['Online / Offline', 'Cloud oder eigener Server'], ['7 Sprachen', 'mehrsprachige Oberfläche']],
    featEye: 'Funktionen', featH: 'Ein Modul für jeden Bereich der Fabrik',
    featP: 'Jeder Nutzer sieht nur die Module, die seine Rolle erfordert. In der Cloud oder auf Ihrem eigenen Server.',
    modEye: 'Module', modH: 'Ein Modul für jede Aufgabe in der Fabrik', modP: 'Mehr als zwanzig Module auf einer Echtzeit-Plattform. Jeder Nutzer sieht nur, was seine Rolle braucht.',
    rowsEye: 'Innovative Systeme', rowsH: 'Besondere Funktionen, die wirklich helfen',
    screensEye: 'Bildschirmfotos', screensH: 'Alle Funktionen, echte Bildschirme', screensP: 'Originalaufnahmen aus der App.',
    pricingEye: 'Pakete', pricingH: 'Das passende Paket', pricingP: 'Wählen Sie das passende Paket; Cloud oder Installation vor Ort. Während der offenen Beta sind alle Pakete kostenlos.',
    perMonth: '/Mon.', free: 'Kostenlos', beta: 'Offene Beta', start: 'Mit diesem Paket starten', modsN: n => `${n} Module`,
    compareH: 'Modulvergleich', compareP: 'Welches Paket welche Module enthält', moduleCol: 'Modul', inc: 'ja', exc: 'nein',
    modeOnline: 'Cloud (online)', modeOffline: 'Eigener Server (offline)', modeBoth: 'Cloud oder eigener Server',
    secEye: 'Sicherheit', secH: 'Ihre Daten, Ihre Kontrolle',
    secP: 'Läuft auf Wunsch auf Ihrem eigenen Server. Jede Aktion wird protokolliert; jeder Nutzer sieht nur, wozu er berechtigt ist.',
    ctaH: 'Richten Sie Ihre Firma in Minuten ein', ctaP: 'Registrieren Sie sich und starten Sie sofort mit Ihrem eigenen Master-Konto.',
    foot: 'ERP',
  },
  fr: {
    nav: ['Fonctionnalités', 'Réunions', 'Forfaits', 'Sécurité'], navMods: 'Modules', navScreens: 'Écrans',
    login: 'Connexion console', create: 'Connexion entreprise', apply: 'Postuler',
    heroPill: 'De la production au terrain, des réunions au bureau — une seule plateforme',
    heroH: ['Gérez votre usine ', 'depuis un seul écran', '.'],
    heroLead: 'Production, ordres de travail, stock, achats, terrain et vol ; visioconférences, messagerie, talkie-walkie et assistant IA ; même des documents bureautiques intégrés — le tout en temps réel, au même endroit. Dans le cloud ou sur votre propre serveur.',
    heroCta: ['Postuler', 'Voir les fonctionnalités'],
    heroPoints: ['Suivi production & imprimantes en direct', 'Visioconférences & talkie-walkie', 'Assistant IA'],
    stats: [['20+', 'modules réunis'], ['En direct', 'production, imprimantes & serveurs'], ['Online / Offline', 'cloud ou votre serveur'], ['7 langues', 'interface multilingue']],
    featEye: 'Fonctionnalités', featH: 'Un module pour chaque recoin de l’usine',
    featP: 'Chaque utilisateur ne voit que les modules requis par son rôle. Dans le cloud ou sur votre propre serveur.',
    modEye: 'Modules', modH: 'Un module pour chaque tâche de l’usine', modP: 'Plus de vingt modules sur une plateforme en temps réel. Chaque utilisateur ne voit que ce dont son rôle a besoin.',
    rowsEye: 'Systèmes innovants', rowsH: 'Des fonctions distinctives vraiment utiles',
    screensEye: 'Captures d’écran', screensH: 'Toutes les fonctions, de vrais écrans', screensP: 'Captures réelles de l’application.',
    pricingEye: 'Forfaits', pricingH: 'Un forfait adapté', pricingP: 'Choisissez le forfait adapté ; cloud ou installation sur site. Tous les forfaits sont gratuits pendant la bêta ouverte.',
    perMonth: '/mois', free: 'Gratuit', beta: 'Bêta ouverte', start: 'Commencer avec ce forfait', modsN: n => `${n} modules`,
    compareH: 'Comparaison des modules', compareP: 'Quels modules chaque forfait inclut', moduleCol: 'Module', inc: 'oui', exc: 'non',
    modeOnline: 'Cloud (online)', modeOffline: 'Votre serveur (offline)', modeBoth: 'Cloud ou votre serveur',
    secEye: 'Sécurité', secH: 'Vos données, votre contrôle',
    secP: 'Fonctionne sur votre propre serveur si vous le souhaitez. Chaque action est journalisée ; chaque utilisateur ne voit que ce à quoi il a droit.',
    ctaH: 'Créez votre entreprise en quelques minutes', ctaP: 'Inscrivez-vous et démarrez tout de suite avec votre compte master.',
    foot: 'ERP',
  },
  es: {
    nav: ['Funciones', 'Reuniones', 'Planes', 'Seguridad'], navMods: 'Módulos', navScreens: 'Pantallas',
    login: 'Acceso consola', create: 'Acceso empresa', apply: 'Solicitar ahora',
    heroPill: 'De la producción al campo, de las reuniones a la oficina: una sola plataforma',
    heroH: ['Gestione su fábrica ', 'desde una sola pantalla', '.'],
    heroLead: 'Producción, órdenes de trabajo, stock, compras, campo y vuelo; videollamadas, mensajería, radio y un asistente de IA; incluso documentos de oficina dentro de la app — todo en tiempo real, en un solo lugar. En la nube o en su propio servidor.',
    heroCta: ['Solicitar ahora', 'Ver funciones'],
    heroPoints: ['Seguimiento de producción e impresoras en vivo', 'Videollamadas y radio', 'Asistente de IA'],
    stats: [['20+', 'módulos bajo un mismo techo'], ['En vivo', 'producción, impresoras y servidor'], ['Online / Offline', 'nube o su propio servidor'], ['7 idiomas', 'interfaz multilingüe']],
    featEye: 'Funciones', featH: 'Un módulo para cada rincón de la fábrica',
    featP: 'Cada usuario ve solo los módulos que requiere su rol. En la nube o en su propio servidor.',
    modEye: 'Módulos', modH: 'Un módulo para cada tarea de la fábrica', modP: 'Más de veinte módulos en una plataforma en tiempo real. Cada usuario ve solo lo que su rol necesita.',
    rowsEye: 'Sistemas innovadores', rowsH: 'Funciones distintivas que de verdad ayudan',
    screensEye: 'Capturas de pantalla', screensH: 'Todas las funciones, pantallas reales', screensP: 'Capturas reales de la aplicación.',
    pricingEye: 'Planes', pricingH: 'Un plan a su medida', pricingP: 'Elija el plan que encaje; nube o instalación local. Todos los planes son gratuitos durante la beta abierta.',
    perMonth: '/mes', free: 'Gratis', beta: 'Beta abierta', start: 'Empezar con este plan', modsN: n => `${n} módulos`,
    compareH: 'Comparación de módulos', compareP: 'Qué módulos incluye cada plan', moduleCol: 'Módulo', inc: 'sí', exc: 'no',
    modeOnline: 'Nube (online)', modeOffline: 'Su propio servidor (offline)', modeBoth: 'Nube o su propio servidor',
    secEye: 'Seguridad', secH: 'Sus datos, su control',
    secP: 'Funciona en su propio servidor si lo desea. Cada acción queda registrada; cada usuario ve solo aquello a lo que está autorizado.',
    ctaH: 'Cree su empresa en minutos', ctaP: 'Regístrese y empiece de inmediato con su propia cuenta master.',
    foot: 'ERP',
  },
  ar: {
    nav: ['المزايا', 'الاجتماعات', 'الباقات', 'الأمان'], navMods: 'الوحدات', navScreens: 'الشاشات',
    login: 'دخول المركز', create: 'دخول الشركة', apply: 'قدِّم الآن',
    heroPill: 'من الإنتاج إلى الميدان، ومن الاجتماعات إلى المكتب — منصة واحدة',
    heroH: ['أدِر مصنعك ', 'من شاشة واحدة', '.'],
    heroLead: 'الإنتاج وأوامر العمل والمخزون والمشتريات والميدان والطيران؛ اجتماعات مرئية ومراسلة ولاسلكي ومساعد ذكاء اصطناعي؛ وحتى مستندات مكتبية داخل التطبيق — كل ذلك في الوقت الفعلي وفي مكان واحد. استضِفه في السحابة أو على خادمك الخاص.',
    heroCta: ['قدِّم الآن', 'استعرض المزايا'],
    heroPoints: ['متابعة حية للإنتاج والطابعات', 'اجتماعات مرئية ولاسلكي', 'مساعد ذكاء اصطناعي'],
    stats: [['20+', 'وحدة تحت سقف واحد'], ['مباشر', 'حالة الإنتاج والطابعات والخادم'], ['Online / Offline', 'السحابة أو خادمك الخاص'], ['7 لغات', 'واجهة متعددة اللغات']],
    featEye: 'المزايا', featH: 'وحدة لكل ركن في المصنع',
    featP: 'يرى كل مستخدم الوحدات التي يتطلبها دوره فقط. في السحابة أو على خادمك الخاص.',
    modEye: 'الوحدات', modH: 'وحدة لكل مهمة في المصنع', modP: 'أكثر من عشرين وحدة على منصة واحدة في الوقت الفعلي. يرى كل مستخدم ما يحتاجه دوره فقط.',
    rowsEye: 'أنظمة مبتكرة', rowsH: 'مزايا مميزة تفيد عملك فعلاً',
    screensEye: 'لقطات الشاشة', screensH: 'كل المزايا، شاشات حقيقية', screensP: 'لقطات فعلية من داخل التطبيق.',
    pricingEye: 'الباقات', pricingH: 'باقة تناسبك', pricingP: 'اختر الباقة المناسبة؛ سحابة أو تثبيت محلي. جميع الباقات مجانية خلال الإصدار التجريبي المفتوح.',
    perMonth: '/شهر', free: 'مجاني', beta: 'نسخة تجريبية', start: 'ابدأ بهذه الباقة', modsN: n => `${n} وحدة`,
    compareH: 'مقارنة الوحدات', compareP: 'ما الوحدات التي تتضمنها كل باقة', moduleCol: 'الوحدة', inc: 'نعم', exc: 'لا',
    modeOnline: 'سحابة (online)', modeOffline: 'خادمك الخاص (offline)', modeBoth: 'سحابة أو خادمك الخاص',
    secEye: 'الأمان', secH: 'بياناتك لك، والتحكم لك',
    secP: 'يعمل على خادمك الخاص إن أردت. كل إجراء مُسجَّل؛ ويرى كل مستخدم ما هو مخوَّل له فقط.',
    ctaH: 'أنشئ شركتك في دقائق', ctaP: 'سجِّل وابدأ فوراً بحساب المدير الخاص بك.',
    foot: 'ERP',
  },
  ru: {
    nav: ['Возможности', 'Встречи', 'Пакеты', 'Безопасность'], navMods: 'Модули', navScreens: 'Экраны',
    login: 'Вход в центр', create: 'Вход компании', apply: 'Подать заявку',
    heroPill: 'От производства до объекта, от встреч до офиса — единая платформа',
    heroH: ['Управляйте фабрикой ', 'с одного экрана', '.'],
    heroLead: 'Производство, наряды, склад, закупки, выезды и полёты; видеоконференции, чат, рация и ИИ-ассистент; даже офисные документы внутри приложения — всё в реальном времени и в одном месте. В облаке или на вашем сервере.',
    heroCta: ['Подать заявку', 'Смотреть возможности'],
    heroPoints: ['Живой контроль производства и принтеров', 'Видеоконференции и рация', 'ИИ-ассистент'],
    stats: [['20+', 'модулей под одной крышей'], ['Онлайн', 'статус производства, принтеров и сервера'], ['Online / Offline', 'облако или ваш сервер'], ['7 языков', 'многоязычный интерфейс']],
    featEye: 'Возможности', featH: 'Модуль для каждого участка фабрики',
    featP: 'Каждый пользователь видит только модули, нужные его роли. В облаке или на вашем сервере.',
    modEye: 'Модули', modH: 'Модуль для каждой задачи фабрики', modP: 'Более двадцати модулей на одной платформе в реальном времени. Каждый видит только то, что нужно его роли.',
    rowsEye: 'Инновационные системы', rowsH: 'Отличительные функции, которые реально помогают',
    screensEye: 'Скриншоты', screensH: 'Все функции, реальные экраны', screensP: 'Настоящие снимки из приложения.',
    pricingEye: 'Пакеты', pricingH: 'Подходящий пакет', pricingP: 'Выберите подходящий пакет; облако или установка на месте. В период открытой бета-версии все пакеты бесплатны.',
    perMonth: '/мес', free: 'Бесплатно', beta: 'Открытая бета', start: 'Начать с этим пакетом', modsN: n => `${n} модулей`,
    compareH: 'Сравнение модулей', compareP: 'Какие модули включает каждый пакет', moduleCol: 'Модуль', inc: 'да', exc: 'нет',
    modeOnline: 'Облако (online)', modeOffline: 'Ваш сервер (offline)', modeBoth: 'Облако или ваш сервер',
    secEye: 'Безопасность', secH: 'Ваши данные, ваш контроль',
    secP: 'При желании работает на вашем сервере. Каждое действие журналируется; каждый видит только то, на что имеет право.',
    ctaH: 'Создайте компанию за минуты', ctaP: 'Зарегистрируйтесь и сразу начните со своей учётной записью master.',
    foot: 'ERP',
  },
};

// Özellik kartları: ikon + başlık/açıklama (çok dilli) + renk + yumuşak
const FEATURES = [
  ['<path d="M3 21h18M5 21V9l5 3V9l5 3V5l4 2v14"/>',
    { tr: 'Üretim ve iş emirleri', en: 'Production & work orders', de: 'Produktion & Arbeitsaufträge', fr: 'Production & ordres de travail', es: 'Producción y órdenes de trabajo', ar: 'الإنتاج وأوامر العمل', ru: 'Производство и наряды' },
    { tr: 'Sipariş → üretim → depo → montaj → kalibrasyon akışı; parça bazında takip.', en: 'Order → production → warehouse → assembly → calibration; part-level tracking.', de: 'Bestellung → Produktion → Lager → Montage → Kalibrierung; Verfolgung auf Teileebene.', fr: 'Commande → production → stock → assemblage → calibration ; suivi par pièce.', es: 'Pedido → producción → almacén → montaje → calibración; seguimiento por pieza.', ar: 'الطلب ← الإنتاج ← المخزن ← التجميع ← المعايرة؛ تتبّع على مستوى القطعة.', ru: 'Заказ → производство → склад → сборка → калибровка; учёт по деталям.' },
    '#2f6fed', '#eaf1ff'],
  ['<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17v4h10v-4"/>',
    { tr: '3B yazıcı odası', en: '3D printer room', de: '3D-Druckerraum', fr: 'Salle d’imprimantes 3D', es: 'Sala de impresoras 3D', ar: 'غرفة طابعات ثلاثية الأبعاد', ru: 'Комната 3D-принтеров' },
    { tr: 'Yazıcıların canlı durumu, 3B oda görünümü, doğrudan G-code gönderimi.', en: 'Live printer status, 3D room view, direct G-code dispatch.', de: 'Live-Druckerstatus, 3D-Raumansicht, direkter G-Code-Versand.', fr: 'État des imprimantes en direct, vue 3D de la salle, envoi G-code direct.', es: 'Estado de impresoras en vivo, vista 3D de la sala, envío directo de G-code.', ar: 'حالة الطابعات المباشرة، عرض ثلاثي الأبعاد للغرفة، إرسال G-code مباشر.', ru: 'Живой статус принтеров, 3D-вид комнаты, прямая отправка G-code.' },
    '#7c5cf5', '#f1ecff'],
  ['<path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12z"/>',
    { tr: 'Görüntülü toplantı ve mesajlaşma', en: 'Video meetings & messaging', de: 'Videokonferenzen & Messaging', fr: 'Visioconférences & messagerie', es: 'Videollamadas y mensajería', ar: 'اجتماعات مرئية ومراسلة', ru: 'Видеоконференции и сообщения' },
    { tr: 'Davet koduyla toplantı, ekran paylaşımı, el kaldırma; sohbet, sesli arama ve telsiz.', en: 'Meetings by invite code, screen share, raise hand; chat, voice calls and radio.', de: 'Meetings per Einladungscode, Bildschirmfreigabe, Handheben; Chat, Sprachanrufe und Funk.', fr: 'Réunions par code d’invitation, partage d’écran, lever la main ; chat, appels vocaux et talkie-walkie.', es: 'Reuniones por código de invitación, compartir pantalla, levantar la mano; chat, llamadas de voz y radio.', ar: 'اجتماعات برمز دعوة، مشاركة الشاشة، رفع اليد؛ محادثة ومكالمات صوتية ولاسلكي.', ru: 'Встречи по коду приглашения, демонстрация экрана, поднятие руки; чат, звонки и рация.' },
    '#ec4899', '#fdebf4'],
  ['<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    { tr: 'Belge Yönetim (ofis)', en: 'Document suite (office)', de: 'Dokumentensuite (Office)', fr: 'Suite bureautique', es: 'Suite de documentos (oficina)', ar: 'حزمة المستندات (مكتب)', ru: 'Офисные документы' },
    { tr: 'Uygulama içi Excel, Word ve Sunum; paylaşım izni ve sürüm geçmişiyle — dış programsız.', en: 'In-app Excel, Word and Slides; with sharing permissions and version history — no external apps.', de: 'Excel, Word und Präsentationen in der App; mit Freigaberechten und Versionsverlauf — ohne externe Programme.', fr: 'Excel, Word et présentations intégrés ; avec permissions de partage et historique de versions — sans applications externes.', es: 'Excel, Word y presentaciones dentro de la app; con permisos de uso compartido e historial de versiones, sin programas externos.', ar: 'Excel وWord والعروض داخل التطبيق؛ مع صلاحيات المشاركة وسجل الإصدارات — دون برامج خارجية.', ru: 'Excel, Word и презентации в приложении; с правами доступа и историей версий — без сторонних программ.' },
    '#0ea5a4', '#e3f7f6'],
  ['<path d="M12 3l2.5 2.5M12 3L9.5 5.5M12 3v6"/><rect x="4" y="9" width="16" height="11" rx="2"/>',
    { tr: 'Endüstriyel tasarım', en: 'Industrial design', de: 'Industriedesign', fr: 'Conception industrielle', es: 'Diseño industrial', ar: 'التصميم الصناعي', ru: 'Промышленный дизайн' },
    { tr: 'Proje, montaj ve alt çizimler; STEP dosyaları için uygulama içi 3B önizleme, sürüm geçmişi.', en: 'Projects, assemblies and sub-drawings; in-app 3D preview for STEP files, version history.', de: 'Projekte, Baugruppen und Teilzeichnungen; 3D-Vorschau für STEP-Dateien in der App, Versionsverlauf.', fr: 'Projets, assemblages et sous-plans ; aperçu 3D intégré des fichiers STEP, historique de versions.', es: 'Proyectos, ensamblajes y subdibujos; vista previa 3D de archivos STEP en la app, historial de versiones.', ar: 'مشاريع وتجميعات ورسومات فرعية؛ معاينة ثلاثية الأبعاد لملفات STEP داخل التطبيق، وسجل إصدارات.', ru: 'Проекты, сборки и подчертежи; 3D-просмотр STEP-файлов в приложении, история версий.' },
    '#9333ea', '#f4e8fd'],
  ['<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>',
    { tr: 'Stok, satın alma ve MRP', en: 'Stock, purchasing & MRP', de: 'Lager, Einkauf & MRP', fr: 'Stock, achats & MRP', es: 'Stock, compras y MRP', ar: 'المخزون والمشتريات وMRP', ru: 'Склад, закупки и MRP' },
    { tr: 'Çoklu depo, kritik stok uyarıları, talep-teklif, Mikro ERP aktarımı.', en: 'Multi-warehouse, critical-stock alerts, requests-quotes, Micro ERP sync.', de: 'Mehrlager, Warnungen bei kritischem Bestand, Anfragen-Angebote, Micro-ERP-Sync.', fr: 'Multi-entrepôt, alertes de stock critique, demandes-devis, synchro Micro ERP.', es: 'Multi-almacén, alertas de stock crítico, solicitudes-ofertas, sincronización con Micro ERP.', ar: 'مستودعات متعددة، تنبيهات المخزون الحرج، طلبات وعروض أسعار، مزامنة Micro ERP.', ru: 'Несколько складов, оповещения о критическом остатке, заявки-предложения, синхронизация с Micro ERP.' },
    '#16a34a', '#e6f7ec'],
  ['<path d="M2 16l20-7-7 13-3-6z"/>',
    { tr: 'Saha ve uçuş', en: 'Field & flight', de: 'Außendienst & Flug', fr: 'Terrain & vol', es: 'Campo y vuelo', ar: 'الميدان والطيران', ru: 'Выезды и полёты' },
    { tr: 'Saha görevleri, araç ve yol kaydı, GPS’li bina kontrolü, uçuş logu analizi.', en: 'Field tasks, vehicle & route logs, GPS building patrol, flight-log analysis.', de: 'Außendienstaufgaben, Fahrzeug- & Routenprotokolle, GPS-Gebäuderundgang, Flugprotokollanalyse.', fr: 'Tâches de terrain, journaux véhicules & itinéraires, ronde de bâtiment GPS, analyse des journaux de vol.', es: 'Tareas de campo, registros de vehículos y rutas, ronda de edificio con GPS, análisis de registros de vuelo.', ar: 'مهام ميدانية، سجلات المركبات والمسارات، جولة مبنى بنظام GPS، تحليل سجل الطيران.', ru: 'Полевые задачи, журналы транспорта и маршрутов, обход здания по GPS, анализ логов полёта.' },
    '#0284c7', '#e2f2fb'],
  ['<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/>',
    { tr: 'İK, sekreterya ve temizlik', en: 'HR, secretariat & cleaning', de: 'Personal, Sekretariat & Reinigung', fr: 'RH, secrétariat & nettoyage', es: 'RR. HH., secretaría y limpieza', ar: 'الموارد البشرية والسكرتارية والنظافة', ru: 'Кадры, секретариат и уборка' },
    { tr: 'Özlük dosyaları, izinler; misafir/kargo/telefon; günlük temizlik çeklisti.', en: 'Personnel files, leaves; guests/cargo/calls; daily cleaning checklist.', de: 'Personalakten, Urlaub; Gäste/Fracht/Anrufe; tägliche Reinigungscheckliste.', fr: 'Dossiers du personnel, congés ; visiteurs/colis/appels ; checklist de nettoyage quotidienne.', es: 'Expedientes de personal, permisos; visitas/paquetería/llamadas; lista de limpieza diaria.', ar: 'ملفات الموظفين والإجازات؛ الزوار/الشحن/المكالمات؛ قائمة تنظيف يومية.', ru: 'Личные дела, отпуска; гости/грузы/звонки; ежедневный чек-лист уборки.' },
    '#f59e0b', '#fff4e0'],
  ['<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    { tr: 'Yapay zeka asistanı', en: 'AI assistant', de: 'KI-Assistent', fr: 'Assistant IA', es: 'Asistente de IA', ar: 'مساعد الذكاء الاصطناعي', ru: 'ИИ-ассистент' },
    { tr: 'Yetkinize göre salt-okunur sorgular; değişiklikler yönetici onayıyla.', en: 'Read-only queries scoped to your permissions; changes via admin approval.', de: 'Schreibgeschützte Abfragen im Rahmen Ihrer Rechte; Änderungen mit Admin-Freigabe.', fr: 'Requêtes en lecture seule selon vos droits ; modifications avec validation admin.', es: 'Consultas de solo lectura según sus permisos; cambios con aprobación del administrador.', ar: 'استعلامات للقراءة فقط وفق صلاحياتك؛ والتغييرات بموافقة المدير.', ru: 'Запросы только для чтения в рамках ваших прав; изменения — с одобрения администратора.' },
    '#dc2626', '#fdecec'],
];

// Yenilikçi sistem satırları (örnek görsellerle); ilk sırada toplantı sistemi
const ROWS = [
  { id: 'meet', img: ['/static/img/landing/mob-meet.webp?v=2', '/static/img/landing/tab-messages.webp?v=2'], solo: false,
    eye: { tr: 'Görüntülü toplantı', en: 'Video meetings', de: 'Videokonferenzen', fr: 'Visioconférences', es: 'Videollamadas', ar: 'اجتماعات مرئية', ru: 'Видеоконференции' },
    h: { tr: 'Zoom tarzı toplantı, ekibinizin içinde', en: 'Zoom-style meetings, inside your team', de: 'Meetings im Zoom-Stil, in Ihrem Team', fr: 'Réunions façon Zoom, au sein de votre équipe', es: 'Reuniones estilo Zoom, dentro de su equipo', ar: 'اجتماعات بأسلوب Zoom، داخل فريقك', ru: 'Встречи в стиле Zoom, внутри вашей команды' },
    p: { tr: 'Davet koduyla görüntülü toplantı; şirket dışından katılımcılar yalnızca bir linkle, giriş yapmadan katılır. Bekleme odası, ekran paylaşımı, el kaldırma sırası, toplantı içi sohbet ve kayıtların metne çevrilmesi.', en: 'Video meetings by invite code; external guests join with just a link, no sign-in. Waiting room, screen share, raise-hand queue, in-meeting chat and transcript of recordings.', de: 'Videokonferenzen per Einladungscode; externe Gäste treten nur über einen Link ohne Anmeldung bei. Warteraum, Bildschirmfreigabe, Handheben-Warteschlange, Chat im Meeting und Transkript von Aufnahmen.', fr: 'Visioconférences par code d’invitation ; les invités externes rejoignent par un simple lien, sans connexion. Salle d’attente, partage d’écran, file de levée de main, chat en réunion et transcription des enregistrements.', es: 'Videollamadas por código de invitación; los invitados externos entran solo con un enlace, sin iniciar sesión. Sala de espera, compartir pantalla, cola para levantar la mano, chat en la reunión y transcripción de las grabaciones.', ar: 'اجتماعات مرئية برمز دعوة؛ ينضم الضيوف الخارجيون برابط فقط دون تسجيل دخول. غرفة انتظار، مشاركة الشاشة، طابور رفع اليد، محادثة داخل الاجتماع، وتفريغ التسجيلات نصّياً.', ru: 'Видеоконференции по коду приглашения; внешние гости подключаются по ссылке без входа. Комната ожидания, демонстрация экрана, очередь поднятых рук, чат во встрече и расшифровка записей.' },
    ticks: { tr: ['Bekleme odası ve katılımcı kabulü', 'Ekran paylaşımı ve el kaldırma', 'Kayıtların metne çevrilmesi'], en: ['Waiting room & admit guests', 'Screen share & raise hand', 'Transcripts of recordings'], de: ['Warteraum & Gäste zulassen', 'Bildschirmfreigabe & Handheben', 'Transkripte von Aufnahmen'], fr: ['Salle d’attente & admission des invités', 'Partage d’écran & lever la main', 'Transcriptions des enregistrements'], es: ['Sala de espera y admisión de invitados', 'Compartir pantalla y levantar la mano', 'Transcripción de grabaciones'], ar: ['غرفة انتظار وقبول المشاركين', 'مشاركة الشاشة ورفع اليد', 'تفريغ التسجيلات نصّياً'], ru: ['Комната ожидания и приём гостей', 'Демонстрация экрана и поднятие руки', 'Расшифровка записей'] } },
  { id: '', img: ['/static/img/landing/shots/m-live.webp?v=2', '/static/img/landing/shots/dashboard.webp?v=2'], solo: false, rev: true,
    eye: { tr: 'Şirket içi sosyal ağ', en: 'Company social network', de: 'Internes soziales Netzwerk', fr: 'Réseau social interne', es: 'Red social interna', ar: 'شبكة اجتماعية داخلية', ru: 'Внутренняя соцсеть' },
    h: { tr: 'Şirketten haberler, sahadan canlı yayın', en: 'Company news, live from the field', de: 'Firmennews, live vom Außendienst', fr: 'Actualités de l’entreprise, en direct du terrain', es: 'Noticias de la empresa, en directo desde el campo', ar: 'أخبار الشركة، بث مباشر من الميدان', ru: 'Новости компании, прямой эфир с объекта' },
    p: { tr: 'Instagram kadar tanıdık bir akış: fotoğraf ve video paylaşımı, kalp ve yorumlar, kaydetme. Sahadaki ekip tek dokunuşla canlı yayın açar; herkese anında bildirim düşer, izleyenler yorum ve kalp gönderir, yayın bitince kayıt akışta paylaşılır.', en: 'A feed as familiar as Instagram: photo and video posts, hearts and comments, saves. Field teams go live with one tap; everyone is notified instantly, viewers send comments and hearts, and the recording is posted when the stream ends.', de: 'Ein Feed so vertraut wie Instagram: Foto- und Videobeiträge, Herzen und Kommentare, Speichern. Außendienstteams gehen mit einem Tippen live; alle werden sofort benachrichtigt, Zuschauer senden Kommentare und Herzen, und die Aufnahme wird nach dem Stream gepostet.', fr: 'Un fil aussi familier qu’Instagram : publications photo et vidéo, cœurs et commentaires, enregistrements. Les équipes de terrain passent en direct d’un geste ; tout le monde est notifié aussitôt, les spectateurs envoient commentaires et cœurs, et l’enregistrement est publié à la fin du direct.', es: 'Un muro tan familiar como Instagram: fotos y vídeos, corazones y comentarios, guardados. Los equipos de campo transmiten en vivo con un toque; todos reciben aviso al instante, los espectadores envían comentarios y corazones, y la grabación se publica al terminar.', ar: 'خلاصة مألوفة كإنستغرام: منشورات صور وفيديو، إعجابات وتعليقات، وحفظ. يبدأ فريق الميدان البث المباشر بلمسة واحدة؛ يصل الإشعار للجميع فوراً، ويرسل المشاهدون التعليقات والإعجابات، ويُنشر التسجيل عند انتهاء البث.', ru: 'Лента, знакомая как Instagram: фото и видео, лайки и комментарии, сохранения. Полевые команды выходят в эфир одним касанием; все получают мгновенное уведомление, зрители шлют комментарии и лайки, а запись публикуется после эфира.' },
    ticks: { tr: ['Fotoğraf / video, kalp, yorum ve yanıt', 'Tek dokunuşla canlı yayın + anlık bildirim', 'Tam ekran, kaydırarak gezinme'], en: ['Photo / video, hearts, comments & replies', 'One-tap live streaming + instant alerts', 'Full-screen, swipe to browse'], de: ['Foto / Video, Herzen, Kommentare & Antworten', 'Live-Streaming per Tipp + Sofortbenachrichtigungen', 'Vollbild, Wischen zum Blättern'], fr: ['Photo / vidéo, cœurs, commentaires & réponses', 'Direct en un geste + alertes instantanées', 'Plein écran, balayer pour parcourir'], es: ['Foto / vídeo, corazones, comentarios y respuestas', 'Directo con un toque + avisos instantáneos', 'Pantalla completa, deslizar para navegar'], ar: ['صور/فيديو، إعجابات، تعليقات وردود', 'بث مباشر بلمسة + إشعارات فورية', 'ملء الشاشة، التمرير للتصفح'], ru: ['Фото/видео, лайки, комментарии и ответы', 'Эфир одним касанием + мгновенные уведомления', 'Полный экран, листание свайпом'] } },
  { id: '', img: ['/static/img/landing/shots/printers.webp?v=2'], solo: true,
    eye: { tr: 'Yazıcı odası', en: 'Printer room', de: 'Druckerraum', fr: 'Salle d’imprimantes', es: 'Sala de impresoras', ar: 'غرفة الطابعات', ru: 'Комната принтеров' },
    h: { tr: 'Onlarca 3B yazıcı, tek bakışta', en: 'Dozens of 3D printers, at a glance', de: 'Dutzende 3D-Drucker auf einen Blick', fr: 'Des dizaines d’imprimantes 3D, en un coup d’œil', es: 'Docenas de impresoras 3D, de un vistazo', ar: 'عشرات الطابعات ثلاثية الأبعاد بنظرة واحدة', ru: 'Десятки 3D-принтеров с одного взгляда' },
    p: { tr: 'Yazıcılar ağdan otomatik bulunur, durumları saniyeler içinde okunur. Kayıtsız baskı ya da hata anında uyarı düşer; yazıcıya doğrudan G-code gönderilir.', en: 'Printers are auto-discovered on the network and polled within seconds. Unregistered prints or errors raise instant alerts; send G-code straight to the printer.', de: 'Drucker werden im Netzwerk automatisch erkannt und im Sekundentakt abgefragt. Nicht erfasste Drucke oder Fehler lösen sofort Warnungen aus; G-Code wird direkt an den Drucker gesendet.', fr: 'Les imprimantes sont détectées automatiquement sur le réseau et interrogées en quelques secondes. Impressions non enregistrées ou erreurs déclenchent des alertes instantanées ; envoi du G-code directement à l’imprimante.', es: 'Las impresoras se descubren automáticamente en la red y se consultan en segundos. Impresiones no registradas o errores generan alertas al instante; envíe G-code directo a la impresora.', ar: 'تُكتشف الطابعات تلقائياً على الشبكة وتُستعلم خلال ثوانٍ. الطباعة غير المسجلة أو الأخطاء تطلق تنبيهات فورية؛ أرسل G-code مباشرة إلى الطابعة.', ru: 'Принтеры автоматически находятся в сети и опрашиваются за секунды. Незарегистрированная печать или ошибки — мгновенные оповещения; отправка G-code прямо на принтер.' },
    ticks: { tr: ['Liste ve 3B oda görünümü', 'Doğrudan G-code gönderimi', 'Hata ve uyumsuzluk uyarıları'], en: ['List & 3D room view', 'Direct G-code dispatch', 'Error & mismatch alerts'], de: ['Listen- & 3D-Raumansicht', 'Direkter G-Code-Versand', 'Fehler- & Abweichungswarnungen'], fr: ['Vue liste & salle 3D', 'Envoi G-code direct', 'Alertes d’erreur & d’incohérence'], es: ['Vista de lista y sala 3D', 'Envío directo de G-code', 'Alertas de error y discrepancia'], ar: ['عرض القائمة والغرفة ثلاثية الأبعاد', 'إرسال G-code مباشر', 'تنبيهات الأخطاء وعدم التطابق'], ru: ['Список и 3D-вид комнаты', 'Прямая отправка G-code', 'Оповещения об ошибках и несоответствиях'] } },
  { id: '', img: ['/static/img/landing/shots/finance-statements.webp?v=2'], solo: true, rev: true,
    eye: { tr: 'Finans', en: 'Finance', de: 'Finanzen', fr: 'Finance', es: 'Finanzas', ar: 'المالية', ru: 'Финансы' },
    h: { tr: 'Patronun görmesi gereken her şey, tek ekranda', en: 'Everything the owner needs to see, on one screen', de: 'Alles, was der Chef sehen muss, auf einem Bildschirm', fr: 'Tout ce que le dirigeant doit voir, sur un seul écran', es: 'Todo lo que el dueño necesita ver, en una pantalla', ar: 'كل ما يحتاج المالك رؤيته، في شاشة واحدة', ru: 'Всё, что нужно руководителю, на одном экране' },
    p: { tr: 'Kasa, banka ve cari hesaplar; 12 haftalık nakit akışı tahmini, alacak ve borç yaşlandırma, çek / senet portföyü. Muhasebe programınızla senkron mizan, gelir tablosu ve bilanço özeti.', en: 'Cash, bank and customer accounts; a 12-week cash-flow forecast, receivable and payable aging, cheque / note portfolio. Trial balance, income statement and balance sheet in sync with your accounting software.', de: 'Kassen-, Bank- und Debitorenkonten; 12-Wochen-Cashflow-Prognose, Forderungs- und Verbindlichkeits-Fälligkeiten, Scheck-/Wechselportfolio. Rohbilanz, Gewinn- und Verlustrechnung und Bilanzübersicht synchron mit Ihrer Buchhaltung.', fr: 'Caisse, banque et comptes clients ; prévision de trésorerie sur 12 semaines, balance âgée des créances et dettes, portefeuille de chèques / effets. Balance, compte de résultat et bilan synchronisés avec votre logiciel comptable.', es: 'Caja, banco y cuentas de clientes; previsión de tesorería a 12 semanas, antigüedad de cobros y pagos, cartera de cheques / pagarés. Balance de sumas, cuenta de resultados y balance sincronizados con su software contable.', ar: 'الصندوق والبنك وحسابات العملاء؛ توقّع تدفّق نقدي لـ12 أسبوعاً، أعمار الذمم المدينة والدائنة، محفظة شيكات/سندات. ميزان مراجعة وقائمة دخل وملخص ميزانية بالتزامن مع برنامج محاسبتك.', ru: 'Касса, банк и счета клиентов; прогноз денежного потока на 12 недель, старение дебиторки и кредиторки, портфель чеков/векселей. Оборотная ведомость, отчёт о прибылях и баланс в синхроне с вашей бухгалтерией.' },
    ticks: { tr: ['Nakit akışı tahmini ve yaşlandırma', 'Mizan, gelir tablosu, bilanço', 'Muhasebe programıyla tek yönlü senkron'], en: ['Cash-flow forecast & aging', 'Trial balance, P&L, balance sheet', 'One-way sync with accounting'], de: ['Cashflow-Prognose & Fälligkeiten', 'Rohbilanz, GuV, Bilanz', 'Einweg-Sync mit der Buchhaltung'], fr: ['Prévision de trésorerie & balance âgée', 'Balance, compte de résultat, bilan', 'Synchro unidirectionnelle avec la comptabilité'], es: ['Previsión de tesorería y antigüedad', 'Balance de sumas, resultados, balance', 'Sincronización unidireccional con contabilidad'], ar: ['توقّع التدفق النقدي والأعمار', 'ميزان مراجعة، قائمة دخل، ميزانية', 'مزامنة أحادية الاتجاه مع المحاسبة'], ru: ['Прогноз денежного потока и старение', 'Оборотка, ОПУ, баланс', 'Односторонняя синхронизация с бухгалтерией'] } },
  { id: '', img: ['/static/img/landing/shots/belge-word.webp?v=2'], solo: true,
    eye: { tr: 'Ofis belgeleri', en: 'Office documents', de: 'Office-Dokumente', fr: 'Documents bureautiques', es: 'Documentos de oficina', ar: 'مستندات المكتب', ru: 'Офисные документы' },
    h: { tr: 'Excel, Word ve Sunum — uygulama içinde', en: 'Excel, Word & Slides — in the app', de: 'Excel, Word & Präsentationen — in der App', fr: 'Excel, Word & présentations — dans l’app', es: 'Excel, Word y presentaciones — en la app', ar: 'Excel وWord والعروض — داخل التطبيق', ru: 'Excel, Word и презентации — в приложении' },
    p: { tr: 'Dış programa gerek yok. Belgelerinizi oluşturun, otomatik kaydedin; kime görüntüleme, kime düzenleme izni vereceğinizi seçin. Her kaydetmede sürüm geçmişi tutulur.', en: 'No external apps needed. Create documents, auto-save; choose who can view and who can edit. Version history is kept on every save.', de: 'Keine externen Programme nötig. Dokumente erstellen, automatisch speichern; festlegen, wer ansehen und wer bearbeiten darf. Bei jedem Speichern wird der Versionsverlauf geführt.', fr: 'Aucune application externe. Créez des documents, enregistrement automatique ; choisissez qui peut consulter et qui peut modifier. Historique de versions à chaque enregistrement.', es: 'Sin programas externos. Cree documentos, guardado automático; elija quién puede ver y quién editar. Se guarda historial de versiones en cada guardado.', ar: 'لا حاجة لبرامج خارجية. أنشئ مستنداتك، حفظ تلقائي؛ اختر من يطّلع ومن يحرّر. يُحفظ سجل الإصدارات عند كل حفظ.', ru: 'Без сторонних программ. Создавайте документы с автосохранением; выбирайте, кто смотрит и кто редактирует. История версий при каждом сохранении.' },
    ticks: { tr: ['Excel / Word / Sunum', 'Görüntüleme & düzenleme izni', 'Sürüm geçmişi ve geri yükleme'], en: ['Excel / Word / Slides', 'View & edit permissions', 'Version history & restore'], de: ['Excel / Word / Präsentation', 'Ansehen- & Bearbeiten-Rechte', 'Versionsverlauf & Wiederherstellung'], fr: ['Excel / Word / Présentation', 'Droits de consultation & modification', 'Historique de versions & restauration'], es: ['Excel / Word / Presentación', 'Permisos de ver y editar', 'Historial de versiones y restauración'], ar: ['Excel / Word / عرض', 'صلاحيات الاطلاع والتحرير', 'سجل الإصدارات والاستعادة'], ru: ['Excel / Word / презентация', 'Права на просмотр и правку', 'История версий и восстановление'] } },
  { id: '', img: ['/static/img/landing/shots/mascot3d.webp?v=2'], solo: true, rev: true,
    eye: { tr: 'Yapay zeka', en: 'Artificial intelligence', de: 'Künstliche Intelligenz', fr: 'Intelligence artificielle', es: 'Inteligencia artificial', ar: 'الذكاء الاصطناعي', ru: 'Искусственный интеллект' },
    h: { tr: 'Sorun, sistem cevaplasın', en: 'Ask, the system answers', de: 'Fragen Sie, das System antwortet', fr: 'Demandez, le système répond', es: 'Pregunte y el sistema responde', ar: 'اسأل، فيُجيب النظام', ru: 'Спросите — система ответит' },
    p: { tr: 'Köşedeki asistana “bugün kaç parça teslim edildi?” diye sorun; yalnızca sizin yetkili olduğunuz verilerle cevap verir. Bir kaydın değişmesini isterseniz talebi yöneticinin onayına gönderir.', en: 'Ask the corner assistant “how many parts shipped today?”; it answers only with data you are allowed to see. Want a record changed? It routes the request to admin approval.', de: 'Fragen Sie den Assistenten in der Ecke „Wie viele Teile wurden heute geliefert?“; er antwortet nur mit Daten, die Sie sehen dürfen. Soll ein Datensatz geändert werden? Er leitet die Anfrage zur Admin-Freigabe weiter.', fr: 'Demandez à l’assistant dans le coin « combien de pièces livrées aujourd’hui ? » ; il répond uniquement avec les données que vous êtes autorisé à voir. Besoin de modifier un enregistrement ? Il transmet la demande à la validation admin.', es: 'Pregunte al asistente de la esquina «¿cuántas piezas se entregaron hoy?»; responde solo con datos que usted puede ver. ¿Quiere cambiar un registro? Envía la solicitud a la aprobación del administrador.', ar: 'اسأل المساعد في الزاوية «كم قطعة سُلّمت اليوم؟»؛ يجيب فقط بالبيانات المصرّح لك بها. أتريد تغيير سجل؟ يحيل الطلب إلى موافقة المدير.', ru: 'Спросите ассистента в углу: «сколько деталей отгружено сегодня?» — он ответит только по данным, доступным вам. Нужно изменить запись? Он отправит запрос на одобрение администратора.' },
    ticks: { tr: ['Yetkiye göre salt-okunur sorgular', 'Değişiklikler yönetici onayıyla', '6 farklı 3D karakter'], en: ['Permission-scoped read-only queries', 'Changes via admin approval', '6 animated 3D characters'], de: ['Rechtebezogene schreibgeschützte Abfragen', 'Änderungen mit Admin-Freigabe', '6 animierte 3D-Figuren'], fr: ['Requêtes en lecture seule selon les droits', 'Modifications avec validation admin', '6 personnages 3D animés'], es: ['Consultas de solo lectura según permisos', 'Cambios con aprobación del administrador', '6 personajes 3D animados'], ar: ['استعلامات للقراءة فقط وفق الصلاحيات', 'التغييرات بموافقة المدير', '6 شخصيات ثلاثية الأبعاد متحركة'], ru: ['Запросы только для чтения по правам', 'Изменения с одобрения администратора', '6 анимированных 3D-персонажей'] } },
];

// Gerçek ekran görüntüleri galerisi
const S = '/static/img/landing/shots/';
const GALLERY = [
  { img: S + 'dashboard.webp?v=2', tr: 'Firma yönetimi', en: 'Company management', de: 'Firmenverwaltung', fr: 'Gestion des entreprises', es: 'Gestión de empresas', ar: 'إدارة الشركات', ru: 'Управление компаниями' },
  { img: S + 'printers.webp?v=2', tr: 'Yazıcı yönetimi', en: 'Printer management', de: 'Druckerverwaltung', fr: 'Gestion des imprimantes', es: 'Gestión de impresoras', ar: 'إدارة الطابعات', ru: 'Управление принтерами' },
  { img: S + 'orders.webp?v=2', tr: 'Üretim yönetimi', en: 'Production management', de: 'Produktionsverwaltung', fr: 'Gestion de production', es: 'Gestión de producción', ar: 'إدارة الإنتاج', ru: 'Управление производством' },
  { img: S + 'reports.webp?v=2', tr: 'Raporlar (22+)', en: 'Reports (22+)', de: 'Berichte (22+)', fr: 'Rapports (22+)', es: 'Informes (22+)', ar: 'تقارير (22+)', ru: 'Отчёты (22+)' },
  { img: S + 'belge-list.webp?v=2', tr: 'Belge Yönetim', en: 'Document suite', de: 'Dokumentensuite', fr: 'Suite bureautique', es: 'Suite de documentos', ar: 'حزمة المستندات', ru: 'Документы' },
  { img: S + 'belge-excel.webp?v=2', tr: 'Uygulama içi Excel', en: 'In-app spreadsheet', de: 'Tabellen in der App', fr: 'Tableur intégré', es: 'Hoja de cálculo en la app', ar: 'جداول داخل التطبيق', ru: 'Таблицы в приложении' },
  { img: S + 'fabrika.webp?v=2', tr: 'Fabrika yerleşimi', en: 'Factory layout', de: 'Fabriklayout', fr: 'Plan d’usine', es: 'Plano de fábrica', ar: 'مخطط المصنع', ru: 'План завода' },
  { img: S + 'field.webp?v=2', tr: 'Saha yönetimi', en: 'Field management', de: 'Außendienst', fr: 'Gestion du terrain', es: 'Gestión de campo', ar: 'إدارة الميدان', ru: 'Выезды' },
  { img: S + 'finance-cash.webp?v=2', tr: 'Nakit akışı ve yaşlandırma', en: 'Cash flow & aging', de: 'Cashflow & Fälligkeiten', fr: 'Trésorerie & balance âgée', es: 'Tesorería y antigüedad', ar: 'التدفق النقدي والأعمار', ru: 'Денежный поток и старение' },
  { img: S + 'finance-trial.webp?v=2', tr: 'Mizan', en: 'Trial balance', de: 'Rohbilanz', fr: 'Balance', es: 'Balance de sumas', ar: 'ميزان المراجعة', ru: 'Оборотная ведомость' },
  { img: S + 'kullanicilar.webp?v=2', tr: 'Kullanıcı yönetimi', en: 'User management', de: 'Benutzerverwaltung', fr: 'Gestion des utilisateurs', es: 'Gestión de usuarios', ar: 'إدارة المستخدمين', ru: 'Управление пользователями' },
];

// Modül ikonları (sabit)
const ic = {
  prod: '<path d="M3 21h18M5 21V9l5 3V9l5 3V5l4 2v14"/>', order: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17v4h10v-4"/>', box: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>',
  mrp: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 20V9"/>', design: '<path d="M12 3l2.5 2.5M12 3L9.5 5.5M12 3v6"/><rect x="4" y="9" width="16" height="11" rx="2"/>',
  wh: '<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>', stock: '<path d="M4 7h16M4 12h16M4 17h10"/>', buy: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>',
  field: '<path d="M2 16l20-7-7 13-3-6z"/>', crm: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="18" cy="9" r="2.4"/>', sales: '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>',
  sec: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V8a5 5 0 0 1 10 0v3"/>', doc: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', hr: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  guard: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>', clean: '<path d="M19 3l-6 6M8 14l-4 7 7-4M8 14l5-5 2 2-5 5z"/>', micro: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 15V9l3 3 3-3v6"/>',
  admin: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', users: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M2 20a6 6 0 0 1 12 0M15 20a5 5 0 0 1 7 0"/>', ann: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 5V5L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
  rep: '<path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-8"/>', tools: '<path d="M14 7l3 3M3 21l9-9M13 3a4 4 0 0 0 5 5l3-3-2-2-2 2-1-1 2-2-3-1z"/>',
  meet: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>', fin: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
  live: '<circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  feed: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>', ai: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', cam: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>', screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
};
// Modül katalog kategorileri: kategori adı (çok dilli) + renk + [ikon, ad(çok dilli), açıklama(çok dilli)]
const MOD_CATS = [
  [{ tr: 'Üretim', en: 'Production', de: 'Produktion', fr: 'Production', es: 'Producción', ar: 'الإنتاج', ru: 'Производство' }, '#2f6fed', [
    [ic.prod, { tr: 'Üretim Yönetimi', en: 'Production', de: 'Produktion', fr: 'Production', es: 'Producción', ar: 'إدارة الإنتاج', ru: 'Производство' }, { tr: 'Yarı mamül panosu, sipariş→montaj akışı', en: 'Kanban, order→assembly flow', de: 'Kanban, Bestellung→Montage-Fluss', fr: 'Kanban, flux commande→assemblage', es: 'Kanban, flujo pedido→montaje', ar: 'لوحة كانبان، تدفق الطلب←التجميع', ru: 'Канбан, поток заказ→сборка' }],
    [ic.order, { tr: 'İş Emri Yönetimi', en: 'Work orders', de: 'Arbeitsaufträge', fr: 'Ordres de travail', es: 'Órdenes de trabajo', ar: 'أوامر العمل', ru: 'Наряды' }, { tr: 'İş emirleri, parça bazlı takip', en: 'Orders, part-level tracking', de: 'Aufträge, Verfolgung auf Teileebene', fr: 'Ordres, suivi par pièce', es: 'Órdenes, seguimiento por pieza', ar: 'أوامر، تتبّع على مستوى القطعة', ru: 'Наряды, учёт по деталям' }],
    [ic.print, { tr: 'Yazıcı Yönetimi', en: 'Printers', de: 'Drucker', fr: 'Imprimantes', es: 'Impresoras', ar: 'الطابعات', ru: 'Принтеры' }, { tr: '3B yazıcı odası, canlı durum, G-code', en: '3D room, live status, G-code', de: '3D-Raum, Live-Status, G-Code', fr: 'Salle 3D, état en direct, G-code', es: 'Sala 3D, estado en vivo, G-code', ar: 'غرفة ثلاثية الأبعاد، حالة حية، G-code', ru: '3D-комната, живой статус, G-code' }],
    [ic.box, { tr: 'Ürün Yönetimi', en: 'Products', de: 'Produkte', fr: 'Produits', es: 'Productos', ar: 'المنتجات', ru: 'Продукты' }, { tr: 'Ürün ağacı, reçete, seri', en: 'BOM, recipes, serials', de: 'Stückliste, Rezepte, Serien', fr: 'Nomenclature, recettes, séries', es: 'Lista de materiales, recetas, series', ar: 'شجرة المنتج، وصفات، أرقام تسلسلية', ru: 'Спецификация, рецептуры, серии' }],
    [ic.mrp, { tr: 'MRP', en: 'MRP', de: 'MRP', fr: 'MRP', es: 'MRP', ar: 'MRP', ru: 'MRP' }, { tr: 'Malzeme ihtiyaç planlama, yarı mamül stoğu', en: 'Material planning, WIP stock', de: 'Materialbedarfsplanung, WIP-Bestand', fr: 'Planification des besoins, stock en-cours', es: 'Planificación de materiales, stock en curso', ar: 'تخطيط احتياجات المواد، مخزون تحت التشغيل', ru: 'Планирование материалов, незавершёнка' }],
    [ic.design, { tr: 'Endüstriyel Tasarım', en: 'Industrial design', de: 'Industriedesign', fr: 'Conception industrielle', es: 'Diseño industrial', ar: 'التصميم الصناعي', ru: 'Промышленный дизайн' }, { tr: 'Proje + çizim, STEP 3B önizleme', en: 'Projects + STEP 3D preview', de: 'Projekte + STEP-3D-Vorschau', fr: 'Projets + aperçu 3D STEP', es: 'Proyectos + vista 3D STEP', ar: 'مشاريع + معاينة STEP ثلاثية الأبعاد', ru: 'Проекты + 3D-просмотр STEP' }],
  ]],
  [{ tr: 'Depo & Satın Alma', en: 'Warehouse', de: 'Lager', fr: 'Entrepôt', es: 'Almacén', ar: 'المستودع', ru: 'Склад' }, '#16a34a', [
    [ic.wh, { tr: 'Depo Yönetimi', en: 'Warehouse', de: 'Lager', fr: 'Entrepôt', es: 'Almacén', ar: 'إدارة المستودع', ru: 'Склад' }, { tr: 'Çoklu depo, onay yönetimi', en: 'Multi-warehouse, approvals', de: 'Mehrlager, Freigaben', fr: 'Multi-entrepôt, validations', es: 'Multi-almacén, aprobaciones', ar: 'مستودعات متعددة، موافقات', ru: 'Несколько складов, согласования' }],
    [ic.stock, { tr: 'Stok', en: 'Stock', de: 'Bestand', fr: 'Stock', es: 'Stock', ar: 'المخزون', ru: 'Склад/запасы' }, { tr: 'Kritik stok uyarıları, hareketler', en: 'Critical alerts, movements', de: 'Kritische Warnungen, Bewegungen', fr: 'Alertes critiques, mouvements', es: 'Alertas críticas, movimientos', ar: 'تنبيهات حرجة، حركات', ru: 'Критические оповещения, движения' }],
    [ic.buy, { tr: 'Satın Alma', en: 'Purchasing', de: 'Einkauf', fr: 'Achats', es: 'Compras', ar: 'المشتريات', ru: 'Закупки' }, { tr: 'Talep, teklif, tedarikçi, fatura', en: 'Requests, quotes, invoices', de: 'Anfragen, Angebote, Rechnungen', fr: 'Demandes, devis, factures', es: 'Solicitudes, ofertas, facturas', ar: 'طلبات، عروض أسعار، فواتير', ru: 'Заявки, предложения, счета' }],
  ]],
  [{ tr: 'Saha & CRM', en: 'Field & CRM', de: 'Außendienst & CRM', fr: 'Terrain & CRM', es: 'Campo y CRM', ar: 'الميدان وCRM', ru: 'Выезды и CRM' }, '#0284c7', [
    [ic.field, { tr: 'Saha Yönetimi', en: 'Field', de: 'Außendienst', fr: 'Terrain', es: 'Campo', ar: 'الميدان', ru: 'Выезды' }, { tr: 'Görevler, araç/yol, uçuş logu', en: 'Tasks, routes, flight logs', de: 'Aufgaben, Routen, Flugprotokolle', fr: 'Tâches, itinéraires, journaux de vol', es: 'Tareas, rutas, registros de vuelo', ar: 'مهام، مسارات، سجلات طيران', ru: 'Задачи, маршруты, логи полётов' }],
    [ic.crm, { tr: 'Firma Yönetimi (CRM)', en: 'CRM', de: 'CRM', fr: 'CRM', es: 'CRM', ar: 'CRM', ru: 'CRM' }, { tr: 'Firmalar, kişiler, evraklar, rehber', en: 'Companies, people, docs', de: 'Firmen, Kontakte, Dokumente', fr: 'Entreprises, contacts, documents', es: 'Empresas, contactos, documentos', ar: 'شركات، جهات اتصال، مستندات', ru: 'Компании, контакты, документы' }],
    [ic.sales, { tr: 'Satış Yönetimi', en: 'Sales', de: 'Vertrieb', fr: 'Ventes', es: 'Ventas', ar: 'المبيعات', ru: 'Продажи' }, { tr: 'Satış faturası, teklif', en: 'Sales invoices, quotes', de: 'Verkaufsrechnungen, Angebote', fr: 'Factures de vente, devis', es: 'Facturas de venta, ofertas', ar: 'فواتير بيع، عروض أسعار', ru: 'Счета продаж, предложения' }],
    [ic.users, { tr: 'Sekreterya', en: 'Secretariat', de: 'Sekretariat', fr: 'Secrétariat', es: 'Secretaría', ar: 'السكرتارية', ru: 'Секретариат' }, { tr: 'Misafir, kargo, telefon notları', en: 'Guests, cargo, call notes', de: 'Gäste, Fracht, Anrufnotizen', fr: 'Visiteurs, colis, notes d’appel', es: 'Visitas, paquetería, notas de llamadas', ar: 'زوار، شحن، ملاحظات مكالمات', ru: 'Гости, грузы, заметки по звонкам' }],
  ]],
  [{ tr: 'Ofis & İK', en: 'Office & HR', de: 'Büro & Personal', fr: 'Bureau & RH', es: 'Oficina y RR. HH.', ar: 'المكتب والموارد البشرية', ru: 'Офис и кадры' }, '#0ea5a4', [
    [ic.doc, { tr: 'Evrak Yönetimi', en: 'Documents', de: 'Dokumente', fr: 'Documents', es: 'Documentos', ar: 'المستندات', ru: 'Документы' }, { tr: 'Uygulama içi Excel/Word/Sunum + sürüm', en: 'In-app office suite + versions', de: 'Office-Suite in der App + Versionen', fr: 'Suite bureautique intégrée + versions', es: 'Suite ofimática en la app + versiones', ar: 'حزمة مكتبية داخل التطبيق + إصدارات', ru: 'Офисный пакет в приложении + версии' }],
    [ic.hr, { tr: 'İnsan Kaynakları', en: 'HR', de: 'Personal', fr: 'RH', es: 'RR. HH.', ar: 'الموارد البشرية', ru: 'Кадры' }, { tr: 'Özlük, izin, başvuru, sözleşme', en: 'Personnel, leave, contracts', de: 'Personal, Urlaub, Verträge', fr: 'Personnel, congés, contrats', es: 'Personal, permisos, contratos', ar: 'ملفات، إجازات، عقود', ru: 'Персонал, отпуска, договоры' }],
    [ic.guard, { tr: 'Güvenlik', en: 'Security', de: 'Sicherheit', fr: 'Sécurité', es: 'Seguridad', ar: 'الأمن', ru: 'Охрана' }, { tr: 'Araç giriş/çıkış, bina kontrol', en: 'Vehicle gate, building patrol', de: 'Fahrzeugtor, Gebäuderundgang', fr: 'Barrière véhicule, ronde de bâtiment', es: 'Control de vehículos, ronda de edificio', ar: 'بوابة المركبات، جولة المبنى', ru: 'Проезд транспорта, обход здания' }],
    [ic.clean, { tr: 'Temizlik', en: 'Cleaning', de: 'Reinigung', fr: 'Nettoyage', es: 'Limpieza', ar: 'النظافة', ru: 'Уборка' }, { tr: 'Günlük temizlik çeklisti', en: 'Daily cleaning checklist', de: 'Tägliche Reinigungscheckliste', fr: 'Checklist de nettoyage quotidienne', es: 'Lista de limpieza diaria', ar: 'قائمة تنظيف يومية', ru: 'Ежедневный чек-лист уборки' }],
    [ic.micro, { tr: 'Mikro ERP', en: 'Micro ERP', de: 'Micro ERP', fr: 'Micro ERP', es: 'Micro ERP', ar: 'Micro ERP', ru: 'Micro ERP' }, { tr: 'Tek yönlü muhasebe entegrasyonu', en: 'One-way accounting sync', de: 'Einweg-Buchhaltungssync', fr: 'Synchro comptable unidirectionnelle', es: 'Sincronización contable unidireccional', ar: 'تكامل محاسبي أحادي الاتجاه', ru: 'Односторонняя синхронизация с бухгалтерией' }],
    [ic.fin, { tr: 'Finans / Ön Muhasebe', en: 'Finance', de: 'Finanzen', fr: 'Finance', es: 'Finanzas', ar: 'المالية', ru: 'Финансы' }, { tr: 'Nakit akışı, çek-senet, mizan, gelir tablosu', en: 'Cash flow, cheques, trial balance, P&L', de: 'Cashflow, Schecks, Rohbilanz, GuV', fr: 'Trésorerie, chèques, balance, résultat', es: 'Tesorería, cheques, balance, resultados', ar: 'التدفق النقدي، شيكات، ميزان مراجعة، قائمة دخل', ru: 'Денежный поток, чеки, оборотка, ОПУ' }],
  ]],
  [{ tr: 'Sistem & Yönetim', en: 'System', de: 'System', fr: 'Système', es: 'Sistema', ar: 'النظام', ru: 'Система' }, '#7c5cf5', [
    [ic.admin, { tr: 'Yönetim', en: 'Admin', de: 'Verwaltung', fr: 'Administration', es: 'Administración', ar: 'الإدارة', ru: 'Администрирование' }, { tr: 'Canlı durum paneli, grafikler', en: 'Live dashboard, charts', de: 'Live-Dashboard, Diagramme', fr: 'Tableau de bord en direct, graphiques', es: 'Panel en vivo, gráficos', ar: 'لوحة حية، رسوم بيانية', ru: 'Живая панель, графики' }],
    [ic.users, { tr: 'Kullanıcı Yönetimi', en: 'Users', de: 'Benutzer', fr: 'Utilisateurs', es: 'Usuarios', ar: 'المستخدمون', ru: 'Пользователи' }, { tr: 'Roller, yetkiler, modül erişimi', en: 'Roles, permissions', de: 'Rollen, Berechtigungen', fr: 'Rôles, permissions', es: 'Roles, permisos', ar: 'أدوار، صلاحيات', ru: 'Роли, права' }],
    [ic.ann, { tr: 'Duyurular', en: 'Announcements', de: 'Ankündigungen', fr: 'Annonces', es: 'Anuncios', ar: 'الإعلانات', ru: 'Объявления' }, { tr: 'Yönetimden şirket geneli duyuru', en: 'Company-wide notices', de: 'Unternehmensweite Mitteilungen', fr: 'Annonces à toute l’entreprise', es: 'Avisos para toda la empresa', ar: 'إعلانات على مستوى الشركة', ru: 'Объявления по всей компании' }],
    [ic.rep, { tr: 'Raporlar', en: 'Reports', de: 'Berichte', fr: 'Rapports', es: 'Informes', ar: 'التقارير', ru: 'Отчёты' }, { tr: '22+ rapor, grafik ve Excel', en: '22+ reports, charts, Excel', de: '22+ Berichte, Diagramme, Excel', fr: '22+ rapports, graphiques, Excel', es: '22+ informes, gráficos, Excel', ar: '22+ تقرير، رسوم، Excel', ru: '22+ отчётов, графики, Excel' }],
    [ic.tools, { tr: 'Araçlar', en: 'Tools', de: 'Werkzeuge', fr: 'Outils', es: 'Herramientas', ar: 'الأدوات', ru: 'Инструменты' }, { tr: 'QR/barkod, hesap araçları', en: 'QR/barcode, utilities', de: 'QR/Barcode, Dienstprogramme', fr: 'QR/code-barres, utilitaires', es: 'QR/código de barras, utilidades', ar: 'QR/باركود، أدوات', ru: 'QR/штрихкод, утилиты' }],
  ]],
  [{ tr: 'Gerçek Zamanlı & İletişim', en: 'Real-time & Comms', de: 'Echtzeit & Kommunikation', fr: 'Temps réel & Comms', es: 'Tiempo real y comunicación', ar: 'الوقت الفعلي والتواصل', ru: 'Реальное время и связь' }, '#ec4899', [
    [ic.meet, { tr: 'Görüntülü Toplantı', en: 'Video meetings', de: 'Videokonferenzen', fr: 'Visioconférences', es: 'Videollamadas', ar: 'اجتماعات مرئية', ru: 'Видеоконференции' }, { tr: 'Zoom tarzı, davet kodu, ekran paylaşımı', en: 'Invite code, screen share', de: 'Einladungscode, Bildschirmfreigabe', fr: 'Code d’invitation, partage d’écran', es: 'Código de invitación, compartir pantalla', ar: 'رمز دعوة، مشاركة شاشة', ru: 'Код приглашения, демонстрация экрана' }],
    [ic.order, { tr: 'Mesajlaşma & Telsiz', en: 'Chat & Radio', de: 'Chat & Funk', fr: 'Chat & talkie-walkie', es: 'Chat y radio', ar: 'محادثة ولاسلكي', ru: 'Чат и рация' }, { tr: 'Sohbet, sesli arama, bas-konuş telsiz', en: 'Chat, voice, push-to-talk', de: 'Chat, Sprache, Push-to-Talk', fr: 'Chat, voix, push-to-talk', es: 'Chat, voz, pulsar para hablar', ar: 'محادثة، صوت، اضغط للتحدث', ru: 'Чат, голос, рация' }],
    [ic.ai, { tr: 'Yapay Zeka Asistanı', en: 'AI assistant', de: 'KI-Assistent', fr: 'Assistant IA', es: 'Asistente de IA', ar: 'مساعد ذكاء اصطناعي', ru: 'ИИ-ассистент' }, { tr: 'Yetkiye göre sorgu, onaylı değişiklik', en: 'Scoped queries, approvals', de: 'Rechtebezogene Abfragen, Freigaben', fr: 'Requêtes selon droits, validations', es: 'Consultas según permisos, aprobaciones', ar: 'استعلامات وفق الصلاحيات، موافقات', ru: 'Запросы по правам, согласования' }],
    [ic.cam, { tr: 'Kameralar & Yüz Tanıma', en: 'Cameras & faces', de: 'Kameras & Gesichter', fr: 'Caméras & visages', es: 'Cámaras y rostros', ar: 'كاميرات والتعرف على الوجوه', ru: 'Камеры и распознавание лиц' }, { tr: 'NVR, canlı izleme, yüz tanıma', en: 'NVR, live view, face ID', de: 'NVR, Live-Ansicht, Gesichts-ID', fr: 'NVR, vue en direct, ID visage', es: 'NVR, vista en vivo, ID facial', ar: 'NVR، عرض حي، تعرّف على الوجه', ru: 'NVR, живой просмотр, Face ID' }],
    [ic.screen, { tr: 'Ekran Paylaşımı', en: 'Screen sharing', de: 'Bildschirmfreigabe', fr: 'Partage d’écran', es: 'Compartir pantalla', ar: 'مشاركة الشاشة', ru: 'Демонстрация экрана' }, { tr: 'Uzaktan destek: izle + müdahale + sesli', en: 'Remote support + control', de: 'Fernsupport + Steuerung', fr: 'Support à distance + contrôle', es: 'Soporte remoto + control', ar: 'دعم عن بُعد + تحكّم', ru: 'Удалённая поддержка + управление' }],
    [ic.feed, { tr: 'Şirketten Haberler', en: 'Company feed', de: 'Firmen-Feed', fr: 'Fil d’entreprise', es: 'Muro de la empresa', ar: 'أخبار الشركة', ru: 'Лента компании' }, { tr: 'Instagram tarzı akış, kalp, yorum, kaydet', en: 'Instagram-style feed, hearts, comments', de: 'Instagram-Feed, Herzen, Kommentare', fr: 'Fil façon Instagram, cœurs, commentaires', es: 'Muro estilo Instagram, corazones, comentarios', ar: 'خلاصة بأسلوب إنستغرام، إعجابات، تعليقات', ru: 'Лента в стиле Instagram, лайки, комментарии' }],
    [ic.live, { tr: 'Canlı Yayın', en: 'Live streaming', de: 'Live-Streaming', fr: 'Diffusion en direct', es: 'Transmisión en vivo', ar: 'بث مباشر', ru: 'Прямые трансляции' }, { tr: 'Sahadan canlı yayın, anlık bildirim, kayıt', en: 'Go live from the field, alerts, replay', de: 'Live vom Außendienst, Warnungen, Wiedergabe', fr: 'Direct depuis le terrain, alertes, rediffusion', es: 'En vivo desde el campo, avisos, repetición', ar: 'بث مباشر من الميدان، تنبيهات، إعادة', ru: 'Эфир с объекта, оповещения, повтор' }],
  ]],
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
  de: [['Passwort- & Login-Regeln', 'Komplexität, Ablauf, Wiederverwendungssperre, Anmeldesperre, PIN.'],
       ['Rollenbasierter Zugriff', 'Module und Daten öffnen sich je Rolle; vertrauliche Dateien lassen sich sogar vor der Leitung verbergen.'],
       ['Datenhoheit & Datenschutz', 'Nur der Master lädt alle Firmendaten herunter; die Zentrale sieht Ihre Daten nicht.'],
       ['Nächtliche Backups', 'Datenbank und Dateien werden jede Nacht automatisch gesichert.']],
  fr: [['Règles de mot de passe & connexion', 'Complexité, expiration, blocage de réutilisation, verrouillage, PIN.'],
       ['Accès basé sur les rôles', 'Modules et données s’ouvrent selon le rôle ; les fichiers confidentiels peuvent être masqués même à la direction.'],
       ['Propriété des données & confidentialité', 'Seul le master télécharge toutes les données ; la console ne voit pas vos données.'],
       ['Sauvegardes nocturnes', 'Base de données et fichiers sauvegardés automatiquement chaque nuit.']],
  es: [['Reglas de contraseña e inicio', 'Complejidad, caducidad, bloqueo de reutilización, bloqueo por intentos, PIN.'],
       ['Acceso basado en roles', 'Módulos y datos se abren según el rol; los archivos confidenciales pueden ocultarse incluso a la dirección.'],
       ['Propiedad de datos y privacidad', 'Solo el master descarga todos los datos; la consola no ve sus datos.'],
       ['Copias nocturnas', 'Base de datos y archivos se respaldan automáticamente cada noche.']],
  ar: [['قواعد كلمة المرور والدخول', 'التعقيد، الصلاحية، منع إعادة الاستخدام، قفل المحاولات، PIN.'],
       ['وصول قائم على الأدوار', 'تُفتح الوحدات والبيانات حسب الدور؛ ويمكن إخفاء الملفات السرية حتى عن الإدارة.'],
       ['ملكية البيانات والخصوصية', 'المدير وحده يُنزّل كل بيانات الشركة؛ والمركز لا يرى بياناتك.'],
       ['نسخ احتياطي ليلي', 'يُنسخ قاعدة البيانات والملفات تلقائياً كل ليلة.']],
  ru: [['Правила пароля и входа', 'Сложность, срок действия, запрет повтора, блокировка попыток, PIN.'],
       ['Доступ по ролям', 'Модули и данные открываются по роли; конфиденциальные файлы можно скрыть даже от руководства.'],
       ['Владение данными и приватность', 'Только master выгружает все данные; центр не видит ваши данные.'],
       ['Ночные бэкапы', 'База данных и файлы автоматически копируются каждую ночь.']],
};

// Üstteki çizgisel dünya header'ı (hero üstü) + KOBİ/Esnaf ikili yapı tanıtımı — 7 dil.
const WORLD = {
  tr: { eyebrow: 'KOBİLER VE ESNAFLAR İÇİN TEK İŞLETİM SİSTEMİ', h: 'İşletmenizin', hl: 'sinir sistemi.', lead: 'Fabrika yönetiminden bakkal POS’una, berber randevusundan restoran masasına — HEPGO, işletmenizin türüne göre şekillenen tek canlı platformdur.', cta: 'Platformu keşfet', stats: [['2', 'ana yol'], ['20+', 'modül'], ['7', 'dil']] },
  en: { eyebrow: 'ONE OPERATING SYSTEM FOR SMEs AND SMALL SHOPS', h: 'Your business’s', hl: 'nervous system.', lead: 'From factory management to grocery POS, from barber bookings to restaurant tables — HEPGO is one live platform that adapts to your business type.', cta: 'Explore the platform', stats: [['2', 'paths'], ['20+', 'modules'], ['7', 'languages']] },
  de: { eyebrow: 'EIN BETRIEBSSYSTEM FÜR KMU UND KLEINGEWERBE', h: 'Das Nervensystem', hl: 'Ihres Betriebs.', lead: 'Von der Fabriksteuerung bis zur Laden-Kasse, vom Friseurtermin bis zum Restauranttisch — HEPGO ist eine lebendige Plattform, die sich Ihrem Geschäft anpasst.', cta: 'Plattform entdecken', stats: [['2', 'Wege'], ['20+', 'Module'], ['7', 'Sprachen']] },
  fr: { eyebrow: 'UN SYSTÈME D’EXPLOITATION POUR PME ET COMMERCES', h: 'Le système nerveux', hl: 'de votre entreprise.', lead: 'De la gestion d’usine à la caisse d’épicerie, du rendez-vous coiffure à la table de restaurant — HEPGO est une plateforme vivante qui s’adapte à votre activité.', cta: 'Découvrir la plateforme', stats: [['2', 'voies'], ['20+', 'modules'], ['7', 'langues']] },
  es: { eyebrow: 'UN SISTEMA OPERATIVO PARA PYMES Y COMERCIOS', h: 'El sistema nervioso', hl: 'de su negocio.', lead: 'De la gestión de fábrica al TPV de la tienda, de la cita en peluquería a la mesa del restaurante — HEPGO es una plataforma viva que se adapta a su negocio.', cta: 'Explorar la plataforma', stats: [['2', 'vías'], ['20+', 'módulos'], ['7', 'idiomas']] },
  ar: { eyebrow: 'نظام تشغيل واحد للمنشآت والحرفيين', h: 'الجهاز العصبي', hl: 'لعملك.', lead: 'من إدارة المصنع إلى نقطة بيع البقالة، ومن حجز الحلاق إلى طاولة المطعم — HEPGO منصة حية تتكيّف مع نوع عملك.', cta: 'استكشف المنصة', stats: [['2', 'مسار'], ['20+', 'وحدة'], ['7', 'لغات']] },
  ru: { eyebrow: 'ЕДИНАЯ ОС ДЛЯ МСБ И МАЛОГО БИЗНЕСА', h: 'Нервная система', hl: 'вашего бизнеса.', lead: 'От управления заводом до кассы магазина, от записи в парикмахерскую до столика в кафе — HEPGO это живая платформа, подстраивающаяся под ваш бизнес.', cta: 'Открыть платформу', stats: [['2', 'пути'], ['20+', 'модулей'], ['7', 'языков']] },
};
const DUO = {
  tr: { eye: 'İki yapı, tek platform', h: 'Size uygun olanı seçin', p: 'HEPGO hem kurumsal üretim firmalarına hem de esnaflara göre şekillenir; kayıtta tipinizi seçersiniz.',
    kobi: { t: 'KOBİ ve Üstü', d: 'İhtiyacınıza göre modül seçin; dilediğiniz zaman açıp kapatın.', list: ['Üretim, iş emri ve stok takibi', 'Satın alma, satış ve CRM', 'İK, finans ve evrak yönetimi', 'Canlı konum, kamera ve görüntülü toplantı'] },
    esnaf: { t: 'Esnaf', d: 'Bakkal, berber/kuaför ve lokanta için hazır paketler — anında kurulum.', list: ['Bakkal: dokunmatik yazarkasa + barkod', 'Berber/Kuaför: randevu takvimi + hizmet ve personel payı', 'Lokanta: masa düzeni + garson + adisyon'] } },
  en: { eye: 'Two setups, one platform', h: 'Pick what fits you', p: 'HEPGO adapts to both corporate manufacturers and small businesses; you choose your type at sign-up.',
    kobi: { t: 'SME and up', d: 'Choose the modules you need; turn them on or off anytime.', list: ['Production, work orders and stock', 'Purchasing, sales and CRM', 'HR, finance and documents', 'Live location, cameras and video meetings'] },
    esnaf: { t: 'Small business', d: 'Ready packages for grocery, barber/salon and restaurant — instant setup.', list: ['Grocery: touch POS + barcode', 'Barber/Salon: booking calendar + service & staff share', 'Restaurant: table layout + waiter + checks'] } },
  de: { eye: 'Zwei Setups, eine Plattform', h: 'Wählen Sie, was passt', p: 'HEPGO passt sich sowohl Herstellern als auch Kleingewerbe an; den Typ wählen Sie bei der Anmeldung.',
    kobi: { t: 'KMU und größer', d: 'Wählen Sie die benötigten Module; jederzeit ein- oder ausschalten.', list: ['Produktion, Arbeitsaufträge und Lager', 'Einkauf, Vertrieb und CRM', 'HR, Finanzen und Dokumente', 'Live-Standort, Kameras und Videokonferenzen'] },
    esnaf: { t: 'Kleingewerbe', d: 'Fertige Pakete für Laden, Friseur/Salon und Restaurant — sofort einsatzbereit.', list: ['Laden: Touch-Kasse + Barcode', 'Friseur/Salon: Terminkalender + Leistung & Mitarbeiteranteil', 'Restaurant: Tischplan + Kellner + Rechnungen'] } },
  fr: { eye: 'Deux configurations, une plateforme', h: 'Choisissez ce qui vous convient', p: 'HEPGO s’adapte aux industriels comme aux commerçants ; vous choisissez votre type à l’inscription.',
    kobi: { t: 'PME et plus', d: 'Choisissez les modules nécessaires ; activez-les quand vous voulez.', list: ['Production, ordres de travail et stock', 'Achats, ventes et CRM', 'RH, finances et documents', 'Localisation en direct, caméras et visioconférence'] },
    esnaf: { t: 'Artisan / commerçant', d: 'Forfaits prêts pour épicerie, coiffeur/salon et restaurant — installation immédiate.', list: ['Épicerie : caisse tactile + code-barres', 'Coiffeur/Salon : agenda + service & part du personnel', 'Restaurant : plan de tables + serveur + additions'] } },
  es: { eye: 'Dos configuraciones, una plataforma', h: 'Elija lo que encaja', p: 'HEPGO se adapta tanto a fabricantes como a comercios; elige tu tipo al registrarte.',
    kobi: { t: 'Pyme y más', d: 'Elija los módulos que necesita; actívelos cuando quiera.', list: ['Producción, órdenes de trabajo y stock', 'Compras, ventas y CRM', 'RRHH, finanzas y documentos', 'Ubicación en vivo, cámaras y videollamadas'] },
    esnaf: { t: 'Autónomo / comercio', d: 'Paquetes listos para tienda, peluquería/salón y restaurante — instalación inmediata.', list: ['Tienda: TPV táctil + código de barras', 'Peluquería/Salón: agenda + servicio y parte del personal', 'Restaurante: plano de mesas + camarero + cuentas'] } },
  ar: { eye: 'هيكلان، منصة واحدة', h: 'اختر ما يناسبك', p: 'يتكيّف HEPGO مع الشركات الصناعية والحرفيين معاً؛ تختار نوعك عند التسجيل.',
    kobi: { t: 'المنشآت وما فوق', d: 'اختر الوحدات التي تحتاجها؛ فعّلها أو أوقفها متى شئت.', list: ['الإنتاج وأوامر العمل والمخزون', 'المشتريات والمبيعات وإدارة العملاء', 'الموارد البشرية والمالية والمستندات', 'الموقع المباشر والكاميرات والاجتماعات المرئية'] },
    esnaf: { t: 'الحرفيون', d: 'باقات جاهزة للبقالة والحلاق/الصالون والمطعم — تثبيت فوري.', list: ['بقالة: نقطة بيع باللمس + باركود', 'حلاق/صالون: تقويم مواعيد + خدمة وحصة الموظف', 'مطعم: توزيع طاولات + نادل + فواتير'] } },
  ru: { eye: 'Две конфигурации, одна платформа', h: 'Выберите своё', p: 'HEPGO подходит и производителям, и малому бизнесу; тип вы выбираете при регистрации.',
    kobi: { t: 'МСБ и выше', d: 'Выберите нужные модули; включайте и выключайте в любой момент.', list: ['Производство, наряды и склад', 'Закупки, продажи и CRM', 'Кадры, финансы и документы', 'Геолокация, камеры и видеовстречи'] },
    esnaf: { t: 'Малый бизнес', d: 'Готовые пакеты для магазина, парикмахерской/салона и кафе — мгновенная настройка.', list: ['Магазин: сенсорная касса + штрихкод', 'Парикмахерская/Салон: календарь записи + услуга и доля персонала', 'Кафе: план столов + официант + счета'] } },
};

// Hero'daki 3D sahnenin sektör sekmeleri (etiket + kısa tanım) — 7 dil.
const SECTOR_KEYS = ['factory', 'grocery', 'barber', 'restaurant'];
const SECTORS = {
  tr: { factory: { l: 'Fabrika', tag: 'Üretim, iş emri, stok ve sahayı tek ekrandan yönetin.' }, grocery: { l: 'Bakkal', tag: 'Dokunmatik yazarkasa ve barkodla saniyede satış.' }, barber: { l: 'Berber', tag: 'Randevu takvimi, hizmetler ve personel payı.' }, restaurant: { l: 'Lokanta', tag: 'Masa düzeni, garson ekranı ve adisyon.' } },
  en: { factory: { l: 'Factory', tag: 'Run production, work orders, stock and field from one screen.' }, grocery: { l: 'Grocery', tag: 'Sell in seconds with a touch POS and barcode.' }, barber: { l: 'Barber', tag: 'Booking calendar, services and staff share.' }, restaurant: { l: 'Restaurant', tag: 'Table layout, waiter screen and checks.' } },
  de: { factory: { l: 'Fabrik', tag: 'Produktion, Aufträge, Lager und Außendienst auf einem Bildschirm.' }, grocery: { l: 'Laden', tag: 'Sekundenschnell verkaufen mit Touch-Kasse und Barcode.' }, barber: { l: 'Friseur', tag: 'Terminkalender, Leistungen und Mitarbeiteranteil.' }, restaurant: { l: 'Restaurant', tag: 'Tischplan, Kellner-Bildschirm und Rechnungen.' } },
  fr: { factory: { l: 'Usine', tag: 'Production, ordres, stock et terrain sur un seul écran.' }, grocery: { l: 'Épicerie', tag: 'Vendez en quelques secondes avec caisse tactile et code-barres.' }, barber: { l: 'Coiffeur', tag: 'Agenda de rendez-vous, services et part du personnel.' }, restaurant: { l: 'Restaurant', tag: 'Plan de tables, écran serveur et additions.' } },
  es: { factory: { l: 'Fábrica', tag: 'Producción, órdenes, stock y campo en una sola pantalla.' }, grocery: { l: 'Tienda', tag: 'Venda en segundos con TPV táctil y código de barras.' }, barber: { l: 'Peluquería', tag: 'Agenda de citas, servicios y parte del personal.' }, restaurant: { l: 'Restaurante', tag: 'Plano de mesas, pantalla de camarero y cuentas.' } },
  ar: { factory: { l: 'مصنع', tag: 'أدِر الإنتاج وأوامر العمل والمخزون والميدان من شاشة واحدة.' }, grocery: { l: 'بقالة', tag: 'بِع في ثوانٍ عبر نقطة بيع باللمس وباركود.' }, barber: { l: 'حلاق', tag: 'تقويم مواعيد وخدمات وحصة الموظف.' }, restaurant: { l: 'مطعم', tag: 'توزيع الطاولات وشاشة النادل والفواتير.' } },
  ru: { factory: { l: 'Завод', tag: 'Производство, наряды, склад и выезды с одного экрана.' }, grocery: { l: 'Магазин', tag: 'Продажи за секунды: сенсорная касса и штрихкод.' }, barber: { l: 'Парикмахер', tag: 'Календарь записи, услуги и доля персонала.' }, restaurant: { l: 'Кафе', tag: 'План столов, экран официанта и счета.' } },
};

function page() {
  const t = T[lang];
  const wd = WORLD[lang] || WORLD.en;
  const du = DUO[lang] || DUO.en;
  const sc = SECTORS[lang] || SECTORS.en;
  const sun = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>');
  const moon = svg('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>');
  const feat = FEATURES.map((f, i) => `<div class="feat reveal fc${i}">
    <div class="feat-ic">${svg(f[0])}</div><b>${esc(L(f[1]))}</b><p>${esc(L(f[2]))}</p></div>`).join('');
  const rows = ROWS.map(r => {
    const media = r.img.length > 1
      ? `<div class="row-media"><div class="tablet"><div class="tablet-screen"><img class="shot" src="${r.img[1]}" alt="" loading="lazy"></div></div><div class="phone phone-mini"><div class="phone-screen"><img class="shot" src="${r.img[0]}" alt="" loading="lazy"></div></div></div>`
      : `<div class="row-media"><div class="laptop"><div class="laptop-screen"><img class="shot" src="${r.img[0]}" alt="" loading="lazy"></div><div class="laptop-base"></div></div></div>`;
    const copy = `<div class="row-copy"><span class="eyebrow">${esc(L(r.eye))}</span><h3>${esc(L(r.h))}</h3><p>${esc(L(r.p))}</p>
      <ul class="ticks">${L(r.ticks).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return `<div class="row ${r.rev ? 'row-rev' : ''} reveal" ${r.id ? `id="${r.id}"` : ''}>${media}${copy}</div>`;
  }).join('');
  const mods = MOD_CATS.map(cat => `<div class="mod-cat reveal"><h3 class="mod-cat-h"><span class="mod-cat-dot" style="background:${cat[1]}"></span>${esc(L(cat[0]))}</h3><div class="mod-grid">${cat[2].map((m, i) => `<div class="mod reveal" style="--d:${i * 40}ms"><div class="mod-ic" style="--c:${cat[1]}">${svg(m[0])}</div><div class="mod-tx"><b>${esc(L(m[1]))}</b><span>${esc(L(m[2]))}</span></div></div>`).join('')}</div></div>`).join('');
  const langMenu = LANGS.map(([c, name]) => `<button class="lang-opt${c === lang ? ' on' : ''}" data-lang="${c}">${esc(name)}</button>`).join('');
  return `
  <header class="nav" id="nav"><div class="wrap nav-in">
    <a class="brand" href="/"><img src="/static/img/hepgo-mark.png" alt="" class="brand-logo"><span class="brand-txt"><b>HEPGO</b><span>${esc(t.foot)}</span></span></a>
    <nav class="nav-links"><a href="#ozellikler">${esc(t.nav[0])}</a><a href="#moduller">${esc(t.navMods)}</a><a href="#meet">${esc(t.nav[1])}</a><a href="#ekran">${esc(t.navScreens)}</a><a href="#fiyatlar">${esc(t.nav[2])}</a><a href="#guvenlik">${esc(t.nav[3])}</a></nav>
    <div class="nav-ctl">
      <div class="lang-wrap"><button class="icon-btn lang-btn" id="langBtn" title="Dil / Language" aria-haspopup="true">${lang.toUpperCase()}</button>
        <div class="lang-menu" id="langMenu" hidden>${langMenu}</div></div>
      <button class="icon-btn" id="themeBtn" title="Tema">${theme === 'dark' ? sun : moon}</button>
      ${site.central ? `<a class="btn btn-ghost" href="${esc(site.merkez_url)}">${esc(t.login)}</a>` : ''}
      <a class="btn btn-primary" href="/giris">${esc(t.create)}</a>
    </div>
  </div></header>
  <main>
    <section class="world-hero" id="hero3d">
      <div class="wrap hero-split">
        <div class="world-copy reveal">
          <span class="eyebrow eyebrow-dot">${esc(wd.eyebrow)}</span>
          <h1>${esc(wd.h)} <span class="hl">${esc(wd.hl)}</span></h1>
          <p class="lead">${esc(wd.lead)}</p>
          <div class="hero-cta"><a class="btn btn-primary btn-lg" href="/giris#kayit">${esc(wd.cta)} ↗</a><a class="btn btn-ghost btn-lg" href="#yapilar">${esc(t.heroCta[1])}</a></div>
          <div class="sector-tabs" id="sectorTabs">${SECTOR_KEYS.map((k, i) => `<button class="sector-tab${i === 0 ? ' on' : ''}" data-sec="${k}">${esc(sc[k].l)}</button>`).join('')}</div>
          <p class="sector-tag" id="sectorTag">${esc(sc.factory.tag)}</p>
          <div class="hero-stats">${wd.stats.map((s, i) => `${i ? '<i></i>' : ''}<span><b>${esc(s[0])}</b> ${esc(s[1])}</span>`).join('')}</div>
        </div>
        <div class="hero-globe-stage" id="heroGlobe" aria-hidden="true"></div>
      </div>
    </section>

    <section class="section duo" id="yapilar"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(du.eye)}</span><h2>${esc(du.h)}</h2><p>${esc(du.p)}</p></div>
      <div class="duo-grid">
        <div class="duo-card reveal">
          <div class="duo-ic duo-ic--kobi">${svg('<path d="M3 21h18M5 21V8l5-3 5 3v13M9 12h2M9 16h2M14 12h2M14 16h2"/>')}</div>
          <h3>${esc(du.kobi.t)}</h3><p>${esc(du.kobi.d)}</p>
          <ul>${du.kobi.list.map(x => `<li>${svg('<path d="M5 12l4 4 10-10"/>')}${esc(x)}</li>`).join('')}</ul>
        </div>
        <div class="duo-card reveal duo-card--esnaf">
          <div class="duo-ic duo-ic--esnaf">${svg('<path d="M4 9h16l-1 11H5L4 9zM4 9l2-5h12l2 5M9 13h6"/>')}</div>
          <h3>${esc(du.esnaf.t)}</h3><p>${esc(du.esnaf.d)}</p>
          <ul>${du.esnaf.list.map(x => `<li>${svg('<path d="M5 12l4 4 10-10"/>')}${esc(x)}</li>`).join('')}</ul>
        </div>
      </div>
    </div></section>


    <section class="section" id="ozellikler"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.featEye)}</span><h2>${esc(t.featH)}</h2><p>${esc(t.featP)}</p></div>
      <div class="features">${feat}</div>
    </div></section>

    <section class="section section-tint" id="moduller"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.modEye)}</span><h2>${esc(t.modH)}</h2><p>${esc(t.modP)}</p></div>
      <div class="mods">${mods}</div>
    </div></section>

    <section class="section"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.rowsEye)}</span><h2>${esc(t.rowsH)}</h2></div>
      <div class="rows">${rows}</div>
    </div></section>

    <section class="section" id="ekran"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.screensEye)}</span><h2>${esc(t.screensH)}</h2><p>${esc(t.screensP)}</p></div>
      <div class="gallery">${GALLERY.map(g => `<figure class="shot-card reveal"><img class="shot" src="${g.img}" alt="${esc(L(g))}" loading="lazy"><figcaption>${esc(L(g))}</figcaption></figure>`).join('')}</div>
    </div></section>

    <section class="pricing section" id="fiyatlar"><div class="wrap">
      <div class="sec-head reveal"><span class="eyebrow">${esc(t.pricingEye)}</span><h2>${esc(t.pricingH)}</h2><p>${esc(t.pricingP)}</p></div>
      <div class="price-grid" id="priceGrid"><p class="muted">…</p></div>
      <div class="price-compare reveal" id="priceCompare"></div>
    </div></section>

    <section class="section section-dark" id="guvenlik"><div class="wrap">
      <div class="sec-head light reveal"><span class="eyebrow">${esc(t.secEye)}</span><h2>${esc(t.secH)}</h2><p>${esc(t.secP)}</p></div>
      <div class="sec-grid">${(SEC[lang] || SEC.en).map(s => `<div class="sec-card reveal">${svg('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>')}<b>${esc(s[0])}</b><p>${esc(s[1])}</p></div>`).join('')}</div>
    </div></section>

    <section class="cta wrap reveal"><div class="cta-card"><div><h2>${esc(t.ctaH)}</h2><p>${esc(t.ctaP)}</p></div>
      <a class="btn btn-white btn-lg" href="/giris#kayit">${esc(t.apply)}</a></div></section>
  </main>
  <footer class="foot"><div class="wrap foot-in">
    <div class="foot-brand"><img src="/static/img/hepgo-mark.png" alt=""><span>HEPGO</span></div>
    <div class="foot-meta">© <span>${new Date().getFullYear()}</span> · ${esc(t.foot)}</div>
  </div></footer>`;
}

const modeLabel = m => ({ online: T[lang].modeOnline, offline: T[lang].modeOffline, both: T[lang].modeBoth }[m] || m);
const money = n => (n ? `${nf.format(n)} ₺` : T[lang].free);

// Modül karşılaştırması: grup adları + modül adları (çok dilli; katalog Türkçe, eşleme yoksa Türkçe'ye düşer)
const GROUP_I18N = {
  sistem: { tr: 'Sistem', en: 'System', de: 'System', fr: 'Système', es: 'Sistema', ar: 'النظام', ru: 'Система' },
  'üretim': { tr: 'Üretim', en: 'Production', de: 'Produktion', fr: 'Production', es: 'Producción', ar: 'الإنتاج', ru: 'Производство' },
  depo: { tr: 'Depo & Satın Alma', en: 'Warehouse & Purchasing', de: 'Lager & Einkauf', fr: 'Entrepôt & Achats', es: 'Almacén y Compras', ar: 'المستودع والمشتريات', ru: 'Склад и закупки' },
  saha: { tr: 'Saha', en: 'Field', de: 'Außendienst', fr: 'Terrain', es: 'Campo', ar: 'الميدان', ru: 'Выезды' },
  crm: { tr: 'CRM', en: 'CRM', de: 'CRM', fr: 'CRM', es: 'CRM', ar: 'CRM', ru: 'CRM' },
  ofis: { tr: 'Ofis', en: 'Office', de: 'Büro', fr: 'Bureau', es: 'Oficina', ar: 'المكتب', ru: 'Офис' },
};
const MODKEY_I18N = {
  admin: { en: 'Admin', de: 'Verwaltung', fr: 'Administration', es: 'Administración', ar: 'الإدارة', ru: 'Администрирование' },
  users: { en: 'Users', de: 'Benutzer', fr: 'Utilisateurs', es: 'Usuarios', ar: 'المستخدمون', ru: 'Пользователи' },
  announcements: { en: 'Announcements', de: 'Ankündigungen', fr: 'Annonces', es: 'Anuncios', ar: 'الإعلانات', ru: 'Объявления' },
  reports: { en: 'Reports', de: 'Berichte', fr: 'Rapports', es: 'Informes', ar: 'التقارير', ru: 'Отчёты' },
  tools: { en: 'Tools', de: 'Werkzeuge', fr: 'Outils', es: 'Herramientas', ar: 'الأدوات', ru: 'Инструменты' },
  production: { en: 'Production', de: 'Produktion', fr: 'Production', es: 'Producción', ar: 'الإنتاج', ru: 'Производство' },
  orders: { en: 'Work orders', de: 'Arbeitsaufträge', fr: 'Ordres de travail', es: 'Órdenes de trabajo', ar: 'أوامر العمل', ru: 'Наряды' },
  printers: { en: 'Printers', de: 'Drucker', fr: 'Imprimantes', es: 'Impresoras', ar: 'الطابعات', ru: 'Принтеры' },
  products: { en: 'Products', de: 'Produkte', fr: 'Produits', es: 'Productos', ar: 'المنتجات', ru: 'Продукты' },
  mrp: { en: 'MRP', de: 'MRP', fr: 'MRP', es: 'MRP', ar: 'MRP', ru: 'MRP' },
  design: { en: 'Industrial design', de: 'Industriedesign', fr: 'Conception industrielle', es: 'Diseño industrial', ar: 'التصميم الصناعي', ru: 'Промышленный дизайн' },
  warehouse: { en: 'Warehouse', de: 'Lager', fr: 'Entrepôt', es: 'Almacén', ar: 'المستودع', ru: 'Склад' },
  stock: { en: 'Stock', de: 'Bestand', fr: 'Stock', es: 'Stock', ar: 'المخزون', ru: 'Запасы' },
  purchasing: { en: 'Purchasing', de: 'Einkauf', fr: 'Achats', es: 'Compras', ar: 'المشتريات', ru: 'Закупки' },
  field: { en: 'Field', de: 'Außendienst', fr: 'Terrain', es: 'Campo', ar: 'الميدان', ru: 'Выезды' },
  companies: { en: 'CRM', de: 'CRM', fr: 'CRM', es: 'CRM', ar: 'CRM', ru: 'CRM' },
  sales: { en: 'Sales', de: 'Vertrieb', fr: 'Ventes', es: 'Ventas', ar: 'المبيعات', ru: 'Продажи' },
  secretariat: { en: 'Secretariat', de: 'Sekretariat', fr: 'Secrétariat', es: 'Secretaría', ar: 'السكرتارية', ru: 'Секретариат' },
  documents: { en: 'Documents', de: 'Dokumente', fr: 'Documents', es: 'Documentos', ar: 'المستندات', ru: 'Документы' },
  hr: { en: 'HR', de: 'Personal', fr: 'RH', es: 'RR. HH.', ar: 'الموارد البشرية', ru: 'Кадры' },
  security: { en: 'Security', de: 'Sicherheit', fr: 'Sécurité', es: 'Seguridad', ar: 'الأمن', ru: 'Охрана' },
  cleaning: { en: 'Cleaning', de: 'Reinigung', fr: 'Nettoyage', es: 'Limpieza', ar: 'النظافة', ru: 'Уборка' },
  finance: { en: 'Finance', de: 'Finanzen', fr: 'Finance', es: 'Finanzas', ar: 'المالية', ru: 'Финансы' },
  mikro: { en: 'Micro ERP', de: 'Micro ERP', fr: 'Micro ERP', es: 'Micro ERP', ar: 'Micro ERP', ru: 'Micro ERP' },
  projects: { en: 'Projects', de: 'Projekte', fr: 'Projets', es: 'Proyectos', ar: 'المشاريع', ru: 'Проекты' },
  boss: { en: 'Boss', de: 'Chef', fr: 'Direction', es: 'Dirección', ar: 'المدير', ru: 'Руководитель' },
  rehber: { en: 'Directory', de: 'Verzeichnis', fr: 'Annuaire', es: 'Directorio', ar: 'الدليل', ru: 'Справочник' },
  certs: { en: 'Certification', de: 'Zertifizierung', fr: 'Certification', es: 'Certificación', ar: 'الاعتماد', ru: 'Сертификация' },
  fleet: { en: 'Fleet', de: 'Fuhrpark', fr: 'Flotte', es: 'Flota', ar: 'الأسطول', ru: 'Автопарк' },
  cameras: { en: 'Cameras', de: 'Kameras', fr: 'Caméras', es: 'Cámaras', ar: 'الكاميرات', ru: 'Камеры' },
};
let CATALOG = null;

async function fillPricing() {
  let pkgs = [];
  try { pkgs = await (await fetch('/api/public/packages')).json(); } catch { /* */ }
  const grid = $('#priceGrid');
  if (!grid) return;
  if (!pkgs.length) { grid.innerHTML = ''; const cmp = $('#priceCompare'); if (cmp) cmp.innerHTML = ''; return; }
  const beta = pkgs.some(p => p.open_beta);
  grid.innerHTML = pkgs.map(p => `<div class="price-card reveal">
    <h3>${esc(p.name)}</h3>
    <div class="price-amt">${beta ? `<span class="price-beta">${esc(T[lang].beta)}</span>` : `${money(p.monthly_fee)}<span>${esc(T[lang].perMonth)}</span>`}</div>
    <span class="price-mode">${esc(modeLabel(p.mode))}</span>
    <p class="price-desc">${esc(p.description || '')}</p>
    <div class="price-mods">${esc(T[lang].modsN(p.modules.length))}</div>
    <a class="btn btn-primary" href="/giris?paket=${encodeURIComponent(p.slug)}#kayit">${esc(T[lang].start)}</a>
  </div>`).join('');
  await fillCompare(pkgs);
  $('#nav') && revealAll();
}

async function fillCompare(pkgs) {
  const box = $('#priceCompare');
  if (!box) return;
  if (!CATALOG) { try { CATALOG = await (await fetch('/api/modules')).json(); } catch { CATALOG = []; } }
  const used = new Set(pkgs.flatMap(p => p.modules));
  const groups = [];
  for (const m of CATALOG) {
    if (!used.has(m.key)) continue;
    let g = groups.find(x => x.key === m.group);
    if (!g) { g = { key: m.group, mods: [] }; groups.push(g); }
    g.mods.push(m);
  }
  if (!groups.length) { box.innerHTML = ''; return; }
  const t = T[lang];
  const modName = m => (lang === 'tr' ? m.title : ((MODKEY_I18N[m.key] && MODKEY_I18N[m.key][lang]) || (MODKEY_I18N[m.key] && MODKEY_I18N[m.key].en) || m.title));
  const groupName = g => (L(GROUP_I18N[g.key]) || (g.key.charAt(0).toLocaleUpperCase('tr') + g.key.slice(1)));
  const beta = pkgs.some(p => p.open_beta);
  const cols = pkgs.map(p => `<th scope="col"><span class="pc-name">${esc(p.name)}</span><span class="pc-fee">${beta ? esc(T[lang].beta) : money(p.monthly_fee)}</span></th>`).join('');
  const rows = groups.map(g => {
    const head = `<tr class="pc-grp"><th scope="colgroup" colspan="${pkgs.length + 1}">${esc(groupName(g))}</th></tr>`;
    const body = g.mods.map(m => {
      const cells = pkgs.map(p => p.modules.includes(m.key)
        ? `<td class="yes" aria-label="${esc(t.inc)}">✓</td>` : `<td class="no" aria-label="${esc(t.exc)}">–</td>`).join('');
      return `<tr><th scope="row">${esc(modName(m))}</th>${cells}</tr>`;
    }).join('');
    return head + body;
  }).join('');
  box.innerHTML = `<h3 class="pc-h">${esc(t.compareH)}</h3><p class="pc-p">${esc(t.compareP)}</p>
    <div class="pc-scroll"><table class="pc-table">
      <thead><tr><th scope="col" class="pc-corner">${esc(t.moduleCol)}</th>${cols}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function revealAll() {
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' }) : null;
  document.querySelectorAll('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));
}

function setLang(code) {
  if (!LANG_CODES.includes(code) || code === lang) return;
  lang = code;
  try { localStorage.setItem('veilox.lang', lang); } catch { /* */ }
  render();
}

function render() {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';   // Arapça sağdan sola
  document.documentElement.dataset.theme = theme;
  $('#app').innerHTML = page();
  // Dil menüsü: aç/kapa + seçim
  const lb = $('#langBtn'); const lm = $('#langMenu');
  lb.addEventListener('click', e => { e.stopPropagation(); lm.hidden = !lm.hidden; });
  lm.querySelectorAll('.lang-opt').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  document.addEventListener('click', () => { if (lm && !lm.hidden) lm.hidden = true; }, { once: true });
  $('#themeBtn').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('veilox.theme', theme); } catch { /* */ } render(); });
  const nav = $('#nav'); const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  revealAll();
  fillPricing();
  mount3D();
}

// Hero'daki premium 3D küre (horizonx Reactive Globe, iframe içinde). Sektör sekmesi iframe'e postMessage
// ile renk gönderir (fabrika mavi, bakkal yeşil, berber kırmızı, lokanta amber) + başlık altı tanımı değişir.
let _heroTimer = null, _heroHandle = null;
async function mount3D() {
  if (_heroTimer) { clearInterval(_heroTimer); _heroTimer = null; }
  if (_heroHandle) { try { _heroHandle.dispose(); } catch { /* */ } _heroHandle = null; }
  const stage = $('#heroGlobe');
  const tabs = $('#sectorTabs'), tagEl = $('#sectorTag'), sc = SECTORS[lang] || SECTORS.en;
  if (!tabs) return;
  if (stage) {
    const mod = await import('/static/hero-globe.js?v=20261011i').catch(() => null);
    if (mod && mod.webglOK()) { try { _heroHandle = mod.mountGlobe(stage, 'factory'); } catch { _heroHandle = null; } }
  }
  let idx = 0;
  const setSec = key => {
    if (_heroHandle) _heroHandle.setSector(key);
    tabs.querySelectorAll('.sector-tab').forEach(b => b.classList.toggle('on', b.dataset.sec === key));
    if (tagEl && sc[key]) tagEl.textContent = sc[key].tag;
  };
  const restartAuto = () => { if (_heroTimer) clearInterval(_heroTimer); _heroTimer = setInterval(() => { idx = (idx + 1) % SECTOR_KEYS.length; setSec(SECTOR_KEYS[idx]); }, 6000); };
  tabs.querySelectorAll('.sector-tab').forEach(b => b.addEventListener('click', () => { idx = SECTOR_KEYS.indexOf(b.dataset.sec); setSec(b.dataset.sec); restartAuto(); }));
  restartAuto();
}

fetch('/api/public/site').then(r => r.json()).then(x => { site = x; }).catch(() => {}).finally(render);
