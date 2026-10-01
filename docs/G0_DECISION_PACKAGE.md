# G0 Decision Package — Fast PWA Prototype

## Status

**Proposed for owner review. G0 is not approved yet.**

This is the single D1–D6 package required by `tasks/plan.md`. It optimizes for a fast playable 12-week demo, not a final store-ready app.

Before implementation starts, owner approval must be recorded. After approval, this PR will be amended to update `docs/DECISIONS.md`, SPEC section 31, and T01–T06/G0 in `tasks/todo.md`; only then should it merge and unblock T18/T07.

## Summary

| Decision | Proposed prototype baseline |
|---|---|
| D1 Runtime/delivery | Static PWA: Node 24.21.0 LTS/npm 11.19.0, React 19.3.0, Vite 8.3.1, TypeScript 7.0.2; GitHub Pages demo. |
| D2 State/content | Hand-authored JSON + Zod validation, semantic IDs, small allowlisted condition/effect vocabulary; no executable content/DSL. |
| D3 Persistence/privacy | IndexedDB via `idb`; whole-checkpoint atomic save with `current` + `previous`; no account/cloud/analytics/uploads. |
| D4 Simulation | Deterministic two-service weekly settlement, 34 decisions over 12 weeks, explicit starting/failure/end rules. |
| D5 Presentation | Portrait Vietnamese prototype, Kenney placeholders, silhouette/avatar NPC placeholders, no final branding/audio. |
| D6 Verification | Biome + TypeScript + Vitest + Playwright Chromium/WebKit + Vite build in GitHub Actions; bounded content checks + manual device smoke when available. |

---

## D1 — Runtime and delivery

### Choice

Build a **static installable PWA**, not a native/cross-platform binary, for the prototype.

Pin the first scaffold to:

- Node.js `24.21.0` LTS + npm `11.19.0`;
- React / React DOM `19.3.0`;
- Vite `8.3.1` + `@vitejs/plugin-react` `6.1.1`;
- TypeScript `7.0.2`;
- `vite-plugin-pwa` `1.3.0`;
- Zod `4.6.5`;
- `idb` `8.0.3`.

D6 development dependencies:

- Vitest `5.0.3`;
- Playwright Test `1.63.0`;
- Biome `2.5.14`.

Use exact direct versions and one committed `package-lock.json`.

### Delivery/runtime boundary

- Shared demo: GitHub Pages deployed from verified `main` build.
- Local development: Vite.
- First acquisition requires network; after successful load/service-worker readiness, core gameplay + used local assets/content must work offline.
- Use PWA **prompt-for-update**, not silent auto-reload during play.
- Support the GitHub Pages repository sub-path; do not assume `/` hosting.
- No backend/API, login, payment, cloud save, runtime CDN dependency, router framework or separate global-state library in T07.
- Final iOS/Android/store/wrapper strategy remains open.

### Target coverage

Automated browser flows: portrait Chromium + WebKit, primary layout around `390x844`, with narrower portrait coverage where relevant.

Manual milestone smoke, when available: one current Android browser + one current iOS Safari device. Unavailable checks are `Not run`, never passed by assumption.

### Version/source check — 2026-10-01

- Node LTS/npm: https://nodejs.org/en/download/current
- React: https://react.dev/versions and https://react.dev/blog/2026/09/09/react-19-3
- Vite requirements/version: https://vite.dev/guide/ and https://www.npmjs.com/package/vite
- React Vite plugin: https://www.npmjs.com/package/@vitejs/plugin-react
- TypeScript 7/version: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ and https://www.npmjs.com/package/typescript
- PWA update behavior: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html
- GitHub Pages workflow: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

---

## D2 — State and content contract

Keep the existing five concepts authoritative: **Event, Event Chain, NPC, World State, Memory/Precedent**.

### Format

