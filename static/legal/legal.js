// Yasal sayfalar (Gizlilik Politikası / Kullanım Şartları) çok dilli: kullanıcının dilinde açar
// (localStorage 'veilox.lang' → tarayıcı dili → Türkçe), yalnız seçili dil bölümünü gösterir; üstteki
// dil çubuğundan değiştirilir. Arapça (ar) sağdan sola. Başlık + "son güncelleme" etiketi de çevrilir.
(function () {
  var LANGS = [['tr', 'Türkçe'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['ar', 'العربية'], ['ru', 'Русский']];
  var CODES = LANGS.map(function (l) { return l[0]; });
  var RTL = { ar: 1 };
  var TITLES = {
    privacy: { tr: 'Gizlilik Politikası', en: 'Privacy Policy', de: 'Datenschutzerklärung', fr: 'Politique de confidentialité', es: 'Política de privacidad', ar: 'سياسة الخصوصية', ru: 'Политика конфиденциальности' },
    terms: { tr: 'Kullanım Şartları', en: 'Terms of Use', de: 'Nutzungsbedingungen', fr: 'Conditions d’utilisation', es: 'Condiciones de uso', ar: 'شروط الاستخدام', ru: 'Условия использования' },
    beta: { tr: 'Beta Programı Sözleşmesi', en: 'Beta Program Agreement', de: 'Beta-Programm-Vereinbarung', fr: 'Accord du programme bêta', es: 'Acuerdo del programa beta', ar: 'اتفاقية برنامج بيتا', ru: 'Соглашение о бета-программе' },
  };
  var UPDATED = { tr: 'Son güncelleme', en: 'Last updated', de: 'Zuletzt aktualisiert', fr: 'Dernière mise à jour', es: 'Última actualización', ar: 'آخر تحديث', ru: 'Последнее обновление' };

  function detect() {
    try {
      var s = localStorage.getItem('veilox.lang');
      if (s && CODES.indexOf(s) >= 0) return s;
      var navs = navigator.languages || [navigator.language || ''];
      for (var i = 0; i < navs.length; i++) {
        var c = (navs[i] || '').slice(0, 2).toLowerCase();
        if (CODES.indexOf(c) >= 0) return c;
      }
    } catch (e) { /* */ }
    return 'tr';
  }

  var docType = (document.body.getAttribute('data-doc-type') || 'privacy');
  var lang = detect();
  var h = (location.hash || '').replace('#', '').toLowerCase();   // eski #tr / #en bağlantılarına saygı
  if (CODES.indexOf(h) >= 0) lang = h;

  function apply(l) {
    if (CODES.indexOf(l) < 0) l = 'tr';
    lang = l;
    try { localStorage.setItem('veilox.lang', l); } catch (e) { /* */ }
    document.documentElement.lang = l;
    document.documentElement.dir = RTL[l] ? 'rtl' : 'ltr';
    var secs = document.querySelectorAll('section[data-doc]');
    for (var i = 0; i < secs.length; i++) secs[i].hidden = (secs[i].id !== l);
    var title = (TITLES[docType] || {})[l];
    var h1 = document.querySelector('.legal header h1');
    if (h1 && title) h1.textContent = title;
    var lbl = document.querySelector('.legal header .lbl-updated');
    if (lbl && UPDATED[l]) lbl.textContent = UPDATED[l];
    var btns = document.querySelectorAll('.lang-sw [data-lang]');
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('on', btns[j].getAttribute('data-lang') === l);
    document.title = (title || document.title.split('—')[0]) + ' — HEPGO';
  }

  function build() {
    var nav = document.querySelector('.lang-sw');
    if (nav) {
      nav.innerHTML = LANGS.map(function (x) { return '<button type="button" data-lang="' + x[0] + '">' + x[1] + '</button>'; }).join('');
      nav.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-lang]') : null;
        if (b) apply(b.getAttribute('data-lang'));
      });
    }
    apply(lang);
  }

  if (document.readyState !== 'loading') build();
  else document.addEventListener('DOMContentLoaded', build);
})();
