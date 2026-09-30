# Plan: first 12-week playable slice

## Status and source of truth

**Proposed plan for review, not implementation approval.** This change adds planning documents only. All implementation tasks remain unstarted; decision work T01-T06 must clear G0 before T07 or later can begin.

Source: PR #1, reviewed head `ddb36247d6d8c5a68fe568d06bceb59f389ba77a`, merged into `main` as `9382310fe6632b3758499b565b2d2c7b07f3d596`. The plan is based on the merged snapshot, including AC-01 through AC-07, not the earlier unamended spec.

Read [SPEC](../docs/SPEC.md), [DECISIONS](../docs/DECISIONS.md), [CONTENT_GUIDE](../docs/CONTENT_GUIDE.md), [PRODUCT_GUARDRAILS](../docs/PRODUCT_GUARDRAILS.md), and [AGENTS](../AGENTS.md). The task checklist is [todo.md](todo.md).

SPEC section 31 requires implementation choices to be decided before implementation planning. They are still open. Accordingly, this document provides a decision-stage plan and a **conditional, stack-neutral delivery sequence**, not a ready-to-execute technical design. G0 must approve those choices and replace provisional file roles/verification labels with actual paths and commands before coding. This plan does not override the spec or silently resolve its gaps.

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

## 2. Decisions before implementation: G0

No engine, platform order, save format, schema, numeric economy, art direction or command is selected here. T01-T06 prepare explicit decisions for owner review. Record rationale, alternatives, consequences and approval in DECISIONS and relevant SPEC sections; a proposed `docs/IMPLEMENTATION.md` may hold implementation details. That new path is a planning proposal, not an existing file or a new source of product authority.

| Decision | Source or gap | Required output before dependent work |
|---|---|---|
| D1: runtime and delivery | SPEC section 31; DECISIONS open choices | Engine/framework and exact versions, development toolchain, prototype target OS/device coverage and delivery route, distinction from final store/release order. Verify chosen APIs against official docs at decision time. No web/native or Android/iOS assumption. |
| D2: state and content | SPEC sections 5, 8-12, 21; CONTENT_GUIDE | Formats/tooling for Event, Event Chain, NPC, World State and Memory/Precedent; identifiers, condition/effect validation, callback windows/order, checkpoint-relevant state and content/test locations. A machine-readable schema is not already specified. |
| D3: persistence and privacy | SPEC sections 3 and 31; AGENTS security | Local format/storage/versioning and interruption recovery that satisfy the locked behavior; explicit handling decision for corrupt/unsupported saves, which the source does not fully define. Decide whether analytics exists and its privacy requirements before collecting anything. No cloud service or SDK assumed. |
| D4: prototype rules | SPEC sections 5, 8-9, 13-15, 23, 26 | Initial state, units/ranges, economy/policy settlement rules, weekly event-budget selection, expansion/progression conditions, and behavior at week 12 or early failure. These details are not specified; do not invent bankruptcy thresholds, financing, or an ending. Specify only what the slice needs. |
| D5: presentation constraints | SPEC sections 24-25 and 31; DECISIONS | Prototype visual/audio production limits, permitted placeholder assets, content language/localization scope and identity constraints. Final names/art and commercial decisions remain open unless explicitly decided. |
| D6: verification and activation | SPEC section 29 and 31; AGENTS workflow | Test approach and CI scope, exact command/path map for the chosen stack, target-device procedure, playtest participant selection and interpretation criteria. Sources do not set a participant count or pass percentage. Bind every conditional task to concrete files and checks; split any task exceeding five tracked files or one focused session. |

G0 requires recorded owner approval of D1-D6 and the activated task sequence. If approved tooling, CI or telemetry requires additional implementation tasks, add and review those focused tasks before activation; this conditional sequence does not imply that such integration work already exists. A remaining material ambiguity blocks the dependent task; it is not permission to choose a default. Merging this planning PR alone does not satisfy G0. No external technology research is represented as already performed.

## 3. Dependency graph and delivery slices

The sequence below is proposed work organization. Task dependencies in todo.md are the detailed graph; checkpoint gates are additional dependencies.

```text
T01 -> T02 -> T03
          -> T04
T01 -> T05
T01..T05 -> T06 -> G0
G0 -> T07 -> T08 -> T09 -> T10 -> T11 -> T12
T12 -> T13 -> T14 -> T15 -> T16 -> T17 -> T18
T18 -> T19 -> T20 -> G1
G1 -> T21 -> T22 -> T23 -> T24
        \-> T25 -----------------> T26
T24 + T25 + T17 -> T26 -> T27 + T28 -> T29 -> G2 -> T30
```

