import type { ContentPack } from "../content/loader.ts";
import { resumeCheckpoint, startCampaign } from "../domain/campaign.ts";
import type { PresentedEvent } from "../domain/presentation.ts";
import { resolveChoice } from "../domain/resolveChoice.ts";
import type { Checkpoint, EventCheckpoint } from "../persistence/checkpoint.ts";
import type { CheckpointStore, StoreErrorCode } from "../persistence/store.ts";

/** What the screen shows. `event` is only ever produced for a checkpoint that is already saved. */
export type SessionState =
  | { kind: "event"; checkpoint: EventCheckpoint; presented: PresentedEvent }
  /** Every decision slot of the week is committed; settlement is T11. */
  | { kind: "settlement"; checkpoint: Checkpoint }
  | { kind: "recover"; previous: Checkpoint }
  | { kind: "unsupported"; schemaVersion: number }
  | { kind: "unusable" }
  | { kind: "invalid-checkpoint"; issues: string[] }
  | { kind: "save-error"; error: StoreErrorCode; message: string }
  | { kind: "load-error"; message: string };

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fromCheckpoint(pack: ContentPack, checkpoint: Checkpoint): SessionState {
  const resumed = resumeCheckpoint(pack, checkpoint);
  if (!resumed.ok) return { kind: "invalid-checkpoint", issues: resumed.issues };
  if (checkpoint.phase === "event" && resumed.presented) {
    return { kind: "event", checkpoint, presented: resumed.presented };
  }
  return { kind: "settlement", checkpoint };
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
      return { kind: "load-error", message: describe(error) };
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
