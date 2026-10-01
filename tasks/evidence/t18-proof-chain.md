# T18 evidence — converging proof chain (paper/data review)

## Status and what this does NOT claim

**Paper/data-shape review only. No runtime validation exists.** No code has loaded, parsed with Zod, scheduled, presented or played this content. No game, build, test suite, scheduler, persistence layer or browser was run, because none exists yet (T07 has not started). Nothing here claims AC-01…AC-07 pass; it records the expectations T08–T12, T15 and T19 must later prove with real behavior.

The JSON files use a **proposed fixture shape**. They are not the runtime schema; T08 owns the Zod schema and may rename fields. The content being proven is the ids, conditions, effects, callback windows and option availability, all drawn from the G0 D2 vocabulary.

- Base: `02e57dd` (`main`, G0 approved). Task revision: the head of the T18 PR (recorded in the PR description, since a file cannot name its own commit).
- Files: `content/prototype/proof-chain.json`, `content/prototype/proof-histories.json`, this file, plus the T18 status line in `tasks/todo.md`.

## Scope

Proves the two product-spec requirements in SPEC section 23 on one small chain:

1. `earlier policy -> stakeholder reaction -> public problem`.
2. Two documented histories reach the same shared crisis by week 12, where at least one selectable option differs because of earlier policy, relationship and precedent. Both versions keep 2–4 valid options.

Chain shape: `setup (W3) -> decision -> precedent -> time passes -> callback (W7–8) -> changed context -> shared crisis (W10–11)`. The callback decision feeds the crisis, so it is not a detour. Not written here: weeks 1–12 of the campaign, other chains, the W12 report composition, the PR-agency offer, final NPC identities, art.

## Inventory and content-budget ledger

Count the event nodes once toward the existing 50–70 node / 8–10 chain budget; the report closure is tracked separately. T18 adds no new target.

| Item | Count | IDs |
|---|---|---|
| Authored event nodes (budget count) | **5** | `evt.proof.rider_claim`, `var.rider_voice_followup.engaged`, `var.rider_voice_followup.aggrieved`, `evt.proof.public_rider_dispute`, `evt.proof.fallback_shift_roster` (setup 1, callback variants 2, crisis 1, fallback 1) |
| Report closures (tracked separately, not in the event-node budget) | 1 | `closure.rider_voice_followup.departed`; no decision, no slot |
| Event chains | **1** | `chain.rider_dispute` (the fallback node is unattached) |
| Required callbacks | 2 | `cb.rider_voice_followup`, `cb.public_rider_dispute` |
| Role/NPC placeholders | 2 | `npc.recurring_rider` (recurring rider), `npc.ops_contact` (operations contact) |
| Policies | 2 | `policy.rider_support_fund`, `policy.rider_review_seat` |
| Precedents | 3 | `prec.rider_dispute.negotiated` / `.declined` / `.suppressed` |
| Memories | 7 | `mem.rider_claim_on_record` plus 6 crisis payoff memories `mem.public_dispute.*` |

Rough share of budget: 5 of 50–70 event nodes (about 7–10%), 1 of 8–10 chains. The slice's "around 8 recurring NPCs" gets 2 role placeholders from this pack. No merchant or competitor role was needed, so none was invented.

Identity: role-based ids only. No name, company, city, competitor, art or vendor asset is chosen or referenced. Player copy is Vietnamese-only per D5.

## Proposed fixture shape: what is draft

- Condition shape: scalar `{op: eq|neq, ref, value}` and set `{op: has|notHas, set: policies|memories, id}`. All lists are AND; there is no OR.
- Vocabulary used: conditions `eq`, `neq`, `has`, `notHas` (`gte`/`lte` not needed); effects `metricAdjust`, `policyAdd`, `recurringCostAdjust`, `npcStatusSet`, `memoryAdd`, `callbackSchedule`. No new operator or effect kind was invented. `flagAdd` and the demand modifier are unused.
- Draft fields with no G0 definition (T08 decides): `placement`, `selectableCoverage`, `contextLines`, `variants`/`changedContext`/`closures` layout, `reportLine`, `unavailableBecause`, `confirmation`.
- NPC status as an enum on `npc.recurring_rider` is a proposed state shape; G0 only says "NPC/organization relationship/status".
- "Callback consumes no slot when closed by report" is a content-side statement of SPEC section 21; the scheduler must implement it.
- Metric numbers are D4 tuning constants and never appear in player text.

