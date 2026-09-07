# Contributing to Nuvio Providers

Thank you for contributing! To maintain high code quality, security, and runtime stability across diverse devices (Android TV, Apple TV, Smart TVs, Mobile), this repository adheres to **Google Developer Standards** and the **Google TypeScript Style Guide**.

---

## 1. Development Principles

### A. The Hermes Runtime Constraint

Providers execute locally on client devices within React Native's **Hermes JavaScript engine**.

- **Neutral Environment**: The environment supports standard Web APIs (e.g., `fetch`, `URL`, `console`, `TextDecoder`).
- **No Node.js Built-ins**: Never `require('fs')`, `require('path')`, or other Node-only core modules inside provider source code.
- **Hermes Transpilation**: Always use the build pipeline (`pnpm build`). `build.js` transpiles modern async/await syntax into generator functions compatible with Hermes.

### B. Typing & Google Style Guide

- Write new providers in **TypeScript** (`src/<provider>/index.ts`).
- Adhere strictly to the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html):
  - **2 spaces** indentation, semicolons required, single quotes for strings.
  - Explicit return types on exported functions.
  - Comprehensive TSDoc/JSDoc comments (`@param`, `@returns`).
  - No implicit or unnecessary `any` types.
  - Constants named in `UPPER_SNAKE_CASE`.

---

## 2. Commit Message Conventions

This project strictly adheres to **Conventional Commits**:

```text
<type>(<scope>): <short summary>

[optional body]
```

### Allowed Types:

- `feat`: A new provider scraper or significant capability.
- `fix`: Bug fix or extractor repair for an existing provider.
- `docs`: Documentation updates.
- `refactor`: Code improvements without functionality changes.
- `test`: Test suite or CLI runner improvements.
- `chore`: Build tooling or dependency updates.

### Examples:

- `feat(vidlink): add encrypted AES stream extractor`
- `fix(uhdmovies): update base domain to uhdmovies.pink`
- `docs: update provider API specifications`

---

## 3. Pull Request Checklist

Before opening a pull request or pushing to `main`, ensure all quality gates pass:

```bash
# 1. Run full repository verification
pnpm check

# 2. Verify all providers compile cleanly
pnpm build

# 3. Test your provider against real TMDB media
pnpm test <your_provider> 872585
```

All CI checks in `.github/workflows/ci.yml` must be green.
