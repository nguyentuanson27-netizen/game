# Plan: first 12-week playable slice

## Status and source of truth

**Proposed plan for review, not implementation approval.** This change adds planning documents only. All tasks remain unstarted. T01-T06 must clear G0 before code or production content work begins. Task IDs are retained for review history; follow the displayed order and dependencies, not numeric order.

Source: PR #1, reviewed head `ddb36247d6d8c5a68fe568d06bceb59f389ba77a`, merged into `main` as `9382310fe6632b3758499b565b2d2c7b07f3d596`. The plan is based on the merged snapshot, including AC-01 through AC-07, not the earlier unamended spec.

Read [SPEC](../docs/SPEC.md), [DECISIONS](../docs/DECISIONS.md), [CONTENT_GUIDE](../docs/CONTENT_GUIDE.md), [PRODUCT_GUARDRAILS](../docs/PRODUCT_GUARDRAILS.md), and [AGENTS](../AGENTS.md). The task checklist is [todo.md](todo.md).

SPEC section 31 requires implementation choices to be decided before implementation planning. They are still open. Accordingly, this document provides a decision-stage plan and a **conditional, stack-neutral delivery sequence**, not a ready-to-execute technical design. G0 approves the minimum prototype choices and details for the first runnable slice. Later file paths and checks are specified just before their slice starts; material product or technical choices are never silently deferred into code. This plan does not override the spec or silently resolve its gaps.

## 1. Outcome and scope

Deliver the first 12 in-game weeks described in SPEC section 23. Preserve the targets of approximately 45-60 minutes and 30-35 player decisions, with sessions of 5-15 minutes. These are prototype/playtest targets, not measured results or a development schedule.

The player must experience `decision -> state/relationship/precedent -> consequence -> new decision`: an earlier decision returns meaningfully, and two histories reach the same crisis by week 12 with at least one genuinely different selectable option. Dialogue-only changes and report-only closure cannot replace that demonstration.

Locked constraints retained from SPEC sections 3-12, 21-24 and DECISIONS:

- Mobile-first, portrait, single-player, offline-first; bicycle delivery plus short-distance bicycle passenger rides. No service is silently cut.
- Resolve 2-4 events per week, one at a time. Each presented decision retains 2-4 valid selectable options; most use three. Preserve the approximate 70/20/10 three/four/two-choice target rather than treating it as an exact per-week quota.
- Save the active event before presentation. Commit immediate effects, relationships, policies, precedents and pending consequences together before success feedback or next-event evaluation. Settle once; `Next Week` only advances.
- Required callbacks use authored earliest/latest weeks, priority by earliest deadline and authored tie order, retained pending state and explicit changed-context resolution. Validate achievable capacity and valid fallback coverage.
- Offline resume cannot reroll, lose an acknowledged choice, duplicate effects, repeat settlement or skip weeks. Interrupted saves recover a complete checkpoint; failed saves block progress without silently resetting.
- Only major irreversible actions require confirmation; cancelling leaves gameplay state unchanged. Warn narratively about high risk without exposing hidden arithmetic.
- Hand-authored core content, branch-and-converge, stakeholder conflicts, meaningful NPC memory and visible company/city growth. No global Good/Evil or Happiness substitute.

The slice's total content budget remains 50-70 authored event nodes, 8-10 chains, around eight recurring NPCs and three competitors (SPEC section 21; CONTENT_GUIDE). Early proof content, variants and fallback events belong inside that budget; 30-35 decisions is a per-playthrough target, not the number of authored nodes. Do not author the whole budget before testing the central hook.

Out of this delivery plan: the full 5-7-hour campaign, all five company stages, complete late-game departments/M&A/fixer systems, public store launch, and all prototype non-goals in SPEC section 30. Later-stage ideas remain product direction, not deleted requirements. No runtime LLM, multiplayer, realtime city builder, procedural crime mechanics or live-service retention work is introduced. Accounts, payments, uploads and network analytics are not added by this plan.

## 2. Minimum decisions before code: G0

Prepare D1-D6 as one concise decision package, not six separate approval rounds. Use DECISIONS and relevant SPEC sections for approved choices, rationale and consequences; add implementation notes only when existing documents cannot hold the needed detail. Use one shared evidence record per slice; append each task's revision/check result before marking it done instead of rewriting every document.

