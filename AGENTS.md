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

## 4. Google-Grade Engineering Standards

All TypeScript and JavaScript code written in this repository must strictly adhere to the **Google TypeScript Style Guide**:

1. **Strict Type Safety (Zero `any` Tolerance)**:
   * Do not use implicit or explicit `any`. Model scraper payloads, HTTP responses, and subtitle structures using strict interfaces adhering to [`types/nuvio.d.ts`](types/nuvio.d.ts).
   * All exported functions must include explicit return types and full TSDoc / JSDoc annotations.
2. **Exhaustive Input & Runtime Validation**:
   * Validate TMDB IDs, season numbers, and episode numbers before initiating network requests.
   * Parse untrusted upstream HTML or JSON defensively with fallback defaults.
3. **Hermetic Modularity**:
   * Keep HTTP header generation, obfuscation unpackers, and scraper business logic isolated into dedicated modular files (`src/common/`).
4. **Resilient Error Logging**:
   * Catch blocks must log structured diagnostic logs (`[ScraperName] Error: ...`) and return empty stream arrays `[]` instead of throwing unhandled exceptions that crash the host mobile app.

---

## 5. The 5 Core Clean Code Rules

### RULE 1: Single Responsibility Principle (SRP)
* Each provider module, extractor, or decryption helper must do exactly one thing.
* Keep functions concise (< 30 lines). Break monolithic scraping functions into separate phases: input validation -> upstream fetch -> HTML/JSON extraction -> stream normalization.

### RULE 2: Intention-Revealing, Self-Documenting Naming
* Function and variable names must immediately communicate their behavior and data type without cryptic abbreviations.
* Use descriptive identifiers (`fetchDecryptedSources`, `normalizeStreamQuality`, `isTvShow`) rather than ambiguous names (`s`, `res2`, `tmp`).

### RULE 3: Fail-Fast & Early Returns (The Bouncer Pattern)
* Inspect inputs and preconditions at the beginning of functions.
* If parameters are missing or invalid, exit immediately. Avoid deeply nested `if`/`else` trees.

### RULE 4: DRY (Don't Repeat Yourself) & Constant Extraction
* Reuse common utilities (`src/common/headers.ts`, `src/common/unpacker.ts`) rather than duplicating code across providers.
* Centralize all API endpoints, regex patterns, quality hierarchies, and default headers into dedicated `constants.ts` files.

### RULE 5: Immutability & Pure Functions
* Always use `const`. Never use `var` or reassign variables unless strictly necessary.
* Avoid mutating arrays or objects in-place. Use functional methods (`.map()`, `.filter()`, `.reduce()`, spread operator) to transform data cleanly.

---

## 6. Development & Build Workflows

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
