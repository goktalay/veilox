# Vantro AI Sales Platform

A static sales-software landing page with sample dashboard visuals, feature cards, analytics, testimonials, pricing and FAQ content.

Made by HorizonX · Version 1.0.1 · October 2026

## Start here

1. Unzip this folder.
2. Start a local web server inside it:
   - With Python: `python3 -m http.server 8080`
   - Or with Node.js: `npx serve .`
3. Open `http://localhost:8080` (with `npx serve`, use the address it prints) in your browser.

There is no build step or dependency installation. This is a marketing page, not a working CRM or AI service.

## What's inside

- `index.html`: page markup, inline styles and inline interactions.
- `styles.css` and `app.js`: additional style and script files; check their overlap with the inline implementation before editing.
- `assets/avatars/`: five PNG avatars; `assets/vendor/`: local GSAP and ScrollTrigger scripts.
- `README.md` (the buyer guide), `CREDITS.md` (libraries and images), and `AGENTS.md` plus `CLAUDE.md` (instructions for AI coding agents).

## Page sections

- Navigation and **Turn Every Deal Into Predictable Revenue** hero (`#top`), then social proof.
- **Why teams choose Vantro** (`#why`): tasks, pipeline and reporting.
- AI feature presentation and key tools (`#keytools`), including goals, pricing, gamification, forecasting, workflows and access control.
- Advanced analytics and reporting, growth content and testimonials.
- **Choose the perfect plan** (`#pricing`): Starter and Ultimate.
- FAQ, dashboard showcase, **Ready to sell smarter, faster?** (`#cta`) and footer.

## Make it yours

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

## Deploy

- Upload the static folder with local assets to a static host. No build step is needed.
- Connect real signup and contact destinations; dashboard and AI visuals are marketing demos, not backend integrations.

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

Write to support@horizonx.so and mention **Vantro AI Sales Platform**.
