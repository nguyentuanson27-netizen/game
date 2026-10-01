# G0 Decision Package — Fast PWA Prototype

## Status

**Proposed for owner review. G0 is not approved yet.**

This package resolves the minimum D1–D6 decisions required by `tasks/plan.md` so the first runnable 12-week slice can be implemented without inventing architecture inside code.

The proposal intentionally optimizes for a **fast playable demo**, not a final store-ready mobile app. The owner-selected Kenney packs remain replaceable placeholder art, and recurring character art remains deferred.

Before implementation starts, the owner must approve this package. When that happens, this PR should be amended to:

1. change this status to `Approved`;
2. record the approved prototype-only decisions in `docs/DECISIONS.md` and update SPEC section 31;
3. mark T01–T06/G0 accordingly in `tasks/todo.md`;
4. only then merge and begin T18/T07.

## Decision summary

| Decision | Proposed prototype baseline |
|---|---|
| D1 Runtime/delivery | Static installable PWA: React 19.3.0 + Vite 8.3.1 + TypeScript 7.0.2, Node 24.21.0 LTS/npm 11.19.0; GitHub Pages for shared demo delivery. |
| D2 State/content | Hand-authored JSON content validated with Zod; stable semantic IDs; small allowlisted condition/effect vocabulary; no scripting or generic rules DSL. |
| D3 Persistence/privacy | IndexedDB via `idb`, whole-checkpoint atomic writes with `current` + `previous` recovery slots, schema versioning, no analytics/accounts/cloud save for the prototype. |
| D4 Simulation | Deterministic weekly settlement for both services, 34 decisions across 12 weeks, explicit prototype-only starting values and failure/end rules. |
| D5 Presentation | Portrait web UI, Vietnamese prototype copy, Kenney placeholders, neutral silhouette/avatar NPC placeholders, runtime text outside images, no audio or final branding. |
| D6 Verification | Vitest + Playwright Chromium/WebKit mobile profiles + Biome + TypeScript + Vite build in GitHub Actions; bounded content validation and manual target-device smoke checks. |

---

# D1 — Runtime and prototype delivery

## Choice

Build the prototype as a **static Progressive Web App (PWA)** rather than a native/cross-platform mobile binary.

Pinned baseline for the first runnable slice:

- Node.js `24.21.0` LTS;
- npm `11.19.0` bundled with that Node release;
- React `19.3.0`;
- React DOM `19.3.0`;
- Vite `8.3.1`;
- `@vitejs/plugin-react` `6.1.1`;
- TypeScript `7.0.2`;
- `vite-plugin-pwa` `1.3.0`;
- Zod `4.6.5`;
- `idb` `8.0.3`.

Development-only verification dependencies proposed in D6:

- Vitest `5.0.3`;
- Playwright Test `1.63.0`;
- Biome `2.5.14`.

Use exact versions in `package.json` for the initial scaffold and commit one `package-lock.json`.

For T07, do not add a router or separate global-state framework. The three-tab shell and event flow start with React state plus small pure domain modules; add another dependency only when a concrete requirement justifies it.

## Delivery route

- Shared prototype: **GitHub Pages built/deployed by GitHub Actions** from `main` after verification passes.
- Local development: Vite dev server.
- Prototype has no server API, login, account system, payment flow or cloud save.
- Final iOS/Android store strategy remains open; choosing PWA for the prototype does not decide the shipped product wrapper.

A first visit/install naturally requires network access to acquire the app. After a successful load and service-worker readiness, the core game and the locally packaged assets/content it uses must work without network access.

The Vite/PWA setup must support the repository sub-path used by GitHub Pages rather than assuming the site is hosted at `/`.

## PWA behavior

Use `vite-plugin-pwa` with generated service worker/precache for the static app shell, authored content and used local assets.

Use **prompt-for-update**, not silent automatic reload. A newly available build must not unexpectedly reload an in-progress decision. Update UI can offer refresh after the current checkpoint is safely committed.

No gameplay content, fonts or required art should depend on a runtime CDN. Third-party source URLs are provenance only.

