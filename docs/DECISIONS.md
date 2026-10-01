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
- Prototype persistence uses IndexedDB through `idb`, whole coherent checkpoints, `current` + `previous` recovery slots, schema versioning and a parent-sequence stale-write guard. Unsupported future-schema saves are preserved rather than silently overwritten.
- Player-visible behavior remains locked in [SPEC section 3](SPEC.md#session-continuity); implementation details are summarized in [SPEC section 31](SPEC.md#31-approved-prototype-technical-baseline) and [G0 Decision Package](G0_DECISION_PACKAGE.md).

### Retention and campaign
- Main hook: one more in-game week to see consequences.
- Sessions target roughly 5–15 minutes.
- Campaign target roughly 5–7 hours, subject to playtest validation.
- Campaign should end and summarize what kind of company/player history emerged.
- Replayability comes from different histories, relationships and available decisions, not primarily random event order.

### Prototype
- 12 in-game weeks.
- Roughly 45–60 minutes.
- Roughly 30–35 decisions; the approved initial deterministic budget is 34 decisions across the 12-week slice.
- 50–70 authored event nodes as the initial content budget.
- Must demonstrate at least one clear earlier-decision -> later-consequence chain.
- Two documented histories must reach the same crisis by week 12 with at least one history-dependent difference in selectable options and 2–4 valid options in each history; dialogue-only differences are insufficient.
- Required prototype verification scenarios are [SPEC AC-01 through AC-07](SPEC.md#required-behavior-checks); they are acceptance requirements, not evidence of an existing implementation.

### Content
- Hand-authored core events for MVP.
- No runtime LLM-generated story content in MVP.
- Branch-and-converge instead of exponential story trees.
- Recurring NPCs and organizations remember relevant history.
- Prototype authored content is UTF-8 JSON under `content/prototype/`, validated at the runtime boundary with Zod and stable semantic IDs.
- Conditions/effects use a small allowlisted data vocabulary; no arbitrary JavaScript or generic narrative DSL.

### Prototype demo art sourcing
- For the fast prototype/demo, use these Kenney CC0 packs as **replaceable placeholders**: RPG Urban Pack, UI Pack, Game Icons and Scribble Platformer.
- This selection does not lock the final art style or final branding.
- RPG Urban Pack supplies urban/environment placeholders; its included characters are not canonical recurring NPCs.
- UI Pack supplies temporary panels/buttons; Game Icons supplies generic navigation/metric/status icons; Scribble Platformer supplies temporary hand-drawn accents/scene dressing.
- Recurring NPC/character art is deliberately deferred to a later art pass; neutral silhouette/avatar placeholders are allowed through T24.
- Keep gameplay/content contracts independent from vendor filenames so the placeholder art can be replaced later without rewriting story/state logic.
- Keep runtime text outside image assets and package used art locally to preserve the offline-first requirement.
- Source/provenance and current prototype-art rules are documented in [PROTOTYPE_ART](PROTOTYPE_ART.md) and [`assets/vendor/kenney/SOURCES.md`](../assets/vendor/kenney/SOURCES.md).
- A1 remains the separate approved asset-package dependency for T25 visual-growth work.

### Prototype technical baseline — G0 approved 2026-10-01
- Prototype runtime/delivery: static installable PWA using Node.js `24.21.0` LTS + npm `11.19.0`, React/React DOM `19.3.0`, Vite `8.3.1` and TypeScript `7.0.2`.
- Shared demo delivery: GitHub Pages; support repository sub-path hosting. First acquisition needs network, then the core game and used local assets/content must work offline after service-worker readiness.
- Final native wrapper, iOS/Android store strategy and commercial delivery remain open; PWA is a prototype choice.
- Prototype save/privacy: IndexedDB + `idb`, schema-versioned whole checkpoints, explicit corrupt-save recovery, no account/cloud save/analytics/ads/uploads/server gameplay logs.
- Prototype simulation: deterministic two-service settlement, 34-decision weekly budget, explicit early-failure rule and week-12 `Prototype Complete` endpoint. Numeric values are tuning constants, not final balance.
- Prototype presentation: Vietnamese-only player copy, Kenney placeholders and neutral character placeholders; no final branding or audio production.
- Prototype verification: TypeScript, Biome, Vitest, Playwright Chromium/WebKit, Vite production build and GitHub Actions. Local `verify` remains lightweight; browser E2E is a separate command while CI runs both.
- Bounded content validation enumerates the small proof pack rather than building a generic solver; G1 records direct player observations separately from reviewer interpretation.
- Canonical rationale, save/recovery details, D4 paper checks and first-slice bindings live in [G0 Decision Package](G0_DECISION_PACKAGE.md).

### Fictionalization
- Real-world systems, fictional world.
- No thinly disguised Grab/Uber/other real company.
- No copied logos, naming, UI, executives or identifiable scandals.
- Dirty/criminal play is represented at strategic narrative level, not as procedural real-world instruction.

## Not yet decided

The approved G0 baseline is sufficient for the prototype implementation. These later/final-product choices remain open and must not be invented implicitly:

- final native wrapper and iOS/Android store/release strategy;
- final art direction;
- final name/company/city names;
- monetization/pricing;
- localization beyond the Vietnamese-only prototype;
- post-prototype analytics, account/cloud-save and privacy strategy;
- save migration/compatibility strategy beyond the prototype `schemaVersion: 1` boundary;
- final audio production scope.

When one of these becomes necessary, update this document and the main spec before implementation depends on it.
