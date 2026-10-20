# AGENTS.md — Sorvine

Instructions for AI coding agents (Codex, Claude Code, Cursor and others) working in this folder. The person you are working with always has the final say: when their request and these notes disagree, follow them.

## Project

A dark landing page for an AI models and agents company: two hands made of glowing particles that form on load, react to the pointer and morph between three scroll scenes, ending in a turning particle brain.

- Stack: static HTML, CSS and JavaScript with a canvas particle engine, no libraries and no build step; an optional Node.js script inlines everything into one file
- `README.md` is the buyer guide. `CREDITS.md` lists every library and image with its license. `LICENSE.md` (when present) is the HorizonX license.

## Run it

   - With Python (already installed on Mac and Linux): `python3 -m http.server 8080`
   - Or with Node.js: `npm start` (runs `npx serve .`)

Then open `http://localhost:8080` (with `npm start`, use the address it prints).

## Where things are

- `index.html`: the page markup (navigation, hero, reach scene and hold scene).
- `styles.css`: every style, with the colors and sizes as variables in the `:root` block at the top.
- `js/`: `particles.js` (the particle canvas and all three scenes), `steps.js` (Learn / Reason / Act steps), `snap.js` (scene snapping), `nav.js` (menus) and `nav-dust.js` (the navbar dissolving into particles on scroll).
- `assets/points.bin` and `assets/brain.bin`: pre-built point data for the hands and the brain.
- `fonts/geist.woff2`: the only font file.
- `scripts/inline.js` and `package.json`: the optional single-file build.
- `README.md` (the buyer guide), `CREDITS.md` (font and data sources), and `AGENTS.md` plus `CLAUDE.md` (instructions for AI coding agents).

## How to change things

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

## Rules for this project

- Keep it a static site with no libraries and no required build step unless the user asks to port it.
- Colors and sizes come from the `:root` variables in `styles.css`. Change those instead of hard-coding new values.
- Scenes and snap points are driven by the `data-hands`, `data-snap` and `data-steps` attributes in `index.html`. Keep them when editing the markup, or the particles lose their targets.
- `assets/*.bin` are binary point data read by `js/particles.js`. Do not edit them by hand.
- Keep the `prefers-reduced-motion` handling in every script.
- Serve the folder over HTTP when testing; the point data is loaded with `fetch`.
- Keep the current look and motion unless the user asks to change them. Before a large change, say what you plan to do.
- Every animation you add or change must keep working with `prefers-reduced-motion` and when its script fails to load.
- Fonts are not covered by the HorizonX license. If the user changes the fonts, use ones they own or have a license for, and never download font files they did not provide.
- When you add a library, font or image, add it to `CREDITS.md` with its version and license.
- Do not add analytics, tracking or other third-party scripts unless the user asks for them.

## Check your work

1. Serve the folder and open every section of the page.
2. Make sure the browser console shows no errors and no file returns 404.
3. Check the layout at 390 px and 1440 px wide.
4. Turn on reduced motion in the operating system and check that the content still appears.

## License

The template is licensed to its owner through their HorizonX membership. Building and shipping sites from it is allowed; publishing or reselling the source files as a template is not. Terms: https://horizonx.so/terms
