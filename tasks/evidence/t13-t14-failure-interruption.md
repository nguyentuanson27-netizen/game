# T13 / T14 evidence - save failure and interruption

## T13 - save-failure matrix (AC-05)

Scope: the five write boundaries added in T08-T12 plus D3 recovery and reset. Run with Vitest on the real `idb` store over `fake-indexeddb` (`npm run test`), and on screen with React Testing Library. Nothing here is device evidence.

### What is injected

| Fault | How | What it models |
|---|---|---|
| `throw` on put 1 / put 2 | `IDBObjectStore.prototype.put` throws `QuotaExceededError` carrying a secret marker | the browser refuses a write |
| `abort` on put 1 / put 2 | the request is issued, then the transaction is aborted | the browser gives up mid-transaction |
| lost acknowledgement | the inner commit succeeds, the caller is told `write-failed` | a write that committed but whose result never reached the app |
| failed recovery / reset | `put` / `delete` fails inside the recovery or reset transaction | D3 explicit recovery paths |
| corrupt / newer-version current appearing mid-game | raw overwrite of `current` between two taps | another tab or a downgrade |

Boundaries: first active-event save (1 put), choice, last choice into `settlement`, settlement, Next Week (into a test-only week 2 that authors two decisions, because the shipped proof loop authors none after week 1), week-12 `Prototype Complete` from a seeded week-12 report (2 puts each: rotate to `previous`, write `current`). The matrix runs on a small test-only pack (`weekTwelvePack`: the proof pack plus a repeatable test beat in weeks 2 and 12) through the real loader, and the week-12 seed carries a resolved decision for every planned slot (`resolvedSettlementAt`), so every golden path is valid for the content that test uses. It asserts transaction semantics only; it does not define what the shipped campaign must do in weeks 2-12.

### What is asserted

For every boundary x fault (22 cases): the fault fired; the result is a failure; `current` and `previous` are byte-identical to before; reopening without a retry resumes the previous complete state and writes nothing; a retry ends with slots deep-equal to a fault-free run (so effects, callbacks and sequence numbers are applied exactly once); the reported error contains no browser message or payload (only the error name).
Lost acknowledgement (5 boundaries): replaying from the held checkpoint is rejected as `stale`; reload shows the single committed result, equal to a fault-free run.
Screens: after a failed choice / settlement / Next Week there is no success feedback, no next event, no report, no Next Week and no second settlement, and the stored slots are unchanged; two failures in a row still change nothing and the third attempt lands once; after a lost acknowledgement the retry shows "reload" and the reload shows the committed state with cash 53 (not doubled) and week 2 once; a corrupt current mid-game opens the recovery prompt (nothing written until confirmed, recovered checkpoint saves from its own sequence); a newer-version save mid-game blocks play and is left untouched; a failed recovery keeps both slots and retry recovers; no screen text contains the injected message or any saved id.

### Defects found and fixed by T13

- Storage errors carried the browser's message; they now carry only the error name (and invalid-candidate issues list field paths and codes, not values).
- A mid-game `recovery-required` / `unsupported-save` rejection showed a generic "save failed, tap again" loop; it now re-reads the stored save and shows the recovery prompt or the blocking newer-version screen.

### Limits

Injection happens through the `IDBObjectStore.put`/`delete` boundary of a simulated IndexedDB; a real browser's abort/quota behaviour is covered separately in T14 (Playwright, Chromium + WebKit) and a physical device not at all (`Not run`). The first-save boundary has no earlier state to resume. No AC is claimed as passing overall.

## T14 - interruption matrix on the real persistence boundary (AC-04, AC-05, AC-07)

Target: Chromium and WebKit through Playwright (CI) and Chromium locally (the pre-installed browser). The store is the real `idb` code on the browser's real IndexedDB; nothing is substituted. Physical devices were **not** used.

### Exact injection boundaries

Installed by `tests/e2e/helpers/interruption.ts` before the app loads, per page, and inert unless armed:

