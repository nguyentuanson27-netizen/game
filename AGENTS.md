# AGENTS.md

## Purpose

Instructions for coding/design agents working in this repository.

## Source of truth

Read these before substantial work:

1. `docs/SPEC.md`
2. `docs/DECISIONS.md`
3. `docs/PRODUCT_GUARDRAILS.md`
4. `docs/CONTENT_GUIDE.md` when touching narrative/content systems

Do not silently override locked product decisions.

## Current project state

G0 approved the prototype baseline (static PWA: Node 24.21.0, npm 11.19.0, React 19.3.0, Vite 8.3.1, TypeScript 7.0.2; see `docs/G0_DECISION_PACKAGE.md`). T07 added a minimal runnable scaffold. T08 added the content boundary (`src/game/content/`), IndexedDB checkpoints (`src/game/persistence/`) resume of the first unanswered proof event, and (T09) committing one choice as a single checkpoint; (T10) current-state options with fallback and confirmation for authored irreversible options; (T11) D4 weekly settlement committed once, and (T12) a weekly report with a durable Next Week and the week-12 `Prototype Complete` endpoint. T13/T14 add a systematic save-failure matrix and real-browser interruption/restart tests. Callback delivery (T15) is not built yet, and the proof loop authors decisions for week 1 only, so Next Week into a week with fewer than 2 authored decisions is refused, and week 12 cannot close the prototype while required callbacks are pending.

Commands (see `README.md`): `npm ci`, `npm run check`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`, `npm run verify`.

Implementation details not fixed by G0 belong to later tasks. Preserve the approved content, persistence and simulation contracts in `docs/DECISIONS.md` and SPEC section 31; if a later task needs an additional material decision, surface it instead of guessing.

## Product invariants

- Mobile-first, portrait.
- Single-player and offline-first core loop.
- Decision-driven simulation.
- Main interaction is concise event text plus 2–4 tap choices.
- Important past decisions create state, relationships, precedents and delayed consequences.
- No global Good/Evil meter.
- No design that collapses gameplay into obvious `+/- stat` arithmetic.
- Company growth must introduce qualitatively new problems.
- Fictional world; do not map content 1:1 to real companies or scandals.

## Scope discipline

Prefer the smallest implementation that proves the current requirement.

Do not add:

- realtime city simulation;
- multiplayer;
- runtime LLM storytelling;
- deep politics/stock-market subsystems;
- live-service mechanics;
- unrelated architecture abstractions.

unless the spec is explicitly changed first.

## Engineering workflow

For non-trivial changes:

1. identify the relevant spec acceptance criteria;
2. inspect the existing code/tests and project conventions;
3. plan the smallest vertical slice;
4. add/adjust tests for changed behaviour;
5. implement narrowly;
6. run the repository's actual focused and relevant full checks;
7. review correctness, security, simplicity and mobile UX;
8. report what was actually verified.

Never claim tests/build/runtime/deploy succeeded unless they were actually run.

## Security and external data

Treat user input, external APIs, analytics payloads, store data, model output and imported content as untrusted.

If future implementation adds networking, accounts, payments, uploads, analytics, external APIs or secrets, perform explicit security review before shipping.

## Content implementation

Narrative content should remain data-driven enough to test conditions/effects without hard-coding story branches throughout UI code.

Do not create unbounded branching. Follow the branch-and-converge and precedent rules in `docs/CONTENT_GUIDE.md`.

## Documentation

When a locked product decision changes, update `docs/DECISIONS.md` and the relevant spec section in the same change.

Do not let implementation become the only record of a product decision.
