import type { ContentPack } from "../content/loader.ts";
import type { Checkpoint } from "../persistence/checkpoint.ts";
import { presentEvent } from "./presentation.ts";
import type { WorldState } from "./worldState.ts";

/** What follows once `resolvedCount` decisions of `week` are committed. */
export type NextStep =
  | { ok: true; phase: "event"; activeEvent: { eventId: string; optionIds: string[] } }
  | { ok: true; phase: "settlement" }
  | { ok: false; message: string };

/**
 * Pick the next decision slot of the week from the authored plan, evaluated against `world`,
 * which callers pass as the state the checkpoint is about to commit (never a stale snapshot).
 * Deterministic: there is no random choice to reroll on resume.
 */
export function nextStep(
  pack: ContentPack,
  week: Checkpoint["week"],
  resolvedCount: number,
  world: WorldState,
): NextStep {
  const slots = pack.plan[week - 1] ?? [];
  const eventId = slots[resolvedCount];
  if (eventId === undefined) return { ok: true, phase: "settlement" };
  const result = presentEvent(pack, eventId, world);
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    phase: "event",
    activeEvent: { eventId, optionIds: result.presented.options.map((o) => o.id) },
  };
}