## Why this choice

The prototype is primarily card/text/state interaction with a small portrait UI. A static PWA gives the shortest path to:

- tap-first mobile testing;
- installable/offline behavior;
- easy link sharing;
- Chromium and WebKit coverage;
- later replacement/wrapping without coupling story/state logic to a native UI framework.

A native/cross-platform shell is deliberately deferred until the prototype proves the game loop.

## Official/version sources checked 2026-10-01

- Node.js LTS/download: https://nodejs.org/en/download/current
- React versions: https://react.dev/versions
- React 19.3 release: https://react.dev/blog/2026/09/09/react-19-3
- Vite guide/runtime requirements: https://vite.dev/guide/
- Vite npm package/version: https://www.npmjs.com/package/vite
- Vite React plugin: https://www.npmjs.com/package/@vitejs/plugin-react
- TypeScript 7 release: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- TypeScript npm package/version: https://www.npmjs.com/package/typescript
- Vite PWA update behavior: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html
- GitHub Pages custom workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Prototype target coverage

Automated browser-facing checks target portrait mobile behavior in both Chromium and WebKit. Playwright device profiles may be used, with a primary layout assertion around `390x844` and an additional narrower portrait check where the behavior warrants it.

Manual device evidence, when devices are available:

- one current Android device/browser;
- one current iOS Safari device.

Device/browser versions are recorded at test time rather than frozen in this decision document. If a physical target is unavailable, evidence says `Not run`; it is never converted into a pass.

Final store/device support is not decided here.

---

# D2 — State and content contract

## Five prototype concepts remain authoritative

Use the existing SPEC concepts directly:

1. Event;
2. Event Chain;
3. NPC;
4. World State;
5. Memory/Precedent.

Do not introduce a generic narrative engine or executable scripting language.

## Authoring format

- Hand-authored UTF-8 JSON files under `content/prototype/`.
- Runtime/test schemas in TypeScript using Zod once the runtime scaffold exists.
- Validate authored content before it can enter game state.
- Use stable semantic IDs such as `event.rider_shortage.01`; IDs are not filenames shown to players and must not encode vendor asset filenames.
- Recurring NPC IDs can be role-based placeholders until canonical character identities are explicitly approved.

The JSON shape must preserve the fields already defined by `docs/CONTENT_GUIDE.md`: title, stage, speaker, category, situation, why-now conditions, options, option availability, confirmation, effects, memory, follow-up/callback information and cooldown/repeatability.

## Minimal condition vocabulary

Conditions are data, not code. For the prototype, support only operators required by authored slice content:

- `eq` / `neq` for exact state, flag, policy and status checks;
- `gte` / `lte` for bounded numeric state;
- `has` / `notHas` for memories/precedents/relationships where presence is the meaningful question.

Each event should normally keep the existing 1–3 meaningful-condition authoring guideline. New operators require a content case that cannot be represented simply by the existing set.

## Minimal effect vocabulary

Effects are allowlisted structured operations, not arbitrary JavaScript:

- add a bounded visible metric;
- add a bounded hidden metric/sentiment;
- set/clear an authored flag or policy;
- change an NPC/organization relationship/status;
- add a memory/precedent;
- set a service demand modifier or recurring policy cost used by D4;
- schedule a required callback with its authored window/order/context behavior.

The exact TypeScript names can be chosen during T08/T09, but their semantics must stay within this list unless G0 is amended.

## World/checkpoint state

The coherent checkpoint needs, at minimum:

- `schemaVersion`;
- checkpoint identity/sequence;
- current week;
- current phase (`brief`, `event`, `feedback`, `settlement`, `report`, `complete`, `failed` as needed by implementation);
- active event ID when one has been selected;
- decisions already resolved in the current week;
- visible metrics;
- hidden state actually used by accepted content;
- NPC/organization relationships and statuses actually used by accepted content;
- policies/flags;
- memories/precedents;
- service modifiers/recurring policy costs used by D4;
- pending and resolved required callbacks;
- week-settlement marker/result so settlement cannot repeat.

