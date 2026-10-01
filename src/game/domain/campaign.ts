import type { ContentPack } from "../content/loader.ts";
import type { Checkpoint, CheckpointDraft } from "../persistence/checkpoint.ts";
import { SCHEMA_VERSION } from "../persistence/checkpoint.ts";
import { type PresentedEvent, presentEvent } from "./presentation.ts";
import { initialWorldState } from "./worldState.ts";

/**
 * The first checkpoint of a new campaign: week 1, the first planned event, already evaluated so
 * the exact selectable options are stored. Deterministic: there is no random selection to reroll.
 */
export function startCampaign(pack: ContentPack): CheckpointDraft {
  const world = initialWorldState(pack);
  const eventId = pack.plan[0]?.[0];
  if (!eventId) throw new Error("The proof loop has no event for week 1");
  const result = presentEvent(pack, eventId, world);
  if (!result.ok) throw new Error(`Cannot start the campaign: ${result.message}`);
  return {
    schemaVersion: SCHEMA_VERSION,
    parentSequence: null,
    week: 1,
    phase: "event",
    activeEvent: { eventId, optionIds: result.presented.options.map((o) => o.id) },
    weekDecisions: [],
    ...world,
  };
}

export type ResumeResult =
  | { ok: true; presented: PresentedEvent }
  | { ok: false; issues: string[] };

/**
 * Check that a stored checkpoint still agrees with the loaded content and rebuild what to show.
 * A mismatch is reported, never repaired: the save is left untouched.
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
  for (const decision of checkpoint.weekDecisions) {
    const event = pack.events.get(decision.eventId);
    if (!event?.options.some((o) => o.id === decision.optionId)) {
      issues.push(`unknown resolved decision ${decision.eventId} / ${decision.optionId}`);
    }
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
