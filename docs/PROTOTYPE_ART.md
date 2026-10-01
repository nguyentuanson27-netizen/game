# Prototype Art Package

## Status

**Demo-only placeholder art direction. Not the final visual identity.**

The prototype should become playable quickly using existing CC0 assets. The final art direction remains open and can replace these assets later without changing gameplay/content contracts.

This document records the owner-selected placeholder sources and how they may be used. It does **not** clear G0 or mark A1 complete by itself; A1 still requires the approved D5 contract and the actual asset subset used by the prototype.

## Selected placeholder packs

| Pack | Prototype role | Boundary |
|---|---|---|
| Kenney — RPG Urban Pack | City/district/environment placeholders: roads, buildings, vehicles and urban props. | Do not treat the included characters as canonical recurring NPCs. |
| Kenney — UI Pack | Buttons, panels and basic interface chrome. | Use visual UI assets only for now; bundled fonts/audio are out of scope until separately reviewed. |
| Kenney — Game Icons | Generic metric/status/navigation icons where the meaning is clear. | Do not use icons to expose hidden stats or create a Good/Evil-style morality indicator. |
| Kenney — Scribble Platformer | Hand-drawn accents, rough decorative elements and temporary scene dressing. | Use sparingly; visual consistency work is intentionally deferred for the fast demo. |

The official pack name is **RPG Urban Pack** (not “RPG Urban Kit”).

## Characters

Recurring NPC portraits/character art are intentionally deferred to a later art pass.

- No Kenney character becomes the canonical identity of Minh, executives, merchants, competitors or other recurring NPCs.
- The first runnable demo may use neutral avatar/silhouette placeholders if needed.
- Character art can be replaced independently of event/state/content logic.

## Demo-first rules

1. **Placeholder, not style lock.** These packs are selected to make the demo fast, not to define the shipped art style.
2. **Keep art swappable.** Gameplay/content data must refer to semantic asset roles/IDs rather than vendor filenames once the runtime asset mapping exists.
3. **Keep text out of images.** Event copy, labels, metrics and buttons remain runtime text so localization and style changes do not require repainting art.
4. **Do not harmonize prematurely.** RPG Urban Pack, UI Pack and Scribble Platformer do not need to look perfectly unified for the first proof.
5. **No remote runtime dependency.** The offline-first game must eventually ship the asset files it uses locally; source URLs are provenance, not runtime dependencies.
6. **Import only what is used.** After D1/D5 are approved, copy the smallest useful subset into the repository rather than automatically committing every file in every pack.
7. **Preserve provenance.** Any imported third-party file must remain traceable to its source pack and license record in `assets/vendor/kenney/SOURCES.md`.
8. **No final brand dependency.** Company/competitor logos, city identity and final branding remain separate work.

## Source of truth and workflow

- Official Kenney asset pages are the source of truth for pack identity and licensing.
- `assets/vendor/kenney/SOURCES.md` records the selected packs and verification date.
- Raw/vendor filenames should be preserved at the vendor boundary when assets are imported.
- Runtime-friendly exports/aliases are decided only after the engine/framework and UI constraints are known.
- If art style changes later, replace runtime-facing asset mappings/files while keeping gameplay IDs and authored event logic stable.

## What this PR intentionally does not do

- choose the final art style;
- create recurring NPC portraits;
- select final branding;
- choose an engine-specific texture/import format;
- import binary asset archives before D1/D5 establish the actual runtime needs;
- mark A1 complete or unblock T25.

## A1 completion later

After G0/D5 approval, the A1 follow-up is complete when the prototype has:

- an approved subset from these sources (or an explicitly approved replacement);
- local files for the assets actually consumed by the demo;
- provenance/license records kept with the imported assets;
- a small set of representative screens/assets reviewed on the chosen portrait target;
- character placeholders or character assets sufficient for the first runnable slice;
- no dependency on vendor filenames from gameplay/content logic.