Do not pre-model every late-game system. Add hidden fields only when real accepted prototype content uses them.

## Required callback record

A scheduled required callback stores enough authored information to preserve SPEC section 21 behavior:

- target event/variant key;
- earliest week;
- latest week;
- authored equal-deadline order;
- eligibility/context key;
- changed-context variant or explicit report-closure key;
- pending/resolved status.

Original window/order is not recomputed from current dialogue after scheduling.

## Option validity

Before presentation:

1. load and validate content;
2. evaluate event conditions against the latest committed state;
3. filter options using current committed state;
4. require 2–4 selectable valid options;
5. if fewer remain, use an authored variant/alternative event/fallback — never silently re-enable an ineligible option.

## Small converging example used to validate D2

This is a **schema example, not production/canonical story content**:

- Event A presents three policy choices and records one of two precedent flags.
- A required callback is scheduled for weeks 3–4.
- Event B is shared by both histories.
- In History A, precedent `policy.supportive` permits option `representative_help`.
- In History B, that option is absent and a different context-valid option is authored.
- Both histories still expose 2–4 valid options.

T18 will replace this schema example with the actual proof-chain content while preserving the contract.

---

# D3 — Persistence and privacy

## Storage

Use IndexedDB through `idb` for browser-local save data.

IndexedDB transactions are used because a checkpoint write must be atomic from the game layer's point of view. Do not save individual metrics/effects in independent transactions and then claim the decision completed.

Source checked: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

## Checkpoint format

Start with `schemaVersion: 1` and a monotonically increasing checkpoint sequence.

Persist the **whole coherent game checkpoint** rather than reconstructing a save from separately committed fragments.

Use two logical save slots in the same database:

- `current` — last successfully committed checkpoint;
- `previous` — previous successfully committed checkpoint retained for recovery.

A save operation must:

1. validate the candidate checkpoint in memory;
2. open one read-write transaction covering both slots;
3. copy the previously valid `current` value to `previous`;
4. write the full new candidate to `current`;
5. acknowledge success only after the transaction completes;
6. then permit feedback/next progression.

If the transaction fails/aborts, progression remains blocked and the prior complete save remains the recovery authority.

## Load/recovery

On load:

1. validate `current` against the supported schema/version;
2. if valid, resume it exactly;
3. if corrupt/unsupported, validate `previous`;
4. if `previous` is valid, offer an explicit recovery to it;
5. if neither is valid, show a blocking recovery screen with an explicit confirmed new-run reset.

Never silently start a new campaign because a save cannot be read.

Unsupported future save versions are treated as unsupported, not coerced into current state.

A browser/OS/user clearing site storage is outside the recoverable checkpoint contract. The prototype should state this limitation in its run/help notes; it does not justify silently resetting a present-but-invalid save.

## Privacy/analytics

Prototype baseline:

- no account;
- no cloud save;
- no analytics SDK;
- no advertising SDK;
- no personal-data collection;
- no user-generated uploads;
- no server-side gameplay logs.

Local checkpoint timestamps may be stored for diagnostics/UI but **must never advance game time**.

Analytics/privacy can be reconsidered only in a later explicit decision.

---

# D4 — Prototype simulation rules

These values are **prototype tuning values**, not final economy balance or player-facing promises. They exist so implementation and tests have one executable baseline instead of inventing numbers independently.

## Initial visible state

- Cash: `50` abstract cash units. Do not attach a final real-world currency/brand to the unit yet.
- Delivery jobs shown for current/last settled week: `0` before the first settlement.
- Ride jobs shown for current/last settled week: `0` before the first settlement.
- Rider Network: `50 / 100`.
- Merchant Network: `40 / 100`.
- Public Trust: `50 / 100`.

Visible network/trust metrics are clamped to `0..100`.

Hidden sentiments/pressures actually introduced by prototype content start neutral (`0`) unless an authored scenario explicitly establishes another initial value. Do not instantiate every hidden metric in SPEC before content uses it.

## Weekly decision budget

