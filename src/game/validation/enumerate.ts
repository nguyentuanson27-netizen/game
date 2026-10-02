import type { ContentPack } from "../content/loader.ts";
import { advanceWeek } from "../domain/advanceWeek.ts";
import { startCampaign } from "../domain/campaign.ts";
import { resolveChoice } from "../domain/resolveChoice.ts";
import { settleWeekClosingCallbacks } from "../domain/settlement.ts";
import type { Checkpoint, CheckpointDraft } from "../persistence/checkpoint.ts";

// Content validation helper (T17), not part of the playable app: nothing in src/game/ui imports it.

/**
 * Bounded enumeration of every structural state reachable by any sequence of choices from the
 * start of the shipped route, using the real transitions (choice, settlement with closures, Next
 * Week) and the real selection rules.
 *
 * States are deduplicated on everything the selection rules read (week, phase, the events decided,
 * policies, memories, relationships, resolved events/callbacks, pending callbacks, recurring
 * costs) but not on the four visible metrics: with no authored condition reading a metric
 * (`assertNoMetricConditions`) the structure cannot depend on them, so each structural state is
 * explored once, through the first path that reaches it. The economy is therefore *not*
 * enumerated: a settlement that would end the company (D4 failure) is continued as a survivable
 * report and only counted in `wouldFail`, so the structure of every history is still explored.
 * Early-failure reachability is checked separately with extreme-policy playthroughs. This proves
 * properties of this pack only, not of any general content.
 */
export interface Reached {
  /** A path of option ids that reaches this state (for reproducing a failure). */
  path: string[];
  checkpoint: Checkpoint;
}

export interface Enumeration {
  /** Structural states, each reached once. */
  states: Map<string, Reached>;
  /** Settlements that the D4 rule would have ended as `failed` (continued as a report here). */
  wouldFail: number;
  /** Every presented event with the distinct option sets it offered (comma-joined ids). */
  presented: Map<string, Set<string>>;
  /** The weeks each event was presented in, over every reachable state. */
  presentedWeeks: Map<string, Set<number>>;
  /**
   * Slots where the planned ordinary event could not be shown and the authored fallback was shown
   * instead, with a path that reproduces it. Not an error by itself: it is the fallback doing its
   * job, listed so a gap is never hidden.
   */
  substitutions: Array<{ week: number; planned: string; path: string[] }>;
  /** Refused transitions: the content dead ends (empty means none reachable). */
  refusals: Array<{ path: string[]; reason: string }>;
  complete: Reached[];
  transitions: number;
}

const structure = (c: Checkpoint) =>
  JSON.stringify([
    c.week,
    c.phase,
    c.weekDecisions.map((d) => d.eventId),
    c.activeEvent,
    [...c.policies].sort(),
    [...c.memories].sort(),
    c.npcStatus,
    [...c.resolvedEventIds].sort(),
    c.recurringCosts,
    c.demandModifiers,
    c.pendingCallbacks.map((p) => p.callbackId).sort(),
    c.resolvedCallbacks.map((r) => [r.callbackId, r.resolvedBy]).sort(),
  ]);

/** The authored conditions must not read metrics, or the structural dedupe above is unsound. */
export function assertNoMetricConditions(pack: ContentPack): void {
  const all: Array<{ op: string; ref?: string }> = [];
  for (const event of pack.events.values()) {
    all.push(...(event.eligibility ?? []));
    for (const line of event.contextLines?.lines ?? []) all.push(...line.when);
    for (const option of event.options) all.push(...option.requires);
  }
  for (const cb of pack.callbacks.values()) {
    all.push(...cb.eligibility);
    for (const variant of cb.variants) all.push(...variant.when);
  }
  const bad = all.filter((c) => c.ref?.startsWith("metric."));
  if (bad.length > 0) throw new Error(`conditions read metrics: ${JSON.stringify(bad)}`);
}

/** The ordinary event the plan has for this slot, or null when a callback event is on screen. */
function plannedEventId(pack: ContentPack, c: Extract<Checkpoint, { phase: "event" }>) {
  if (pack.events.get(c.activeEvent.eventId)?.deliveredBy) return null;
  const delivered = c.weekDecisions.filter((d) => pack.events.get(d.eventId)?.deliveredBy).length;
  return pack.plan[c.week - 1]?.[c.weekDecisions.length - delivered] ?? null;
}

export function enumerate(pack: ContentPack, limit = 100_000): Enumeration {
  assertNoMetricConditions(pack);
  const states = new Map<string, Reached>();
  const presented = new Map<string, Set<string>>();
  const presentedWeeks = new Map<string, Set<number>>();
  const substitutions: Enumeration["substitutions"] = [];
  const refusals: Enumeration["refusals"] = [];
  const complete: Reached[] = [];
  let transitions = 0;
  let wouldFail = 0;

  const queue: Reached[] = [];
  const admit = (reached: Reached) => {
    const k = structure(reached.checkpoint);
    if (states.has(k)) return;
    states.set(k, reached);
    queue.push(reached);
    if (states.size > limit) throw new Error(`enumeration exceeded ${limit} states`);
  };
  const visit = (from: Reached, draft: CheckpointDraft, label: string) => {
    transitions++;
    admit({
      path: label ? [...from.path, label] : from.path,
      checkpoint: { ...draft, sequence: from.checkpoint.sequence + 1 } as Checkpoint,
    });
  };

  admit({ path: [], checkpoint: { ...startCampaign(pack), sequence: 1 } });
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head] as Reached;
    const c = node.checkpoint;
    switch (c.phase) {
      case "event": {
        const set = presented.get(c.activeEvent.eventId) ?? new Set<string>();
        set.add(c.activeEvent.optionIds.join(","));
        presented.set(c.activeEvent.eventId, set);
        presentedWeeks.set(
          c.activeEvent.eventId,
          (presentedWeeks.get(c.activeEvent.eventId) ?? new Set<number>()).add(c.week),
        );
        const planned = plannedEventId(pack, c);
        if (planned !== null && planned !== c.activeEvent.eventId) {
          substitutions.push({ week: c.week, planned, path: node.path });
        }
        for (const optionId of c.activeEvent.optionIds) {
          const resolved = resolveChoice(pack, c, optionId);
          if (!resolved.ok) {
            refusals.push({
              path: [...node.path, optionId],
              reason: `${resolved.reason}: ${resolved.message}`,
            });
          } else visit(node, resolved.draft, optionId);
        }
        break;
      }
      case "settlement": {
        const draft = settleWeekClosingCallbacks(pack, c);
        if (draft.phase === "failed") {
          wouldFail++;
          visit(node, { ...draft, phase: "report" }, "");
        } else visit(node, draft, "");
        break;
      }
      case "report": {
        const advanced = advanceWeek(pack, c);
        if (!advanced.ok) {
          refusals.push({ path: node.path, reason: `${advanced.reason}: ${advanced.message}` });
        } else visit(node, advanced.draft, "");
        break;
      }
      case "failed":
        break;
      case "complete":
        complete.push(node);
        break;
    }
  }
  return {
    states,
    wouldFail,
    presented,
    presentedWeeks,
    substitutions,
    refusals,
    complete,
    transitions,
  };
}