## History A — rider-support policy (demonstration)

`[opt.rider_claim.fund_policy, opt.rider_voice.engaged.keep_informal, opt.crisis.joint_statement]`

| Week | Event | Choice | State change (proof effects only) |
|---|---|---|---|
| 3 | `evt.proof.rider_claim` | `fund_policy` | Rider 50→60; `policy.rider_support_fund`; recurring cost +6; rider status `ally`; `prec.rider_dispute.negotiated`; schedules both callbacks |
| 7 | `cb.rider_voice_followup` → `var.rider_voice_followup.engaged` | `keep_informal` | Rider 60→62; status stays `ally` |
| 10 | `cb.public_rider_dispute` → `evt.proof.public_rider_dispute` | `joint_statement` | Trust +6, Rider +5, recurring cost +3, `mem.public_dispute.joint_statement` |

State when the crisis is presented: policy `rider_support_fund`; precedent `negotiated`; rider `ally`; cash 106, Rider 62, Trust 50, recurring cost 6. W3 settlement = 19 deliveries + 13 rides, gross 77, cost 71, cash +6, which equals the G0 T04 "History A" paper check. Crisis selectable: `hold_and_review`, `cite_policy`, `joint_statement` (3).

## History B — decline (demonstration)

`[opt.rider_claim.decline, opt.rider_voice.aggrieved.hold_line, opt.crisis.announce_new_policy]`

| Week | Event | Choice | State change |
|---|---|---|---|
| 3 | `evt.proof.rider_claim` | `decline` | Rider 50→40; status `resentful`; `prec.rider_dispute.declined`; schedules both callbacks |
| 7 | `cb.rider_voice_followup` → `var.rider_voice_followup.aggrieved` | `hold_line` | Trust 50→45 |
| 10 | `evt.proof.public_rider_dispute` | `announce_new_policy` | Cash −8, Trust +2, `policy.rider_support_fund`, recurring cost +6, `mem.public_dispute.policy_under_pressure` |

State when the crisis is presented: no policy; precedent `declined`; rider `resentful`; cash 78, Rider 40, Trust 45. W3 settlement = 17 + 11, gross 67, cost 65, cash +2, which equals the G0 T04 "History B" paper check. Crisis selectable: `hold_and_review`, `announce_new_policy`, `quiet_settlement` (3).

## History C — changed-context probe (supplemental, not an AC-06 demonstration history)

`[opt.rider_claim.settle_and_part (confirmation required), report closure, opt.crisis.quiet_settlement]`

The setup choice makes the rider `departed`. At W7 no callback variant is valid, so `cb.rider_voice_followup` resolves through `closure.rider_voice_followup.departed` in that week's report, with no decision and no slot. The crisis is still reached with 3 selectable options. This history exists so the "original context invalid" rule has a reachable case.

## Callback window check

| Callback | Source | Earliest | Latest | Tie order | Eligibility | Changed-context resolution |
|---|---|---|---|---|---|---|
| `cb.rider_voice_followup` | every option of `evt.proof.rider_claim` (W3) | 7 | 8 | 1 | `has mem.rider_claim_on_record` | variant `engaged` or `aggrieved` by precedent when rider is not `departed`; otherwise report closure |
| `cb.public_rider_dispute` | every option of `evt.proof.rider_claim` (W3) | 10 | 11 | 2 | `has mem.rider_claim_on_record` | none possible; report closure explicitly **not allowed** (the payoff must be playable) |

