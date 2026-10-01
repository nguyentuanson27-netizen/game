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

Boundaries: first active-event save (1 put), choice, last choice into `settlement`, settlement, Next Week, week-12 `Prototype Complete` (2 puts each: rotate to `previous`, write `current`).

### What is asserted

For every boundary x fault (22 cases): the fault fired; the result is a failure; `current` and `previous` are byte-identical to before; reopening without a retry resumes the previous complete state and writes nothing; a retry ends with slots deep-equal to a fault-free run (so effects, callbacks and sequence numbers are applied exactly once); the reported error contains no browser message or payload (only the error name).
Lost acknowledgement (5 boundaries): replaying from the held checkpoint is rejected as `stale`; reload shows the single committed result, equal to a fault-free run.
Screens: after a failed choice / settlement / Next Week there is no success feedback, no next event, no report, no Next Week and no second settlement, and the stored slots are unchanged; two failures in a row still change nothing and the third attempt lands once; after a lost acknowledgement the retry shows "reload" and the reload shows the committed state with cash 53 (not doubled) and week 2 once; a corrupt current mid-game opens the recovery prompt (nothing written until confirmed, recovered checkpoint saves from its own sequence); a newer-version save mid-game blocks play and is left untouched; a failed recovery keeps both slots and retry recovers; no screen text contains the injected message or any saved id.

### Defects found and fixed by T13

- Storage errors carried the browser's message; they now carry only the error name (and invalid-candidate issues list field paths and codes, not values).
- A mid-game `recovery-required` / `unsupported-save` rejection showed a generic "save failed, tap again" loop; it now re-reads the stored save and shows the recovery prompt or the blocking newer-version screen.

### Limits

Injection happens through the `IDBObjectStore.put`/`delete` boundary of a simulated IndexedDB; a real browser's abort/quota behaviour is covered separately in T14 (Playwright, Chromium + WebKit) and a physical device not at all (`Not run`). The first-save boundary has no earlier state to resume. No AC is claimed as passing overall.
