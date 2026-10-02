import type { ContentPack } from "../content/loader.ts";
import type { Checkpoint } from "../persistence/checkpoint.ts";
import { type CallbackWorld, nextDueCallback } from "./callbacks.ts";
import { type PresentResult, presentEvent } from "./presentation.ts";

/** What follows once `weekDecisions` of `week` are committed. */
export type NextStep =
  | { ok: true; phase: "event"; activeEvent: { eventId: string; optionIds: string[] } }
  | { ok: true; phase: "settlement" }
  | { ok: false; message: string };

/**
 * Pick the next decision slot of the week, evaluated against `world`, which callers pass as the
 * state the checkpoint is about to commit (never a stale snapshot).
 *
 * The week has as many slots as the authored plan lists (the weekly budget). A required callback
 * that is due takes the slot before any ordinary event, so it displaces the last planned
 * ordinary event rather than adding a decision; one that finds no slot stays pending. Otherwise
 * the next planned ordinary event is shown, or the authored fallback when it cannot be
 * presented. Deterministic: there is no random choice to reroll on resume.
 */
export function nextStep(
  pack: ContentPack,
  week: Checkpoint["week"],
  weekDecisions: Checkpoint["weekDecisions"],
  world: CallbackWorld,
): NextStep {
  const slots = pack.plan[week - 1] ?? [];
  if (weekDecisions.length >= slots.length) return { ok: true, phase: "settlement" };

  const due = nextDueCallback(pack, week, world);
  if (due) return toStep(presentEvent(pack, due.eventId, world));

  // Callback decisions are not ordinary events, so they do not advance the ordinary plan.
  const delivered = weekDecisions.filter((d) => pack.events.get(d.eventId)?.deliveredBy).length;
  const eventId = slots[weekDecisions.length - delivered];
  if (eventId === undefined) return { ok: true, phase: "settlement" };
  let result = presentEvent(pack, eventId, world);
  // The planned event cannot be shown in the current state (ineligible, already used, or fewer
  // than two selectable options): use the authored fallback instead. An invalid option is never
  // switched back on to reach the minimum.
  const fallbackId = pack.fallbackEventId;
  if (!result.ok && fallbackId !== null && fallbackId !== eventId) {
    result = presentEvent(pack, fallbackId, world);
  }
  return toStep(result);
}

function toStep(result: PresentResult): NextStep {
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    phase: "event",
    activeEvent: {
      eventId: result.presented.event.id,
      optionIds: result.presented.options.map((o) => o.id),
    },
  };
}
