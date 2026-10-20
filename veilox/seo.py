"""hepgo.com tanıtım sayfası (static/exp2) için SEO: ?lang=<dil> adresinde sunucu tarafı <html lang/dir>, başlık ve açıklama
(sayfa metinleri tarayıcıda kit.js ile aynı sözlükten çevrilir: static/exp2/i18n/hepgo.<dil>.json), canonical + hreflang,
Open Graph / Twitter kartı, schema.org yapılandırılmış verisi, robots.txt ve sitemap.xml."""
import html as _h
import json
import re
from pathlib import Path

BASE = 'https://www.hepgo.com'
LANGS = ('tr', 'en', 'fr', 'de', 'es', 'ar', 'zh', 'ru')
OG_LOCALE = {'tr': 'tr_TR', 'en': 'en_US', 'fr': 'fr_FR', 'de': 'de_DE', 'es': 'es_ES', 'ar': 'ar_AR', 'zh': 'zh_CN', 'ru': 'ru_RU'}
HREFLANG = {'zh': 'zh-Hans'}
_norm = lambda s: re.sub(r'\s+', ' ', s).strip()   # noqa: E731
_cache = {}


def _dict(i18n_dir: Path, lang):
    if lang == 'tr':
        return {}
    if lang not in _cache:
        try:
            _cache[lang] = json.loads((i18n_dir / f'hepgo.{lang}.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            _cache[lang] = {}
    return _cache[lang]


def _url(lang):
    return f'{BASE}/' if lang == 'tr' else f'{BASE}/?lang={lang}'


GA_ID = 'G-2ERBQVXYVK'   # Google Analytics (yalnız ana sayfa; ziyaretçi izin verince kit.js yükler)


def render(page, lang, i18n_dir: Path):
    lang = lang if lang in LANGS else 'tr'
    d = _dict(i18n_dir, lang)
    t = lambda s: d.get(_norm(_h.unescape(s)), _h.unescape(s))   # noqa: E731
    m = re.search(r'<title>(.*?)</title>', page, re.S)
    title = t(m.group(1)) if m else 'HEPGO'
    m = re.search(r'<meta name="description" content="([^"]*)">', page)
    desc = t(m.group(1)) if m else ''
    esc = _h.escape
    page = re.sub(r'<html lang="[^"]*"', f'<html lang="{lang}" dir="{"rtl" if lang == "ar" else "ltr"}"', page, count=1)
    page = re.sub(r'<title>.*?</title>', f'<title>{esc(title, False)}</title>', page, count=1, flags=re.S)
    page = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">', page, count=1)
    ld = [{'@context': 'https://schema.org', '@type': 'Organization', 'name': 'HEPGO', 'url': f'{BASE}/', 'logo': f'{BASE}/static/img/hepgo-mark.png'},
          {'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'HEPGO', 'url': f'{BASE}/', 'inLanguage': list(LANGS)},
          {'@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': 'HEPGO', 'description': desc, 'url': _url(lang),
           'image': f'{BASE}/static/exp2/og.png', 'applicationCategory': 'BusinessApplication', 'operatingSystem': 'Web',
           'inLanguage': list(LANGS), 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'TRY',
                                                  'description': 'Beta döneminde ücretsiz'}}]
    extra = (f'\n<link rel="canonical" href="{esc(_url(lang))}">'
             + ''.join(f'<link rel="alternate" hreflang="{HREFLANG.get(l, l)}" href="{esc(_url(l))}">' for l in LANGS)
             + f'<link rel="alternate" hreflang="x-default" href="{esc(_url("tr"))}">'
             '\n<meta name="robots" content="index, follow, max-image-preview:large"><meta name="theme-color" content="#ffffff">'
             '\n<link rel="apple-touch-icon" href="/static/img/hepgo-mark.png">'
             f'\n<meta property="og:type" content="website"><meta property="og:site_name" content="HEPGO">'
             f'<meta property="og:url" content="{esc(_url(lang))}"><meta property="og:title" content="{esc(title)}">'
             f'<meta property="og:description" content="{esc(desc)}"><meta property="og:locale" content="{OG_LOCALE[lang]}">'
             + ''.join(f'<meta property="og:locale:alternate" content="{OG_LOCALE[l]}">' for l in LANGS if l != lang)
             + f'\n<meta property="og:image" content="{BASE}/static/exp2/og.png"><meta property="og:image:width" content="1200">'
               f'<meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png">'
               f'<meta property="og:image:alt" content="{esc(title)}">'
             '\n<meta name="application-name" content="HEPGO"><meta name="apple-mobile-web-app-title" content="HEPGO">'
             f'\n<meta name="mt-ga" content="{GA_ID}"><meta name="mt-privacy" content="/gizlilik">'
             f'\n<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}">'
             f'<meta name="twitter:description" content="{esc(desc)}"><meta name="twitter:image" content="{BASE}/static/exp2/og.png">'
             '\n<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>\n')
    return page.replace('</head>', extra + '</head>', 1)


def robots():
    return ('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /panel\nDisallow: /giris\n\n'
            f'Sitemap: {BASE}/sitemap.xml\n')


def sitemap():
    alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{HREFLANG.get(l, l)}" href="{_h.escape(_url(l))}"/>' for l in LANGS)
    urls = ''.join(f'<url><loc>{_h.escape(_url(l))}</loc>{alts}<changefreq>weekly</changefreq>'
                   f'<priority>{"1.0" if l == "tr" else "0.8"}</priority></url>' for l in LANGS)
    legal = ''.join(f'<url><loc>{BASE}{p}</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>'
                    for p in ('/gizlilik', '/kullanim-sartlari', '/beta-sozlesmesi'))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            f'xmlns:xhtml="http://www.w3.org/1999/xhtml">{urls}{legal}</urlset>\n')
