# G0 Decision Package — Fast PWA Prototype

## Status

**Proposed for owner review. G0 is not approved yet.**

This is the single D1–D6 package required by `tasks/plan.md`. It chooses the minimum product/technical baseline needed to start the 12-week prototype. It is not a full implementation design.

After owner approval, this PR should be amended to record the approved choices in `docs/DECISIONS.md`, SPEC section 31, and T01–T06/G0 in `tasks/todo.md`. Only then should it merge and unblock T18/T07.

## Decision summary

| Decision | Proposed prototype baseline |
|---|---|
| D1 Runtime/delivery | Static installable PWA using Node 24.21.0 LTS/npm 11.19.0, React 19.3.0, Vite 8.3.1 and TypeScript 7.0.2; GitHub Pages for the shared demo. |
| D2 State/content | Hand-authored JSON + Zod boundary validation, semantic IDs, small allowlisted condition/effect vocabulary, no executable content or generic rules DSL. |
| D3 Persistence/privacy | IndexedDB via `idb`; coherent whole-checkpoint saves with current/previous recovery slots plus stale-write rejection; no account/cloud/analytics/uploads. |
| D4 Simulation | Deterministic two-service weekly settlement, 34 decisions over 12 weeks, explicit starting/failure/end rules. Values are prototype tuning, not permanent balance. |
| D5 Presentation | Portrait Vietnamese prototype, Kenney placeholders from PR #3, neutral character placeholders, no final branding/audio. |
| D6 Verification | Type/lint/unit/integration/build/browser checks in GitHub Actions, bounded content validation, and real-device smoke when available. |

---

## D1 — Runtime and delivery

### Choice

Build a **static installable PWA** for the prototype.

Core toolchain:

- Node.js `24.21.0` LTS + npm `11.19.0`;
- React / React DOM `19.3.0`;
- Vite `8.3.1`;
- TypeScript `7.0.2`.

T07 will pin the exact compatible supporting packages in `package.json` / `package-lock.json`, including the React Vite plugin, PWA plugin, Zod, `idb`, Vitest, Playwright, Biome, and required React/Node type packages. Supporting patch versions are a scaffold concern, not a G0 product decision; changing the selected runtime/tool category still requires an explicit decision.

### Delivery boundary

- Shared demo: GitHub Pages from a verified `main` build.
- Local development: Vite.
- First acquisition requires network; after successful load/service-worker readiness, core gameplay and used local assets/content must work offline.
- Use prompt-for-update rather than surprise reload during play.
- Support GitHub Pages repository sub-path hosting.
- No backend/API, login, payment, cloud save, runtime CDN dependency, router framework or separate global-state library for the first slice.
- Final iOS/Android/store/wrapper strategy remains open.

### Target coverage

- Automated browser flows: portrait Chromium + WebKit; primary layout around `390x844`, with a narrower portrait case where useful.
- Manual milestone smoke, when available: one current Android browser + one current iOS Safari device.
- Unavailable checks are `Not run`, never inferred as passing.

---

## D2 — State and content contract

Keep the existing five concepts authoritative: **Event, Event Chain, NPC, World State, Memory/Precedent**.

### Format and IDs

- Hand-authored UTF-8 JSON under `content/prototype/`.
- Stable semantic IDs; gameplay/content does not depend on vendor asset filenames.
- Recurring NPC IDs may remain role-based placeholders until canonical identities are approved.
- Zod validates authored and loaded data once T08 makes the content executable.

### Conditions and effects

Only implement operators/effects used by the slice.

Initial condition vocabulary:

- `eq`, `neq`;
- `gte`, `lte`;
- `has`, `notHas`.

Initial effect vocabulary:

- adjust bounded visible/hidden metrics;
- set/clear authored flags or policy state;
- change NPC/organization relationship/status;
- add memory/precedent;
- adjust delivery/ride demand modifier or recurring policy cost;
- schedule a required callback with its authored window/order/context behavior.

No arbitrary JavaScript and no generic story/rules DSL.

### Checkpoint content

Persist the state required by accepted content, including:

- schema/checkpoint version + sequence;
- week + phase + active event;
- current-week resolved decisions;
- visible metrics and used hidden state;
- used relationships/statuses/policies/flags/memories;
- service modifiers/recurring policy costs;
- pending/resolved callbacks;
- settlement marker/result.

