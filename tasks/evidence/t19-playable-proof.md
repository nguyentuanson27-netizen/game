# T19 evidence — both histories played to different options (AC-06)

Environment: Node 24.21.0, npm 11.19.0, Linux; Playwright 1.63 on the sandbox's pre-installed Chromium (uncommitted local config). WebKit runs in CI only. Real devices: **Not run**.

**Status:** implemented on branch; exact-head CI and owner review pending. This is the runtime proof for AC-06; it does not mark the prototype complete, and G1/T20 still needs a real player.

## What was proven, with the T18 fixture as authority

`content/prototype/proof-histories.json` (history A `fund_policy`, B `decline`, C `settle_and_part`, plus the 7-state `reachableCrisisStates` table) was not rewritten. The runtime plays it through real choices, checkpoints, callbacks, closures, settlement and Next Week; no state is seeded.

- **Shared crisis, different decision space.** Both A and B reach `evt.proof.public_rider_dispute` in week 10 (delivered by `cb.public_rider_dispute`). The committed state offers A `[hold_and_review, cite_policy, joint_statement]` and B `[hold_and_review, announce_new_policy, quiet_settlement]`, exactly the fixture's lists. Only-A / only-B ids are asserted; each unavailable option's authored condition is evaluated against the committed state and fails, and the only refs those conditions read are `policies`, `memories` and the rider status (never a metric). 2-4 options in both.
- **Callbacks.** In both, the follow-up arrives in week 7 with the documented variant (`engaged` / `aggrieved`) before the ordinary beat. History C reaches the same crisis with a report closure instead (no variant shown, resolved by `closure.rider_voice_followup.departed`).
- **State before the crisis** (policies, memories, rider status, recurring policy cost) equals the fixture. Metrics are deliberately not compared: the fixture assumes no other content and the placeholder beats move them. The fixture's setup placement (week 3) differs from the shipped route (week 1) as noted in the T15 evidence; callback weeks (7, 10) match.
- **Resume** (real IndexedDB store via fake-indexeddb): reopening at the crisis restores the same committed state and the same selectable ids with no write and the crisis callback still pending once; reopening at the week-9 report restores it without settling or advancing again, and Next Week then reaches the crisis once.
- **Save failure** at the crisis decision: no success, previous checkpoint byte-identical, reopen still shows the same crisis; the retry resolves the callback once; replaying the old tap is stale. (Callback decision failure was covered in T15, closure settlement failure in T16.)
- **Browser** (Chromium): `histories.spec.ts` plays A and B from the first tap to week 10 through the UI, reads the visible option buttons and the stored `optionIds`, and reloads at the crisis. B then resolves the crisis once (both callbacks resolved, none pending).

## Bounded enumeration (limits stated)

`tests/game/proof/enumerate.ts` explores every structural state reachable by any choices from the start of the shipped route with the real transitions. States are keyed on what the selection rules read (week, phase, decided events, policies, memories, relationships, resolved events/callbacks, pending callbacks, recurring costs) and **not on the four metrics**; that is only sound while no authored condition reads a metric, which the test asserts (`assertNoMetricConditions`).

Result on the shipped pack: **361 structural states, 633 transitions, 8 events presented (the fallback is never planned and no gap needs it), 18 distinct completed endings, 0 refused transitions (no dead end).** Every presented event offered 2-4 options in every reachable state. The crisis was offered exactly the 4 documented option sets (4, 3, 2, 3 options). The 7 documented crisis states collapse to 6 structural states (B + `hold_line` and B + `route_to_ops` differ only in a metric), so the documented 21 paths are 18 structurally distinct endings; the 21 documented paths are also replayed one by one under the real rules and each reaches the week-12 report with no pending callback and both callbacks resolved once. Both callbacks resolve inside their authored windows on every reachable path.

**Economy is not enumerated.** A settlement that D4 would end as `failed` is continued as a report during the structural walk (0 such settlements on the first-reached paths) and failure is checked separately with 18 extreme-play runs (first/last option, most/least cash, most/least network+trust, for each of the 3 setups): none reaches `failed` or goes below -25 cash. A one-off exhaustive run (Pareto-minimal metric vectors, 4 minutes, not committed) found 0 failed states over the whole route, but a result that is not reproducible from the repository is not claimed as evidence.

## Verification actually run

- `npm run verify`: Biome, tsc, Vitest 21 files / 296 tests, build: pass.
- Playwright Chromium (local): 31/31. WebKit via CI. **Not run:** real Android/iOS device (DEVICE).

## Limits

- Not general or full-campaign exhaustiveness: this is one pack (9 events, 2 callbacks) with the economy excluded from the enumeration.
- The week-1 setup placement and 22 placeholder routine decisions are scaffolding; T21-T24 replace them and every check must be rerun then (T17 runs it as a content check).
- Option wording is a first Vietnamese draft with no native-speaker or player review.