- Not before earliest: setup is W3; both callbacks wait through W4–W6 and W7–W9 respectively; delivery only at W7 and W10 in every history.
- Feasible: window capacity is W7–8 = 3+3 = 6 slots and W10–11 = 3+3 = 6 slots, each needing 1. The windows are disjoint, so no proof deadline is oversubscribed. Because required callbacks take priority, each is delivered at the first slot of its earliest week in the walk-through. Content elsewhere may add at most 5 other required deliveries whose windows lie entirely inside W7–8 (and likewise W10–11) before the window is full; T17 must check that bound across chains. The crisis is due by W11, leaving W12 free of this pack's required deliveries.
- Pending rule is stated in each callback: slot shortage never cancels it, original deadline retained.
- Never applies an unchosen option: `appliesUnchosenOption: false`; the closure has no effects.
- **Tie order is authored (1, 2) but not exercised.** The two windows do not touch, so no equal-deadline case occurs in the proof. T15/T17 must add a synthetic equal-deadline fixture; this proof does not demonstrate tie ordering.

## Weekly slot and budget check

Budget `[2,3,3,3,3,3,3,3,3,3,3,2]` = 34. Proof-authored slots only; "other" slots belong to ordinary or fallback content outside T18.

| Week | Budget | Proof slots A / B | Proof slots C | Other slots A / B | Other slots C |
|---|---|---|---|---|---|
| 1 | 2 | 0 | 0 | 2 | 2 |
| 2 | 3 | 0 | 0 | 3 | 3 |
| 3 | 3 | 1 (`rider_claim`) | 1 | 2 | 2 |
| 4–6 | 3 each | 0 | 0 | 3 each | 3 each |
| 7 | 3 | 1 (callback variant) | 0 (report closure) | 2 | 3 |
| 8–9 | 3 each | 0 | 0 | 3 each | 3 each |
| 10 | 3 | 1 (crisis) | 1 | 2 | 2 |
| 11 | 3 | 0 | 0 | 3 | 3 |
| 12 | 2 | 0 | 0 | 2 | 2 |
| **Total** | **34** | **3** | **2** | **31** | **32** |

Result: at most one proof slot in any week; no week exceeds its budget; required callbacks use normal slots; no event is pushed below 2 valid choices. Per-history proof decisions are 3 (A, B) and 2 (C) of 34; the remaining decisions come from the rest of the slice. D4 requires 2–4 decisions per week, not exactly 34 from this pack.

D4 paper settlement across W1–W12 with only proof effects (all other content assumed neutral): final cash A 115, B 58, C 116. Across all 21 paths the lowest post-settlement cash is 57 (W1, before any proof effect) and final cash ranges 58–126, far from the `< -25` failure threshold. This says nothing about the rest of the slice's economy.

## Shared crisis comparison

Same event `evt.proof.public_rider_dispute` (title, speaker `npc.ops_contact`, stage `city_player`), delivered by the same callback in W10.

| Option | History A | History B | History C | Availability rule (draft) |
|---|---|---|---|---|
| `opt.crisis.hold_and_review` | yes | yes | yes | none (always) |
| `opt.crisis.cite_policy` | **yes** | no | no | `has policies policy.rider_support_fund` |
| `opt.crisis.announce_new_policy` | no | **yes** | yes | `notHas policies policy.rider_support_fund` |
| `opt.crisis.joint_statement` | **yes** | no | no | `eq npc.recurring_rider.status ally` |
| `opt.crisis.refer_to_review_panel` | no | no | no | `has policies policy.rider_review_seat` (only after A + `grant_seat`) |
| `opt.crisis.quiet_settlement` | no | **yes** | yes | `notHas memories prec.rider_dispute.negotiated` |
| **Selectable count** | **3** | **3** | **3** | |

A selectable: `[hold_and_review, cite_policy, joint_statement]`. B selectable: `[hold_and_review, announce_new_policy, quiet_settlement]`. Both within 2–4.

