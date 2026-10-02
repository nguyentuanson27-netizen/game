import type { ContentPack } from "../content/loader.ts";
import type { CheckpointDraft, ReportCheckpoint } from "../persistence/checkpoint.ts";
import { overdueCallbacks } from "./callbacks.ts";
import { nextStep } from "./nextStep.ts";

export const FINAL_WEEK = 12;
const MIN_WEEKLY_DECISIONS = 2;

/**
 * Why `Next Week` was refused. These are different states and are never merged:
 * - `no-content`: the next week has no authored decision slot yet (unfinished content);
 * - `invalid-content`: it has one, but its event cannot be presented now (an authored dead end);
 * - `pending-callbacks`: the final week cannot close the prototype while required callbacks that
 *   earlier choices scheduled are still unresolved;
 * - `overdue-callbacks`: a required callback's window ended with the week just settled and it was
 *   never resolved. Its deadline is never extended and it is never dropped, so the game stops here
 *   (an authored schedule that cannot fit the weekly budget, which content validation must catch).
 */
export type AdvanceFailure =
  | "no-content"
  | "invalid-content"
  | "pending-callbacks"
  | "overdue-callbacks";

export type AdvanceResult =
  | { ok: true; draft: CheckpointDraft }
  | { ok: false; reason: AdvanceFailure; message: string };

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
    // Prototype Complete needs the proof payoff: unresolved required callbacks block it. Delivering
    // them is the callback scheduler's job (T15); here they only stop a premature ending.
    if (checkpoint.pendingCallbacks.length > 0) {
      return {
        ok: false,
        reason: "pending-callbacks",
        message: `${checkpoint.pendingCallbacks.length} required callback(s) are still pending`,
      };
    }
    return { ok: true, draft: { ...base, phase: "complete", activeEvent: null } };
  }

  const overdue = overdueCallbacks(pack, checkpoint.week, checkpoint.pendingCallbacks);
  if (overdue.length > 0) {
    return {
      ok: false,
      reason: "overdue-callbacks",
      message: `required callback(s) ${overdue.join(", ")} passed their deadline unresolved`,
    };
  }

  const week = (checkpoint.week + 1) as ReportCheckpoint["week"];
  // The contract is 2-4 decisions a week (SPEC section 5). Incomplete content may still load, but
  // a week authored with fewer than two decisions is unfinished: refuse instead of playing it.
  const authored = pack.plan[week - 1]?.length ?? 0;
  if (authored < MIN_WEEKLY_DECISIONS) {
    return {
      ok: false,
      reason: "no-content",
      message: `week ${week} has ${authored} authored decision(s); at least ${MIN_WEEKLY_DECISIONS} are required`,
    };
  }
  // The new week's first slot is evaluated against the state settlement just committed.
  const next = nextStep(pack, week, [], checkpoint);
  if (!next.ok) return { ok: false, reason: "invalid-content", message: next.message };
  // With at least two authored slots the first one is always an event; this narrows the type.
  if (next.phase !== "event") {
    return { ok: false, reason: "no-content", message: `week ${week} has no playable slot` };
  }
  return { ok: true, draft: { ...base, week, phase: "event", activeEvent: next.activeEvent } };
}