| Decision | Minimum owner-approved output |
|---|---|
| D1: runtime/delivery | Engine/framework and exact versions, toolchain, prototype OS/device coverage and delivery route. Keep final store/release order distinct; verify version-sensitive choices against official docs. |
| D2: state/content | Minimal formats/tooling for the five SPEC concepts, identifiers, condition/effect and option rules, callback windows/order and checkpoint state. Walk a small converging example; do not design a generic rules language. |
| D3: persistence/privacy | Local format/storage/versioning and recovery meeting SPEC section 3; decide corrupt/unsupported-save handling and analytics/privacy boundaries before collection. No cloud or migration framework is assumed. |
| D4: prototype rules | Initial values/units, both services' settlement, weekly event budget, progression and early-failure/week-12 behavior. These are source gaps requiring explicit decisions, not values supplied by this plan. |
| D5: presentation | Prototype asset/audio limits, placeholders, language/localization and fictional identity. Do not require final art or commercial branding. |
| D6: verification | Test/CI scope, device procedure, bounded content-coverage approach and player-observation method. Bind actual paths and commands for the first runnable slice only; no invented participant count/pass rate. |

G0 needs owner approval of this package and the first slice's task details. It does not require the final file layout or exact test commands for T21-T30. Before each later slice, inspect the code that now exists, fill its paths/checks, and split oversized or independent work; no new approval ceremony is needed unless a material decision changes. Approved tooling/CI integration must have explicit tasks before it is needed. A material unresolved dependency still blocks its task. Merging this planning PR does not approve G0 or authorize code, merge or deployment.

## 3. Delivery order and dependencies

Draft the proof chain first and reuse it as fixtures throughout implementation. Do not build a general validator before there is real content to validate. The numbered IDs are stable references, not execution order; [todo.md](todo.md) is the detailed graph.

```text
T01 -> T02 -> T03; T02 -> T04; T01 -> T05
T01..T05 -> T06 -> G0
G0 -> T18 + T07 -> T08 -> T09 -> T10 -> T11 -> T12
T12 + T18 -> T15 -> T19 -> T20 -> G1
T12 -> T13 -> T14
T15 -> T16 -> T17
G1 + T14 + T17 -> T21 -> T22 -> T23 -> T24
T21 -> T25
T24 + T25 + T17 -> T26 -> T27 + T28 -> T29 -> G2 -> T30
```

| Slice | Task order | Result/checkpoint |
|---|---|---|
| Decisions | T01-T03; T04-T06 | Compatibility check C01, then one G0 approval of the minimum package. |
| Small proof inputs | T18, T07 | Draft chain and runnable portrait shell; C02. These two tasks can run independently after G0. |
| First durable choice | T08-T09 | Use draft content; save/resume and basic failure blocking from the first checkpoint; C03. |
| Complete week | T10-T12 | Current-state options, confirmation, once-only settlement/report/advancement; C04. |
| Early gameplay observation | T15, T19-T20 | Play an actual callback and two histories with different options; G1. No dependency on T13-T14 or T16-T17. |
| Broader recovery checks | T13-T14 | Extend fault/interruption coverage on the real target; C05. |
| Combined-content checks | T16-T17 | Changed-context/fallback and cross-chain checks for the actual content set; C06 before expansion. |
| Content growth | T21-T23; T24-T26 | First nine weeks at C07, full 12-week candidate at C08. Reuse proof content inside the existing budget. |
| Final verification | T27-T29; T30 | Full AC/device/player evidence at G2, then prototype handoff. |

Checkpoints are brief reviews after two or three tasks, not additional deliverables or automatic human-approval rounds. Run focused checks for each change and relevant full/static/build checks at each checkpoint; record applicability rather than requiring meaningless commands. T27/T28 may run independently on the same revision; T25 may run alongside T22-T24. Shared state, persistence and scheduling edits need coordination rather than concurrent conflicting writes.

**G1 is an early, limited gameplay decision.** The small proof must have safe checkpoint behavior, valid content for its reachable states, an actual remembered consequence, history-dependent options and observations about understanding/curiosity. It is not proof of the full campaign, growth experience, duration, or the complete interruption/content matrix. Known data-loss, invalid-choice or broken-continuation paths block observation; a smaller content set is not permission to ship unsafe behavior. T13-T14 and T16-T17 remain required before T21-T26 expand content. If the hook fails, revise that chain instead of adding volume.

**G2 is unchanged:** all AC-01 through AC-07, cumulative content coverage, target-device continuity and SPEC section 29 player outcomes need evidence before declaring the 12-week slice complete. Two demonstration histories alone do not prove all reachable paths. Unmet requirements remain blockers or require an explicit spec change.

## 4. Keep the implementation small

Use the five SPEC content concepts and the simplest data-testable resolution/persistence/presentation boundaries. They do not require five subsystems or a framework. No server API, event-sourcing framework, generic rules DSL, DI framework, database, telemetry SDK or new dependency is mandated. Implement only hidden state used by actual slice content; do not cut either starting service or stakeholder conflicts.