| Interruption | Mechanism | State when the page is closed |
|---|---|---|
| `abort-before-commit` | the `put` of the `current` checkpoint aborts its own transaction after the writes were issued | the browser rolls the whole transaction back: only the complete OLD checkpoint exists |
| `hold-after-commit` | the transaction's `complete` event is withheld from the app's listener | the browser has committed (the NEW checkpoint is durable and readable from IndexedDB) but the app was never told: no feedback, no next screen |

Boundaries x both interruptions (10 scenarios per browser): first active-event save (interrupted while the app boots), ordinary choice, confirmed irreversible choice (AC-07), settlement, Next Week (exercised at its only reachable production boundary: a seeded week-12 report -> `Prototype Complete`, a persistence state only, because Next Week into week 2 is refused for the shipped content and no browser fixture injects other content). After the interruption the page is closed without `beforeunload`, a new page opens in the same browser context, and the test asserts: abort -> exactly the old state, same slots, no alert, and the action then lands exactly once (`sequence + 1`, `previous` = the old checkpoint); hold -> the new state with no feedback replayed and slots identical to what was committed while the old page was still open. Each injector is proved to fire (abort -> the app shows its error; hold -> `heldCount > 0`).

### Full browser restart, offline (`tests/e2e/restart.spec.ts`)

One journey with a persistent browser profile: the whole browser process is closed, the static server is stopped for good after the first restart, and the browser is relaunched on the same profile with its clock set one more month ahead each time. 7 restarts, at: unanswered event (same option texts), AC-07 confirmation left open (restart = cancel, nothing committed), confirmed irreversible result (no feedback replayed), all decisions committed awaiting settlement, settled week-1 report (cash 46, settled once), a seeded week-12 report (persistence state only, with no callbacks pending since closing the prototype needs them resolved), and `Prototype Complete`. At every restart the stored slots are deep-equal to those before it, and the browser clock is asserted to have jumped, so "time away" is a real absence.

Time away (AC-04): shown by behaviour, not by a source scan. Each start jumps the browser clock a month ahead, and at every restart the stored slots are deep-equal to those before it, so no week advanced and no event was rerolled. (An earlier static text scan for `Date`/timers/`Math.random` in `src/game` was removed: it blocked harmless UI timers and matched comments.)

The restart journey claims no gameplay beyond week 1: weeks 2-12 are not authored in the shipped content, so there is no played route to them. The week-12 and `Prototype Complete` steps are seeded persistence states. **Not covered in the browser:** restart after Next Week into an authored week and a full-slice restart; both are pending valid integrated content (T15 and later). Next Week's write boundary is covered on valid test content by the T13 matrix; a seeded week-12 -> `Prototype Complete` write is covered by `tests/e2e/interruption.spec.ts`.

### DEVICE procedure (not run)

To be run on a current Android browser and current iOS Safari when available; record device, OS and browser versions:
1. Open the deployed PWA over HTTPS, wait for the offline-ready notice, then enable airplane mode.
2. Force-close the app (app switcher), reopen: the same unanswered event and options must appear.
3. Repeat the force-close/reopen at: after a choice, with the confirmation dialog open (must reopen unresolved), after confirming, at the settlement screen, on the report, after Next Week.
4. Tap a choice and force-close within a moment of the tap: reopening must show a complete old or complete new state, never a mixture, and no feedback for an unacknowledged one.
5. Set the device date forward several days and reopen: the week must be unchanged.

### Limits

- Interruptions are page-level (abort, withheld completion, page close, browser restart), not a power cut or OS kill; the hold interruption relies on the browser committing before it dispatches `complete`, which is the IndexedDB contract.
- The first-save boundary has no earlier state, so its "old" state is "start over with the same first event".
- WebKit's persistent-context and service-worker behaviour is exercised on CI only (Playwright WebKit is not run locally); CI `verify` is green on Chromium + WebKit at merge (PR #12: Vitest 169, Playwright 32/32; PR #13: Vitest 177, Playwright 54/54).
- Everything marked DEVICE above is `Not run`. No AC is claimed as passing overall; C05 additionally needs the device run and owner sign-off.
