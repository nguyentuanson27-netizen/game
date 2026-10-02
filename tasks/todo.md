# Tasks: first 12-week playable slice

## Execution rules

Read [plan.md](plan.md). Source: PR #1 merged at `9382310fe6632b3758499b565b2d2c7b07f3d596`, including AC-01 through AC-07. T01-T06 are complete through the approved G0 decision package; T18 is complete as a paper/data draft only, and other implementation/content tasks remain unstarted. IDs are retained for existing review references: follow the displayed order/dependencies, not numeric order.

T01-T06 prepare one decision package for G0, not six independent approval rounds. All code/content tasks require G0. Only the upcoming slice needs actual paths and commands; later tasks retain acceptance/dependency requirements and are detailed before they start. Update decision docs only when decisions change. Keep one evidence record per slice, but attach each task's revision, check results and limitations before checking that task off.

`FOCUSED`, `FULL`, `STATIC`, `BUILD`, `CONTENT`, `DEVICE` are labels, not commands. T06 binds the first runnable slice, T07 executes setup, and each later slice binds its checks against the current repository. Changed behavior needs a failing behavioral test before the fix/implementation where practical; data/report tasks need appropriate validation/observation. Run relevant full/static/build checks at checkpoints. Missing runtime evidence is not a pass.

File lists are provisional roles until their slice is prepared. S means about 1-2 files, M about 3-5; include tests/config/evidence in review scope. Split independent concerns or work too large for one focused session. Necessary scaffold/config/lockfile files can stay together with a documented exception and runnable verification. Do not game file counts by creating giant files or broken intermediate steps.

Every new persistence boundary inherits failure blocking, preservation of the prior complete checkpoint and safe retry from its first implementation. Later matrix tasks deepen verification, not postpone these requirements. Known safety or content-integrity failures block dependent work and player observation.

## Decision package

### T01 - Runtime and prototype delivery decision
**Status:** [x] Complete — G0 approved 2026-10-01 in PR #4.
**Description:** Resolve D1 without assuming an engine, mobile OS order or distribution route.
**Dependencies:** None.
**Files likely touched:** docs/DECISIONS.md; relevant docs/SPEC.md sections; shared tasks/todo.md record. **Scope:** M (about 3 files; batch documentation updates).
**Acceptance:** Record chosen versions/toolchain and prototype device/delivery scope, alternatives and rationale; distinguish final commercial choices still open; submit with the shared G0 package.
**Verification:** Review against SPEC section 31 and locked mobile/offline constraints; cite official documentation for selected version-sensitive claims. No install/build is claimed at this decision stage.

### T02 - State and content contract decision
**Status:** [x] Complete — G0 approved 2026-10-01 in PR #4.
**Description:** Resolve D2 using the five existing content concepts and authoring rules.
**Dependencies:** T01.
**Files likely touched:** docs/DECISIONS.md; relevant docs/SPEC.md sections; shared tasks/todo.md record. **Scope:** M (about 3 files; batch documentation updates).
**Acceptance:** Define minimal state/content format and identifiers, condition/effect and option rules, callback windows/order and fallback semantics using a small converging example. Submit tooling/content organization with G0; no generic rules engine.
**Verification:** Walk one authored event and one converging chain through the proposed format against CONTENT_GUIDE; document unsupported details instead of guessing them.

### T03 - Save and privacy decision
**Status:** [x] Complete — G0 approved 2026-10-01 in PR #4.
**Description:** Resolve D3 while preserving the already locked session-continuity behavior.
**Dependencies:** T01, T02.
**Files likely touched:** docs/DECISIONS.md; relevant docs/SPEC.md sections; shared tasks/todo.md record. **Scope:** M (about 3 files; batch documentation updates).
**Acceptance:** Decide local checkpoint format/storage/versioning and interrupted-write recovery; explicitly decide corrupt/unsupported-save handling without silently resetting; record analytics yes/no and privacy boundaries before any collection.
**Verification:** Review AC-04/AC-05 against the design, official storage documentation and relevant trust boundaries; record compatibility limitations for the shared G0 review.

**Checkpoint C01:** Check runtime/content/storage compatibility internally; include conclusions in the single G0 package. No extra approval round.

### T04 - Prototype simulation rules decision
**Status:** [x] Complete — G0 approved 2026-10-01 in PR #4.
**Description:** Resolve D4: the source names economy/progression systems but does not supply their executable rules.
**Dependencies:** T02.
**Files likely touched:** docs/DECISIONS.md; relevant docs/SPEC.md sections; shared tasks/todo.md record. **Scope:** M (about 3 files; batch documentation updates).
**Acceptance:** Propose explicit initial state/units, settlement for both services, weekly event-budget/progression rules and early-failure/week-12 behavior for G0. Specify only the slice; do not invent a full campaign ending.
**Verification:** Review a sample week and two contrasting policy histories on paper; ensure the agreed rules preserve 2-4 weekly decisions and the slice targets. Paper review is not gameplay validation.

### T05 - Prototype presentation constraints
**Status:** [x] Complete — G0 approved 2026-10-01 in PR #4.
**Description:** Resolve D5 before assets or content depend on unstated art/audio/localization choices.
**Dependencies:** T01.
**Files likely touched:** docs/DECISIONS.md; relevant docs/SPEC.md sections; shared tasks/todo.md record. **Scope:** M (about 3 files; batch documentation updates).
**Acceptance:** Propose a minimal prototype art contract for G0: asset groups needed by the slice, source-of-truth/workflow, placeholder-vs-production boundary, language/localization and fictional identity, plus only the naming/export/aspect-ratio/format constraints required by the chosen runtime and current UI. Explicitly state whether T07-T24 may use placeholders; do not require final branding/art.
**Verification:** Review one event-card layout and one growth-feedback example against SPEC sections 7, 24-25 and PRODUCT_GUARDRAILS; verify the contract is sufficient to brief a separate art-package follow-up without designing the full art direction here.

