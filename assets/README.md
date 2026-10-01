# Assets

Prototype art is currently **placeholder-first**. See [`docs/PROTOTYPE_ART.md`](../docs/PROTOTYPE_ART.md).

## Planned structure

```text
assets/
  vendor/
    kenney/
      SOURCES.md
      rpg-urban-pack/
      ui-pack/
      game-icons/
      scribble-platformer/
  game/
    environments/
    ui/
    icons/
    characters/
```

The vendor folders hold imported source files that are actually needed by the prototype. The `game/` side is reserved for runtime-facing exports/aliases after the engine/framework is selected.

## Rules

- Do not commit entire third-party archives by default; import the smallest useful subset after D1/D5 define the runtime needs.
- Preserve source filenames at the vendor boundary where practical.
- Keep source/license provenance in `vendor/kenney/SOURCES.md`.
- Do not bake gameplay text into image assets.
- Do not let event/content data depend directly on Kenney filenames.
- Recurring character art is not selected yet; do not make included pack characters canonical NPCs.
- Final branding and final art direction remain open.