T27 and T28 may run independently after T26; T29 waits for both. Every other extra dependency is stated in todo.md.

| Slice | Tasks | Demonstrable result and exit checkpoint |
|---|---|---|
| S0: decisions | T01-T06 | Reviewed implementation choices and executable task map. C01 after T03; G0 after T06. No game code. |
| S1: first durable decision | T07-T09 | Minimal runnable portrait path: load an authored event, resume it unchanged, choose and observe persisted effects. C02 after T09. |
| S2: complete week | T10-T12 | Confirmation, current-state option eligibility, once-only settlement, short report and durable advancement. C03 after T12. |
| S3: reliability and due callback | T13-T15 | Recoverable save failures, real interruption evidence and a due callback returning in play. C04 after T15. |
| S4: valid consequence space | T16-T18 | Changed context, fallback coverage and cross-chain validation; one authored converging proof chain. C05 after T18. |
| S5: prove the hook | T19-T20 | Two playable histories reach the same crisis with different options; focused player observation. G1 before scaling content. |
| S6: first nine weeks | T21-T23 | Incremental onboarding, district/competitor pressure, cash/safety pressure and rider callback. C06 after T23. |
| S7: complete slice | T24-T26 | Weeks 10-12, agency offer, visible growth and audited cumulative content/decision budgets. C07 after T26. |
| S8: verify and hand off | T27-T30 | AC evidence, target-mobile checks, representative playtest and documented go/no-go for the next phase. G2 after T29; owner review at T30. |

Each implementation task starts with the relevant behavioral test, observes the intended failure, implements narrowly and reruns focused checks. Content tasks validate data and playable reachability; playtest/report tasks record observations instead of fabricating automated coverage. At each checkpoint, review correctness, security, architecture, simplicity and relevant performance; preserve evidence and stop on failed prerequisites. Checkpoints occur after two or three tasks, with T30 as the final handoff.

**G1:** before expansion toward the full content budget, verify a playable earlier-decision callback and the same-crisis/different-options proof, plus reliable resume. Record player observations about recognizing consequences and wanting another week. If the central hook is not demonstrated, refine that small chain first; do not compensate with more content. The sample and interpretation method come from D6, not an invented numeric threshold here.

**G2:** do not declare the 12-week slice complete until AC-01 through AC-07, content reachability/capacity, target-device continuity and the SPEC section 29 player observations have evidence. Timing and fun are playtest findings, not inferred from event counts. Record unmet criteria as blockers or proposed spec changes, never silently lower the gate.

## 4. Responsibilities, not a chosen architecture

Use the five content concepts already named in SPEC section 21. The following responsibility boundaries are planning aids; D1-D3 choose the simplest implementation and actual file layout.

| Responsibility | Contract to preserve |
|---|---|
| Authored content and validation | Conditions, choices, effects, NPC references, meaningful memory and callback/fallback coverage are data-testable rather than scattered through UI branches. |
| Decision/week resolution | Read current committed state; apply a choice once; separate immediate effects from recurring settlement; never turn hidden state into a global morality score. |
| Persistence boundary | Store coherent week/phase, active event, effects, history and pending/resolved consequences; block progress on failure. Treat loaded data as untrusted. |
| Mobile presentation | Brief, choice card, immediate feedback, report and Next Week; Home/Company/Network remain the initial navigation target. Show only player-knowable feedback and visible growth. |
| Verification evidence | Exercise real state and persistence where practical; use controlled fixtures/fault injection for edge cases. Record target environment and limitations without adding a production telemetry service by default. |

No event-sourcing framework, database, server API, generic rules DSL, DI framework or new dependency is mandated. Only implement hidden state and later-stage concepts needed by authored slice content. Both starting services and stakeholder tensions still need representation; reduced scope must not turn into a delivery-only game or a disconnected card quiz.

Parallel work is safe only after the relevant contracts stabilize: content drafting and presentation assets can proceed against approved D2/D5; T25 can proceed alongside T22-T24; T27 and T28 can validate the same frozen candidate independently. Changes to shared state, checkpoint format, scheduler and week settlement stay sequential. Parallel authoring still waits for G1 before scaling and shares one content-budget ledger.

## 5. Acceptance-to-task traceability