Use this deterministic prototype budget:

`[2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2]`

for weeks 1–12 respectively: **34 player decisions** before any authored early-ending path.

Required callbacks consume those slots; they do not create bonus slots outside the weekly budget.

## Prototype stage pacing

For content eligibility only:

- Weeks 1–4: `street_startup`;
- Weeks 5–8: `local_platform`;
- Weeks 9–12: `city_player`.

This is prototype pacing, not the final full-campaign progression formula. Player history still changes event/option eligibility inside those stages.

## Deterministic settlement for both services

After the week's 2–4 decisions are committed, settle once using the latest state.

Definitions:

```text
riderFactor    = trunc((riderNetwork - 50) / 10)
merchantFactor = trunc((merchantNetwork - 40) / 10)
trustFactor    = trunc((publicTrust - 50) / 15)

deliveryJobs = clamp(0, 40,
  18 + riderFactor + merchantFactor + deliveryDemandModifier)

rideJobs = clamp(0, 30,
  12 + riderFactor + trustFactor + rideDemandModifier)

grossIncome = (deliveryJobs * 2) + (rideJobs * 3)
weeklyCost  = 65 + recurringPolicyCost
cashDelta   = grossIncome - weeklyCost
```

All demand modifiers and recurring policy costs start at `0` and are changed only by authored effects/policies.

Baseline with the initial state therefore settles to 18 delivery jobs + 12 rides, gross income 72, cost 65 and `+7` cash before authored event effects.

The UI may show the delivery/ride counts and qualitative reasons, but must not expose hidden formulas or future exact deltas before a choice.

Settlement is deterministic: no random demand roll is required for the prototype.

## Early failure

After a successfully committed weekly settlement, if Cash is below `-25`, enter an explicit prototype `failed` state and show an end-of-run report. Do not auto-reset or continue applying weeks.

A new run requires an explicit player action. T18/T19 proof histories must be authored so both intended demonstration histories remain playable through week 12.

## Week 12 endpoint

After week 12 settlement:

- show the week-12 report;
- deliver/reflect the required shared-crisis payoff and PR-agency cliffhanger according to accepted content;
- show `Prototype Complete` instead of advancing to week 13.

This is not a full campaign ending and does not assign a Good/Bad label.

---

# D5 — Prototype presentation constraints

## Art boundary

PR #3's four Kenney CC0 packs are approved **as demo placeholders only** once G0 is approved:

- RPG Urban Pack — city/district/environment placeholder material;
- UI Pack — temporary panels/buttons;
- Game Icons — generic metric/navigation/status icons;
- Scribble Platformer — temporary hand-drawn accents/scene dressing.

T07–T24 may use those placeholders without waiting for final art.

Recurring NPC/character art remains deferred. Use a neutral silhouette/avatar slot where a portrait is required. No Kenney character becomes a canonical recurring NPC.

A1 remains a separate approved-package dependency for T25 visual-growth work as already defined by the plan; this G0 decision does not pretend PR #3 completed A1.

## Asset separation

- Keep source/provenance under the existing `assets/vendor/` boundary.
- Import only the subset actually used by the runnable demo.
- Runtime-facing code/content uses semantic asset IDs/roles, never Kenney filenames directly.
- Keep all player-readable text out of raster/vector artwork.
- No required runtime CDN asset dependency.

## UI contract

Prototype UI is portrait/mobile-first with the existing navigation target:

- Home;
- Company;
- Network.

Events use a full-screen decision presentation with:

- optional scene/portrait placeholder region;
- concise situation copy;
- 2–4 large vertically stacked choice buttons in the lower portion;
- short qualitative hint when useful;
- immediate feedback only after the save checkpoint succeeds.

Use native semantic controls. Touch targets should be approximately `44x44` CSS pixels or larger where practical. Do not remove visible focus behavior; keyboard access remains useful even though touch is primary.

## Prototype language

**Proposal:** prototype player-facing copy is Vietnamese only.

Do not add an i18n framework for the first slice. Keep authored/UI text in UTF-8 data/code rather than baked into artwork so localization can be introduced later without repainting assets.

