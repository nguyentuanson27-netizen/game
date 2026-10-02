# T15 / T16 evidence — required callbacks

Environment: Node 24.21.0, npm 11.19.0 (the pinned G0 versions, installed outside the repo), Linux. Browser: Playwright 1.63 driving the sandbox's pre-installed Chromium through an uncommitted local config; WebKit and real devices are not available locally.

## T15 — deliver required callbacks

**Status:** merged (PR #16); GitHub Actions `verify` green on its head at merge, Chromium + WebKit; re-verified green on the follow-up fix PR #21 head `f83b583`. Owner review and real-device checks remain pending (DEVICE `Not run`).

### What changed

- `src/game/domain/callbacks.ts` (pure): delivery order = earliest `latestWeek`, then the authored `tieOrder`; a callback is deliverable when its window has opened (`week >= earliestWeek`), its eligibility holds and an authored variant is valid (variant `when` holds and the variant event can be presented with 2-4 options; first valid variant in authored order). `nextDueCallback` returns the first deliverable one; `overdueCallbacks` finds pending callbacks whose last week has passed.
- `src/game/domain/nextStep.ts`: the week has as many slots as its authored plan; at each slot a due callback is chosen before any ordinary event, so it takes one of the week's slots (displacing the last planned ordinary event, never adding a decision). A callback with no slot stays pending. Ordinary events and the authored fallback behave as in T10.
- `src/game/domain/resolveChoice.ts`: choosing an option of a callback-delivered event removes the callback from `pendingCallbacks` and appends it to the new `resolvedCallbacks` in the same draft as the choice, so it resolves once; a resolved or pending callback is never scheduled again.
- `src/game/domain/advanceWeek.ts`: `Next Week` is refused with `overdue-callbacks` when a pending callback's last week was the week just settled (nothing is dropped, no deadline is extended). The week-12 `pending-callbacks` refusal is unchanged.
- `src/game/domain/callbackCapacity.ts`: `checkCallbackCapacity(pack, callbackIds)` replays the runtime delivery rule over the authored plan for a given set of callbacks and reports the ones that find no slot, with the week-by-week schedule. A bounded check, not a scheduler.
- Checkpoint v1 gains `resolvedCallbacks` (`.default([])`, so a v1 save written before T15 still reads). Window and deadline stay in content; the checkpoint stores only identity and origin.
- Resume (`campaign.ts`) now also rejects: a pending callback scheduled in a later week, listed twice, or both pending and resolved; a resolution recorded by an event that is not the callback's variant or that was never resolved; and an active event that differs from what the selection rules pick from the committed state (a save that skips a due callback is blocked, not repaired).
- Loader: `required` must be `true` (an optional follow-up is just an ordinary event); `tieOrder` must be unique; a variant event must be marked `deliveredBy` its callback and vice versa; a plan may not list a callback's own event.
- Content: `proof-loop.json` now walks all 12 weeks. Week 1 is the setup plus `evt.routine.rainy_week` (this PR originally planned the fallback event here, which was wrong: a fallback is only a substitution for a gap, and being non-repeatable it was spent in week 1; corrected in the follow-up fix, which also made the validator reject a planned fallback). Weeks 2-12 carry two placeholder routine beats each (`evt.routine.rainy_week`, `merchant_packaging`, `bike_checkup`, `customer_feedback`; neutral, state-independent, repeatable, 2-3 options, small trade-offs), added so a player can reach the callbacks. They are not part of the proof chain, read and write no chain state, and are to be replaced by campaign content (T21+). The T18 walk-through places the setup in week 3; the playable route keeps it in week 1 (existing tests depend on it) with the callback windows (7-8, 10-11) unchanged.

### Decisions to review

1. A due callback displaces the last planned ordinary event instead of adding a decision, so the weekly budget stays the authority.
2. Four placeholder routine beats plus a 2-slot-per-week plan were added to the shipped content. Without them the shipped build cannot reach week 7, so neither T19 nor the T20 observation is playable. This is the smallest content that makes the route walkable; it is not campaign content and the owner may prefer another shape.
3. Unique global `tieOrder` and `required: true` are new loader constraints.
4. A callback whose deadline passes unresolved stops `Next Week` (`overdue-callbacks`) rather than being delivered late or dropped: runtime never silently extends a deadline.
5. A due callback whose eligibility or variants do not hold is skipped and stays pending in T15. Closing it in the weekly report is T16.

### Verification actually run

- `npm run verify` (Biome, `tsc --noEmit`, Vitest 18 files / 231 tests, `vite build`): pass.
- Playwright Chromium (local): 28/28, including the new `callback.spec.ts` journey: setup in week 1, ordinary weeks 2-6, the follow-up delivered in week 7 (first slot, both callbacks pending), reload restores the same pending callback event with no write, choosing resolves it in one checkpoint (pending -> resolved) and the ordinary beat follows, a further reload does not bring it back. WebKit: covered by CI only.
- Mutation spot checks on the pure rule (inverted tie order, no earliest check, no deadline ordering) each fail the new tests.

### AC-02 coverage

| Requirement | Test |
|---|---|
| nothing before its earliest week | `callbacks.test.ts` "waits for its earliest week" |
| delivered at the earliest week, before the ordinary event, taking a slot | same describe |
| no effect before the player resolves it | same describe |
| latest-boundary delivery, overflow stays pending with the original deadline | "keeps a callback pending when the week has no slot left" |
| earliest deadline first, then authored tie order, independent of scheduling order | "competing callbacks" (3 tests) |
| infeasible small schedule detected / stops instead of dropping | "stops at an overdue callback", "required-callback capacity check" (5 tests) |
| resolves once; never rescheduled | "resolving a delivered callback" |
| resume while pending; failed save then retry once; double activation once; reload does not redeliver; crisis delivered once | `callbackSession.test.ts` (real IndexedDB store via fake-indexeddb) |
| tampered/legacy saves | "a saved callback state is checked on resume", legacy v1 read |
| ambiguous content rejected | "content that would make delivery ambiguous is rejected at load" |

### Limits

- The capacity check is conservative (every callback assumed pending when its window opens, each taking one slot) and works on a given set; enumerating which sets can really be pending together over reachable histories, and applying it to the actual pack, is T17.
- Cooldowns are not implemented; no authored event uses one.
- **Not run:** WebKit locally (CI), real Android/iOS device (DEVICE).

## T16 — changed-context and fallback coverage

**Status:** merged (PR #17); GitHub Actions `verify` green on its head at merge, Chromium + WebKit; re-verified green on the follow-up fix PR #21 head `f83b583`. Owner review and real-device checks remain pending (DEVICE `Not run`).

### What changed

- Callback context: a pending callback is *invalid* when its window is open and either its eligibility fails or no authored variant can be shown (variant `when` holds and the event has 2-4 selectable options). Variants are evaluated against the latest committed state in authored order, so a resumed save selects the same variant (resume refuses a save showing a different event).
- Report closure (`settleWeekClosingCallbacks`, used by `session.settle`): an invalid callback whose authored resolution is a `reportClosure` is closed in the **same checkpoint as the week's settlement**, in the first week its window is open. It leaves `pendingCallbacks`, is recorded in `resolvedCallbacks` with the closure id, consumes no decision slot, has no choice and applies no effect (closure `effects` are schema-limited to empty). Evaluated against the state the week's decisions committed, before the cash delta. The weekly report prints the authored closure text from the committed record, so a reload shows the same report and nothing is emitted again; the settlement phase cannot run twice.
- A callback with no closure (`resolution.type: "none"`, like the shared crisis) stays pending when invalid, is never dropped, and blocks Next Week at its deadline (`overdue-callbacks`).
- Resume: a closure resolution must be the callback's own authored closure and not precede its window; a `report`/`failed` save that still lists a closable callback as pending is refused.
- Loader: a closure must be named by its callback; a fallback event must have no eligibility, 2-4 unconditional options and no `deliveredBy`; an authored `cooldownWeeks` is rejected (the runtime does not track cooldowns, so it would be silently ignored; none is authored today).
- Fallback behaviour is unchanged from T10 and now covered as AC-03 evidence: used only when the planned event cannot be presented, takes that slot (counts toward the weekly budget and the decisions), is non-repeatable (a second gap is refused explicitly as `no-next-event` / `invalid-content`, writing nothing, never an invented event), never revives a locked option.

### Verification actually run

- `npm run verify`: Vitest 19 files / 257 tests, Biome, tsc, build — pass. Playwright Chromium (local): 29/29, including the History-C journey in `callback.spec.ts` (confirmed settle-and-part in week 1, follow-up never offered, week-7 report shows the authored closure, reload shows the same report with one closure and no write). WebKit via CI. Mutation check: disabling closure detection fails 7 of the 23 new domain tests.
- `changedContext.test.ts`: normal context (engaged/aggrieved), invalidated context (rider departed at setup; rider leaves after setup in both histories), authored alternate variant, closure (no slot, no effect, no hidden choice, text only in the report), closure when eligibility fails, closure absent -> pending, resume of variants and closures, fallback chosen / locked options / 2-4 options on all three proof histories, uncovered gap surfaced, fallback/cooldown/closure content rules. `callbackSession.test.ts`: closure through the real store — failed settlement save keeps the callback pending, retry closes once, a repeat is stale, reload restores the closed report with no write, crisis still has its 3 options.

### AC-03 coverage and limits

- Covers: invalid original context -> variant or closure by the deadline; too few ordinary events -> fallback without bypassing options; locked options; resume before/after resolution; 2-4 options in every event shown on the three proof histories.
- Limits: the fallback is a single non-repeatable event, so it covers one gap per campaign; reachable gaps over the whole pack are for T17 to prove absent or covered. The closure is evaluated at settlement, not at the instant a context changes mid-week. Cooldowns remain unimplemented (rejected if authored). **Not run:** WebKit locally (CI), real device.
