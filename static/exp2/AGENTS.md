# AGENTS.md — Vantro AI Sales Platform

Instructions for AI coding agents (Codex, Claude Code, Cursor and others) working in this folder. The person you are working with always has the final say: when their request and these notes disagree, follow them.

## Project

A static sales-software landing page with sample dashboard visuals, feature cards, analytics, testimonials, pricing and FAQ content.

- Stack: static HTML, CSS and JavaScript, with local GSAP and ScrollTrigger; no build step
- `README.md` is the buyer guide. `CREDITS.md` lists every library and image with its license. `LICENSE.md` (when present) is the HorizonX license.

## Run it

   - With Python: `python3 -m http.server 8080`
   - Or with Node.js: `npx serve .`

Then open `http://localhost:8080` (with `npx serve`, use the address it prints).

## Where things are

- `index.html`: page markup, inline styles and inline interactions.
- `styles.css` and `app.js`: additional style and script files; check their overlap with the inline implementation before editing.
- `assets/avatars/`: five PNG avatars; `assets/vendor/`: local GSAP and ScrollTrigger scripts.
- `README.md` (the buyer guide), `CREDITS.md` (libraries and images), and `AGENTS.md` plus `CLAUDE.md` (instructions for AI coding agents).

## How to change things

- **Colors:** edit the `:root` block in `index.html`: `--ink` `#0b0b10`, `--body` `#5b6170`, `--blue` `#4f6bf5`, `--soft` `#f7f7fa` and `--dark` `#0c0c10`.
- **Corners:** `--r-lg` is `24px`, `--r-md` is `18px` and `--r-sm` is `12px` in the same block.
- **Text:** change brand, feature, price and FAQ copy directly in `index.html`; connect calls to action to your own destinations.
- **Images:** replace PNG avatars in `assets/avatars/` or update their paths.
- **Fonts:** change the Inter Google Fonts link in `index.html` and its font rules.
- **Styles and interactions:** the HTML has inline code while the guide describes `styles.css` and `app.js`; confirm which code is active before making changes.

## Motion

- Self-hosted GSAP and ScrollTrigger are loaded from `assets/vendor/`; versions are not supplied.
- The HTML includes inline JavaScript and reduced-motion handling. The guide describes reveals, parallax, count-up stats, AI tabs, pricing toggles and mobile navigation; verify these against the active implementation.
- Keep reduced-motion final states visible when changing reveals.

## Rules for this project

- Inspect inline HTML code before editing `styles.css` or `app.js`; avoid maintaining duplicate implementations.
- Keep local GSAP and ScrollTrigger paths intact.
- Preserve section navigation, FAQ, pricing and mobile-menu behavior when replacing copy.
- Do not present sample AI, analytics or CRM visuals as live services without implementing integrations.
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
