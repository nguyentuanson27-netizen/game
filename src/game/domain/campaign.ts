import type { ContentPack } from "../content/loader.ts";
import {
  type Checkpoint,
  type EventCheckpointDraft,
  SCHEMA_VERSION,
} from "../persistence/checkpoint.ts";
import { closableCallbacks } from "./callbacks.ts";
import { nextStep } from "./nextStep.ts";
import { type PresentedEvent, presentEvent } from "./presentation.ts";
import { computeSettlement, FAILURE_CASH_THRESHOLD } from "./settlement.ts";
import { initialCampaignState } from "./worldState.ts";

/**
 * The first checkpoint of a new campaign: week 1, the first planned event, already evaluated so
 * the exact selectable options are stored.
 */
export function startCampaign(pack: ContentPack): EventCheckpointDraft {
  const state = initialCampaignState(pack);
  const next = nextStep(pack, 1, [], state);
  if (!next.ok) throw new Error(`Cannot start the campaign: ${next.message}`);
  if (next.phase !== "event") throw new Error("The proof loop has no event for week 1");
  return {
    schemaVersion: SCHEMA_VERSION,
    parentSequence: null,
    week: 1,
    weekDecisions: [],
    ...state,
    phase: "event",
    activeEvent: next.activeEvent,
  };
}

export type ResumeResult =
  | { ok: true; presented: PresentedEvent | null }
  | { ok: false; issues: string[] };

/**
 * Check that a stored checkpoint still agrees with the loaded content and rebuild what to show
 * (null outside the event phase, which has no active event). A mismatch is reported, never
 * repaired: the save is left untouched.
 */
