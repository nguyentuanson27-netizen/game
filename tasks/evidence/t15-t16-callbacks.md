# T15 / T16 evidence — required callbacks

Environment: Node 24.21.0, npm 11.19.0 (the pinned G0 versions, installed outside the repo), Linux. Browser: Playwright 1.63 driving the sandbox's pre-installed Chromium through an uncommitted local config; WebKit and real devices are not available locally.

## T15 — deliver required callbacks

**Status:** implemented on branch; CI and owner review pending (see `tasks/todo.md`).

### What changed

- `src/game/domain/callbacks.ts` (pure): delivery order = earliest `latestWeek`, then the authored `tieOrder`; a callback is deliverable when its window has opened (`week >= earliestWeek`), its eligibility holds and an authored variant is valid (variant `when` holds and the variant event can be presented with 2-4 options; first valid variant in authored order). `nextDueCallback` returns the first deliverable one; `overdueCallbacks` finds pending callbacks whose last week has passed.
- `src/game/domain/nextStep.ts`: the week has as many slots as its authored plan; at each slot a due callback is chosen before any ordinary event, so it takes one of the week's slots (displacing the last planned ordinary event, never adding a decision). A callback with no slot stays pending. Ordinary events and the authored fallback behave as in T10.
- `src/game/domain/resolveChoice.ts`: choosing an option of a callback-delivered event removes the callback from `pendingCallbacks` and appends it to the new `resolvedCallbacks` in the same draft as the choice, so it resolves once; a resolved or pending callback is never scheduled again.
- `src/game/domain/advanceWeek.ts`: `Next Week` is refused with `overdue-callbacks` when a pending callback's last week was the week just settled (nothing is dropped, no deadline is extended). The week-12 `pending-callbacks` refusal is unchanged.
- `src/game/domain/callbackCapacity.ts`: `checkCallbackCapacity(pack, callbackIds)` replays the runtime delivery rule over the authored plan for a given set of callbacks and reports the ones that find no slot, with the week-by-week schedule. A bounded check, not a scheduler.
- Checkpoint v1 gains `resolvedCallbacks` (`.default([])`, so a v1 save written before T15 still reads). Window and deadline stay in content; the checkpoint stores only identity and origin.
- Resume (`campaign.ts`) now also rejects: a pending callback scheduled in a later week, listed twice, or both pending and resolved; a resolution recorded by an event that is not the callback's variant or that was never resolved; and an active event that differs from what the selection rules pick from the committed state (a save that skips a due callback is blocked, not repaired).
- Loader: `required` must be `true` (an optional follow-up is just an ordinary event); `tieOrder` must be unique; a variant event must be marked `deliveredBy` its callback and vice versa; a plan may not list a callback's own event.
- Content: `proof-loop.json` now walks all 12 weeks. Week 1 is unchanged (setup + fallback). Weeks 2-12 carry two placeholder routine beats each (`evt.routine.rainy_week`, `merchant_packaging`, `bike_checkup`, `customer_feedback`; neutral, state-independent, repeatable, 2-3 options, small trade-offs), added so a player can reach the callbacks. They are not part of the proof chain, read and write no chain state, and are to be replaced by campaign content (T21+). The T18 walk-through places the setup in week 3; the playable route keeps it in week 1 (existing tests depend on it) with the callback windows (7-8, 10-11) unchanged.

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
