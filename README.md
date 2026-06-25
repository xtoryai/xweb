# XWeb

**AI-Readable Website Engine**

XWeb is an open-source website engine that makes your content readable by both humans and AI. One Node.js process = a complete website + headless CMS + REST API.

Built on [Astro 6](https://astro.build) SSR + [Sveltia CMS](https://github.com/sveltia/sveltia-cms), with built-in [Schema.org](https://schema.org) JSON-LD structured data output. Apache-2.0 licensed. Your source. Your data. Zero lock-in.

## Why XWeb

Most websites are "electronic brochures" — AI platforms (ChatGPT, Gemini, Doubao) can't properly read or cite them. XWeb solves this:

- **AI-Readable**: Built-in Schema.org JSON-LD structured data on every page. Search engines and AI platforms don't just "see" your content — they understand it.
- **Source Delivery**: Apache-2.0 licensed. Full source code delivered. Deploy it yourself, modify it yourself, hire anyone to maintain it. No vendor lock-in.
- **Minimal Ops**: Zero database. Markdown files for content, Git for versioning. One Node.js process runs everything. No ops team required.

## Quick Start

```bash
git clone https://github.com/xtoryai/xweb.git
cd xweb
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). Your site is running.

### Production Build

```bash
npm run build
node dist/server/entry.mjs
```

### Docker

```bash
docker build -t xweb .
docker run -p 4321:4321 xweb
```

## Architecture

XWeb is built in four layers:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Render** | Astro 6 SSR | Server-side rendering, file-based routing, instant first paint |
| **Content** | Sveltia CMS | Headless Git-based CMS, visual Markdown/YAML editing |
| **API** | Server API | JWT auth → file CRUD → Git commit → auto push |
| **Data** | File System + Git | Zero database, content as code, every change versioned |

The CMS lives in [`/cms`](./cms) — a customized [Sveltia CMS](https://github.com/sveltia/sveltia-cms) with `server-api` backend for username/password authentication (instead of GitHub OAuth).

## Key Features

- **Astro 6 SSR** — instant first paint, SEO-optimized
- **Sveltia CMS** — headless Git-based content management with visual editor
- **Schema.org JSON-LD** — AI-readable structured data out of the box
- **Markdown Content** — write in Markdown, version with Git
- **Tailwind v4** — utility-first CSS
- **Zero Database** — flat files, nothing to maintain
- **Server API** — JWT auth, file CRUD, auto Git commit/push
- **One-Click Deploy** — Node.js, Docker, or Hong Kong node (no ICP required)

## Project Structure

```
xweb/
├── src/                    # Engine source
│   ├── pages/              # Astro page components (file-based routing)
│   ├── layouts/            # Layout components
│   ├── components/         # Shared components
│   ├── content/            # Demo content (Markdown + YAML)
│   ├── lib/                # Core utilities (auth, content, image processing)
│   ├── styles/             # Global CSS
│   └── middleware.ts       # Astro middleware
├── cms/                    # Sveltia CMS source (customized)
│   └── src/lib/services/backends/server-api/  # Custom auth backend
├── public/
│   └── admin/              # Pre-built CMS bundle + config
├── templates/              # HTML templates for PDF generation
├── astro.config.mjs        # Astro configuration
├── package.json
└── LICENSE                 # Apache-2.0
```

## Who Is This For

- **Developers** who want a modern, lightweight website engine with AI-readability built in
- **Agencies** who need a CMS that clients can use without GitHub accounts
- **Enterprises** who require data sovereignty — source code delivered, deploy anywhere
- **Anyone** tired of SaaS lock-in who wants full control of their website

## Community & Contributing

- **License**: [Apache-2.0](./LICENSE) — free to use, modify, and distribute
- **Issues**: Report bugs or suggest features on [GitHub Issues](https://github.com/xtoryai/xweb/issues)
- **Pull Requests**: Code, docs, translations — all welcome
- **Code of Conduct**: See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## Related

- [xtoryai.com](https://xtoryai.com) — Project website
- [xtocn.com](https://xtocn.com) — Commercial services (Chinese)
- [Astro](https://astro.build) — The web framework
- [Sveltia CMS](https://github.com/sveltia/sveltia-cms) — The headless CMS

## License

Apache-2.0 © XtoryAI