export function resumeCheckpoint(pack: ContentPack, checkpoint: Checkpoint): ResumeResult {
  const issues: string[] = [];
  for (const id of checkpoint.policies) {
    if (!pack.policyIds.has(id)) issues.push(`unknown policy ${id}`);
  }
  for (const id of checkpoint.memories) {
    if (!pack.memoryIds.has(id)) issues.push(`unknown memory ${id}`);
  }
  for (const [id, status] of Object.entries(checkpoint.npcStatus)) {
    const npc = pack.npcs.get(id);
    if (!npc) issues.push(`unknown npc ${id}`);
    else if (!npc.statuses.includes(status)) issues.push(`npc ${id} has unknown status ${status}`);
  }
  for (const id of checkpoint.resolvedEventIds) {
    if (!pack.events.has(id)) issues.push(`unknown resolved event ${id}`);
  }
  for (const id of Object.keys(checkpoint.recurringCosts)) {
    if (!pack.policyIds.has(id)) issues.push(`unknown recurring cost source ${id}`);
  }
  const seenCallbacks = new Set<string>();
  for (const pending of checkpoint.pendingCallbacks) {
    const callback = pack.callbacks.get(pending.callbackId);
    if (!callback) {
      issues.push(`unknown pending callback ${pending.callbackId}`);
    } else if (pending.sourceEventId !== callback.sourceDecision.event) {
      issues.push(`pending callback ${pending.callbackId} has the wrong source event`);
    } else if (!callback.sourceDecision.options.includes(pending.sourceOptionId)) {
      issues.push(`pending callback ${pending.callbackId} has a non-source option`);
    }
    if (pending.scheduledWeek > checkpoint.week) {
      issues.push(`pending callback ${pending.callbackId} was scheduled in a later week`);
    }
    if (seenCallbacks.has(pending.callbackId)) {
      issues.push(`callback ${pending.callbackId} is pending more than once`);
    }
    seenCallbacks.add(pending.callbackId);
  }
  for (const resolved of checkpoint.resolvedCallbacks) {
    const callback = pack.callbacks.get(resolved.callbackId);
    if (!callback) {
      issues.push(`unknown resolved callback ${resolved.callbackId}`);
    } else if (pack.closures.has(resolved.resolvedBy)) {
      // A report closure: it must be this callback's authored closure, in a week its window had
      // opened. It is not a decision, so no event had to be resolved.
      if (pack.closures.get(resolved.resolvedBy)?.callback !== resolved.callbackId) {
        issues.push(`callback ${resolved.callbackId} was closed by another callback's closure`);
      }
      if (resolved.week < callback.window.earliestWeek) {
        issues.push(`callback ${resolved.callbackId} was closed before its window opened`);
      }
    } else if (!callback.variants.some((v) => v.event === resolved.resolvedBy)) {
      issues.push(
        `callback ${resolved.callbackId} was resolved by an event that is not its variant`,
      );
    } else if (!checkpoint.resolvedEventIds.includes(resolved.resolvedBy)) {
      issues.push(
        `callback ${resolved.callbackId} is resolved by an event that was never resolved`,
      );
    }
    if (resolved.week > checkpoint.week) {
      issues.push(`callback ${resolved.callbackId} was resolved in a later week`);
    }
    if (seenCallbacks.has(resolved.callbackId)) {
      issues.push(
        `callback ${resolved.callbackId} is both pending and resolved, or resolved twice`,
      );
    }
    seenCallbacks.add(resolved.callbackId);
  }
  checkpoint.weekDecisions.forEach((decision, index) => {
    const event = pack.events.get(decision.eventId);
    if (!event?.options.some((o) => o.id === decision.optionId)) {
      issues.push(`unknown resolved decision ${decision.eventId} / ${decision.optionId}`);
    }
    if (decision.slot !== index + 1) issues.push(`decision slot ${decision.slot} is out of order`);
  });

  const slotCount = pack.plan[checkpoint.week - 1]?.length ?? 0;
  if (checkpoint.phase !== "event") {
    if (checkpoint.phase === "complete") {
      if (checkpoint.week !== 12) issues.push("Prototype Complete before week 12");
      // The ending needs every required callback resolved; a save that skips that is not resumed.
      if (checkpoint.pendingCallbacks.length > 0) {
        issues.push("Prototype Complete with required callbacks still pending");
      }
      return issues.length > 0 ? { ok: false, issues } : { ok: true, presented: null };
    }
    if (checkpoint.weekDecisions.length !== slotCount) {
      issues.push(`${checkpoint.phase} phase before every decision slot of the week was resolved`);
    }
    if (checkpoint.phase === "report" || checkpoint.phase === "failed") {
      if (checkpoint.settlement.week !== checkpoint.week) {
        issues.push("settlement belongs to a different week");
      }
      // The stored result must be exactly what D4 produces from the committed state; a mismatch
      // blocks the save (it is never recomputed or overwritten here).
      const expected = computeSettlement(checkpoint, checkpoint.week);
      for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
        if (checkpoint.settlement[key] !== expected[key]) {
          issues.push(`settlement ${key} does not match the committed state`);
        }
      }
      // The report closes every callback whose context is invalid; none may still be pending.
      for (const closable of closableCallbacks(pack, checkpoint.week, checkpoint)) {
        issues.push(`callback ${closable.callbackId} should have been closed in this report`);
      }
      const failed = checkpoint.metrics.cash < FAILURE_CASH_THRESHOLD;
      if (failed !== (checkpoint.phase === "failed")) {
        issues.push("phase does not match the cash failure rule");
      }
    }
    return issues.length > 0 ? { ok: false, issues } : { ok: true, presented: null };
  }

  if (checkpoint.weekDecisions.length >= slotCount) {
    issues.push("event phase after every decision slot of the week was resolved");
  }
  // The active event must be exactly what the selection rules pick from the committed state: a
  // save that skips a due callback or swaps the event is refused, never repaired.
  const expected = nextStep(pack, checkpoint.week, checkpoint.weekDecisions, checkpoint);
  if (!expected.ok || expected.phase !== "event") {
    issues.push("the committed state selects no event for this slot");
  } else if (expected.activeEvent.eventId !== checkpoint.activeEvent.eventId) {
    issues.push("active event differs from the one the committed state selects");
  }
  const result = presentEvent(pack, checkpoint.activeEvent.eventId, checkpoint);
  if (!result.ok) {
    issues.push(result.message);
  } else {
    const stored = checkpoint.activeEvent.optionIds.join(",");
    const evaluated = result.presented.options.map((o) => o.id).join(",");
    if (stored !== evaluated) issues.push("active event options differ from the saved option set");
  }
  return issues.length > 0 || !result.ok
    ? { ok: false, issues }
    : { ok: true, presented: result.presented };
}
