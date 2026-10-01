# G0 Decision Package — Fast PWA Prototype

## Status

**Proposed for owner review. G0 is not approved yet.**

This package resolves only the D1–D6 choices required to start the 12-week prototype. After owner approval, amend this PR to record the approved choices in `docs/DECISIONS.md`, SPEC section 31, and T01–T06/G0 in `tasks/todo.md`; only then merge and unblock T18/T07.

| Decision | Proposed baseline |
|---|---|
| D1 | Static installable PWA: Node 24.21.0 LTS/npm 11.19.0, React 19.3.0, Vite 8.3.1, TypeScript 7.0.2; GitHub Pages demo. |
| D2 | Hand-authored JSON + Zod boundary validation, semantic IDs, small allowlisted condition/effect vocabulary; no executable content or generic rules DSL. |
| D3 | IndexedDB via `idb`; whole-checkpoint current/previous recovery + stale-write rejection; no account/cloud/analytics/uploads. |
| D4 | Deterministic two-service settlement, 34 decisions over 12 weeks, explicit failure/end rules; numeric values are tuning constants. |
| D5 | Portrait Vietnamese prototype, Kenney placeholders from PR #3, neutral character placeholders, no final branding/audio. |
| D6 | Type/lint/test/build/browser checks in GitHub Actions, bounded content validation, real-device smoke when available. |

---

## D1 — Runtime and delivery

Build a **static installable PWA**.

Core toolchain:
- Node.js `24.21.0` LTS + npm `11.19.0`;
- React / React DOM `19.3.0`;
- Vite `8.3.1`;
- TypeScript `7.0.2`.

T07 pins exact compatible supporting packages in `package.json` / `package-lock.json`: React Vite/PWA plugins, Zod, `idb`, Vitest, Playwright, Biome, and required React/Node type packages. Those patch pins are scaffold details; changing the selected runtime/tool category is a G0-level decision.

Delivery boundary:
- GitHub Pages for the shared demo; Vite locally.
- First acquisition requires network; after service-worker readiness, core gameplay and used local assets/content work offline.
- Prompt for updates; do not surprise-reload during play.
- Support repository sub-path hosting.
- No backend/API, login, payment, cloud save, runtime CDN, router framework or separate global-state library for the first slice.
- Final store/native-wrapper strategy stays open.

Verification target:
- automated portrait Chromium + WebKit, primary layout around `390x844`;
- manual current Android browser + current iOS Safari smoke when available; unavailable = `Not run`.

---

## D2 — State and content

Keep the five existing concepts: **Event, Event Chain, NPC, World State, Memory/Precedent**.

- UTF-8 JSON under `content/prototype/`.
- Stable semantic IDs; no vendor asset filenames in gameplay/content IDs.
- Zod validates authored/loaded data once T08 makes content executable.
- Role-based NPC IDs may remain placeholders until canonical identities are approved.
- No arbitrary JavaScript or generic story/rules DSL.

Initial condition vocabulary: `eq`, `neq`, `gte`, `lte`, `has`, `notHas`.

Initial effect vocabulary:
- bounded metric adjustment;
- flags/policies;
- NPC/organization relationship/status;
- memory/precedent;
- delivery/ride demand modifier or recurring policy cost;
- required callback scheduling.

Checkpoint state includes only accepted-content needs: version/sequence, week/phase/active event, resolved decisions, visible/used hidden state, used relationships/policies/flags/memories, service modifiers/costs, callback state, and settlement marker/result.

Callbacks preserve authored window/order/context data. Before presentation, evaluate against latest committed state and require 2–4 valid choices. If filtering leaves fewer than two, use an authored valid alternative/fallback; never revive an invalid option.

T18 provides the real converging proof content; this package invents no canonical story.

---

## D3 — Persistence and privacy

Use IndexedDB through `idb`, with `schemaVersion: 1`, monotonic checkpoint sequence, and two logical slots:
- `current`: last committed checkpoint;
- `previous`: prior committed checkpoint for recovery.

