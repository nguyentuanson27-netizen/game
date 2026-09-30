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
- Normal choice is committed on tap; only major irreversible actions need confirmation.

### Simulation philosophy
- No simple Good/Evil meter.
- No single global Happiness meter.
- Stakeholders have different interests.
- Important decisions create precedents and delayed consequences.
- Relationships and company history may unlock or remove future options.
- Growth must change the type of problems, not just increase values.

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
- save-data implementation;
- event/content data format and authoring tools;
- CI/build/test commands;
- audio production scope.

When one of these becomes necessary, update this document and the main spec before implementation depends on it.