## Exact reason the options differ

The difference comes from state written by earlier decisions, not from copy or numbers:

- **Policy.** A created `policy.rider_support_fund` at W3, which makes `cite_policy` selectable and `announce_new_policy` not. B has no such policy, so the reverse holds.
- **Relationship.** A's rider is `ally` (set at W3, preserved by `keep_informal`), enabling `joint_statement`. B's rider is `resentful`; C's is `departed`.
- **Precedent.** A set `prec.rider_dispute.negotiated`, so `quiet_settlement` is unavailable (nothing is left to settle privately). B's `prec.rider_dispute.declined` leaves it available.

No crisis option condition reads a metric, and the situation text variants in `contextLines` are explicitly dialogue-only and not counted. The sets of selectable ids differ by four options.

## Changed-context and fallback handling

| Case | Where | Resolution | Slots / choices |
|---|---|---|---|
| Relationship no longer usable (rider `departed`) | History C, W7 | `closure.rider_voice_followup.departed` in the W7 report; no option applied | No slot used; W7 keeps 3 ordinary/fallback slots |
| Callback context changed (rider `resentful` vs `ally`) | A/B, W7 | Authored variants `engaged` / `aggrieved` | 3 selectable each |
| Rider relationship cooled before crisis | A + `defer_to_review` (status `neutral`) | `joint_statement` becomes unavailable | Crisis offers 2: `hold_and_review`, `cite_policy` |
| Option invalidated by history | Crisis, all histories | Each conditional option has `unavailableBecause`; none is revived to fill the quota | 2–4 in all 7 reachable states |
| Too few ordinary events / freed slot | e.g. W7 in C | `evt.proof.fallback_shift_roster`: state-independent, 2 options, cooldown 4 weeks | 2 selectable; cannot bypass other events' conditions |
| Crisis cannot be closed by report | `cb.public_rider_dispute` | `reportClosureAllowed: false`; event adapts through option filtering | always at least `hold_and_review` plus one policy option |

## Reachable proof-state enumeration

3 setup options × callback outcome = 7 crisis states and 21 full paths (each crisis option once per state). Crisis selectable counts: 4, 3, 2, 3, 3, 3, 3. The table is in `proof-histories.json` under `reachableCrisisStates`. The only 4-option state is A + `grant_seat`; the only 2-option state is A + `defer_to_review`.

## Checks actually run

All run locally on this branch, 2026-10-01. The first was a plain JSON parse; the rest were an **ad-hoc Python 3 script kept in the session scratchpad and not committed**. Per the T18 scope there is no content validator, scheduler or loader in the repo; T17 owns a real one.

| Check | Result |
|---|---|
| JSON syntax of both files (`jq`, Python `json`) | pass |
| Unique semantic ids across the proof (41 ids), id format | pass |
| No vendor/real-brand names in either file (`kenney`, `grab`, `uber`, `shopee`, `gojek`, `be group`) | pass |
| Conditions only `eq`/`neq`/`has`/`notHas`; effects only the G0 vocabulary | pass |
| All condition/effect/callback/closure/chain/speaker references resolve; all ids in `proof-histories.json` exist in `proof-chain.json` | pass |
| Declared `createdBy` of every policy/memory matches actual effects; every non-payoff state item has a reader | pass (`prec.rider_dispute.suppressed` is read only by a dialogue line; payoff memories have no in-proof reader, both documented) |
| Every presented event, in all 21 paths, has 2–4 selectable options | pass |
| Callback windows within 1–11, earliest ≤ latest, tie order unique, every source option schedules the callback, delivery inside window in every history | pass |
| Weekly budget equals D4 (sum 34); proof slots ≤ budget every week | pass |
| History JSON numbers (selectable ids, unavailable lists, cash trace, W3/W10 settlements, pre-crisis state) equal recomputation from the authored effects with D4 settlement | pass |
| W3 settlement for A/B equals G0 T04 A/B paper checks | pass |
| Event-node count 5, report closure 1 tracked separately, 1 chain; every `stage` is `street_startup`, `local_platform` or `city_player` | pass |
| 12-week proof-only replay of all 21 paths never fails or goes below 0 cash | pass |