- Authored UTF-8 JSON under `content/prototype/`.
- TypeScript/Zod validation once T07/T08 runtime tooling exists.
- Stable semantic IDs; no vendor asset filenames in gameplay/content IDs.
- Recurring NPC IDs may remain role-based placeholders until canonical identities are approved.
- JSON preserves the fields already required by `docs/CONTENT_GUIDE.md`.

### Conditions

Only add operators actual slice content needs. Initial allowlist:

- `eq`, `neq`;
- `gte`, `lte`;
- `has`, `notHas`.

Keep the existing 1–3 meaningful-condition guideline. No arbitrary JavaScript or generic rules DSL.

### Effects

Initial allowlist:

- adjust bounded visible/hidden metrics;
- set/clear authored flags or policy state;
- change NPC/organization relationship/status;
- add memory/precedent;
- adjust delivery/ride demand modifier or recurring policy cost;
- schedule required callback with authored window/order/context behavior.

### Coherent checkpoint state

Persist only fields actually needed by accepted content, including:

- schema/checkpoint version + sequence;
- week + phase + active event;
- current-week resolved decisions;
- visible metrics and used hidden state;
- used relationships/statuses/policies/flags/memories;
- service modifiers/recurring policy costs;
- pending/resolved required callbacks;
- settlement marker/result.

Required callbacks retain target/variant, earliest/latest week, authored tie order, eligibility/context key, changed-context variant/report closure, and pending/resolved state. Original schedule is not recomputed from dialogue later.

Before an event is shown, evaluate against latest committed state and require 2–4 valid selectable options. If filtering leaves fewer than two, use an authored variant/alternative/fallback; never re-enable an invalid option just to fill the count.

### D2 paper example

Schema-only example, not canonical story content: Event A records one of two policy precedents and schedules a week-3–4 callback; both histories later converge on Event B, where one precedent unlocks a representative-help option and the other history receives a different authored valid option. Both retain 2–4 choices.

T18 replaces this example with real proof-chain content.

---

## D3 — Persistence and privacy

### Storage contract

Use IndexedDB through `idb`. IndexedDB's transactional model is the local atomic-write boundary: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

Start with `schemaVersion: 1` and a monotonic checkpoint sequence.

Keep two logical slots:

- `current` — last committed checkpoint;
- `previous` — prior committed checkpoint for recovery.

A choice/settlement/advance save must:

1. validate the whole candidate checkpoint;
2. use one read-write transaction covering both slots;
3. move valid `current` to `previous`;
4. write the full candidate to `current`;
5. acknowledge success/proceed only after completion.

If write/transaction fails, progression stays blocked and the prior complete checkpoint remains authoritative.

### Load/recovery

- Valid `current` → resume exactly.
- Invalid/unsupported `current` + valid `previous` → explicit recovery option.
- Neither valid → blocking recovery screen; new-run reset requires explicit confirmation.
- Never silently reset or coerce an unsupported future schema.
- Browser/OS/user-cleared site storage is an explicit prototype limitation, not a reason to hide present save corruption.

### Privacy boundary

Prototype has no account, cloud save, analytics/ads SDK, uploads, personal-data collection or server gameplay logs. Local timestamps may exist for diagnostics/UI but never advance in-game time.

---

## D4 — Prototype simulation rules

These are testable prototype tuning values, not final balance.

### Initial visible state

- Cash: `50` abstract units;
- current/last-settled delivery jobs: `0` before first settlement;
- current/last-settled rides: `0` before first settlement;
- Rider Network: `50/100`;
- Merchant Network: `40/100`;
- Public Trust: `50/100`.

Network/trust metrics clamp to `0..100`. Hidden values begin neutral only when accepted content actually uses them.

### Weekly decision budget

`[2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2]` = **34 decisions** across weeks 1–12.

Required callbacks consume normal slots.

Prototype eligibility stages:

- W1–4: `street_startup`;
- W5–8: `local_platform`;
- W9–12: `city_player`.

This is slice pacing, not the full-campaign progression formula.

### Weekly settlement

