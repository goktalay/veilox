'use strict';
// Builds a single self-contained HTML string (CSS, font, scripts and particle data inlined).

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const dataUri = (rel, mime) =>
  `data:${mime};base64,${fs.readFileSync(path.join(root, rel)).toString('base64')}`;

function inlinedHtml() {
  const css = fs
    .readFileSync(path.join(root, 'styles.css'), 'utf8')
    .replace(/url\("(fonts\/[\w-]+\.woff2)"\)/g, (_, src) => `url("${dataUri(src, 'font/woff2')}")`);
  return fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/<link rel="preload"[^>]*>\n?/, '')
    .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`)
    .replace(/data-(particles|hold|brain)="(assets\/[\w-]+\.bin)"/g, (_, attr, src) => `data-${attr}="${dataUri(src, 'application/octet-stream')}"`)
    .replace(/<script src="(js\/[\w-]+\.js)"><\/script>/g, (_, src) =>
      `<script>${fs.readFileSync(path.join(root, src), 'utf8')}</script>`);
}

module.exports = { inlinedHtml };

// node scripts/inline.js <out.html>
if (require.main === module) {
  const out = process.argv[2] || path.join(root, 'dist', 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, inlinedHtml());
  console.log(out);
}
