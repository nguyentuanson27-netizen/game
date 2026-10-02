import type { ContentPack } from "../content/loader.ts";
import { byDeliveryOrder } from "./callbacks.ts";

export interface CapacityViolation {
  callbackId: string;
  latestWeek: number;
  /** Reproducible explanation: the week schedule that ran out of slots. */
  message: string;
}

/**
 * Can these required callbacks all be delivered by their deadlines? Replays the runtime's own
 * delivery rule over the authored plan: every callback is assumed pending from the first week of
 * its window and takes one decision slot (the conservative case), each week delivers the callbacks
 * the runtime would pick first (earliest deadline, then authored tie order) up to that week's
 * slot count, and anything still undelivered at the end of its last week is a violation. Nothing
 * is reordered or extended to make a schedule fit. This is a bounded check for a given set, not a
 * scheduler: which sets can really be pending together is the content validation's enumeration.
 */
export function checkCallbackCapacity(
  pack: ContentPack,
  callbackIds: readonly string[],
): CapacityViolation[] {
  const callbacks = callbackIds
    .map((id) => pack.callbacks.get(id))
    .filter((cb) => cb !== undefined)
    .sort(byDeliveryOrder);
  const delivered = new Set<string>();
  const violations: CapacityViolation[] = [];
  const trace: string[] = [];

  for (let week = 1; week <= pack.plan.length; week++) {
    let free = pack.plan[week - 1]?.length ?? 0;
    const delivery: string[] = [];
    for (const cb of callbacks) {
      if (free === 0) break;
      if (delivered.has(cb.id) || cb.window.earliestWeek > week) continue;
      delivered.add(cb.id);
      delivery.push(cb.id);
      free -= 1;
    }
    trace.push(
      `week ${week}: ${pack.plan[week - 1]?.length ?? 0} slot(s) -> ${delivery.join(", ") || "none"}`,
    );
    for (const cb of callbacks) {
      if (cb.window.latestWeek === week && !delivered.has(cb.id)) {
        violations.push({
          callbackId: cb.id,
          latestWeek: week,
          message: `${cb.id} is undelivered at the end of its last week ${week}; ${trace.join("; ")}`,
        });
      }
    }
  }
  return violations;
}
