# Nuvio Providers — AI Agent Directives & Scraper Architecture

This repository contains custom streaming scrapers and edge proxy functions for the **Nuvio** mobile/desktop streaming client.

All AI assistants (Antigravity, Claude Code, Cursor, Copilot) interacting with this codebase MUST adhere strictly to the guidelines and standards below.

---

## 1. Project Specifications

* **Target Environment**: Nuvio Plugin Runtime (Hermes / QuickJS on Android, iOS, WebOS, Tizen).
* **Language & Tooling**: TypeScript (`build.ts` via `esbuild` & `tsx`), Node.js LTS via `pnpm`.
* **Deployment Target**:
  * Edge Proxies: Vercel Functions (`/api/`) & Cloudflare Workers (`home-theatre.fancied.workers.dev`).
  * Scraper Bundles: `providers/*.js` served statically via GitHub Pages / Raw CDN.
* **Manifest**: [`manifest.json`](manifest.json) registers all scrapers, versions, supported media types, and icons.

---

## 2. Core Constraints: The Hermes / QuickJS Rules

Scraper scripts run in an embedded JavaScript engine (Hermes or QuickJS) on mobile devices:

1. **NO Node.js Built-in Modules**: Never `require('fs')`, `require('path')`, `require('crypto')`, etc. inside scraper runtime code.
2. **Bundled Single-File CommonJS**: All scraper code must compile to a standalone CommonJS file in `providers/<id>.js` exporting `getStreams`.
3. **Android Header Stripping**: Android network stacks strip forbidden headers (`Referer`, `Origin`, `User-Agent`) during client-side `fetch()`. If an upstream source requires these headers, route the request through the **Home_Theatre Cloudflare Edge API** (`https://home-theatre.fancied.workers.dev/api/streams`) or Vercel edge functions.
4. **Parameter Type Traps**:
   * In JavaScript, `undefined !== null` evaluates to `true`.
   * When checking if media is a TV show, use:
     ```typescript
     const isTv = mediaType === 'tv' || mediaType === 'series' || (typeof season === 'number' && season > 0) || (typeof season === 'string' && season !== '');
     ```

---

## 3. Active Providers & Structure

```
nuvio-providers/
├── AGENTS.md               # Master AI guidelines (this file)
├── CLAUDE.md -> AGENTS.md  # Symlink for Claude Code
├── GEMINI.md -> AGENTS.md  # Symlink for Antigravity / Gemini
├── manifest.json           # Scraper registry (id, name, version, filename, logo)
├── build.ts                # esbuild compilation script (builds src/* to providers/*.js)
├── src/
│   ├── home_theatre/       # Premier Cloudflare Edge provider (aggregates VidSrc + Cinejoy)
│   ├── cinejoy/            # Cinejoy direct/proxy scraper
│   ├── vidsrc/             # VidSrc multi-server scraper
│   └── vegamovies/         # Vegamovies Hindi/English scraper
├── providers/              # Bundled standalone CJS scripts for Nuvio
│   ├── home_theatre.js
│   ├── cinejoy.js
│   ├── vidsrc.js
│   └── vegamovies.js
└── types/
    └── nuvio.d.ts          # Complete Nuvio API type declarations
```

---

## 4. Development & Build Workflows

### 1. Build Providers
To bundle TypeScript sources from `src/<provider>/` into `providers/<provider>.js`:
```bash
pnpm run build
```

### 2. Test a Provider
Always run a quick CLI verification with Node before committing:
```bash
node -e "
const { getStreams } = require('./providers/home_theatre.js');
getStreams('550', 'movie', null, null).then(console.log);
"
```

### 3. Update Manifest
Whenever updating or adding a scraper:
1. Increment the scraper's version in `manifest.json`.
2. Increment the repository's root `version` in `manifest.json`.
3. Verify that `manifest.json` points to the correct `filename`.
