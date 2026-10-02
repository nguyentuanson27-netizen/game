import type { ContentPack } from "../content/loader.ts";
import type { CallbackDef } from "../content/schema.ts";
import type { Checkpoint } from "../persistence/checkpoint.ts";
import { allHold } from "./conditions.ts";
import { presentEvent } from "./presentation.ts";
import type { WorldState } from "./worldState.ts";

/** What delivery reads: the world conditions are evaluated against, plus what is still pending. */
export type CallbackWorld = WorldState & Pick<Checkpoint, "pendingCallbacks">;

/**
 * Delivery order (SPEC section 21): earliest deadline first; equal deadlines use the authored
 * tie order. The id is only a last resort so the order is total even for malformed content.
 */
export function byDeliveryOrder(a: CallbackDef, b: CallbackDef): number {
  return (
    a.window.latestWeek - b.window.latestWeek ||
    a.tieOrder - b.tieOrder ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/**
 * The event a callback would deliver in `week`, or null when it cannot be delivered now: its
 * window has not opened, its eligibility does not hold, or no authored variant is valid for the
 * current state. An invalid variant is never revived; the first valid one in authored order wins.
 */
export function deliverableEvent(
  pack: ContentPack,
  callback: CallbackDef,
  week: number,
  world: WorldState,
): string | null {
  if (week < callback.window.earliestWeek) return null;
  if (!allHold(callback.eligibility, world)) return null;
  for (const variant of callback.variants) {
    if (allHold(variant.when, world) && presentEvent(pack, variant.event, world).ok) {
      return variant.event;
    }
  }
  return null;
}

/**
 * The required callback that takes the next decision slot of `week`, if any. Pending callbacks
 * whose window is open and whose context is valid beat every ordinary event; among them the
 * earliest deadline goes first. One that cannot be delivered now stays pending and does not block
 * the others.
 */
export function nextDueCallback(
  pack: ContentPack,
  week: number,
  world: CallbackWorld,
): { callbackId: string; eventId: string } | null {
  const pending = world.pendingCallbacks
    .map((p) => pack.callbacks.get(p.callbackId))
    .filter((callback): callback is CallbackDef => callback !== undefined)
    .sort(byDeliveryOrder);
  for (const callback of pending) {
    const eventId = deliverableEvent(pack, callback, week, world);
    if (eventId !== null) return { callbackId: callback.id, eventId };
  }
  return null;
}

/** Pending callbacks whose deadline is `week` or earlier: the week ending now was their last. */
export function overdueCallbacks(
  pack: ContentPack,
  week: number,
  pending: Checkpoint["pendingCallbacks"],
): string[] {
  return pending
    .filter((p) => (pack.callbacks.get(p.callbackId)?.window.latestWeek ?? Infinity) <= week)
    .map((p) => p.callbackId);
}
