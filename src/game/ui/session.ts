import type { ContentPack } from "../content/loader.ts";
import { type AdvanceFailure, advanceWeek } from "../domain/advanceWeek.ts";
import { resumeCheckpoint, startCampaign } from "../domain/campaign.ts";
import type { PresentedEvent } from "../domain/presentation.ts";
import { resolveChoice } from "../domain/resolveChoice.ts";
import { settleWeekClosingCallbacks } from "../domain/settlement.ts";
import type {
  Checkpoint,
  CompleteCheckpoint,
  EventCheckpoint,
  FailedCheckpoint,
  ReportCheckpoint,
  SettlementCheckpoint,
} from "../persistence/checkpoint.ts";
import { type CheckpointStore, describeFault, type StoreErrorCode } from "../persistence/store.ts";

/** What the screen shows. `event` is only ever produced for a checkpoint that is already saved. */
export type SessionState =
  | { kind: "event"; checkpoint: EventCheckpoint; presented: PresentedEvent }
  /** Every decision slot of the week is committed; the week awaits settlement. */
  | { kind: "settlement"; checkpoint: SettlementCheckpoint }
  /** Settlement is committed; the weekly report is shown and `Next Week` is pending. */
  | { kind: "report"; checkpoint: ReportCheckpoint }
  /** Settlement left Cash below the D4 threshold: the explicit failed state. */
  | { kind: "failed"; checkpoint: FailedCheckpoint }
  /** The week-12 report was closed: the approved `Prototype Complete` endpoint. */
  | { kind: "complete"; checkpoint: CompleteCheckpoint }
  | { kind: "recover"; previous: Checkpoint }
  | { kind: "unsupported"; schemaVersion: number }
  | { kind: "unusable" }
  | { kind: "invalid-checkpoint"; issues: string[] }
  | { kind: "save-error"; error: StoreErrorCode; message: string }
  | { kind: "load-error"; message: string };

function fromCheckpoint(pack: ContentPack, checkpoint: Checkpoint): SessionState {
  const resumed = resumeCheckpoint(pack, checkpoint);
  if (!resumed.ok) return { kind: "invalid-checkpoint", issues: resumed.issues };
  switch (checkpoint.phase) {
    case "event":
      return resumed.presented
        ? { kind: "event", checkpoint, presented: resumed.presented }
        : { kind: "invalid-checkpoint", issues: ["event phase without a presentable event"] };
    case "settlement":
      return { kind: "settlement", checkpoint };
    case "report":
      return { kind: "report", checkpoint };
    case "failed":
      return { kind: "failed", checkpoint };
    case "complete":
      return { kind: "complete", checkpoint };
  }
}

/**
 * Load the save, or start a new campaign. A new campaign's first event is chosen
 * deterministically and committed first; the caller may show it only from the returned state, which
 * exists only after the commit transaction completed. Retrying after a failure rebuilds the same
 * draft, so no partial state can be created.
 */
export async function bootstrap(store: CheckpointStore, pack: ContentPack): Promise<SessionState> {
  // A concurrent bootstrap (or another tab) may create the first checkpoint between our load and
  // our commit; the stale rejection then sends us back to load it instead of overwriting it.
  for (let attempt = 0; attempt < 3; attempt++) {
    let loaded: Awaited<ReturnType<CheckpointStore["load"]>>;
    try {
      loaded = await store.load();
    } catch (error) {
      return { kind: "load-error", message: describeFault(error) };
    }
    switch (loaded.status) {
      case "ready":
        return fromCheckpoint(pack, loaded.checkpoint);
      case "recoverable":
        return { kind: "recover", previous: loaded.previous };
      case "unsupported":
        return { kind: "unsupported", schemaVersion: loaded.schemaVersion };
      case "unusable":
        return { kind: "unusable" };
      case "empty": {
        const committed = await store.commit(startCampaign(pack));
        if (committed.ok) return fromCheckpoint(pack, committed.value);
        if (committed.error === "stale") continue;
        return { kind: "save-error", error: committed.error, message: committed.message };
      }
    }
  }
  return { kind: "load-error", message: "The save kept changing while it was being loaded." };
}

/** The player confirmed recovery from the previous checkpoint. */
export async function recover(
  store: CheckpointStore,
  pack: ContentPack,
  previous: Checkpoint,
): Promise<SessionState> {
  const result = await store.recoverFromPrevious(previous.sequence);
  if (result.ok) return fromCheckpoint(pack, result.value);
  if (result.error === "stale") return bootstrap(store, pack);
  return { kind: "save-error", error: result.error, message: result.message };
}

/** The player confirmed clearing a save that neither slot could restore. */
export async function resetCampaign(
  store: CheckpointStore,
  pack: ContentPack,
): Promise<SessionState> {
  const result = await store.reset();
  if (result.ok || result.error === "stale") return bootstrap(store, pack);
  return { kind: "save-error", error: result.error, message: result.message };
}

export type ChooseResult =
  | { ok: true; state: SessionState; feedback: string }
  | { ok: false; error: StoreErrorCode | "not-selectable" | "no-next-event"; message: string };

/**
 * One tap: build the whole decision as a single checkpoint and commit it. Feedback and the next
 * state are returned only after the commit transaction completed; on any failure nothing was
 * written, so the same tap can simply be repeated.
 */
export async function choose(
  store: CheckpointStore,
  pack: ContentPack,
  checkpoint: EventCheckpoint,
  optionId: string,
): Promise<ChooseResult> {
  const resolved = resolveChoice(pack, checkpoint, optionId);
  if (!resolved.ok) return { ok: false, error: resolved.reason, message: resolved.message };
  const committed = await store.commit(resolved.draft);
  if (!committed.ok) return { ok: false, error: committed.error, message: committed.message };
  return {
    ok: true,
    state: fromCheckpoint(pack, committed.value),
    feedback: resolved.option.feedback,
  };
}

export type SettleResult =
  | { ok: true; state: SessionState }
  | { ok: false; error: StoreErrorCode | AdvanceFailure; message: string };

/**
 * Settle the week once: one checkpoint holds the settled cash, the result and the new phase. The
 * report is shown only from the committed result; a failed save leaves the week unsettled.
 */
export async function settle(
  store: CheckpointStore,
  pack: ContentPack,
  checkpoint: SettlementCheckpoint,
): Promise<SettleResult> {
  const committed = await store.commit(settleWeekClosingCallbacks(pack, checkpoint));
  if (!committed.ok) return { ok: false, error: committed.error, message: committed.message };
  return { ok: true, state: fromCheckpoint(pack, committed.value) };
}

/**
 * `Next Week`: advance one week (or finish after week 12) in one checkpoint. The new week or the
 * endpoint is shown only from the committed result; on failure the report stays as it was.
 */
export async function nextWeek(
  store: CheckpointStore,
  pack: ContentPack,
  checkpoint: ReportCheckpoint,
): Promise<SettleResult> {
  const advanced = advanceWeek(pack, checkpoint);
  if (!advanced.ok) return { ok: false, error: advanced.reason, message: advanced.message };
  const committed = await store.commit(advanced.draft);
  if (!committed.ok) return { ok: false, error: committed.error, message: committed.message };
  return { ok: true, state: fromCheckpoint(pack, committed.value) };
}