Final localization scope remains open.

## Branding and audio

- Use temporary generic fictional labels; do not lock final company/city/competitor names in this package.
- Do not copy identifiable real-company trade dress.
- No audio production is required for the first 12-week prototype.
- Final art direction, brand identity and audio scope remain later decisions.

---

# D6 — Verification, CI and first-slice bindings

## Tooling

Use:

- TypeScript compiler for type checks;
- Biome for formatting/linting;
- Vitest for pure state/content/persistence unit/integration tests;
- Playwright for browser-facing mobile flows in Chromium and WebKit;
- GitHub Actions for pull-request/main verification;
- Vite production build as a required static-build check.

Playwright supports Chromium/WebKit projects and device emulation: https://playwright.dev/docs/test-projects and https://playwright.dev/docs/emulation

## Authoritative commands after T07 creates the scaffold

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

Planned meanings:

- `check` → Biome CI-style formatting/lint checks;
- `typecheck` → TypeScript no-emit type check;
- `test` → Vitest;
- `build` → Vite production build;
- `test:e2e` → Playwright Chromium + WebKit mobile projects;
- `verify` → check + typecheck + unit/integration tests + build + browser tests.

Browser installation is setup work, not part of each normal local `verify`; CI installs the pinned Playwright browser binaries/dependencies before `test:e2e`.

T07 must create and actually run these commands before they become evidence. This G0 document does not claim they already exist or pass.

## CI

Once T07 exists, add one focused GitHub Actions verification workflow for pull requests and `main` using the pinned Node/npm boundary and `npm ci`.

Pages deployment is a separate job/workflow that consumes a successful production build on `main`; do not deploy pull-request code as production demo state.

Dependency/security baseline:

- exact direct dependency versions in the initial package manifest;
- one committed npm lockfile;
- CI installs with `npm ci`;
- review install/lifecycle behavior before adding dependencies;
- run the native npm advisory audit at the actual install boundary and triage high/critical findings rather than blindly applying forced major upgrades.

## Content verification strategy

Do not build a generic solver.

Before runtime validation exists, T18 uses the D2 contract and an explicit paper/data checklist. Once T08 introduces the actual loader/schema, the same proof fixtures become executable validation inputs.

Executable checks then grow from the small proof pack:

- unique IDs/references;
- valid 2–4 option counts after authored conditions for reachable proof states;
- valid callback windows/order/context closure;
- no required-delivery over-capacity within the weekly budget;
- fallback coverage for enumerated reachable proof states.

T19 executes both required histories using the real selection/resolution rules. Later content batches extend the bounded reachable-state checks before they are accepted.

## Device/browser verification

For every browser-facing checkpoint where applicable:

- automated portrait Chromium project;
- automated portrait WebKit project;
- explicit offline/reload/resume scenarios once persistence exists.

At milestone reviews, add manual real-device smoke evidence when devices are available. Record unavailable device checks as `Not run` with the reason.

## Player-observation method

For G1, use a first-time-player observation sheet rather than inventing a participant quota in advance. For each session record separately:

- whether the basic choice interaction was understood without coaching;
- whether the player recognized at least one later consequence as caused by an earlier choice;
- whether the player understood the main customer/rider/merchant/platform tension;
- whether they wanted to continue another week;
- direct player comments;
- reviewer interpretation kept separate from direct comments.

G1 remains a qualitative prototype checkpoint, not statistical validation.

## Roles

- Implementer: coding agent working on the task branch.
- Independent approval/review: repository owner/human reviewer. Self-review is additional evidence, not independent approval.

## First-slice file/check bindings

These paths are the expected boundaries for the **next** implementation slice. If Vite scaffold generation requires adjacent config/lock files, keep that coherent scaffold together and explain the exception rather than creating a broken intermediate state.

### T18 — proof-chain draft

T18 remains independent from the runtime scaffold. Expected paths:

```text
content/prototype/proof-chain.json
content/prototype/proof-histories.json
tasks/evidence/t18-proof-chain.md
```

