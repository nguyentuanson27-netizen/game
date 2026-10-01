import type { ContentPack } from "../content/loader.ts";
import type { CheckpointDraft, ReportCheckpoint } from "../persistence/checkpoint.ts";
import { nextStep } from "./nextStep.ts";

export const FINAL_WEEK = 12;

export type AdvanceResult = { ok: true; draft: CheckpointDraft } | { ok: false; message: string };

/**
 * `Next Week`: from a committed report, advance exactly one week (or finish after week 12).
 * Only week-local state resets (the week's decisions and its settlement result); the company,
 * policies, relationships, memories, recurring costs and pending callbacks carry over untouched.
 * Pure, and only a `report` checkpoint is accepted, so the settled week is never settled again
 * and no week can be skipped.
 */
export function advanceWeek(pack: ContentPack, checkpoint: ReportCheckpoint): AdvanceResult {
  const {
    sequence,
    phase: _phase,
    activeEvent: _active,
    settlement: _settlement,
    ...rest
  } = checkpoint;
  const base = { ...rest, parentSequence: sequence, weekDecisions: [] };

  if (checkpoint.week >= FINAL_WEEK) {
    return { ok: true, draft: { ...base, phase: "complete", activeEvent: null } };
  }

  const week = (checkpoint.week + 1) as ReportCheckpoint["week"];
  // The new week's first slot is evaluated against the state settlement just committed.
  const next = nextStep(pack, week, 0, checkpoint);
  if (!next.ok) return { ok: false, message: next.message };
  // A week with no authored decisions is unfinished content, not a valid zero-decision week:
  // refuse instead of settling it (and eventually "completing" the prototype) with nothing played.
  if (next.phase !== "event") {
    return { ok: false, message: `week ${week} has no authored decisions yet` };
  }
  return { ok: true, draft: { ...base, week, phase: "event", activeEvent: next.activeEvent } };
}