Each candidate carries `parentSequence`, the sequence it was derived from. The initial checkpoint uses `parentSequence: null` and is valid only when no `current` checkpoint exists.

A choice/settlement/advance save uses one read-write transaction to:
1. validate the full candidate;
2. read `current` inside the transaction;
3. reject if `current.sequence !== candidate.parentSequence`;
4. move valid `current` to `previous`;
5. assign the next sequence and write the full candidate to `current`;
6. acknowledge/proceed only after transaction completion.

A mismatch is a recoverable stale-write conflict: do not acknowledge or overwrite newer state; reload the latest checkpoint before retrying. This prevents a second tab/window from erasing an already acknowledged choice.

Recovery:
- valid `current` → resume exactly;
- invalid/unsupported `current` + valid `previous` → explicit recovery;
- when recovery is confirmed, use one recovery transaction to re-check that `previous` is still the selected valid checkpoint and `current` is still invalid/missing/unsupported, then promote the recovered checkpoint to a valid `current` before gameplay resumes;
- subsequent saves derive from that recovered `current.sequence`;
- neither valid → blocking recovery; reset requires confirmation;
- never silently coerce/reset unsupported future schema.

Prototype privacy: no account, cloud save, analytics/ads SDK, uploads, personal-data collection or server gameplay logs. Site-storage clearing is an explicit prototype limitation.

---

## D4 — Prototype simulation

These numbers are **initial tuning constants**. Playtest may change them without reopening G0 if the model and player-visible contract stay the same.

Initial visible state:
- Cash `50`;
- delivery jobs / rides `0` before first settlement;
- Rider Network `50/100`;
- Merchant Network `40/100`;
- Public Trust `50/100`.

Network/trust clamp to `0..100`. Hidden values start neutral only when used.

Weekly decision budget:
`[2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2]` = **34 decisions**. Required callbacks consume normal slots.

Prototype stages:
- W1–4 `street_startup`;
- W5–8 `local_platform`;
- W9–12 `city_player`.

Weekly settlement runs once after choices using latest committed state:

```text
riderFactor    = trunc((riderNetwork - 50) / 10)
merchantFactor = trunc((merchantNetwork - 40) / 10)
trustFactor    = trunc((publicTrust - 50) / 15)

deliveryJobs = clamp(0, 40, 18 + riderFactor + merchantFactor + deliveryDemandModifier)
rideJobs     = clamp(0, 30, 12 + riderFactor + trustFactor + rideDemandModifier)

grossIncome = (deliveryJobs * 2) + (rideJobs * 3)
weeklyCost  = 65 + recurringPolicyCost
cashDelta   = grossIncome - weeklyCost
```

Initial baseline: 18 deliveries + 12 rides = gross 72, cost 65, cash +7 before authored effects. No random demand roll is required; pre-choice UI remains qualitative.

Failure/end:
- after committed settlement, Cash `< -25` → explicit `failed` state;
- T18/T19 proof histories remain playable through W12;
- after W12 settlement/report and proof payoff → `Prototype Complete`; no W13/full-campaign ending.

---

## D5 — Presentation

PR #3's Kenney packs are **replaceable prototype placeholders** after G0:
- RPG Urban Pack — environment/city;
- UI Pack — temporary panels/buttons;
- Game Icons — generic metric/navigation/status icons;
- Scribble Platformer — rough accents/scene dressing.

T07–T24 may use placeholders without final art. Recurring character art stays deferred; use neutral silhouette/avatar placeholders. A1 is still required for T25 visual-growth work.

Contract:
- provenance/source assets stay under `assets/vendor/`; import only what is used;
- runtime/content uses semantic asset roles/IDs, not vendor filenames;
- player-readable text stays outside images; no required runtime CDN assets;
- portrait Home / Company / Network target;
- events: concise situation + 2–4 large stacked choices + optional qualitative hint/scene;
- feedback only after successful checkpoint;
- semantic native controls, visible focus, practical touch targets around `44x44` CSS px or larger.

