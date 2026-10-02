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
npm run test         # Vitest unit, game and content tests
npm run test:content # only the T17 content validation of the prototype pack
npm run build        # production build into dist/
npm run verify       # check + typecheck + test + build (fast local gate)
npm run test:e2e     # Playwright smoke tests, Chromium + WebKit (needs `npx playwright install chromium webkit` once)
```

`BASE_PATH` sets the repository sub-path for GitHub Pages, e.g. `BASE_PATH=/game/ npm run build`. `npm run test:e2e` builds and serves the app under `/game/` itself.

## Status

T08-T12: the first playable weekly loop. The app loads the bundled T18 proof content through a Zod boundary and saves every step as an IndexedDB checkpoint before showing it: the active event, one tap (choice, effects, policies, relationships, precedents, scheduled callbacks and the next event, evaluated from the state just committed, with confirmation only for authored irreversible options), the D4 week settlement and the weekly report. Each step resumes exactly after a reload or offline reopen, and a save that does not match the authored content (unknown NPC status, wrong callback source, tampered settlement) is blocked, never repaired. `Next Week` into a week authored with fewer than the 2 required decisions is refused. T15 delivers required callbacks inside their authored windows (a due callback takes a slot before ordinary events, earliest deadline first, then the authored tie order; it stays pending when slots are full and resolves once). The shipped proof route is walkable end to end: week 1 plays the setup, weeks 2-12 carry two placeholder routine beats each (campaign content replaces them from T21), the rider follow-up arrives in week 7 and the shared crisis in week 10, and the week-12 `Prototype Complete` endpoint needs every required callback resolved. T16: a callback whose context changed is delivered through an authored variant or closed by its authored report closure (committed with the week's settlement, no slot, no effect). T17 validates the actual pack (`npm run test:content`): references, windows, tie order, callback capacity, reachability, fallback and option-count over a bounded enumeration of every reachable state. The player observation (T20/G1) is still to do. T13/T14 add a save-failure matrix and real-browser interruption and offline-restart tests (device runs are still `Not run`). See [`tasks/todo.md`](tasks/todo.md) for task status and evidence.
