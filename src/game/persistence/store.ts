import { z } from "zod";
import {
  type Checkpoint,
  type CheckpointDraft,
  checkpointSchema,
  SCHEMA_VERSION,
} from "./checkpoint.ts";

export type StoreErrorCode =
  /** `current` is not the checkpoint the candidate was derived from (another tab/window won). */
  | "stale"
  /** The candidate itself is not a valid checkpoint. */
  | "invalid"
  /** `current` belongs to a newer app version; this version must not touch it. */
  | "unsupported-save"
  /** `current` is missing or corrupt while recovery data exists; recovery must be chosen first. */
  | "recovery-required"
  /** The browser failed or aborted the write. Nothing was changed. */
  | "write-failed";

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StoreErrorCode; message: string };

export type LoadResult =
  /** Nothing stored: a new campaign. */
  | { status: "empty" }
  /** A valid `current` checkpoint: resume exactly. */
  | { status: "ready"; checkpoint: Checkpoint }
  /** `current` is missing/corrupt but `previous` is valid: offer explicit recovery. */
  | { status: "recoverable"; previous: Checkpoint }
  /** A newer app version wrote the save: block this version and preserve it. */
  | { status: "unsupported"; schemaVersion: number }
  /** Something is stored but neither slot is usable: blocking recovery, reset needs confirmation. */
  | { status: "unusable" };

/** The only way the game reads or writes campaign state (G0 D3). */
export interface CheckpointStore {
  load(): Promise<LoadResult>;
  /**
   * Validate the candidate, read `current` in the same write transaction, reject a stale
   * `parentSequence`, rotate `current` to `previous` and write the numbered candidate as the new
   * `current`. Resolves only after the transaction completed.
   */
  commit(draft: CheckpointDraft): Promise<StoreResult<Checkpoint>>;
  /**
   * After the player confirmed recovery: re-check in one transaction that `previous` is still the
   * valid checkpoint with `expectedSequence` and `current` is still missing/corrupt, then promote
   * it to `current`.
   */
  recoverFromPrevious(expectedSequence: number): Promise<StoreResult<Checkpoint>>;
  /** After the player confirmed: clear an unusable save. Refuses to touch a usable or newer save. */
  reset(): Promise<StoreResult<null>>;
}

export type Slot =
  | { kind: "missing" }
  | { kind: "valid"; checkpoint: Checkpoint }
  | { kind: "future"; schemaVersion: number }
  | { kind: "corrupt" };

const versionProbe = z.looseObject({ schemaVersion: z.number().int() });

/** Classify a raw stored value without ever coercing it. */
export function classifySlot(raw: unknown): Slot {
  if (raw === undefined) return { kind: "missing" };
  const probe = versionProbe.safeParse(raw);
  if (probe.success && probe.data.schemaVersion > SCHEMA_VERSION) {
    return { kind: "future", schemaVersion: probe.data.schemaVersion };
  }
  const parsed = checkpointSchema.safeParse(raw);
  return parsed.success ? { kind: "valid", checkpoint: parsed.data } : { kind: "corrupt" };
}