Prototype copy is Vietnamese only; do not add an i18n framework yet. Final localization, branding, art direction and audio remain open.

---

## D6 — Verification and first-slice binding

Tool categories:
- TypeScript: typecheck;
- Biome: format/lint;
- Vitest: domain/content/persistence tests;
- Playwright: Chromium + WebKit browser flows;
- Vite: production build;
- GitHub Actions: PR/main verification.

T07 pins exact compatible supporting versions and required React/React DOM/Node type packages.

First-slice repository scripts created and proven by T07:

```text
npm ci
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run verify
```

`verify` is the fast local gate: check + typecheck + unit/integration tests + build. Browser E2E stays a separate `test:e2e` command; CI runs both. This document does not claim these commands exist or pass yet.

### Immediate task bindings

| Task | Actual paths for the first slice | Required evidence |
|---|---|---|
| T18 | `content/prototype/proof-chain.json`; `content/prototype/proof-histories.json`; `tasks/evidence/t18-proof-chain.md` | Paper/data-shape review; two histories document shared-crisis selectable-option difference; no runtime pass claimed. |
| T07 | `package.json`; `package-lock.json`; `vite.config.ts`; `src/main.tsx`; `src/App.tsx`; `tests/e2e/smoke.spec.ts`; `.github/workflows/verify.yml` | Install, check/typecheck/test/build, PWA manifest/service worker, Chromium/WebKit smoke. |
| T08 | `src/game/content/`; `src/game/persistence/`; `src/game/ui/`; `tests/game/`; `tests/e2e/offline-resume.spec.ts` | AC-04/05: same event/options on resume; failed/stale save no success; recovered checkpoint can save again; complete checkpoint recovery. |
| T09 | `src/game/domain/`; `src/game/persistence/`; `src/game/ui/`; `tests/game/`; `tests/e2e/offline-resume.spec.ts` | AC-01/04/05: effects/history/callbacks commit together; no duplicate effects. |

These are the concrete first-slice locations required by T06, not a full repository file map. Files inside the listed directories may follow the simplest coherent scaffold. Later slices are detailed only when they start.

Also verify the deployed PWA update path once available: install/load version A, deploy B, accept update prompt, confirm B activates without discarding the committed local checkpoint.

Content validation grows from real proof content; do not build a generic solver. Real Android/iOS smoke is required when available, otherwise `Not run`. G1 records player observations separately from reviewer interpretation; no invented participant quota.

Roles:
- implementer: coding agent on the task branch;
- independent approval/review: repository owner/human reviewer;
- self-review is not independent approval.

---

## C01 compatibility check

- Node 24.21.0 satisfies the selected Vite baseline.
- Static PWA/GitHub Pages fits the single-player offline-first prototype without a backend.
- IndexedDB supplies the transactional boundary; `parentSequence` rejects stale-tab overwrites.
- Zod validates data; content is never executed as code.
- PWA precache/local assets support offline core after first acquisition.
- Chromium/WebKit cover the relevant web-engine paths; emulation does not replace device smoke.
- PR #3 placeholders let gameplay work proceed without final art.

Known limitations: browser site storage can be cleared; PWA install/update UX varies by OS/browser; GitHub Pages is public static hosting and must contain no secrets; D4 values are tuning baselines.

## Source references checked 2026-10-01

- Node: https://nodejs.org/en/download/current
- React: https://react.dev/versions
- Vite: https://vite.dev/guide/
- TypeScript: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- PWA updates: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology
- Playwright: https://playwright.dev/docs/test-projects
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Approval checklist

- [ ] D1 runtime/delivery
- [ ] D2 state/content
- [ ] D3 save/privacy
- [ ] D4 simulation
- [ ] D5 presentation/art/language
- [ ] D6 verification + first-slice bindings

Until owner approval is recorded and canonical docs are amended, **T18/T07 remain blocked**.