Verification before T18 is accepted:

- paper/data-shape walk against `CONTENT_GUIDE.md` and D2/D4/D5;
- IDs/references/options/windows reviewed using the proposed contract;
- two expected histories documented with a selectable-option difference at the shared crisis;
- no runtime/schema-test pass claimed before T07/T08 makes those checks executable.

### T07 — minimal runnable scaffold

Expected coherent scaffold boundary:

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

Acceptance/verification:

- pinned approved toolchain installs with `npm ci`;
- Playwright Chromium/WebKit browser dependencies are installed for browser checks;
- portrait shell launches locally;
- PWA manifest/service-worker generation is present in production build;
- `check`, `typecheck`, `test`, `build`, `test:e2e`, `verify` are executable and recorded;
- automated Chromium/WebKit mobile smoke passes;
- no server/account/analytics dependency is introduced.

### T08 — resume an unanswered event

Expected paths:

```text
src/game/content/schema.ts
src/game/content/load-content.ts
src/game/persistence/checkpoint-store.ts
src/game/ui/EventScreen.tsx
tests/game/checkpoint-store.test.ts
tests/e2e/offline-resume.spec.ts
```

Verification centers on AC-04/AC-05: active event saved before presentation, same valid options after reopen, failed save blocks progression, prior complete checkpoint survives. T08 also turns the T18 proof data into schema-validated runtime input.

### T09 — commit one choice coherently

Expected paths:

```text
src/game/domain/resolve-choice.ts
src/game/persistence/checkpoint-store.ts
src/game/ui/EventScreen.tsx
tests/game/resolve-choice.test.ts
tests/e2e/offline-resume.spec.ts
```

Verification centers on AC-01/AC-04/AC-05: all immediate effects/history/callbacks commit together, no success feedback before checkpoint success, retry/repeated activation cannot duplicate effects.

---

# Compatibility check C01

The proposal is internally compatible:

- PWA + GitHub Pages can serve a static React/Vite build over HTTPS.
- Vite's documented Node requirement is satisfied by Node 24.21.0 LTS.
- The game needs no backend for the locked single-player/offline-first core loop.
- IndexedDB provides transactional local storage suitable for the coherent checkpoint boundary; `idb` is a small wrapper rather than a second persistence model.
- Zod validates hand-authored JSON and loaded saves before use; no content is executed as code.
- PWA precaching keeps the used app/content/assets local after first successful acquisition.
- Prompted service-worker updates avoid surprise reloads in the middle of an unresolved event.
- Chromium/WebKit browser projects cover the two browser engines most relevant to the proposed web prototype path.
- Kenney placeholder assets and deferred character art fit D5 without blocking T07–T24.

## Known prototype limitations

- Browser storage can be cleared by the user/OS; there is no cloud backup in this prototype.
- PWA installation behavior differs between browsers/OS versions; the demo must remain usable in the browser without requiring installation.
- Browser automation/emulation does not replace real-device smoke checks.
- GitHub Pages is public static hosting and is not appropriate for secrets/sensitive transactions; this prototype contains neither.
- Exact economy values are tuning baselines and may be revised through an explicit decision change if gameplay evidence shows they are poor.

---

# G0 approval checklist

Owner approval should confirm the following as a package, not as six separate ceremonies:

- [ ] D1: PWA/React/Vite/TypeScript prototype route and GitHub Pages sharing route.
- [ ] D2: validated JSON content + small allowlisted condition/effect contract.
- [ ] D3: IndexedDB whole-checkpoint save/recovery and no analytics/cloud/account scope.
- [ ] D4: 12-week/34-decision pacing, starting values, deterministic two-service settlement, failure/week-12 endpoint.
- [ ] D5: Vietnamese prototype, Kenney placeholders, silhouettes for characters, no audio/final branding.
- [ ] D6: test/CI/browser/device/content verification and T18/T07–T09 bindings.

Until those are approved and the canonical docs are amended, **T18 and T07 remain blocked and no gameplay implementation should begin**.
