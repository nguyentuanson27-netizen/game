# Product Decisions

This file records product decisions already agreed during discovery so later work does not silently reopen them.

## Locked decisions

### Product form
- Mobile-first.
- Portrait orientation.
- Single-player.
- Offline-first core loop.
- Decision-driven simulation, not realtime tycoon management.

### Starting business
- Fictional urban platform.
- Bicycle-based delivery/shipping.
- Bicycle-based short-distance passenger rides.
- Starts small and local, then expands in scale and influence.

### Decision UX
- Most events use 3 choices.
- Important events may use 4; truly binary events may use 2.
- Choices may express clean, pragmatic, grey or dirty strategies, but those labels are not shown to the player.
- No swipe-left/right core mechanic.
- Normal choices commit on tap. Only major irreversible actions require confirmation; their effects apply only after confirmation. Cancelling leaves the event unresolved and changes no gameplay state.

### Simulation philosophy
- No simple Good/Evil meter.
- No single global Happiness meter.
- Stakeholders have different interests.
- Important decisions create precedents and delayed consequences.
- Relationships and company history may unlock or remove future options.
- Growth must change the type of problems, not just increase values.

### Resolution and callback delivery
- Resolve each choice and save its immediate effects, relationships/policies/precedents and scheduled consequences before acknowledging completion or evaluating the next event.
- Settle recurring economy and due week-end effects once; `Next Week` advances without settling the same week again.
- Required callbacks have authored delivery windows, take priority over ordinary events by earliest deadline with authored tie ordering, and remain pending when slots are full. Changed context requires a valid variant or explicit report closure; slot shortage alone cannot cancel delivery.
- Validate required-callback capacity and state-appropriate fallback coverage within the weekly budget. Every presented decision retains 2–4 selectable, valid options.
- Canonical delivery and ordering rules: [SPEC section 5](SPEC.md#5-core-gameplay-loop) and [section 21](SPEC.md#callback-delivery-and-event-coverage).

### Session continuity
- Local offline resume is required for the prototype. Preserve completed choices, company/history state, current week/phase and pending/resolved consequences together; no rerolls, lost acknowledged choices or duplicated effects.
- Interrupted saves recover a complete previous/new checkpoint. Failed saves block progression without claiming success or resetting the campaign; time away does not advance weeks.
- Player-visible behavior is locked in [SPEC section 3](SPEC.md#session-continuity); save format, storage and versioning are not selected.

### Retention and campaign
- Main hook: one more in-game week to see consequences.
- Sessions target roughly 5–15 minutes.
- Campaign target roughly 5–7 hours, subject to playtest validation.
- Campaign should end and summarize what kind of company/player history emerged.
- Replayability comes from different histories, relationships and available decisions, not primarily random event order.

### Prototype
- 12 in-game weeks.
- Roughly 45–60 minutes.
- Roughly 30–35 decisions.
- 50–70 authored event nodes as the initial content budget.
- Must demonstrate at least one clear earlier-decision -> later-consequence chain.
- Two documented histories must reach the same crisis by week 12 with at least one history-dependent difference in selectable options and 2–4 valid options in each history; dialogue-only differences are insufficient.
- Required prototype verification scenarios are [SPEC AC-01 through AC-07](SPEC.md#required-behavior-checks); they are acceptance requirements, not evidence of an existing implementation.

### Content
- Hand-authored core events for MVP.
- No runtime LLM-generated story content in MVP.
- Branch-and-converge instead of exponential story trees.
- Recurring NPCs and organizations remember relevant history.

### Fictionalization
- Real-world systems, fictional world.
- No thinly disguised Grab/Uber/other real company.
- No copied logos, naming, UI, executives or identifiable scandals.
- Dirty/criminal play is represented at strategic narrative level, not as procedural real-world instruction.

## Not yet decided

Do not invent these choices without an explicit decision:

- game engine/framework;
- iOS/Android release order;
- store/distribution strategy;
- final art direction;
- final name/company/city names;
- monetization/pricing;
- localization scope;
- analytics stack;
- save-data implementation (format, storage and versioning; player-visible continuity is already locked);
- event/content data format and authoring tools;
- CI/build/test commands;
- audio production scope.

When one of these becomes necessary, update this document and the main spec before implementation depends on it.