Treat roughly five touched files as a review signal, not a quota. Keep one coherent behavior per task and split independent concerns or work too large for one focused session. A necessary scaffold/config/lockfile group can exceed the guideline with an explicit scope explanation and a runnable verification; do not pack unrelated code into fewer files or split a coherent scaffold into broken intermediate states.

Content validation grows with content: basic IDs/references/options/windows first, explicit bad-case fixtures next, then combined scheduling and reachable-state checks for the accepted pack. For a small finite proof, a documented enumeration plus executable traces can suffice if it covers the required behavior. Use the real selection rules; no generic solver/editor is a prerequisite. If the state space is too large to justify coverage, simplify interacting content or surface the gap rather than call samples exhaustive. Run cumulative validation before accepting each larger batch, not only at the final audit.

Loaded save/content is untrusted; validate at the boundary and never execute it as code. Preserve the last complete checkpoint, block progression on failed saves, and check retry/idempotency when each new write boundary is added. T13/T14 deepen this coverage, not introduce basic safety late. Review dependencies before installation; do not log secrets or personal data or add accounts/payments/network analytics without explicit scope and security review.

## 5. Acceptance-to-task traceability

The [canonical AC wording](../docs/SPEC.md#required-behavior-checks) stays in SPEC; this table is not evidence of passing tests. T27 reruns all seven on the final content set.

| Requirement | Tasks and evidence |
|---|---|
| AC-01: within-week state | T09-T11: prior choice changes later options; 2-4 valid choices remain; settlement never repeats immediate effects. |
| AC-02: callback contention | T15, T17: earliest week, deadlines/tie order, retained overflow, rejected infeasible schedules. |
| AC-03: changed context/coverage | T16-T17: valid variant/report closure by deadline; fallback respects conditions/cooldowns. T19 checks coverage of the small proof before observation. |
| AC-04: offline resume | T08-T12, T14, T19: same unanswered event, committed choice, settled report and advancement; no reroll/duplication/skipped week. |
| AC-05: failed/interrupted save | T08-T09, T11-T12: basic failure blocking and retry at each boundary; T13-T14: expanded failure/interruption matrix, complete old/new state including before feedback. |
| AC-06: history-dependent options | T18 drafts expectations; T19 proves actual selectable differences by week 12 with 2-4 valid options in both histories; T24 retains that proof in the full slice. |
| AC-07: confirmation | T10, T14: ordinary tap has no dialog, cancel changes nothing, confirm commits once and survives resume. |
| SPEC sections 4, 7-10, 13-15, 17, 24-25 | T04-T05, T11, T21-T25, T28: both services, five readable metrics, stakeholder tensions, risk warnings and visible company/city growth. |
| SPEC sections 21-23; CONTENT_GUIDE | T18-T19, T17, T21-T26: branch-and-converge, feasible payoffs, cumulative node/chain/NPC/competitor budgets and per-history decisions. |
| SPEC sections 28-29 | T05, T20, T28-T29: fictionalization, new-player understanding/curiosity, accessibility and measured pacing; G1 observations are limited, not full-slice validation. |

`FOCUSED`, `FULL`, `STATIC`, `BUILD`, `CONTENT`, `DEVICE` in todo.md are labels, not shell commands. D6 binds the first slice; later bindings use the actual repository before that slice begins. T07 verifies setup. Use behavioral tests before implementation; content/report tasks use appropriate validation or observations. Missing/unavailable checks stay not run, never passed.

## 6. Stop conditions and handoff

Stop dependent work for lost/duplicated state, ineligible choices, missed required deadlines, insufficient content coverage, or unapproved material decisions. Preserve a minimal reproduction, fix it and rerun affected checks. Do not compensate for an uninteresting chain with more content, or for poor measured performance with speculative caching/concurrency. Further campaign or commercial release work needs a separate plan.

For this PR, change only tasks/plan.md and tasks/todo.md; check dependencies, references, AC coverage, diff and remote hashes. No game/runtime result is implied. Keep all implementation tasks unstarted.

For implementation handoff, apply [AGENTS](../AGENTS.md) and the standing SON Definition of Done. The repository-readable minimum is: acceptance and edge/error cases verified; relevant tests/build/static/runtime checks evidenced; no unrelated scope or secrets; surrounding integration and save compatibility reviewed; decisions/run instructions current; relevant security and rollback constraints recorded; required owner approvals present. Production observability/deployment checks are not applicable to this docs-only PR or an unpublished offline prototype unless that scope changes. Record passed, failed, not applicable with reason, and not run distinctly; this summary does not waive the full standing checklist.

T30 supplies the tested revision, reproducible run/check instructions, AC/playtest evidence, remaining limitations and save/rollback implications. Self-review is not independent review. No merge, store publication or deployment is authorized by the plan.
