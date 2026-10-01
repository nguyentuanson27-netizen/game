# Tasks: first 12-week playable slice

## Execution rules

Read [plan.md](plan.md). Source: PR #1 merged at `9382310fe6632b3758499b565b2d2c7b07f3d596`, including AC-01 through AC-07. T01-T06 are complete through the approved G0 decision package; implementation/content tasks remain unstarted. IDs are retained for existing review references: follow the displayed order/dependencies, not numeric order.

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
**Status:** [ ] Ready; not started.
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
- GitHub Actions `verify` on head `ce49fd8`: `npm run verify` + `npm run test:e2e` pass, 8/8 browser tests on Chromium and WebKit (Playwright WebKit 26.6, emulated 390x844). The first CI run failed only on WebKit offline reload because `context.setOffline()` makes WebKit error on reload; fixed by the stopped-server approach.
- **Not run:** WebKit locally (Playwright browser download blocked by sandbox network policy; covered by CI), real Android/iOS device smoke (DEVICE), and the deployed-update path (no deployment exists yet). Emulation does not replace device smoke.
- Scope notes: `zod@4.6.5` and `idb@8.0.3` are pinned as direct dependencies per D1 but are not imported or used yet (no schemas, adapters or checkpoint code); T08 is the first task that uses them. No GitHub Pages deploy workflow in T07 (sub-path support only, via `BASE_PATH`). Transitive `glob@11.1.0` (via `workbox-build`, build-time only) prints an npm deprecation notice.

**Checkpoint C02:** Draft and scaffold are ready for the first event; paper content review and actual launch evidence remain distinct.

### T08 - Resume an unanswered event
**Status:** [ ] Blocked by dependencies.
**Description:** Load an event from T18 through the minimal local checkpoint boundary, validating data before use.
**Dependencies:** T07, T18, T03.
**Files likely touched:** Event loader/presenter; local checkpoint adapter; one event fixture; persistence test; task record. **Scope:** M (3-5 files).
**Acceptance:** Save the selected event/phase before presentation; offline reopen restores the same 2-4 valid options. Failed saves show no success and block progression while preserving the prior complete checkpoint; retry cannot replace it with partial state.
**Verification:** FOCUSED and DEVICE unanswered-event resume for AC-04; inject a basic failed/interrupted checkpoint for AC-05 and test retry. Reject malformed fixture/save data per D2/D3, never execute it as code. Broader boundary coverage remains T13-T14.

### T09 - Commit one choice coherently
**Status:** [ ] Blocked by dependencies.
**Description:** Complete the first vertical path from tap through persistent effects to immediate feedback.
**Dependencies:** T08, T04.
**Files likely touched:** Choice resolution; checkpoint integration; feedback presenter; behavior tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Persist the choice, immediate visible/hidden effects, relationships/policies/precedents and pending consequences together before feedback. Failed writes block progression and retain the previous checkpoint; repeated activation/retry commits the action once.
**Verification:** FOCUSED AC-01/AC-04 portions plus basic AC-05 at the choice write: fail, retry and reopen; compare the complete expected state and scheduled consequences, with no premature success feedback or duplicate effects.

**Checkpoint C03:** Verify one durable choice, unanswered/answered resume and basic failed-write/retry behavior before extending the loop.

### T10 - Current-state options and confirmation
**Status:** [ ] Blocked by dependencies.
**Description:** Present the next event against the updated state and honor the authored confirmation flag.
**Dependencies:** T09.
**Files likely touched:** Eligibility/resolution; decision presenter; event fixture; behavior tests; task record. **Scope:** M (3-5 files).
**Acceptance:** A prior choice can remove an option in the next event without leaving fewer than two valid choices; ordinary tap needs no dialog; cancel changes no state or scheduled consequences and confirm commits once.
**Verification:** FOCUSED AC-01/AC-07 scenarios, including lost contact support, context-valid alternatives and cancel/confirm followed by resume; inspect the UI path with DEVICE.

### T11 - Settle one week once
**Status:** [ ] Blocked by dependencies.
**Description:** Apply the approved recurring economy and due week-end effects after the week's decisions.
**Dependencies:** T10, T04.
**Files likely touched:** Week resolution; economy rules/config; checkpoint integration; settlement tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Use current state after 2-4 sequential events and D4 rules for both services; save settlement once without reapplying immediate choice effects; events unlocked by settlement enter the following week.
**Verification:** FOCUSED AC-01/AC-04 and basic AC-05 at settlement: repeat/fail/retry the write and reopen; compare complete state, no duplicated effects, and next-week eligibility unlocked only by settlement.

### T12 - Report and durable advancement
**Status:** [ ] Blocked by dependencies.
**Description:** Complete the short report -> Next Week -> brief path without leaking hidden arithmetic.
**Dependencies:** T11.
**Files likely touched:** Report/brief presentation; week advancement; checkpoint integration; transition tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Show only player-knowable report feedback; checkpoint advancement without re-settling or skipping a week; use the approved endpoint/early-failure behavior rather than adding an endless loop.
**Verification:** FOCUSED AC-04 plus basic AC-05 at advancement: fail/retry, repeat Next Week and reopen with DEVICE. Progress stays blocked on a failed write, the prior complete checkpoint survives, and neither settlement nor advancement repeats.

**Checkpoint C04:** Verify a complete week, current-state choices, confirmation, once-only settlement/advancement and failure blocking at each new write.

## Early observation, then broader hardening

### T15 - Deliver required callbacks
**Status:** [ ] Blocked by dependencies.
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
**Status:** [ ] Blocked by dependencies.
**Description:** Extend the safety already tested in T08-T12 to a systematic matrix; do not defer basic failure blocking to this task.
**Dependencies:** T12, T03.
**Files likely touched:** Checkpoint failure handling; error/retry presentation; fault fixtures; recovery tests; task record. **Scope:** M (3-5 files).
**Acceptance:** Failed saves never show success or permit another decision/week advance; the previous complete checkpoint remains recoverable with no silent reset; retry/resume cannot duplicate effects or scheduled consequences.
**Verification:** FOCUSED AC-05 across active-event, choice, settlement and advancement saves; add missing cases, D3 corrupt/unsupported-save behavior and retry/resume regressions. Reuse existing tests; errors must contain no secret/PII payloads.

### T14 - Interruption matrix on the target
**Status:** [ ] Blocked by dependencies.
**Description:** Verify the real persistence boundary, not only an in-memory substitute.
**Dependencies:** T13.
**Files likely touched:** Interruption test harness; scenario fixtures; verification record/task status. **Scope:** M (3-5 files).
**Acceptance:** Before/after-write interruption restores a complete old/new checkpoint, including closure before feedback; offline app restart preserves every AC-04 boundary and AC-07 result; time away does not advance weeks.
**Verification:** Run AC-04/AC-05/AC-07 via FOCUSED integration and DEVICE force-close/restart procedures; record environment, exact injection boundaries and coverage limits. Failed scenarios create focused fix tasks before continuation.

**Checkpoint C05:** Broader recovery/interruption checks pass on the recorded target; preserve regressions and stop dependent work on failure.

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