Run once after that week's choices using latest committed state:

```text
riderFactor    = trunc((riderNetwork - 50) / 10)
merchantFactor = trunc((merchantNetwork - 40) / 10)
trustFactor    = trunc((publicTrust - 50) / 15)

deliveryJobs = clamp(0, 40,
  18 + riderFactor + merchantFactor + deliveryDemandModifier)

rideJobs = clamp(0, 30,
  12 + riderFactor + trustFactor + rideDemandModifier)

grossIncome = (deliveryJobs * 2) + (rideJobs * 3)
weeklyCost   = 65 + recurringPolicyCost
cashDelta    = grossIncome - weeklyCost
```

Demand modifiers / recurring policy cost start at `0` and change only through authored effects. Initial baseline settles to `18` deliveries + `12` rides, income `72`, cost `65`, cash `+7` before event effects.

No random demand roll is needed. Pre-choice UI stays qualitative; do not reveal hidden formula/future exact deltas.

### Failure/end

- After a committed settlement, Cash `< -25` enters explicit `failed` state; no auto-reset/auto-continue.
- T18/T19 demonstration histories must remain playable through W12.
- After W12 settlement/report and required shared-crisis/PR-agency payoff, show `Prototype Complete`; no W13 and no invented full-campaign ending.

---

## D5 — Presentation constraints

PR #3's Kenney packs are approved **only as replaceable demo placeholders** once G0 clears:

- RPG Urban Pack — environment/city;
- UI Pack — temporary panels/buttons;
- Game Icons — generic metric/navigation/status icons;
- Scribble Platformer — rough accents/scene dressing.

T07–T24 may use them without final art. Recurring character art remains deferred; use neutral silhouette/avatar slots. No Kenney character becomes canonical.

A1 remains separately required for T25 visual-growth work; this package does not claim PR #3 completed A1.

### Asset/UI rules

- Keep provenance/source assets under existing `assets/vendor/` boundary; import only used subset.
- Runtime/content refers to semantic asset roles/IDs, not vendor filenames.
- Player-readable text stays outside images; no required runtime CDN assets.
- Portrait Home / Company / Network navigation remains the target.
- Events: optional portrait/scene area + concise situation + 2–4 large stacked choices + optional qualitative hint.
- Feedback appears only after successful checkpoint.
- Prefer semantic native controls; practical touch target about `44x44` CSS px or larger; retain visible keyboard focus.

### Language/branding/audio

**Proposal:** prototype player-facing copy is Vietnamese only. Do not add an i18n framework yet; keep text in UTF-8 content/code so localization remains possible later.

Use generic fictional temporary labels rather than locking final company/city/competitor names. No prototype audio production. Final localization, branding, art direction and audio scope remain open.

---

## D6 — Verification and first-slice bindings

### Tools

- TypeScript: typecheck;
- Biome: format/lint gate;
- Vitest: domain/content/persistence tests;
- Playwright: Chromium + WebKit mobile browser flows;
- Vite: production build;
- GitHub Actions: PR/main verification.

Playwright source: https://playwright.dev/docs/test-projects and https://playwright.dev/docs/emulation

### Commands created and proven by T07

```text
npm ci
npx playwright install --with-deps chromium webkit
npm run dev
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run verify
```

`verify` means check + typecheck + unit/integration tests + production build + browser tests. Browser installation is setup/CI work, not rerun inside every normal local `verify`.

This document does **not** claim these commands exist or pass before T07.

### CI/security boundary

After T07 exists:

- one focused verify workflow on pull requests and `main` using pinned Node + `npm ci`;
- Pages deployment only from successful `main` build, not PR code;
- exact direct versions + one lockfile;
- review dependency install/lifecycle behavior;
- run native npm advisory audit at the actual install boundary and triage high/critical findings; no blind forced-major remediation.

### Content verification

Do not build a generic solver.

