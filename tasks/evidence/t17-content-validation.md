# T17 evidence — bounded cross-chain content validation

Environment: Node 24.21.0, npm 11.19.0. Run with `npm run test:content` (also part of `npm run test` / `npm run verify`, and a named step in CI).

**Status:** implemented on branch; exact-head CI and owner review pending. It validates the actual prototype pack only; it is not a general solver, editor or rules engine.

## What is checked, and how

`src/game/validation/` (not imported by the app):

- `enumerate.ts` walks every structural state reachable by any choices from the start of the shipped route with the **real** transitions and rules (`resolveChoice`, `settleWeekClosingCallbacks`, `advanceWeek`, selection, callbacks, closures). States are keyed on what the selection rules read, not on the four metrics; `assertNoMetricConditions` fails the run if an authored condition reads a metric (otherwise the dedupe would be unsound). Each reached state keeps one path of option ids that reproduces it. The economy is not enumerated (see T19 evidence).
- `validatePack.ts` (`validateContentPack`) returns issues, each with a code, a message and, for history-dependent problems, the option-id path:
  - static: `ordinary-gap` (a week with fewer than 2 decisions), `over-budget`, `plan-repeats-event` (a non-repeatable event planned twice), `fallback-repeatable`, `source-option-does-not-schedule`, `non-source-option-schedules`, `foreign-source`, `metric-condition`;
  - reachability (from the enumeration): `dead-end` (any refused transition, with the reason code and a reproducing path: overdue callback, no valid next event, unpresentable crisis, ...), `option-count` (a presented event outside 2-4), `unreachable-event` (also catches an event the fallback would silently replace forever), `unreachable-option`, `callback-never-scheduled`, `callback-window-before-source`, `callback-lost`;
  - capacity: `callback-capacity` via `checkCallbackCapacity` for all callbacks together (conservative) and for each set really pending together in some reachable state.
  - `crisisDivergenceIssues`: the shared crisis must offer at least two different option sets over reachable histories.
- The loader still rejects malformed/unresolved content (duplicate ids, unknown event/option/callback/policy/memory/NPC/status references, bad source event/option, malformed windows, duplicate/non-positive tie order, fewer than 2 authored options, non-required callbacks, unsafe fallbacks, authored cooldowns). The validator reuses runtime functions instead of re-implementing their rules.

## Result on the actual pack

`CONTENT {"events":9,"chains":1,"callbacks":2,"closures":1,"states":361,"transitions":630,"completedEndings":18,"fallbackSubstitutions":0}` with **0 issues**: no dead end, every presented event 2-4 options, every event and option reachable, both callbacks scheduled by every source option and inside their windows, capacity feasible for every reachable pending set, no fallback used, shared crisis offers 4 distinct option sets (4, 3, 3, 2 options). Pack source: `content/prototype/proof-chain.json` + `proof-loop.json` at the PR head (a file cannot name its own commit; the PR description records it). 5 proof event nodes + 4 placeholder routine beats = 9 of the 50-70 node budget; 1 of 8-10 chains.

## Known-bad fixtures that are rejected (24 tests, all in `tests/content/proofPack.content.test.ts`)

- At load: duplicate event/option/callback ids; unknown event, source event, source option, callback (effect and closure), policy, memory, NPC status and speaker; callback window with earliest after latest or outside 1-12; non-positive and duplicate tie order; fewer than 2 options; a callback not marked required.
- By the validator, each with reproducible information: oversubscribed required callbacks (3 equal windows, 2 slots: the undelivered callback and the week-by-week schedule, plus the dead-end history path); a window over a week with no authored slots; a window that closes before its source can be played; a source event that is never played; a source option that does not schedule its callback and one that schedules an unlisted one; an invalidated callback with no closure (path contains `opt.test.flip.off`); a non-repeatable event planned twice; a repeatable fallback; a 5-option event that the fallback would hide; an option that is never selectable; a week with a single decision; a gap the fallback covers once (reported as a substitution) and the same gap twice (dead end with path); a crisis that offers the same options in every history.
- Valid controls that must stay accepted: overlapping windows and equal deadlines that fit in authored tie order, the exactly-full equal-deadline week, an invalidated callback that has its closure.
- Mutation spot checks on the capacity, unreachable-option, window-before-source and repeated-event rules each fail the corresponding fixture.

## Limits

- One pack, structural enumeration only (361 states). The metrics and the economy are not enumerated; failure is checked by extreme-play runs in the T19 tests. If an authored condition ever reads a metric the run fails loudly until the enumeration is extended.
- The capacity check assumes every callback consumes one slot and all pending callbacks are released at their first window week (conservative); a content batch that exceeds the weekly budget needs rebalancing rather than a waiver.
- The `callback-window-before-source` rule rejects only windows that end before the source can be played; same-week delivery is allowed.
- Cooldowns are not implemented, so none can be authored (the loader rejects them); the first content that needs them must add tracking and the checks that go with it.
- Rerun `npm run test:content` with every later content batch (T21-T24); a larger pack may need a smaller bound or explicit cases (the enumeration throws past 100,000 states rather than silently truncating).
- **Not run:** WebKit locally (CI), real device (DEVICE).