Required callbacks keep their authored scheduling/context data. Do not reconstruct schedule semantics later from dialogue.

Before presentation, evaluate against the latest committed state and require 2–4 valid choices. If authored filtering leaves fewer than two, use a valid authored variant/alternative/fallback; never revive an invalid option.

T18 supplies the real converging proof content. No canonical story content is invented by this decision package.

---

## D3 — Persistence and privacy

### Storage contract

Use IndexedDB through `idb`.

Start with `schemaVersion: 1` and a monotonic checkpoint sequence. Keep two logical slots:

- `current` — last committed checkpoint;
- `previous` — prior committed checkpoint for recovery.

A candidate save carries the sequence of the checkpoint it was derived from as `parentSequence`.

A choice/settlement/advance save must use one read-write transaction to:

1. validate the whole candidate;
2. read `current` inside the transaction;
3. reject the write if `current.sequence !== candidate.parentSequence`;
4. move valid `current` to `previous`;
5. assign the next sequence and write the full candidate to `current`;
6. acknowledge success/proceed only after the transaction completes.

A stale write mismatch is a recoverable conflict: do not acknowledge the action or overwrite newer state; reload the latest committed checkpoint before retrying.

This protects the SPEC invariant that an acknowledged choice cannot later disappear because another tab/window committed from stale state.

### Load/recovery

- Valid `current` → resume exactly.
- Invalid/unsupported `current` + valid `previous` → explicit recovery option.
- Neither valid → blocking recovery screen; new-run reset requires explicit confirmation.
- Never silently reset or coerce an unsupported future schema.
- Browser/OS/user-cleared site storage is an explicit prototype limitation.

### Privacy

No account, cloud save, analytics/ads SDK, uploads, personal-data collection or server gameplay logs. Local timestamps may exist for diagnostics/UI but never advance in-game time.

---

## D4 — Prototype simulation rules

These are **initial tuning constants** for the prototype. Playtest/balance adjustments may change the numbers without reopening G0 as long as the simulation model and player-visible contract stay the same.

### Initial visible state

- Cash: `50`;
- delivery jobs / rides: `0` before first settlement;
- Rider Network: `50/100`;
- Merchant Network: `40/100`;
- Public Trust: `50/100`.

Network/trust metrics clamp to `0..100`. Hidden values start neutral only when accepted content uses them.

### Weekly decision budget

`[2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2]` = **34 decisions** across weeks 1–12.

Required callbacks consume normal event slots.

Prototype stages:

- W1–4: `street_startup`;
- W5–8: `local_platform`;
- W9–12: `city_player`.

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

Demand modifiers / recurring policy cost start at `0` and change only through authored effects. Initial baseline settles to 18 deliveries + 12 rides, gross 72, cost 65, cash +7 before authored event effects.

No random demand roll is required. Pre-choice UI remains qualitative rather than exposing hidden future arithmetic.

### Failure/end

- After a committed settlement, Cash `< -25` enters explicit `failed` state; no silent reset/continue.
- T18/T19 proof histories must remain playable through W12.
- After W12 settlement/report and required proof payoff, show `Prototype Complete`; no W13 and no invented full-campaign ending.

---

## D5 — Presentation constraints

PR #3's Kenney packs are approved only as **replaceable prototype placeholders** once G0 clears:

- RPG Urban Pack — environment/city;
- UI Pack — temporary panels/buttons;
- Game Icons — generic metric/navigation/status icons;
- Scribble Platformer — rough accents/scene dressing.

T07–T24 may use placeholder art without waiting for final art direction. Recurring character art remains deferred; use neutral silhouette/avatar placeholders. No Kenney character becomes canonical.

A1 remains separately required for T25 visual-growth work; this package does not claim PR #3 completed A1.

### UI/art contract

- Keep provenance/source assets under the existing `assets/vendor/` boundary and import only the subset actually used.
- Runtime/content refers to semantic asset roles/IDs, not vendor filenames.
- Player-readable text stays outside images; no required runtime CDN assets.
- Portrait Home / Company / Network navigation is the target.
- Events use a concise situation, 2–4 large stacked choices, optional qualitative hint, and optional portrait/scene area.
- Feedback appears only after a successful checkpoint.
- Prefer semantic native controls, visible keyboard focus and practical touch targets around `44x44` CSS px or larger.

### Language/branding/audio