T18 is independent of T07: draft proof JSON + paper/data checklist first. T08 then makes those fixtures executable through the real Zod loader.

Executable coverage grows from the proof pack and checks unique references, 2–4 valid options, callback windows/order/changed-context resolution, deadline capacity and fallback coverage for bounded reachable states. T19 plays both required histories through real selection/resolution rules.

### Browser/device/player evidence

- automated portrait Chromium + WebKit at browser-facing checkpoints;
- offline/reload/resume checks once persistence exists;
- real Android/iOS smoke when available, otherwise `Not run`;
- G1 first-time-player sheet records interaction understanding, consequence recognition, stakeholder tension understanding, desire for another week, direct comments, and reviewer interpretation separately. No invented participant quota.

### Roles

- Implementer: coding agent on the task branch.
- Independent approval/review: repository owner/human reviewer; self-review is not independent approval.

### T18 — proof-chain draft

Expected paths:

```text
content/prototype/proof-chain.json
content/prototype/proof-histories.json
tasks/evidence/t18-proof-chain.md
```

Acceptance: paper/data-shape walk against `CONTENT_GUIDE.md` + D2/D4/D5; IDs/options/windows reviewed; two histories document the shared-crisis selectable-option difference. No runtime/schema-test pass claimed yet.

### T07 — minimal runnable scaffold

Expected coherent scaffold (generated/config files may exceed the normal file-count signal):

```text
package.json
package-lock.json
vite.config.ts
tsconfig*.json
biome.json
playwright.config.ts
index.html
src/main.tsx
src/App.tsx
src/styles.css
tests/e2e/smoke.spec.ts
.github/workflows/verify.yml
```

Acceptance: pinned install succeeds; portrait shell launches; PWA manifest/service worker is in production build; all D6 commands exist and are actually run; Chromium/WebKit mobile smoke passes; no backend/account/analytics dependency.

### T08 — unanswered-event resume

Expected paths:

```text
src/game/content/schema.ts
src/game/content/load-content.ts
src/game/persistence/checkpoint-store.ts
src/game/ui/EventScreen.tsx
tests/game/checkpoint-store.test.ts
tests/e2e/offline-resume.spec.ts
```

Focus AC-04/AC-05: save active event before display, restore same valid options, block on save failure, preserve prior complete checkpoint. T18 proof data becomes schema-validated runtime input here.

### T09 — coherent choice commit

Expected paths:

```text
src/game/domain/resolve-choice.ts
src/game/persistence/checkpoint-store.ts
src/game/ui/EventScreen.tsx
tests/game/resolve-choice.test.ts
tests/e2e/offline-resume.spec.ts
```

Focus AC-01/AC-04/AC-05: effects/history/callbacks commit together; no success feedback before checkpoint success; retry/repeated activation cannot duplicate effects.

---

## C01 compatibility check

- Node 24.21.0 satisfies Vite's documented Node requirement.
- Static PWA/GitHub Pages matches the single-player core without adding a backend.
- IndexedDB transactions provide the local atomic boundary; `idb` is only a small wrapper.
- Zod validates authored/load data; content is never executed as code.
- PWA precache + local assets supports offline core after initial acquisition; prompted updates avoid surprise reload.
- Chromium/WebKit cover the two relevant web-engine paths for this prototype.
- PR #3 placeholders + silhouettes allow T07–T24 without final character art.

Known limitations: browser site storage can be cleared; PWA install UX varies by OS/browser; emulation does not replace real-device smoke; GitHub Pages is public static hosting and must contain no secrets; D4 economy values are tuning baselines and require explicit amendment if play evidence changes them.

## Approval checklist

- [ ] D1 runtime/delivery
- [ ] D2 state/content contract
- [ ] D3 save/privacy
- [ ] D4 simulation baseline
- [ ] D5 presentation/art/language boundary
- [ ] D6 verification + T18/T07–T09 bindings

Until owner approval is recorded and canonical docs are amended, **T18/T07 remain blocked**.