### T06 - Approve minimum decisions and detail the first slice
**Status:** [x] Complete — owner approved D1-D6; G0 cleared 2026-10-01 in PR #4.
**Description:** Complete D6 and submit D1-D6 together for one G0 review; activate only the next slice in detail.
**Dependencies:** T01, T02, T03, T04, T05.
**Files likely touched:** docs/DECISIONS.md; relevant docs/SPEC.md sections; tasks/todo.md; tasks/plan.md only if dependencies change. **Scope:** M (3-5 files).
**Acceptance:** Approve the test/CI and bounded content-coverage strategy, device and player-observation method; assign implementer/reviewer; bind actual paths/checks for T18 and the first runnable slice T07-T09. Leave later task details provisional until their slice starts, without deferring material D1-D6 decisions.
**Verification:** Check all seven AC mappings, tool/device availability and dependencies; owner approval of the package clears G0. T07 must execute the chosen setup commands. Do not demand a final file map for T21-T30.

**Gate G0 — CLEARED 2026-10-01:** Owner approved D1-D6 and the first-slice details in PR #4. T18 and T07 may begin after this PR merges; runtime/build evidence is still required by their own acceptance criteria.

### A1 - Approved prototype art package (external follow-up)
**Status:** [ ] Ready after G0; external follow-up not started.
**Description:** A dedicated follow-up art-direction/asset-package PR creates and approves the golden references plus prototype asset bundle required by T25. The bundle may use approved placeholders, production assets, or a mix according to D5; this plan names the dependency but does not hardcode a GitHub PR number.
**Dependencies:** G0, T05.
**Acceptance:** Package covers the D5 asset groups consumed by T25 and follows its source-of-truth/workflow plus required naming/export/aspect-ratio/format constraints; every asset is clearly marked placeholder or production where that distinction matters.
**Verification:** Review the package against D5, portrait/mobile constraints and PRODUCT_GUARDRAILS. A1 may progress in parallel with T07-T24 and does not block them when D5 allows placeholders; T25 cannot start until A1 is approved.

## Small proof and first playable loop

### T18 - Draft the converging proof chain early
**Status:** [x] Complete (paper/data review only) — draft fixture in `content/prototype/proof-chain.json` and `proof-histories.json`; evidence, counts and limitations in [t18-proof-chain.md](evidence/t18-proof-chain.md). Proposed fixture shape, not runtime-validated; no gameplay, loader, scheduler or AC pass is claimed.
**Description:** Draft the small story used as fixtures by the first playable loop, rather than waiting for a cross-chain validator.
**Dependencies:** T06, T04, T05.
**Files likely touched:** One proof-chain draft/content unit; minimal NPC/precedent data; expected-history fixture; shared content ledger/task record. **Scope:** M (3-5 files).
**Acceptance:** Describe two histories converging on the same crisis by week 12, with a history-dependent selectable-option difference and 2-4 valid options each. Include conditions, callback windows and any needed alternatives/fallbacks; count retained proof/variant/fallback nodes once inside the existing content budget.
**Verification:** Walk the draft against CONTENT_GUIDE and D2/D4/D5 on paper; no runtime pass is implied. T08-T12/T15 use it as fixtures; T19 validates the playable proof, and T17 later checks combined content. T17 is not a drafting prerequisite.

### T07 - Minimal runnable scaffold
**Status:** [~] Implemented; CI green on Chromium + WebKit. Awaiting real-device smoke (`Not run`) and owner review before checking off.
**Description:** Establish only the approved runtime/tooling and a launchable portrait shell for the first decision slice.
**Dependencies:** T06.
**Files likely touched:** Chosen runtime entry; dependency/build configuration and lockfile if applicable; smoke test; setup instructions/task record. **Scope:** M target; coherent generated scaffold may need a documented exception.
**Acceptance:** Pinned approved toolchain launches the shell on the chosen prototype target; actual setup/test/build commands are documented and executable; no unapproved services or dependencies are added.
**Verification:** Run initial FOCUSED, STATIC and BUILD; perform DEVICE launch smoke check. Review dependencies/install behavior before installation. Keep necessary generated/config/lock files together when that preserves a runnable scaffold; explain a larger diff instead of mechanically splitting it.

