# Product Spec v1.0

## 1. Objective

Build a mobile-first decision-driven business simulation set in a fictional city. The player starts as the founder/operator of a tiny bicycle-based delivery and short-distance ride platform, then grows it into a major urban company.

The game should feel immediately understandable because the business is familiar, while its depth comes from persistent state: stakeholder reactions, precedents, relationships, policies and delayed consequences.

Core thesis:

> Simple decisions on the surface; a company and city that remember underneath.

## 2. Product fantasy

The player should feel:

1. "I am building something from almost nothing."
2. "My choices are defining how this company behaves."
3. "Old decisions keep coming back in new contexts."
4. "As the company grows, I gain power but lose direct control."
5. "By the end, I am dealing with the machine I created."

The intended progression is:

`Street startup -> local platform -> city player -> market leader -> corporate network`

Growth must introduce new categories of decisions, not merely larger numbers.

## 3. Platform and session model

- Primary platform: mobile.
- Orientation: portrait.
- Input: tap-based cards/buttons; no swipe-left/right decision mechanic.
- Connectivity: offline-first for the core game.
- Normal session: 5–15 minutes.
- One in-game week: approximately 3–5 minutes.
- Full campaign target: approximately 5–7 hours, to be validated by prototype testing.
- Prototype target: 12 weeks, approximately 45–60 minutes and 30–35 decisions.

The main retention loop is **one more week**.

## 4. Starting business

The company launches with two bicycle-based services:

- Delivery: food, small parcels and documents.
- Short-distance rides: dense districts, campuses, tourist areas and zones where bicycles make sense.

Initial scale should feel personal: roughly tens of riders, a handful of merchants and one district.

The world is fictional. The business may use recognizable marketplace dynamics, but it must not map 1:1 to Grab, Uber, Shopee or another real company.

## 5. Core gameplay loop

Each week:

1. Short business brief.
2. 2–4 decisions/events.
3. Company simulation resolves the choices.
4. Immediate stakeholder feedback appears.
5. Hidden/delayed consequences update.
6. Weekly report summarizes what the player can reasonably know.
7. Player chooses `Next Week`.

Decisions should modify more than a score. They may change:

- visible company metrics;
- stakeholder sentiment;
- relationships;
- policies;
- precedents;
- future event eligibility;
- debts/favours;
- competitor behaviour;
- company culture.

## 6. Decision design

Most events present three choices; important events may present four, while genuinely binary situations may use two.

Target mix:

- ~70% three choices;
- ~20% four choices;
- ~10% two choices.

Choices may represent clean, pragmatic, grey or dirty approaches, but the UI must not label them as morality categories.

Examples of approaches:

- transparent compensation or negotiation;
- commercially pragmatic settlement;
- aggressive PR, lobbying or loophole use;
- covert pressure, smear tactics or fixer relationships represented only at strategic abstraction.

No option should be globally optimal. A valid event should normally contain at least two defensible choices in the current context.

## 7. Information model

Before a choice, show direction and trade-off, not exact hidden arithmetic.

Good:

> Increase peak-hour rider bonus — expensive, but likely to improve rider supply.

Avoid:

> -$12,000, +8 Rider, +4 Trust.

After the choice, show short immediate feedback. Delayed consequences may emerge weeks later.

Hidden information must still be fair: high-risk decisions require narrative warning before selection.

## 8. Visible player metrics

The main state should remain readable on mobile. Core visible metrics:

- Cash;
- Orders / rides;
- Rider Network;
- Merchant Network;
- Public Trust.

Not all five need to remain permanently pinned to the header.

## 9. Hidden simulation state

Examples:

- rider sentiment;
- merchant sentiment;
- investor confidence;
- media hostility;
- regulatory attention;
- competitor hostility;
- operational stress;
- PR dependency;
- legal/exposure risk;
- underworld/fixer exposure;
- company culture tendencies.

Players should usually infer these through people, reports and consequences rather than exact numbers.

## 10. Stakeholders

Core stakeholder groups:

- customers;
- riders/shippers;
- merchants;
- employees/executives;
- investors/board;
- media/public;
- regulators/city authorities;
- competitors;
- agencies, intermediaries and informal contacts.

A strong decision often benefits some groups while harming others.

## 11. Precedent system

The game remembers important treatment patterns and decisions.

Examples:

- whether previous rider disputes were negotiated or suppressed;
- whether merchant fees were repeatedly increased;
- whether the company used a specific PR agency;
- whether a competitor was helped, attacked or betrayed;
- whether public promises were honoured.

Later situations may refer to those precedents and change available options or reactions.

Do not store every click as a special precedent. Only remember events that the world can meaningfully call back.

## 12. Evolving decision space

The company the player builds should determine which future options are available.

A trusted company may gain access to:

- respected spokespeople;
- independent auditors;
- regulator goodwill;
- rider representatives;
- trusted journalists.

A company built around aggressive influence may gain:

- PR attack capability;
- fixers/intermediaries;
- political contacts;
- insider information;
- hostile M&A expertise.

Two players may therefore see the same crisis with different choices.

## 13. Economy

The economy should be understandable but not spreadsheet-heavy.

Revenue may come from:

- completed deliveries/rides;
- platform fees;
- merchant fees;
- subscriptions;
- later services.

Costs may include:

- rider incentives;
- operations/support;
- marketing/PR;
- insurance/safety;
- expansion;
- legal/compliance;
- departments and later corporate overhead.

Players generally choose policies rather than entering precise numeric percentages.

## 14. Districts and expansion

The fictional city is divided into districts rather than a detailed tycoon map.

Districts can differ in:

- demand;
- merchant density;
- bicycle suitability;
- income/price sensitivity;
- regulation;
- competitor presence.

Expansion opens opportunities and vulnerabilities.

## 15. Company progression

### Stage 1 — Street Startup

Focus: customers, riders, merchants, cash and survival. Founder knows individual people.

### Stage 2 — Local Platform

Focus: district expansion, policies, merchant relationships and competitors. Individual cases begin becoming company-wide rules.

### Stage 3 — City Player

Focus: PR, media, investors, regulators and departments. Small operational failures can become public crises.

### Stage 4 — Market Leader

Focus: organized rider pressure, large merchant groups, M&A, lobbying and systemic competition.

### Stage 5 — Corporate Network

Focus: internal politics, board power, multiple services, monopoly concerns and accumulated consequences.

Late game should move from `building` toward `payoff` as old debts, favours, rivals and precedents converge.

## 16. Departments and recurring executives

Later-stage departments may include:

- Operations;
- Finance;
- Marketing/PR;
- Legal;
- Rider/People Relations;
- Government Relations;
- Strategy/M&A.

Department heads are recurring characters with their own viewpoint and relationships, not passive stat bonuses.

Different executives may recommend different responses to the same crisis.

## 17. Competition

Competitors should have recognizable strategies and memory.

Possible archetypes:

- discount/subsidy competitor;
- premium service competitor;
- politically connected competitor.

Competitors may price aggressively, poach people, seek exclusive merchants, retaliate, cooperate, merge or collapse depending on history.

## 18. PR and crisis system

Crises should primarily emerge from company state and past choices rather than arbitrary punishment.

Typical escalation:

`complaint -> social controversy -> press -> stakeholder reaction -> regulator/investor response`

A major crisis may span multiple weeks.

PR is narrative and strategic, not `pay money -> reputation +5`.

Campaigns and responses can succeed, fail or create hypocrisy risk when public messaging contradicts actual company behaviour.

## 19. Clean / grey / dirty play

The game does not use a Good/Evil meter.

Clean play tends toward trust, stability and higher immediate cost.

Grey play uses aggressive negotiation, exclusivity, lobbying, loopholes or narrative control and can create dependencies or scrutiny.

Dirty play may include abstracted smear campaigns, blackmail, covert pressure, sabotage or fixer relationships. It can provide strong short-term leverage but increases retaliation, dependency, investigation and exposure risk.

Dirty play must be represented at a strategic level and must not become a procedural real-world guide to wrongdoing.

## 20. Favour/debt relationships

Some relationships create obligations rather than simple cash costs.

A contact may solve a problem now and later request a favour. Refusing may damage the relationship or create retaliation risk.

The design principle is:

> A shortcut that solves today's problem may become tomorrow's stakeholder.

## 21. Content architecture

Five content concepts are sufficient for the prototype:

- Event;
- Event Chain;
- NPC;
- World State;
- Memory/Precedent.

Event triggers should normally use 1–3 meaningful conditions.

