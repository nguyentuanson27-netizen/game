# Content Authoring Guide

## Purpose

Use this guide when writing events, NPC arcs and crisis chains. The goal is to make the world feel like it remembers the player rather than presenting disconnected quiz questions.

## Event template

Each event should define:

- **Title**
- **Stage** — startup / local platform / city player / market leader / corporate network
- **Speaker** — NPC, department, external actor
- **Category** — operational / character / strategic / crisis / opportunity
- **Situation** — concise mobile-readable context
- **Why now** — 1–3 state/relationship/precedent conditions
- **Options** — usually 3, sometimes 2 or 4
- **Immediate effects** — feedback the player can reasonably observe
- **Delayed effects** — hidden or deferred state changes
- **Memory created** — only when the world can meaningfully call it back
- **Follow-up** — optional chain continuation
- **Cooldown/repeatability**

## Option rules

A good event normally has at least two defensible options.

Avoid:

- one obviously correct answer;
- options that differ only by magnitude;
- exposing exact hidden stat math;
- forcing Clean/Grey/Dirty labels onto the UI;
- inserting a dirty option where it makes no narrative sense.

Prefer different operating strategies, for example:

- compensate;
- negotiate;
- change policy;
- shift cost;
- use PR;
- use influence;
- delay;
- escalate.

## Mobile writing rules

- Situation should usually fit in 2–4 short sentences.
- The player should understand the problem in roughly 15 seconds.
- Option action text should usually fit on one line.
- Optional hint: one short line describing likely trade-off.
- Normal event resolution should be readable in a few seconds.

## Consequence pattern

Memorable chains should often follow:

`setup -> decision -> time passes -> callback -> new context -> harder decision -> payoff`

Do not make every choice schedule a bespoke future event. Most choices should modify shared state, relationships or eligibility; explicit future hooks are reserved for meaningful decisions.

## Branching rule

Prefer branch-and-converge.

Different options may change state and dialogue, then later converge on a shared event that reads the earlier choice.

Avoid exponential trees such as every option producing four unique future branches indefinitely.

## NPC rules

Recurring NPCs should have a simple purpose and memory:

- role;
- influence;
- relationship;
- loyalty/alignment where useful;
- current status;
- important shared history.

NPCs are not passive stat bonuses. Their advice reflects their role and incentives.

Examples:

- CFO optimizes financial survival;
- Operations optimizes service reliability;
- PR optimizes perception;
- Legal optimizes liability;
- rider representative optimizes rider interests.

None needs to be a villain to create conflict.

## Precedent rules

Create a precedent only when a later actor could reasonably say, in effect, "You handled this differently before."

Useful examples:

- previous rider dispute response;
- merchant-fee promises;
- public transparency commitments;
- repeated use of a PR agency;
- treatment of a competitor;
- promises made to an executive or contact.

Do not turn every decision into a unique permanent flag.

## Crisis rules

Crises should normally emerge from accumulated state or prior decisions.

Good:

`low rider sentiment + sustained order pressure + recent incentive cut -> organized protest`

Weak:

`random roll -> scandal with no relationship to player history`

A major crisis may span several weeks and should expose disagreement between stakeholders or executives.

## Opportunity rules

Not all content should be a problem. Use opportunities for pacing and growth:

- district partnerships;
- festivals/events;
- sponsorships;
- major merchant deals;
- expansion opportunities;
- promising recurring characters.

Opportunities may later create obligations or vulnerabilities.

## Tone

Mix ordinary business, humour, human stories, tension and occasional darker material. If every week is corruption, betrayal or catastrophe, none of it will feel special.

## Dirty-play boundary

Dirty options may depict strategic-level misconduct such as smear campaigns, covert pressure, blackmail or fixer relationships inside the fictional world. Do not write procedural instructions for committing real-world wrongdoing.

## Quality checklist

Before accepting an event:

- [ ] Understandable quickly on a phone.
- [ ] At least two defensible choices when appropriate.
- [ ] No universally optimal answer.
- [ ] Consequences follow the fiction and company state.
- [ ] At least one meaningful state/relationship effect.
- [ ] Uses player history when relevant.
- [ ] Does not expose hidden arithmetic unnecessarily.
- [ ] Does not create unbounded branching.
- [ ] Fits the current campaign stage.
- [ ] Does not map allegations onto identifiable real people/companies.

## Prototype content budget

Initial vertical slice target:

- 50–70 authored event nodes;
- 8–10 event chains;
- around 8 recurring NPCs;
- 3 competitors;
- 12 in-game weeks;
- about 30–35 player decisions in the first playable slice.

Do not scale content volume until the prototype proves that callbacks and consequences are actually engaging.