Canonical acceptance wording remains in [SPEC required behavior checks](../docs/SPEC.md#required-behavior-checks). The following is a coverage map, not a replacement or evidence that tests pass. T27 reruns all seven against the full content set.

| Requirement | Primary tasks | Required evidence |
|---|---|---|
| AC-01: within-week state | T09-T11 | Prior choice changes later options; 2-4 valid alternatives remain; settlement does not reapply it. |
| AC-02: callback contention | T15, T17 | Earliest week, deadline/tie order, retained overflow and rejected infeasible schedules. |
| AC-03: changed context/coverage | T16-T17 | Valid variant/report closure by deadline; fallback respects conditions and cooldowns. |
| AC-04: offline resume | T08-T09, T11-T14 | Close/reopen unanswered event, committed choice, settled report and advancement; no reroll, duplication or skipped week. |
| AC-05: failed/interrupted save | T13-T14 | Before/after checkpoint interruption, including before feedback; complete old/new state, visible failure and blocked progression. |
| AC-06: history-dependent options | T18-T19, T24 | Two documented histories reach the same playable crisis by week 12; actual selectable-option difference from history, 2-4 valid choices each. |
| AC-07: confirmation | T10, T14 | Normal tap has no dialog; cancel is state-neutral; confirm commits once and survives resume. |
| SPEC sections 4, 8-10, 13-15, 17 | T04, T11, T21-T25 | Both services, readable five core metrics, differentiated stakeholder effects and visible district/company progression. |
| SPEC sections 21-23; CONTENT_GUIDE | T18-T26 | Branch-and-converge, required payoffs within slice, cumulative nodes/chains/NPCs/competitors and per-history decision counts. |
| SPEC sections 7, 24-25, 28-29 | T05, T20, T25, T28-T29 | Mobile readability, risk warnings, visible growth, fictionalization and recorded new-player observations. |

Verification labels in todo.md are **not shell commands**: `FOCUSED`, `FULL`, `STATIC`, `BUILD`, `CONTENT`, `DEVICE`. D6 binds each to an exact repository command or a concrete manual procedure, including environment and applicability; T07 executes and confirms the initial setup. Unsupported checks stay explicitly pending. Never substitute remembered package-manager commands.

## 6. Risks and stop conditions

| Risk | Mitigation or stop condition |
|---|---|
| Open decisions become accidental architecture | G0 blocks code; version-sensitive choices require official documentation at decision time. No guessed paths or commands survive activation. |
| Save acknowledgment differs from durable state | T08-T14 prove actual checkpoint/feedback boundaries early. Data loss, duplicate settlement or a silently reset campaign stops subsequent work. |
| Individually valid chains oversubscribe weeks | T17 checks combined reachable states under the real scheduler and budgets; retain pending callbacks and reject infeasible content rather than waive deadlines. Random sampling alone is not proof of all reachable-state coverage. |
| Validation state space becomes too large | D2/D6 define a tractable model and coverage argument for the bounded slice; split or simplify content while preserving contracts, or surface missing proof. Do not claim exhaustive validation from two demo histories. |
| Locked options leave an event unusable | Validate every presented reachable variant; use authored alternatives, never revive an ineligible option to meet the count. |
| Authoring hides an uninteresting core loop | G1 precedes volume. Count proof/fallback nodes inside the budget; do not treat additional drama as the fix. |
| Numeric economy or stopping rules are absent | D4 records explicit owner decisions before settlement/progression/content depends on them. The plan does not choose values or failure semantics. |
| Final polish or late-game systems overtake the slice | Use only approved production limits; stop at the agreed week-12 boundary. Further campaign work gets a new plan. |
| Untrusted data or telemetry weakens safety | Review loaded save/content validation and dependency provenance. No executing content as code; no secret/PII logging. Network/auth/payment/analytics additions require a separate explicit security review. |

## 7. Completion and handoff

For this planning PR: only tasks/plan.md and tasks/todo.md are added; source product documents stay unchanged. Verify cross-references, ordered/acyclic dependencies, task size and acceptance/verification fields, AC coverage, open-decision gates and clean diff. Check remote file hashes and PR base/head after writing. Self-review is not independent human approval.

For later implementation: every checked task needs its acceptance evidence plus the project's standing Definition of Done (correctness, quality, integration, documentation and relevant security/ship readiness). Apply [AGENTS](../AGENTS.md) to repository work; the SON Project shared Definition of Done is supplied in project knowledge, not assumed to be a repository file. Record checks as passed, failed, not applicable with reason, or not run; missing runtime evidence is not a pass.

Keep each change small and revertible. If a checkpoint fails, preserve the failing artifact/save and halt expansion; after a regression fix, rerun the affected checks. Rolling back app code must not silently discard or reinterpret saves: use the compatibility decision from D3 and document any remaining limitation.

T30 delivers the tested revision, runnable instructions, acceptance/playtest evidence, known limitations and a next-phase recommendation for owner review. It is a prototype handoff, not permission for store publication or commercial release. No merge or deployment is authorized by this plan.
