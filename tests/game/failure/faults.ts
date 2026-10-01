import { openDB } from "idb";
import { vi } from "vitest";
import type { CheckpointStore } from "../../../src/game/persistence/store.ts";

/** A marker planted in injected browser errors; it must never reach a result or the screen. */
export const SECRET = "SECRET-PAYLOAD-4711";

export type FaultKind = "throw" | "abort";

export interface Fault {
  /** True once the injected failure actually fired. */
  readonly fired: boolean;
  restore(): void;
}

/**
 * Fail the `at`-th `put` of the next write transaction(s) on the real IndexedDB implementation.
 * - `throw`: the browser refuses the request (e.g. quota), carrying a message with a secret.
 * - `abort`: the request is issued and then the whole transaction is aborted, as if the browser
 *   gave up mid-write. Either way the transaction must roll back as a unit.
 */
export function injectPutFault(kind: FaultKind, at: number): Fault {
  const realPut = IDBObjectStore.prototype.put;
  let calls = 0;
  const state = { fired: false };
  const spy = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<typeof realPut>
  ) {
    calls += 1;
    if (calls !== at) return realPut.apply(this, args);
    state.fired = true;
    if (kind === "throw") throw new DOMException(SECRET, "QuotaExceededError");
    const request = realPut.apply(this, args);
    this.transaction.abort();
    return request;
  });
  return {
    get fired() {
      return state.fired;
    },
    restore: () => spy.mockRestore(),
  };
}

/** Fail the first `delete` of the next write transaction (used to fail a reset). */
export function injectDeleteFault(): Fault {
  const state = { fired: false };
  const spy = vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(function (
    this: IDBObjectStore,
  ) {
    state.fired = true;
    throw new DOMException(SECRET, "QuotaExceededError");
  });
  return {
    get fired() {
      return state.fired;
    },
    restore: () => spy.mockRestore(),
  };
}

/**
 * The write really committed but the acknowledgement was lost, so the app is told it failed.
 * The first `passFirst` commits are acknowledged normally; `lost` counts the swallowed ones.
 */
export function lostAck(inner: CheckpointStore, passFirst = 0): CheckpointStore & { lost: number } {
  let seen = 0;
  const wrapper = {
    lost: 0,
    load: () => inner.load(),
    async commit(draft: Parameters<CheckpointStore["commit"]>[0]) {
      const result = await inner.commit(draft);
      seen += 1;
      if (!result.ok || seen <= passFirst) return result;
      wrapper.lost += 1;
      return { ok: false as const, error: "write-failed" as const, message: "AbortError" };
    },
    recoverFromPrevious: (n: number) => inner.recoverFromPrevious(n),
    reset: () => inner.reset(),
  };
  return wrapper;
}

/** Both slots exactly as stored, read behind the store's back. */
export async function rawSlots(dbName: string) {
  // Same schema as the app, so peeking at a database that does not exist yet cannot break it.
  const db = await openDB(dbName, 1, {
    upgrade: (database) => void database.createObjectStore("checkpoints"),
  });
  try {
    return {
      current: await db.get("checkpoints", "current"),
      previous: await db.get("checkpoints", "previous"),
    };
  } finally {
    db.close();
  }
}
