# Untitled Bicycle Platform Game

Mobile-first, single-player decision-driven business simulation about building a fictional bicycle delivery and short-distance ride platform from a tiny local startup into a powerful urban company.

The player resolves short business situations with 2–4 choices. Decisions change company state, stakeholder relationships, policies and precedents; consequences can return many in-game weeks later.

## Product pillars

- Simple mobile interaction, deeper simulation underneath.
- Real-world business systems in a fully fictional world.
- Decisions create precedents; the world remembers how the company behaved.
- Clean, pragmatic, grey and dirty strategies are viable but carry different long-term costs.
- Growth changes the kinds of problems the player faces, not just the numbers.
- The main retention hook is: **one more week to see what my decisions cause.**

## Current target

- Platform: mobile, portrait, offline-first.
- Format: single-player campaign.
- Session: roughly 5–15 minutes.
- Full campaign target: roughly 5–7 hours, subject to prototype validation.
- Prototype/vertical slice: first 12 in-game weeks, roughly 45–60 minutes and 30–35 decisions.

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — product/gameplay specification and acceptance criteria.
- [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md) — event, NPC, chain and consequence authoring rules.
- [`docs/PRODUCT_GUARDRAILS.md`](docs/PRODUCT_GUARDRAILS.md) — scope, fictionalization, safety and differentiation boundaries.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decisions already locked during product discovery.
- [`docs/PROTOTYPE_ART.md`](docs/PROTOTYPE_ART.md) — demo-first placeholder art sources, boundaries and replacement rules.
- [`assets/README.md`](assets/README.md) — planned asset layout and vendor/runtime separation.
- [`AGENTS.md`](AGENTS.md) — instructions for coding/design agents working in this repository.

## Development

Requires Node.js `24.21.0` and npm `11.19.0` (see `.node-version`; `engine-strict` is on). The prototype is a static installable PWA built with React 19.3.0, Vite 8.3.1 and TypeScript 7.0.2 — see [G0 Decision Package](docs/G0_DECISION_PACKAGE.md).

```bash
npm ci               # install from the lockfile
npm run dev          # local dev server
npm run check        # Biome format + lint
npm run typecheck    # TypeScript
npm run test         # Vitest unit tests
npm run build        # production build into dist/
npm run verify       # check + typecheck + test + build (fast local gate)
npm run test:e2e     # Playwright smoke tests, Chromium + WebKit (needs `npx playwright install chromium webkit` once)
```

`BASE_PATH` sets the repository sub-path for GitHub Pages, e.g. `BASE_PATH=/game/ npm run build`. `npm run test:e2e` builds and serves the app under `/game/` itself.

## Status

T08-T10: the app loads the bundled T18 proof content through a Zod boundary, saves each active event as an IndexedDB checkpoint before showing it, and commits one tap as a single checkpoint (choice, effects, policies, relationships, precedents, scheduled callbacks and the next event) before showing feedback; the next event is evaluated from the state just committed, and options marked irreversible ask for confirmation. Week settlement and the weekly report are not built yet (T11-T12). See [`tasks/todo.md`](tasks/todo.md) for task status and evidence.
