import { type IDBPDatabase, type IDBPTransaction, openDB } from "idb";
import { checkpointSchema } from "./checkpoint.ts";
import {
  type CheckpointStore,
  classifySlot,
  describeFault,
  describeIssues,
  type LoadResult,
  type StoreErrorCode,
  type StoreResult,
} from "./store.ts";

export const DEFAULT_DB_NAME = "bicycle-platform-prototype";
const STORE = "checkpoints";
const CURRENT = "current";
const PREVIOUS = "previous";

type Tx = IDBPTransaction<unknown, [typeof STORE], "readwrite">;

function fail<T>(error: StoreErrorCode, message: string): StoreResult<T> {
  return { ok: false, error, message };
}

/** Abort without letting the rejected `tx.done` surface as an unhandled rejection. */
async function abort(tx: Tx | undefined): Promise<void> {
  if (!tx) return;
  try {
    tx.abort();
  } catch {
    // already finished or aborted
  }
  await tx.done.catch(() => undefined);
}

export interface IdbCheckpointStore extends CheckpointStore {
  close(): Promise<void>;
}

export function createIdbCheckpointStore(dbName: string = DEFAULT_DB_NAME): IdbCheckpointStore {
  let dbPromise: Promise<IDBPDatabase<unknown>> | undefined;

  const open = (): Promise<IDBPDatabase<unknown>> => {
    dbPromise ??= openDB(dbName, 1, {
      upgrade(db) {
        db.createObjectStore(STORE);
      },
    });
    // A failed open must not be cached, or every later retry would fail the same way.
    dbPromise.catch(() => {
      dbPromise = undefined;
    });
    return dbPromise;
  };

  return {
    async load(): Promise<LoadResult> {
      const db = await open();
      const tx = db.transaction(STORE, "readonly");
      const [rawCurrent, rawPrevious] = await Promise.all([
        tx.store.get(CURRENT),
        tx.store.get(PREVIOUS),
      ]);
      await tx.done;

      const current = classifySlot(rawCurrent);
      const previous = classifySlot(rawPrevious);
      if (current.kind === "valid") return { status: "ready", checkpoint: current.checkpoint };
      if (current.kind === "future") {
        return { status: "unsupported", schemaVersion: current.schemaVersion };
      }
      if (previous.kind === "valid")
        return { status: "recoverable", previous: previous.checkpoint };
      if (previous.kind === "future") {
        return { status: "unsupported", schemaVersion: previous.schemaVersion };
      }
      if (current.kind === "missing" && previous.kind === "missing") return { status: "empty" };
      return { status: "unusable" };
    },

    async commit(draft) {
      // Fail fast on a malformed candidate before opening a write transaction.
      const provisional = checkpointSchema.safeParse({
        ...draft,
        sequence: (draft.parentSequence ?? 0) + 1,
      });
      if (!provisional.success) return fail("invalid", describeIssues(provisional.error));

      let tx: Tx | undefined;
      try {
        const db = await open();
        tx = db.transaction(STORE, "readwrite") as unknown as Tx;
        const store = tx.store;

        const current = classifySlot(await store.get(CURRENT));
        if (current.kind === "future") {
          await abort(tx);
          return fail("unsupported-save", "The stored save was written by a newer version.");
        }
        if (current.kind === "corrupt") {
          await abort(tx);
          return fail("recovery-required", "The current checkpoint is unreadable.");
        }
        if (current.kind === "missing" && (await store.get(PREVIOUS)) !== undefined) {
          await abort(tx);
          return fail("recovery-required", "The current checkpoint is missing; recover first.");
        }

        const currentSequence = current.kind === "valid" ? current.checkpoint.sequence : null;
        if (draft.parentSequence !== currentSequence) {
          await abort(tx);
          return fail("stale", "The save changed since this checkpoint was derived; reload it.");
        }

        const candidate = checkpointSchema.safeParse({
          ...draft,
          sequence: (currentSequence ?? 0) + 1,
        });
        if (!candidate.success) {
          await abort(tx);
          return fail("invalid", describeIssues(candidate.error));
        }

        if (current.kind === "valid") await store.put(current.checkpoint, PREVIOUS);
        await store.put(candidate.data, CURRENT);
        await tx.done;
        return { ok: true, value: candidate.data };
      } catch (error) {
        await abort(tx);
        return fail("write-failed", describeFault(error));
      }
    },

    async recoverFromPrevious(expectedSequence) {
      let tx: Tx | undefined;
      try {
        const db = await open();
        tx = db.transaction(STORE, "readwrite") as unknown as Tx;
        const current = classifySlot(await tx.store.get(CURRENT));
        const previous = classifySlot(await tx.store.get(PREVIOUS));
        if (current.kind === "future") {
          await abort(tx);
          return fail("unsupported-save", "The stored save was written by a newer version.");
        }
        if (
          current.kind === "valid" ||
          previous.kind !== "valid" ||
          previous.checkpoint.sequence !== expectedSequence
        ) {
          await abort(tx);
          return fail("stale", "The stored checkpoints changed; reload before recovering.");
        }
        await tx.store.put(previous.checkpoint, CURRENT);
        await tx.done;
        return { ok: true, value: previous.checkpoint };
      } catch (error) {
        await abort(tx);
        return fail("write-failed", describeFault(error));
      }
    },

    async reset() {
      let tx: Tx | undefined;
      try {
        const db = await open();
        tx = db.transaction(STORE, "readwrite") as unknown as Tx;
        const current = classifySlot(await tx.store.get(CURRENT));
        const previous = classifySlot(await tx.store.get(PREVIOUS));
        if (current.kind === "future" || previous.kind === "future") {
          await abort(tx);
          return fail("unsupported-save", "The stored save was written by a newer version.");
        }
        if (current.kind === "valid" || previous.kind === "valid") {
          await abort(tx);
          return fail("stale", "A usable checkpoint exists; it will not be cleared.");
        }
        await tx.store.delete(CURRENT);
        await tx.store.delete(PREVIOUS);
        await tx.done;
        return { ok: true, value: null };
      } catch (error) {
        await abort(tx);
        return fail("write-failed", describeFault(error));
      }
    },

    async close() {
      if (!dbPromise) return;
      const db = await dbPromise.catch(() => undefined);
      db?.close();
      dbPromise = undefined;
    },
  };
}