Branches should usually reconverge while preserving memory of how earlier events were handled. Avoid exponential narrative trees.

Main content types:

- operational;
- character;
- strategic;
- crisis;
- opportunity.

Prototype content target: roughly 50–70 authored event nodes, 8–10 chains, about eight recurring NPCs and three competitors. The prototype is for validating the loop, not proving full-campaign content volume.

## 22. Content signature

Memorable stories should often follow:

`setup -> decision -> time passes -> callback -> changed context -> harder decision -> payoff`

Example:

`help a rider -> rider becomes famous -> rider gains influence -> rider later challenges company policy`

Avoid reducing such stories to one-time stat rewards.

## 23. First 12-week vertical slice

Target: approximately 45–60 minutes and 30–35 decisions.

Narrative spine:

- Weeks 1–3: onboarding, riders, merchants, first recurring rider.
- Weeks 4–6: customer pressure, district expansion, first competitor.
- Weeks 7–9: cash pressure, rider incentives, safety incident, recurring-rider callback.
- Weeks 10–12: merchant precedent, public rider dispute and first mini-crisis.

The slice should culminate in an offer from a PR agency, naturally opening the later clean/grey/dirty media layer.

At least one chain must clearly demonstrate:

`earlier policy -> stakeholder reaction -> public problem`

## 24. Mobile UX

Home screen: city/HQ visual progression plus current company snapshot.

Primary navigation should remain small; initial target:

- Home;
- Company;
- Network.

Events are full-screen cards with portrait/scene, concise situation text and large vertically stacked options in the thumb-accessible lower portion of the screen.

Normal decisions do not require confirmation. Irreversible/high-impact actions may.

Weekly reports are short and end with a prominent `Next Week` action.

## 25. Visual progression

The company and city must visibly react to scale and major events.

Examples:

- more riders in the streets;
- merchants displaying the brand;
- larger offices/HQ;
- competitor advertising;
- PR campaigns/billboards;
- protests/media presence;
- bicycle infrastructure and hubs.

This is feedback, not a full city-builder system.

## 26. Campaign and replayability

The campaign should have an ending rather than being designed primarily as endless play.

Replay value comes from different company histories, relationships, available choices and endings — not merely randomized event order.

Potential end states may describe combinations such as:

- trusted urban utility;
- dominant market leader;
- corporate empire;
- shadow influence network;
- founder removed by board;
- collapse under accumulated liabilities.

Do not label endings Good/Bad.

## 27. Retention principles

The game should repeatedly create three questions:

1. What will the decision I just made cause later?
2. What is my company becoming?
3. Do I still control the organization I created?

Do not rely on daily-login rewards, energy timers, battle passes or artificial waiting for the core retention loop.

## 28. Fictionalization and legal-distance requirement

- Fictional city, companies, characters and scandals.
- Do not copy real logos, naming patterns, UI, slogans or distinctive trade dress.
- Do not create thinly disguised real executives or allegations against identifiable real companies.
- Real-world companies may inform generic market mechanics only.
- Any real-event inspiration must be transformed rather than recreated 1:1.

See `PRODUCT_GUARDRAILS.md`.

## 29. Prototype success criteria

The vertical slice succeeds when representative new players can:

- understand the basic decision interaction in under one minute;
- understand customer/rider/merchant/platform tension within the first ten minutes;
- play without needing hidden metric values;
- identify at least one later problem as a consequence of their own earlier decision;
- perceive visible company/city growth;
- regularly face at least two defensible choices;
- express curiosity to play another in-game week.

The design is failing if players primarily reduce options to obvious `+5/-5` arithmetic.

## 30. Explicit non-goals for prototype

Do not build yet:

- detailed realtime city simulation;
- multiplayer;
- runtime LLM-generated story content;
- stock-market simulation;
- deep political simulation;
- procedural crime mechanics;
- hundreds of employees as individually simulated agents;
- large multi-country map;
- live-service retention systems.

## 31. Technical status / open questions

No engine/framework has been chosen yet. Therefore the repository currently has no authoritative build, test, lint or development commands.

Before implementation planning, decide and document:

- engine/framework and exact supported versions;
- target mobile OS/store strategy;
- save-data model;
- content data format/tooling;
- test strategy;
- visual/audio production constraints;
- localization requirements;
- analytics/privacy requirements, if any.

Do not invent these implementation choices from this product spec.
