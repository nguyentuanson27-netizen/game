# T20 / G1 — observation protocol and technical readiness

**Status: NOT COMPLETE.** This file prepares the observation. **No participant has played, no participant statement or observation is recorded here, and G1 is not approved.** Browser automation, unit tests and the enumerations are technical proof evidence; none of them is a player observation (G0 D6).

## 1. Technical readiness (machine-verifiable, already recorded elsewhere)

| Item | Where | State |
|---|---|---|
| Required callback delivered in its window, once, with save/resume | [t15-t16-callbacks.md](t15-t16-callbacks.md) | CI green at merge; Chromium + WebKit |
| Changed context: variant or authored report closure, no dead end | same | same |
| Both histories to the shared crisis with different selectable options | [t19-playable-proof.md](t19-playable-proof.md) | same |
| Bounded content validation of the pack | [t17-content-validation.md](t17-content-validation.md) | `npm run test:content` |
| Real-device (Android/iOS) walkthrough, force-close | T14 procedure, T19 DEVICE | **Not run** |
| Owner sign-off of T07-T14 / C05 | `tasks/todo.md` | **Pending** |

Known gate: T14 (device + owner) and T17 owner review still block content expansion T21 even if G1 passes.

## 2. Build to observe

Record before the session (fill in, do not guess): git SHA of `main`, the deployed or locally served URL, browser and OS/device, date, whether the PWA was installed, whether the session was offline. Use a fresh browser profile (empty IndexedDB) for every participant. Do not mix a participant's save with a previous build.

## 3. What a session looks like

- The route is 12 weeks of 2 decisions each (24 decisions). Weeks 1 and 7 and 10 carry the proof; the other 20 decisions are **placeholder routine beats** (neutral, repeating four events). Expect the observer to see fatigue or confusion in weeks 2-6 and 8-9; record it as a finding about the scaffold, not about the hook. The owner may decide to observe a shortened session (e.g. start the participant at the week-6 report from a prepared save) — if so, say exactly how the state was prepared and that it was not played.
- Do not explain the mechanics, hidden state or the callbacks beforehand. Give only: "this is a prototype of a business decision game; play as you like and say what you are thinking."
- The observer must not hint which choice leads where. Allow free choices (the three histories A, B, C are all reachable); note which the participant reached.
- Stop for known safety/content failures (data loss, invalid choice, broken continuation): these block the session and become fix tasks; they are not waived.

## 4. What to record (G0 D6)

Interaction understanding · consequence recognition · stakeholder-tension understanding · desire for another week · direct player comments. No invented participant quota.

For each participant keep these two sections strictly apart:

**A. Direct participant statements and observed behaviour** — verbatim quotes with the moment (week/event), what they tapped, hesitations, questions, what they said when the week-7 follow-up and week-10 crisis appeared, whether they linked it to their week-1 choice *in their own words*, whether they asked to continue.

**B. Reviewer interpretation** — clearly labelled as the reviewer's reading; never mixed into A.

## 5. Checklist per participant

- [ ] Understood how to choose (tap) within the first minute (observed, not asked).
- [ ] Understood the rider / merchant / customer / company tension in their own words within ~10 minutes.
- [ ] At the week-7 callback: did they recognise it as a consequence of the week-1 choice? (quote)
- [ ] At the week-10 crisis: did they notice their options reflected earlier decisions? (quote)
- [ ] Did they avoid reducing options to +/- arithmetic? (observed)
- [ ] Did they want another in-game week? (quote)
- [ ] Any confusion, dead end, lost progress, reload surprise.
- [ ] Which history (A/B/C) was reached; crisis options shown.

## 6. Technical record per session

Build SHA, device/browser, offline or online, any reload/force-close during play and what was shown after, any error screen, the stored checkpoint sequence at the crisis (readable via the browser's IndexedDB panel).

## 7. Untested broader cases (state in the G1 record)

Full-campaign pacing and growth, weeks beyond the single chain, other chains, the PR-agency offer, multiple sessions over days, real-device force-close, accessibility, native-speaker review of the Vietnamese copy, the economy beyond extreme-play runs.

## 8. Decision

G1 is reviewed by the owner after real observation. A failed hook returns to the small chain (revise it) rather than adding volume. Until then T20 stays unchecked and T21 stays blocked.
