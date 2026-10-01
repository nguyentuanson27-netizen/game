import type { ContentPack } from "../content/loader.ts";
import type { EventOption, GameEvent } from "../content/schema.ts";
import { allHold } from "./conditions.ts";
import type { WorldState } from "./worldState.ts";

export interface PresentedEvent {
  event: GameEvent;
  /** Selectable options only, in authored order. Never padded with unavailable ones. */
  options: EventOption[];
  /** Dialogue-only context lines whose conditions hold in the current state. */
  contextLines: string[];
}

export type PresentResult =
  | { ok: true; presented: PresentedEvent }
  | {
      ok: false;
      reason: "unknown-event" | "not-eligible" | "already-resolved" | "option-count";
      message: string;
    };

/** Evaluate an event against `state` and return what the player may choose from. */
export function presentEvent(pack: ContentPack, eventId: string, state: WorldState): PresentResult {
  const event = pack.events.get(eventId);
  if (!event) return { ok: false, reason: "unknown-event", message: `Unknown event ${eventId}` };
  if (event.repeatable === false && state.resolvedEventIds.includes(eventId)) {
    return { ok: false, reason: "already-resolved", message: `${eventId} was already resolved` };
  }
  if (!allHold(event.eligibility ?? [], state)) {
    return { ok: false, reason: "not-eligible", message: `${eventId} is not eligible` };
  }
  const options = event.options.filter((option) => allHold(option.requires, state));
  if (options.length < 2 || options.length > 4) {
    return {
      ok: false,
      reason: "option-count",
      message: `${eventId} has ${options.length} selectable options; 2-4 are required`,
    };
  }
  const contextLines = (event.contextLines?.lines ?? [])
    .filter((line) => allHold(line.when, state))
    .map((line) => line.text);
  return { ok: true, presented: { event, options, contextLines } };
}