The 90 `PASS` lines came from a throwaway script that applies the authored conditions/effects. They check the data against its own semantics, not against a runtime implementation.

## Review against CONTENT_GUIDE, D2, D4, D5

- Event template: title, stage, speaker, category, situation, why-now, options, availability, confirmation, effects, memory, follow-up, callback delivery, cooldown: present; mandatory ones filled for each node.
- Quality checklist: Understandable quickly on a phone (situations are 2–4 sentences, options one line); at least two defensible options (A/B/C all have genuine trade-offs, none dominant); consequences follow state; uses player history; availability leaves 2–4; irreversible action `settle_and_part` marked for confirmation; callbacks have windows and changed-context resolution; fallback present; no exposed arithmetic in copy; no unbounded branching (1 setup → 1 callback → 1 crisis, three paths reconverging on shared ids); fits stage per node.
- Branch-and-converge: all branches converge on the same callback id and crisis event id at the first possible point while preserving precedent and relationship.
- D2: authored JSON, semantic ids, no executable content, no new DSL, role-based NPC ids.
- D4: weekly budget respected; W3 histories reproduce the T04 examples; both histories remain playable to W12 (proof-only).
- D5: Vietnamese-only copy, no vendor filenames, no art ids; text outside images.
- Guardrails: all fictional, no real company or event mapped. The grey options (private payment/quiet settlement, firm refusal) stay at business/narrative level with no procedural detail.
- The private-payment setup option and the quiet-settlement crisis option are the proof's grey strategies. Neither is labeled morally, and each has costs (cash, precedent, lost relationship, leak risk).

## How later tasks consume this

- T08: load `evt.proof.rider_claim` (3 options, one needs confirmation) through the checkpoint boundary.
- T09/T10: effects/history/callback scheduling; `callbackSchedule` is on every setup option.
- T15: delivery windows, priority, pending rule; build a synthetic equal-deadline fixture because the proof does not exercise tie order.
- T16: closure case C and fallback; check variant mismatch for other reasons (see limitations).
- T19: replay A, B, C and the 7-state table; compare selectable ids at the crisis.
- T17: re-check capacity when other chains compete for W7–8 and W10–11, and re-check option counts if other content changes rider status or policies.

## Known limitations

1. Other slots in each week (31–32 of 34 per history) are not authored here. Fallback coverage is shown for the one slot this pack frees, not for the whole slice.
2. Metric values assume other content has no metric effect; the economy check is proof-only.
3. Tie order is declared but not exercised (disjoint windows).
4. The closure text says the rider left; the "no variant matches" rule is general. If later content makes variants unmatchable for a different reason, T16/T17 must add a variant or a different closure.
5. The crisis option counts hold only within this pack. Other content that changes `npc.recurring_rider.status`, adds `policy.rider_support_fund`, or grants `policy.rider_review_seat` can change them; T17 must re-check.
6. The 6 crisis payoff memories and the W12 report line (`reportLine`) have no reader here; the W12 report and PR-agency offer are later tasks.
7. Placement weeks (W3, W7, W10) are walk-through placements; actual ordinary-event selection is T10's.
8. Copy is a first Vietnamese draft; it has had no native-speaker or playtest review.
9. `refer_to_review_panel` is reachable only in one path (A + `grant_seat`); the 3 callback options on that path are all valid but only one reaches it.
10. History C is a supplemental probe, not required by AC-06.

## Not run / unverified

- No runtime load, Zod validation, scheduler, checkpoint, UI, browser or device checks (T07+ do not exist).
- AC-01…AC-07: not verified. This file supplies paper expectations for AC-02, AC-03, AC-06 and AC-07 inputs only.
- No player observation, no G1 evidence.
