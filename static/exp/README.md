# Sorvine

A dark landing page for an AI models and agents company: two hands made of glowing particles that form on load, react to the pointer and morph between three scroll scenes, ending in a turning particle brain.

Made by HorizonX · Version 1.0.0 · October 2026

## Start here

1. Unzip this folder.
2. Start a local web server inside it:
   - With Python (already installed on Mac and Linux): `python3 -m http.server 8080`
   - Or with Node.js: `npm start` (runs `npx serve .`)
3. Open `http://localhost:8080` (with `npm start`, use the address it prints) in your browser.

There is nothing to install. Use a local server: the particle data in `assets/` is loaded with `fetch`, which browsers block when `index.html` is opened by double-click. If you need one file that opens anywhere, run `npm run build` (Node.js 18 or newer): it writes `dist/index.html` with the styles, font, scripts and particle data inlined.

## What's inside

- `index.html`: the page markup (navigation, hero, reach scene and hold scene).
- `styles.css`: every style, with the colors and sizes as variables in the `:root` block at the top.
- `js/`: `particles.js` (the particle canvas and all three scenes), `steps.js` (Learn / Reason / Act steps), `snap.js` (scene snapping), `nav.js` (menus) and `nav-dust.js` (the navbar dissolving into particles on scroll).
- `assets/points.bin` and `assets/brain.bin`: pre-built point data for the hands and the brain.
- `fonts/geist.woff2`: the only font file.
- `scripts/inline.js` and `package.json`: the optional single-file build.
- `README.md` (the buyer guide), `CREDITS.md` (font and data sources), and `AGENTS.md` plus `CLAUDE.md` (instructions for AI coding agents).

## Page sections

- Navigation bar with links, a language menu, a **Log in** button and a mobile menu below 900 px. Scrolling down dissolves it into particles; scrolling up gathers it back.
- Hero: "Turn Your Data Into Your Smartest Teammate", with **Learn more** and **Get started** buttons. A cloud of particles gathers into two reaching hands; moving the pointer pushes the dots aside.
- **Reach** (`#product`): "Human intent, machine intelligence." The same hands grow and open around the text.
- **Hold** (`#platform`): "Your business in the palm of your hand." One hand becomes an open palm under a turning sphere, then the scene steps through **Learn**, **Reason** and **Act**: the hand breaks into rings around the sphere and the sphere becomes a brain.

## Make it yours

- **Colors and sizes:** edit the `:root` block at the top of `styles.css`:
   - `--bg` `#000` background · `--text` `#fff` main text · `--text-muted` and `--text-soft` secondary text
   - `--primary` `#4189fd` blue accent · `--primary-soft` lighter accent · `--glass-line` and `--glass-edge` borders
   - `--btn-h` and `--btn-font` button size · `--u` the layout unit, which scales the design with the screen
- **Text:** edit the copy in `index.html`. The three Learn / Reason / Act texts are the `.hold__text` paragraphs; keep three of them, or update the matching labels.
- **Brand:** the logo is an inline SVG in the `.nav__logo` link at the top of `index.html`; its colors are in `.sorvine-mark` in `styles.css`.
- **Links:** the nav, buttons and **Log in** point to `#` anchors. Replace them with your real pages.
- **Language menu:** it only switches the `EN` / `ES` label. Wire it to your translations or remove it.
- **Font:** change the `@font-face` rule and `--font` at the top of `styles.css`, and the preload link in the `<head>` of `index.html`.
- **Breakpoints:** the layout adapts at 1180 px, 1100 px, 900 px, 760 px and 420 px wide, and touch screens get native snapping (search for `@media` in `styles.css`).

## Motion

- Everything is drawn by hand-written JavaScript on one `<canvas>`; there are no animation libraries.
- `js/particles.js` holds the timing constants near the top (intro length, pulse interval, sphere spin and more), each with a comment.
- `js/snap.js` glides the page between resting points taken from the `data-snap` attributes: the hero, the reach scene and the three hold steps. Arrow keys, Page Up/Down and Home work too.
- If a visitor has **Reduce motion** turned on in their system settings (the `prefers-reduced-motion` setting), the particles stay still, snapping jumps instead of gliding and the navbar only fades.
- On small screens the page draws fewer particles so it stays smooth on phones.

## Deploy

- Upload the whole folder to any static host: Cloudflare Pages, Netlify, Vercel, GitHub Pages or your own server. No build step is needed.
- On Netlify or Cloudflare Pages you can drag the unzipped folder into the dashboard. Or upload only `dist/index.html` after `npm run build`.

## Keep building with AI

Open this folder in an AI coding agent such as Claude Code or Codex and ask in plain words. The folder includes `AGENTS.md` (and a `CLAUDE.md` that points to it), so Codex, Claude Code, Cursor and other agents learn how the project is built and how to check their work before they change anything. Some examples:

- "Read README.md and index.html, then change the brand colors to my palette: …"
- "Replace the copy with content for my studio. Keep the layout and the animations."
- "Port this page to Next.js with Tailwind CSS without changing how it looks or moves."

To add more HorizonX components to the page from your agent, connect the HorizonX MCP server (included in your membership): https://horizonx.so/mcp

## License

Your HorizonX membership gives you a commercial license for this template: use it and adapt it in personal, client and commercial projects. You may not resell, redistribute, sublicense or publicly share the original source files. Full terms: https://horizonx.so/terms.
Libraries and images are listed with their own licenses in `CREDITS.md`. Fonts are not covered by the HorizonX license: if you change them, use fonts you own or have a license for.

## Need help?

Write to support@horizonx.so and mention **Sorvine**.