Prototype player-facing copy is Vietnamese only. Do not add an i18n framework yet; keep text in UTF-8 content/code so localization remains possible later.

Use generic fictional temporary labels rather than locking final company/city/competitor names. No prototype audio production. Final localization, branding, art direction and audio scope remain open.

---

## D6 — Verification and first-slice binding

### Verification strategy

Use the smallest toolset that covers the contract:

- TypeScript for type checking;
- Biome for format/lint;
- Vitest for domain/content/persistence tests;
- Playwright for Chromium + WebKit browser flows;
- Vite production build;
- GitHub Actions on PRs and `main`.

T07 pins exact compatible supporting package versions and the lockfile. It must include the required React/React DOM/Node type packages for the chosen TypeScript scaffold rather than inventing them later.

### First-slice commands

T07 must create and actually prove repository scripts for:

```text
npm ci
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run verify
```

`verify` covers check + typecheck + tests + production build + browser tests. Browser installation/setup belongs to environment/CI setup rather than every normal verify invocation.

This document does not claim any command currently exists or passes.

### First-slice path binding

Only the immediate slices are bound now:

- **T18:** `content/prototype/` proof-chain/history JSON + one evidence record.
- **T07:** root package/tool configs, `src/` runnable portrait shell, one browser smoke test, and one verify workflow.
- **T08:** content schema/loader, checkpoint store, event presentation, focused persistence/resume tests.
- **T09:** choice resolver + checkpoint integration + focused idempotency/state tests.

Exact filenames inside those responsibility groups may follow the scaffold's simplest coherent structure. Later slices are detailed only when they start.

### Required checks

T18:
- paper/data-shape walk against CONTENT_GUIDE + D2/D4/D5;
- two histories document the shared-crisis selectable-option difference;
- no runtime/schema pass claimed.

T07:
- pinned install succeeds;
- portrait shell launches;
- production build contains the PWA manifest/service worker;
- check/typecheck/test/build/browser smoke actually run;
- no backend/account/analytics dependency.

T08/T09:
- AC-01/AC-04/AC-05 focused tests;
- active event saved before presentation;
- same valid options restore after resume;
- failed or stale save produces no success acknowledgement;
- previous/new complete checkpoint recovery only;
- repeated activation cannot duplicate effects.

PWA update behavior is verified once a deployable build exists: install/load version A, deploy version B, exercise the prompt-for-update path, confirm B becomes active without silently discarding the committed local checkpoint.

### Content/device/player evidence

- Build validation from real proof content; do not create a generic solver.
- Browser checkpoints cover portrait Chromium + WebKit.
- Real Android/iOS smoke when available, otherwise `Not run`.
- G1 records player observations separately from reviewer interpretation; no invented participant quota.

### Roles

- Implementer: coding agent on the task branch.
- Independent approval/review: repository owner/human reviewer.
- Self-review is not independent approval.

---

## C01 compatibility check

- Node 24.21.0 satisfies the selected Vite baseline.
- Static PWA/GitHub Pages fits the single-player offline-first prototype without adding a backend.
- IndexedDB provides the transactional local boundary; `parentSequence` prevents stale tabs from silently overwriting a newer committed checkpoint.
- Zod validates authored/load data; content is never executed as code.
- PWA precache + local assets supports offline core after initial acquisition.
- Chromium/WebKit cover the two relevant web-engine paths for this prototype; emulation does not replace real-device smoke.
- PR #3 placeholders + silhouettes let the gameplay proof proceed without final art.

Known limitations: browser site storage can be cleared; PWA install/update UX varies by OS/browser; GitHub Pages is public static hosting and must contain no secrets; D4 numbers are tuning baselines, not permanent balance.

## Version/source references checked for this proposal

Checked 2026-10-01:

- Node: https://nodejs.org/en/download/current
- React: https://react.dev/versions
- Vite: https://vite.dev/guide/
- TypeScript: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- PWA update behavior: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html
- IndexedDB transactions: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology
- Playwright projects/emulation: https://playwright.dev/docs/test-projects
- GitHub Pages Actions deployment: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Approval checklist

- [ ] D1 runtime/delivery
- [ ] D2 state/content contract
- [ ] D3 save/privacy
- [ ] D4 simulation baseline
- [ ] D5 presentation/art/language boundary
- [ ] D6 verification + first-slice bindings

Until owner approval is recorded and canonical docs are amended, **T18/T07 remain blocked**.