**T07 evidence (Node 24.21.0, npm 11.19.0):**
- Run locally from a clean `npm ci`: `npm run check`, `typecheck`, `test` (2 files / 6 tests) and `build` (`npm run verify`) pass; `npm audit` reports 0 vulnerabilities.
- Playwright smoke (4 tests: launch, no horizontal overflow at 390x844, manifest/icons under sub-path `/game/`, offline reload after service-worker control) passes locally on Chromium using the pre-installed Chromium via an uncommitted config. The offline test stops a test-owned static server before reloading; with service workers blocked the reload fails, so the test depends on the service worker.
- GitHub Actions `verify` (run #4) on head `5da179a`, after the review fixes: `npm run verify` + `npm run test:e2e` pass, 8/8 browser tests on Chromium and WebKit (Playwright WebKit 26.6, emulated 390x844). The first CI run failed only on WebKit offline reload because `context.setOffline()` makes WebKit error on reload; fixed by the stopped-server approach. A later change only bumps the workflow's first-party actions to Node 24 majors (`checkout`/`setup-node`/`upload-artifact` v7); its own CI result is shown on the PR checks, not recorded here.
- **Not run:** WebKit locally (Playwright browser download blocked by sandbox network policy; covered by CI), real Android/iOS device smoke (DEVICE), and the deployed-update path (no deployment exists yet). Emulation does not replace device smoke.
- Scope notes: `zod@4.6.5` and `idb@8.0.3` are pinned as direct dependencies per D1 but are not imported or used yet (no schemas, adapters or checkpoint code); T08 is the first task that uses them. No GitHub Pages deploy workflow in T07 (sub-path support only, via `BASE_PATH`). Transitive `glob@11.1.0` (via `workbox-build`, build-time only) prints an npm deprecation notice.

**Checkpoint C02:** Draft and scaffold are ready for the first event; paper content review and actual launch evidence remain distinct.

### T08 - Resume an unanswered event
**Status:** [~] Implemented and merged (PR #7); CI `verify` green on Chromium + WebKit at merge. Real-device smoke `Not run`; not checked off until owner review.
**Description:** Load an event from T18 through the minimal local checkpoint boundary, validating data before use.
**Dependencies:** T07, T18, T03.
**Files likely touched:** Event loader/presenter; local checkpoint adapter; one event fixture; persistence test; task record. **Scope:** M (3-5 files).
**Acceptance:** Save the selected event/phase before presentation; offline reopen restores the same 2-4 valid options. Failed saves show no success and block progression while preserving the prior complete checkpoint; retry cannot replace it with partial state.
**Verification:** FOCUSED and DEVICE unanswered-event resume for AC-04; inject a basic failed/interrupted checkpoint for AC-05 and test retry. Reject malformed fixture/save data per D2/D3, never execute it as code. Broader boundary coverage remains T13-T14.

**T08 evidence (Node 24.21.0, npm 11.19.0):**
- Code: `src/game/content/` (Zod schema, loader, reference checks), `src/game/persistence/` (checkpoint schema, `idb` store), `src/game/domain/` (condition evaluator, presentation, campaign start/resume), `src/game/ui/` (bootstrap session, event card, recovery screens), `tests/game/`, `tests/e2e/offline-resume.spec.ts`.
- Run locally from a clean `npm ci`: `npm run verify` passes (Biome, `tsc --noEmit`, Vitest 6 files / 51 tests, `vite build`). Playwright on Chromium (pre-installed browser via an uncommitted config): 6/6 (4 existing smoke + 2 new: reload resume and offline reopen after service-worker control).
- Behaviour covered: bundled proof content loads with semantic ids/windows/option conditions intact; malformed content rejected (missing field, unknown effect, unsupported operator, misspelled key, bad id/type, <2 options, unresolved reference, duplicate id, over-budget plan); the first event is committed before any option is shown (held-commit test at session and React level, and IndexedDB read in the browser); reopen/reload restores the same event and options with no new save; failed first save shows an error and no options, nothing is persisted, retry builds the same draft and yields one checkpoint; concurrent starts (and StrictMode double effects) converge on one checkpoint; stale `parentSequence` rejected without touching the newer save; `current` -> `previous` rotation; an injected failure on the second put leaves `current` and `previous` exactly as before and a retry then succeeds once; corrupt `current` + valid `previous` asks before promoting it and later saves derive from it; a newer-schema save is blocked and left byte-identical; unusable save needs a second confirmation to reset and a usable save is never reset; a checkpoint that disagrees with the content is refused, not repaired.
- Deviations/decisions to review: (1) `content/prototype/proof-loop.json` is a small slot plan owned by T08 (week 1 = `evt.proof.rider_claim` then `evt.proof.fallback_shift_roster`; weeks 2-12 empty). It only says which authored events the loop walks; it is not the T15 scheduler, and the T18 walk-through placement (W3/W7/W10) is left to T15/T19. (2) The two T18 JSON files were reformatted (whitespace only, `jq -S` identical) because `main` failed `npm run check` after T07/T18 landed independently. (3) `fake-indexeddb` 6.2.5 added as a test-only devDependency.
- Checkpoint v1 currently holds only what T08 reads: version/sequence/parentSequence, week, phase, active event + selectable option ids, this week's decisions, visible metrics, policies, memories and NPC status. Pending callbacks, recurring costs, settlement and similar fields are added by the task that first writes or reads them.
- Tapping an option records nothing in T08 (it shows a notice); resolving a choice is T09.
- **Not run:** WebKit locally (covered by CI), real Android/iOS device smoke (DEVICE), interrupted-save interleaving beyond the injected failure (T13/T14), the deployed-update path (nothing deployed).

### T09 - Commit one choice coherently
**Status:** [~] Implemented and merged (PR #8); CI `verify` green on Chromium + WebKit at merge. Real-device smoke `Not run`; not checked off until owner review.
**Description:** Complete the first vertical path from tap through persistent effects to immediate feedback.
**Dependencies:** T08, T04.
**Files likely touched:** Choice resolution; checkpoint integration; feedback presenter; behavior tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Persist the choice, immediate visible/hidden effects, relationships/policies/precedents and pending consequences together before feedback. Failed writes block progression and retain the previous checkpoint; repeated activation/retry commits the action once.
**Verification:** FOCUSED AC-01/AC-04 portions plus basic AC-05 at the choice write: fail, retry and reopen; compare the complete expected state and scheduled consequences, with no premature success feedback or duplicate effects.

**T09 evidence (Node 24.21.0, npm 11.19.0):**
- Code: `src/game/domain/resolveChoice.ts` (pure: option -> one complete checkpoint draft), `nextStep.ts` (next slot evaluated against the state being committed), `src/game/ui/session.ts` (`choose`), `GameScreen.tsx`/`EventCard.tsx` (busy lock, feedback after commit, retry).
- A tap builds a single draft holding: the decision (`weekDecisions`), visible metrics (networks/trust clamped to 0..100, cash unclamped), policies, `recurringCosts`, NPC status, memories/precedents, `pendingCallbacks` (callback id, scheduled week, source event/option; metadata only, no delivery) and the next active event with its selectable option ids (or the `settlement` phase after the last slot). It is committed in one transaction; feedback and the next screen come only from the committed result.
- Run locally: `npm run verify` passes (Vitest 7 files / 71 tests, includes pure-resolution, session-level and React-level tests). Playwright Chromium 9/9 (adds committed-choice reload, committed-choice offline reopen, double tap).
- Covered: complete expected state for fund_policy/decline/settle_and_part; policy/precedent/relationship/callbacks committed with the choice (one `commit` call, `previous` = pre-choice checkpoint); failed save -> no feedback, previous checkpoint intact, retry applies once; repeated activation (disabled-while-saving, and a stale-parent rejection when a second tap reuses the old checkpoint); another tab winning -> reload prompt, no overwrite; reopen after a successful choice restores state, next event and pending callbacks; settlement-phase checkpoint after the last slot and its resume; an unreleased T08 checkpoint still reads (new fields default).
- Checkpoint v1 widened with `recurringCosts`, `pendingCallbacks` and a `settlement` phase (`activeEvent: null`). The settlement phase only means "all decision slots resolved"; settlement itself is T11.
- AC coverage is only started: AC-01 (state-derived next event in the same draft; the lost-contact scenario is T10), AC-04 (after a committed choice), AC-05 (failure at the choice write). No AC is claimed as passing overall.
- **Not run:** WebKit locally (CI), real-device smoke, interruption interleavings beyond the injected failure (T13/T14).

**Checkpoint C03:** Verify one durable choice, unanswered/answered resume and basic failed-write/retry behavior before extending the loop.

*C03 status:* the automated evidence exists (T08/T09 tests, CI on Chromium + WebKit); real-device resume (DEVICE) was not run and the owner has not signed it off, so C03 is not checked.

### T10 - Current-state options and confirmation
**Status:** [~] Implemented and merged (PR #9); CI `verify` green on Chromium + WebKit at merge. Real-device smoke `Not run`; not checked off until owner review.
**Description:** Present the next event against the updated state and honor the authored confirmation flag.
**Dependencies:** T09.
**Files likely touched:** Eligibility/resolution; decision presenter; event fixture; behavior tests; task record. **Scope:** M (3-5 files).
**Acceptance:** A prior choice can remove an option in the next event without leaving fewer than two valid choices; ordinary tap needs no dialog; cancel changes no state or scheduled consequences and confirm commits once.
**Verification:** FOCUSED AC-01/AC-07 scenarios, including lost contact support, context-valid alternatives and cancel/confirm followed by resume; inspect the UI path with DEVICE.

**T10 evidence (Node 24.21.0, npm 11.19.0):**
- Code: `src/game/domain/nextStep.ts` (planned slot -> authored fallback when it cannot be presented), `presentation.ts` (non-repeatable events are not shown twice), `src/game/ui/ConfirmDialog.tsx` + `EventCard.tsx` (native modal `<dialog>`, only for options authored `confirmation: "required"`). Checkpoint v1 gains `resolvedEventIds` (consumer: non-repeatable check; defaults to `[]`).
- The next event is always evaluated inside the same draft that commits the previous choice, from the state about to be committed, so there is no stale snapshot to read. Option sets are stored in the checkpoint and re-verified on resume.
- Focused tests (`tests/game/domain/currentState.test.ts`) use the real proof content plus a test-only beat in week 3 (`rider_claim -> estrange beat -> shared crisis`; the crisis is placed there only to read state, delivery is T15): fund -> crisis offers cite/joint; decline -> announce/quiet; fund then losing the rider's support -> `joint_statement` disappears while the fund (and `cite_policy`) remain, so the relationship alone explains it; every one of the 6 paths keeps 2-4 options; stored option ids equal a re-evaluation of the committed state and differ from the week-start evaluation. Fallback: a planned event with 0 or 1 selectable options is replaced by the authored fallback (invalid options are never revived); with no valid event left the choice is refused and nothing is written.
- UI (`GameScreen.test.tsx`, Playwright `choice-confirmation.spec.ts`): ordinary choice commits on tap with no dialog; the major option opens a dialog with focus on "Hủy" and writes nothing; cancel / Escape leave the event unresolved with zero state, callback or checkpoint change (also after a reload); confirm commits exactly once (double activation too), a failed confirmed save shows an error and applies nothing, and the result survives reopening.
- Run locally: `npm run verify` and Playwright Chromium pass (counts in the PR).
- Limits: variant selection for callbacks (`engaged`/`aggrieved`) belongs to T15/T16 and is not implemented; the "valid variant" capability here is the fallback substitution and state-dependent option sets/context lines. Confirmation copy is generic Vietnamese (the authored `confirmationNote` is a reviewer note and is not shown). AC-01 is covered at the within-week option level; the settlement half of AC-01 is T11. AC-07 covered for the one authored irreversible option. **Not run:** WebKit locally (CI), real device.

### T11 - Settle one week once
**Status:** [~] Implemented and merged (PR #10); CI `verify` green on Chromium + WebKit at merge. Real-device smoke `Not run`; not checked off until owner review.
**Description:** Apply the approved recurring economy and due week-end effects after the week's decisions.
**Dependencies:** T10, T04.
**Files likely touched:** Week resolution; economy rules/config; checkpoint integration; settlement tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Use current state after 2-4 sequential events and D4 rules for both services; save settlement once without reapplying immediate choice effects; events unlocked by settlement enter the following week.
**Verification:** FOCUSED AC-01/AC-04 and basic AC-05 at settlement: repeat/fail/retry the write and reopen; compare complete state, no duplicated effects, and next-week eligibility unlocked only by settlement.

**T11 evidence (Node 24.21.0, npm 11.19.0):**
- Code: `src/game/domain/settlement.ts` (D4 model exactly: rider/merchant/trust factors by truncation, 18/12 base jobs, 0..40 / 0..30 clamps, fees 2/3, cost 65 + recurring policy cost, cash delta, failure when cash < -25), `session.ts` `settle`, `GameScreen.tsx` ("Tổng kết tuần" button), `WeeklyReport.tsx` (minimal summary; the full report and Next Week are T12). Checkpoint v1 gains the `report` and `failed` phases (carrying the settlement result) and `demandModifiers` (read by settlement, default 0; no authored effect sets them yet).
- Settlement is one commit from the `settlement` phase (all authored slots resolved) to `report`/`failed`. It adds only the cash delta and the result; metrics, policies, relationships, memories, pending callbacks and decisions are carried over unchanged, so immediate effects are never re-applied. Only the `settlement` phase can settle, so a committed week cannot be settled again, and a reused old checkpoint is rejected as stale.
- Run locally: `npm run verify` (Vitest 10 files / 107 tests) and Playwright Chromium 13/13 pass.
- Covered: baseline 18+12 -> gross 72, cost 65, +7; history A (fund) 19+13, 77, 71, +6; history B (decline) 17+11, 67, 65, +2; the three `paperSettlementWeek3` entries and the week-10 A/B entries of `proof-histories.json` are reproduced by the real choice effects (including the recurring cost stacking 6+3); each service responds to its own inputs (merchants -> deliveries, trust -> rides, riders -> both, per-service demand); clamps and truncation toward zero; failure at -26 but not -25; failed settlement save keeps the unsettled week and blocks progress, retry applies the delta once; reload/report never settles again and never writes; duplicate taps settle once; the settled week stays week 1 with no active event (next-week events are only reachable through T12's Next Week); failed state resumes.
- Limits: no authored content produces demand modifiers or deferred week-end effects yet, so those paths are covered by arithmetic tests only. The `failed` state is terminal with no restart action (D4 asks only for an explicit failed state; a restart flow would be a new product decision). AC-01 settlement half and AC-04/AC-05 at settlement are covered; no AC is claimed as passing overall. **Not run:** WebKit locally (CI), real device.

### T12 - Report and durable advancement
**Status:** [~] Implemented and merged (PR #11); CI `verify` green on Chromium + WebKit at merge. Real-device smoke `Not run`; not checked off until owner review.
**Description:** Complete the short report -> Next Week -> brief path without leaking hidden arithmetic.
**Dependencies:** T11.
**Files likely touched:** Report/brief presentation; week advancement; checkpoint integration; transition tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Show only player-knowable report feedback; checkpoint advancement without re-settling or skipping a week; use the approved endpoint/early-failure behavior rather than adding an endless loop.
**Verification:** FOCUSED AC-04 plus basic AC-05 at advancement: fail/retry, repeat Next Week and reopen with DEVICE. Progress stays blocked on a failed write, the prior complete checkpoint survives, and neither settlement nor advancement repeats.

**T12 evidence (Node 24.21.0, npm 11.19.0):**
- Code: `src/game/domain/advanceWeek.ts` (pure `Next Week`: report -> next week, or -> `complete` after week 12), `reportLines.ts` (authored `reportLine`s of the week's committed decisions), `session.ts` `nextWeek`, `WeeklyReport.tsx` (visible meters, jobs, income/cost/result, authored lines, Next Week), `GameScreen.tsx` (one commit helper for choice/settlement/advance). Checkpoint v1 gains the `complete` phase.
- Next Week is its own checkpoint: it resets only `weekDecisions` and the settlement result, keeps metrics, policies, relationships, memories, recurring costs, demand modifiers, resolved events and pending callbacks, evaluates the new week's first slot against the state settlement committed, and accepts only a `report` checkpoint (no re-settlement, no skipped week). Week 12 -> `Prototype Complete`; no week 13. The failed state has no Next Week.
- The report shows only player-knowable information: cash/jobs/income/cost/result, the three visible meters and authored report lines. A test asserts the report text contains no relationship status, precedent/policy/callback ids or internal factors.
- Run locally at PR time: `npm run verify` (Vitest 12 files / 128 tests) and Playwright Chromium 16/16. *Superseded by the review-fix PR:* the production 12-week run and the "week 2" offline test passed only because weeks 2-12 had zero decisions, which is not a valid prototype week; they were replaced (see "Review fix" below).
- Covered: report resume without re-settlement or saves; one-week advance, double tap advances once; failed advance stays on the report with the previous checkpoint intact and retries once; reopen after advance restores week/phase; settlement not repeated; no week skipped (test-only content with a decision every week); W12 endpoint (seeded report); authored report lines.
- Limits: weeks 2-12 have no authored decisions in the proof loop, so Next Week into them is refused (see "Review fix" below); when a new week's planned slot has no valid event and the fallback is spent, Next Week is refused with an error and the report stays (a content dead end that T17 validation, not runtime invention, must prevent). The `Prototype Complete` screen does not yet show the proof payoff (the crisis callback is delivered by T15). There is no brief screen: the first event's `whyNow` line and the week header act as the brief. AC-04/AC-05 are covered at the report and Next Week boundaries; no AC is claimed as passing overall. **Not run:** WebKit locally (CI), real device.

- **Review fix (findings from the PR #7-#11 review, one follow-up PR):** (1) resume now rejects an NPC status that is not one of the NPC's authored statuses; (2) resume rejects a pending callback whose source event/option is not the callback's authored source (and the content loader requires a callback's source options to belong to its source event); (3) resume recomputes the D4 settlement from the committed state and rejects a report/failed save whose stored result differs (it is never recomputed or overwritten); (4) `advanceWeek` refuses to enter a week with no authored decisions, so the shipped proof loop stops at the week-1 report with "Tuần tiếp theo chưa có nội dung" instead of settling zero-decision weeks and reaching `Prototype Complete` with callbacks still pending (the production 12-week test was replaced by test-only content with a decision every week plus a seeded week-12 report for the endpoint); (5) the failed report keeps the authored report lines; (6) T12-T14 statuses now record CI green on Chromium + WebKit. Owner review round 1 on that PR: (7) the week-12 report refuses `Prototype Complete` while any required callback is still pending (`pending-callbacks`; delivering them stays T15), and the seeded completion fixtures now seed none; (8) `advanceWeek` failures carry a reason, `no-content` (unauthored week), `invalid-content` (authored week that cannot be presented) or `pending-callbacks`, each with its own player message, so an authored dead end is no longer reported as unfinished content. Owner re-review: (9) resume also rejects a `complete` save that still has pending callbacks (a structurally valid older/tampered v1 save can no longer open on `Prototype Complete`); (10) Next Week refuses a week authored with fewer than 2 decisions (`no-content`; incomplete content still loads), so the contract of 2-4 decisions a week is not bypassed by a 1-decision week, and the test-only `playablePack` now authors two slots per week. Owner re-review 2: (11) the loader requires at least 2 slots in week 1 (the campaign start), so week 1 cannot start and settle on a single decision either; later incomplete weeks still load. Real-device smoke is still `Not run` and owner sign-off is still pending, so nothing is checked off.

**Checkpoint C04:** Verify a complete week, current-state choices, confirmation, once-only settlement/advancement and failure blocking at each new write.

*C04 status:* automated evidence exists for a complete week and a full 12-week walk (unit, React and Playwright tests); real-device runs (DEVICE) were not run and the owner has not signed it off, so C04 is not checked.

## Early observation, then broader hardening

### T15 - Deliver required callbacks
**Status:** [~] Implemented on branch; exact-head CI and owner review pending. Browser-tested on Chromium locally (WebKit via CI); real-device callback/resume walkthrough `Not run`, so not checked off. Evidence: [t15-t16-callbacks.md](evidence/t15-t16-callbacks.md).
**Description:** Bring the drafted consequence back into the existing loop using only the scheduling rules its content and explicit test cases require.
**Dependencies:** T12, T18.
**Files likely touched:** Event selection; pending callback state; contention fixtures; scheduler tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Required eligible callbacks precede ordinary events within their earliest/latest window and authored tie order; overflow retains its deadline and pending state until committed resolution; slot reservation respects the weekly budget.
**Verification:** FOCUSED AC-02 with early, equal-deadline, competing and infeasible small schedules; DEVICE callback/resume walkthrough including failed resolution-save/retry. Retain the original deadline and apply callback resolution once. Do not build a general scheduler framework.

### T19 - Play both histories to different options
**Status:** [ ] Blocked by dependencies.
**Description:** Integrate the draft into a small valid playable proof and exercise two histories through real choices, checkpoints and the shared crisis.
**Dependencies:** T15, T10, T18.
**Files likely touched:** History integration tests; minimal content/resolution fixes if needed; evidence/task record. **Scope:** M (3-5 files).
**Acceptance:** Real choices produce a history-dependent option difference by week 12, 2-4 valid choices and consistent resume. Before player observation, validate the proof pack's reachable choices, callback windows and fallback coverage; fix gaps or simplify content. Drafting and two demonstration paths alone are not content acceptance.
**Verification:** FOCUSED AC-06 and DEVICE both histories, with basic save failure/retry and committed-boundary reopen evidence. Enumerate the small finite pack and replay relevant transitions under the actual selection rules; document coverage/limits, not an exhaustive claim from two paths. Required changed-context handling must work for any reachable proof case; no known unsafe path goes to T20.

### T20 - Review the core hook before scaling
**Status:** [ ] Blocked by dependencies.
**Description:** Observe the small safe proof as soon as it is playable, without waiting for the broader interruption matrix or cross-chain tooling.
**Dependencies:** T19.
**Files likely touched:** Focused playtest/verification record; tasks/todo.md. **Scope:** S (1-2 files).
**Acceptance:** Record consequence recognition and curiosity plus T19 proof/resume evidence. G1 covers the core mechanism only, not full growth/pacing/fun or all ACs. A failed hook returns to the small chain; content expansion also waits for T14 and T17.
**Verification:** Use the D6 observation method and record participant statements separately from interpretation; owner reviews G1. List untested broader cases explicitly. Known safety/content failures block the session rather than being waived for speed.

**Gate G1:** Review the small proof and observations now. This is not full-slice approval: T14 and T17 still block content expansion. No general validator is required to draft or observe the validated small pack.

### T13 - Expand save-failure coverage
**Status:** [~] Implemented and merged (PR #12); CI `verify` green on Chromium + WebKit at merge. Real-device smoke `Not run`; not checked off until owner review.
**Description:** Extend the safety already tested in T08-T12 to a systematic matrix; do not defer basic failure blocking to this task.
**Dependencies:** T12, T03.
**Files likely touched:** Checkpoint failure handling; error/retry presentation; fault fixtures; recovery tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Failed saves never show success or permit another decision/week advance; the previous complete checkpoint remains recoverable with no silent reset; retry/resume cannot duplicate effects or scheduled consequences.
**Verification:** FOCUSED AC-05 across active-event, choice, settlement and advancement saves; add missing cases, D3 corrupt/unsupported-save behavior and retry/resume regressions. Reuse existing tests; errors must contain no secret/PII payloads.

**T13 evidence:** see [t13-t14-failure-interruption.md](evidence/t13-t14-failure-interruption.md) (T13 section). Summary: a table-driven matrix, on a small test-only pack with valid week-2 and week-12 content (not the shipped empty weeks), runs every write boundary (first active-event save, choice, last choice into settlement, settlement, Next Week, week-12 completion) against four injected failures on the real `idb` store (browser refusal or transaction abort on each `put`), asserts both slots are byte-identical afterwards, nothing is reset, reopening resumes the old complete state, and a retry ends exactly equal to a fault-free run; lost-acknowledgement cases prove a committed write cannot be replayed; failed recovery/reset, mid-game corrupt/newer-version saves (now routed to the recovery/unsupported screens instead of a retry loop), and sanitized error contents are covered at store and screen level.

### T14 - Interruption matrix on the target
**Status:** [~] Implemented and merged (PR #13); CI `verify` green on Chromium + WebKit at merge. DEVICE force-close procedure documented but `Not run`; not checked off until the device run and owner review.
**Description:** Verify the real persistence boundary, not only an in-memory substitute.
**Dependencies:** T13.
**Files likely touched:** Interruption test harness; scenario fixtures; verification record/task status. **Scope:** M (3-5 files).
**Acceptance:** Before/after-write interruption restores a complete old/new checkpoint, including closure before feedback; offline app restart preserves every AC-04 boundary and AC-07 result; time away does not advance weeks.
**Verification:** Run AC-04/AC-05/AC-07 via FOCUSED integration and DEVICE force-close/restart procedures; record environment, exact injection boundaries and coverage limits. Failed scenarios create focused fix tasks before continuation.

**T14 evidence:** see [t13-t14-failure-interruption.md](evidence/t13-t14-failure-interruption.md) (T14 section): environment, exact injection boundaries (abort before commit; commit then close before feedback) for 5 boundaries x 2 interruptions, a 7-restart offline browser-restart journey with a month-long clock jump each time (weeks 2-12 are not authored, so its week-12/endpoint steps are seeded persistence states and Next Week/full-slice restart coverage is pending valid integrated content), the DEVICE procedure (`Not run`) and coverage limits.

**Checkpoint C05:** Broader recovery/interruption checks pass on the recorded target; preserve regressions and stop dependent work on failure.

*C05 status:* automated T13/T14 evidence exists on Chromium + WebKit; the real-device runs were not performed and the owner has not signed it off, so C05 is not checked.

### T16 - Changed-context and fallback coverage
**Status:** [ ] Blocked by dependencies.
**Description:** Keep the loop valid when a scheduled story no longer fits or ordinary events are insufficient.
**Dependencies:** T15.
**Files likely touched:** Event/context resolution; fallback content; report closure; behavior tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Resolve invalid-context callbacks with an authored valid variant or explicit report closure by deadline; slot shortage alone never cancels delivery and no unchosen effect is applied; fallback choices respect state/cooldown and count toward both budgets.
**Verification:** FOCUSED AC-03 for empty eligibility, invalidated context and locked options; check both original and resumed histories, including 2-4 valid choices per presented event.

### T17 - Cross-chain content validation
**Status:** [ ] Blocked by dependencies.
**Description:** Extend existing content checks to combined chains in the actual pack; a reusable general solver or editor is not a prerequisite.
**Dependencies:** T16, T18.
**Files likely touched:** Existing content checks; bounded fixtures/history cases; coverage/evidence record. **Scope:** M (3-5 files); split independent work if needed.
**Acceptance:** Reject bad references/options/windows and infeasible combined deadlines; justify reachable fallback/option coverage using actual selection rules. Start with explicit cases and bounded enumeration; simplify interacting content or surface missing coverage when it becomes intractable, never silently waive the spec.
**Verification:** CONTENT and FOCUSED AC-02/AC-03: oversubscribed windows, cooldown gaps and valid converging controls; failures identify a reproducible history. Extend only for actual content risks; rerun cumulative checks with every later batch. Random samples alone do not prove all histories.

**Checkpoint C06:** Combined content and fallback coverage are checked. T21 waits for T20/G1, T14 and T17; early feedback does not waive hardening before expansion.

## Conditional content expansion

### T21 - Weeks 1-3 onboarding
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Integrate onboarding, riders, merchants and the first recurring rider into the working loop.
**Dependencies:** T20, T14, T17.
**Files likely touched:** Bounded content batch; NPC/state data; history fixture; content ledger; task record. **Scope:** M (3-5 files).
**Acceptance:** Both bicycle services and customer/rider/merchant tension are represented; early decisions seed meaningful history without excessive permanent flags; the batch follows mobile writing, option and callback rules within cumulative budgets.
**Verification:** CONTENT and FOCUSED playthrough of weeks 1-3, with DEVICE readability check; use D6 observations later to validate the under-one-minute/first-ten-minute targets rather than assert them from text length.

### T22 - Weeks 4-6 expansion pressure
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Integrate customer pressure, district expansion and the first competitor using approved D4 rules.
**Dependencies:** T21.
**Files likely touched:** Bounded content batch; district/competitor state; history fixture; content ledger; task record. **Scope:** M (3-5 files).
**Acceptance:** Expansion changes available problems rather than only increasing numbers; competitor response reads relevant history; callbacks/fallbacks remain feasible across the cumulative first six weeks.
**Verification:** CONTENT and FOCUSED contrasting expansion histories; compare eligibility and stakeholder effects and confirm no realtime city-simulation subsystem is introduced.

### T23 - Weeks 7-9 pressure and callback
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Integrate cash/incentive pressure, the safety incident and recurring-rider callback.
**Dependencies:** T22.
**Files likely touched:** Bounded content batch; relationship/policy effects; history fixture; content ledger; task record. **Scope:** M (3-5 files).
**Acceptance:** Consequences follow accumulated state and history rather than arbitrary punishment; high-risk options provide narrative warning without exact hidden math; callback windows remain achievable through week 9.
**Verification:** CONTENT and FOCUSED contrasting rider-policy histories, including changed context and resumed play; review ordinary/opportunity/human content pacing against CONTENT_GUIDE.

**Checkpoint C07:** Review cumulative first-nine-week content, callback capacity and budgets; authored nodes and decisions seen per history are different counts.

### T24 - Weeks 10-12 payoff
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Complete merchant precedent, public rider dispute, the mini-crisis and PR-agency offer.
**Dependencies:** T23.
**Files likely touched:** Final bounded content batch; history/endpoint data; two-history fixture; content ledger; task record. **Scope:** M (3-5 files).
**Acceptance:** Required proof payoffs remain playable by week 12 in the integrated slice; the agency offer opens the later layer without implementing its full systems; the approved endpoint is used without silently inventing a campaign ending.
**Verification:** CONTENT and FOCUSED AC-06 on both full histories, including prior-chain contention; verify report-only closures do not replace the shared-crisis option difference.

### T25 - Company and network growth feedback
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Connect existing committed state to the small mobile navigation and visible company/city changes.
**Dependencies:** T21, T05, A1.
**Files likely touched:** Home/Company/Network presentation; assets/golden references from A1; UI checks; evidence/task record. **Scope:** M (3-5 files).
**Acceptance:** Use the approved A1 package for visual-growth work; five core visible metrics remain readable without pinning all to the header; relationship and growth feedback reflect committed history; visuals follow approved scope and never become a city-builder system.
**Verification:** DEVICE early/later snapshot comparison, portrait/text-accessibility checks and FOCUSED UI-state tests; confirm no hidden-stat arithmetic or morality labels leak through presentation.

### T26 - Cumulative content and pacing audit
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Audit the integrated candidate against content budgets, reachable behavior and the planned slice shape.
**Dependencies:** T24, T25, T17.
**Files likely touched:** Content ledger; bounded balance/content adjustments; validation/evidence record; task status. **Scope:** M target (3-5 files); separate independent repairs.
**Acceptance:** Account for 50-70 nodes, 8-10 chains, around eight recurring NPCs and three competitors without double-counting proof/fallback content; validate required delivery and 2-4 choices/events on reachable paths; measure per-history decisions against the approximate 30-35 target without claiming duration/fun is proven.
**Verification:** CONTENT plus FULL on cumulative histories using the D6 coverage method; record deviations and open focused repair tasks when fixes exceed this task's scope. Reserve duration validation for T29.

**Checkpoint C08:** Freeze the full-slice candidate after cumulative checks; record deviations rather than silently changing targets.

## Final verification and handoff

### T27 - Full acceptance regression
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Rerun the canonical behavior contract against the frozen full content set.
**Dependencies:** T26.
**Files likely touched:** Acceptance scenario fixtures/runner; verification record/task status. **Scope:** M (3-5 files).
**Acceptance:** Each AC-01 through AC-07 has a reproducible scenario and result at the candidate revision; failing paths become blockers with regression evidence; no skipped check or two-history sample is represented as complete reachability proof.
**Verification:** Run FOCUSED, FULL, STATIC, BUILD and CONTENT using actual repository commands; preserve logs, scenario identifiers, revision and coverage limitations.

### T28 - Target-mobile verification
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Validate the integrated user flow on the approved device/OS coverage, including accessibility and continuity.
**Dependencies:** T26, T14.
**Files likely touched:** Device verification scenarios; evidence/task record. **Scope:** M (3-5 files).
**Acceptance:** Portrait cards, stacked options, confirmation, errors and reports remain readable/usable; offline resume and force-close boundaries satisfy the contract on tested targets; measured issues and unavailable environments are disclosed, not marked passed.
**Verification:** DEVICE walkthrough with approved content language/assets, accessible controls/focus/text checks where applicable, repeated taps and interrupted saves; record actual target and observations without inventing a performance threshold.

### T29 - Representative 12-week playtest
**Status:** [ ] Blocked by G1 and dependencies.
**Description:** Test the SPEC section 29 player outcomes and timing using the approved D6 protocol.
**Dependencies:** T27, T28, T06.
**Files likely touched:** Playtest evidence/report; tasks/todo.md. **Scope:** S (1-2 files).
**Acceptance:** Record interaction comprehension, first-ten-minute stakeholder understanding, consequence recognition, visible growth, defensible choices and curiosity; measure session/slice duration and decision counts; separate observations from interpretation and apply the approved go/no-go method without invented pass rates.
**Verification:** Observe representative new players on the frozen build; preserve anonymized protocol/results per D3, report untested outcomes and submit G2 evidence for owner review.

**Gate G2:** Require all ACs, cumulative content, target-device and representative player evidence before declaring the slice complete. Failures block completion or require explicit spec changes.

### T30 - Prototype handoff
**Status:** [ ] Blocked by G1, G2 and dependencies.
**Description:** Package the verified revision and next-phase decision, not a commercial release.
**Dependencies:** T29.
**Files likely touched:** README.md; implementation/run instructions; evidence index; tasks/plan.md; tasks/todo.md. **Scope:** M (3-5 files).
**Acceptance:** Provide actual setup/verification commands, tested revision and AC/playtest evidence; document limitations, rollback/save-compatibility implications and remaining open decisions; obtain owner review before any next-phase or release commitment.
**Verification:** Follow the handoff instructions, inspect the final diff and apply the standing Definition of Done with the repository-readable minimum in plan.md; distinguish self-review from independent review and unrun checks from passes.