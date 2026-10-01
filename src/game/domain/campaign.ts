import type { ContentPack } from "../content/loader.ts";
import {
  type Checkpoint,
  type EventCheckpointDraft,
  SCHEMA_VERSION,
} from "../persistence/checkpoint.ts";
import { nextStep } from "./nextStep.ts";
import { type PresentedEvent, presentEvent } from "./presentation.ts";
import { initialCampaignState } from "./worldState.ts";

/**
 * The first checkpoint of a new campaign: week 1, the first planned event, already evaluated so
 * the exact selectable options are stored.
 */
export function startCampaign(pack: ContentPack): EventCheckpointDraft {
  const state = initialCampaignState(pack);
  const next = nextStep(pack, 1, 0, state);
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
 * (null in the settlement phase, which has no active event). A mismatch is reported, never
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
  for (const id of Object.keys(checkpoint.npcStatus)) {
    if (!pack.npcs.has(id)) issues.push(`unknown npc ${id}`);
  }
  for (const id of Object.keys(checkpoint.recurringCosts)) {
    if (!pack.policyIds.has(id)) issues.push(`unknown recurring cost source ${id}`);
  }
  for (const pending of checkpoint.pendingCallbacks) {
    if (!pack.callbacks.has(pending.callbackId)) {
      issues.push(`unknown pending callback ${pending.callbackId}`);
    }
  }
  checkpoint.weekDecisions.forEach((decision, index) => {
    const event = pack.events.get(decision.eventId);
    if (!event?.options.some((o) => o.id === decision.optionId)) {
      issues.push(`unknown resolved decision ${decision.eventId} / ${decision.optionId}`);
    }
    if (decision.slot !== index + 1) issues.push(`decision slot ${decision.slot} is out of order`);
  });

  const slotCount = pack.plan[checkpoint.week - 1]?.length ?? 0;
  if (checkpoint.phase === "settlement") {
    if (checkpoint.weekDecisions.length !== slotCount) {
      issues.push("settlement phase before every decision slot of the week was resolved");
    }
    return issues.length > 0 ? { ok: false, issues } : { ok: true, presented: null };
  }

  if (checkpoint.weekDecisions.length >= slotCount) {
    issues.push("event phase after every decision slot of the week was resolved");
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
