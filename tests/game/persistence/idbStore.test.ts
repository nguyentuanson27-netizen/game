import { openDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { firstDraft, nextDraft, uniqueDbName } from "../helpers.ts";

const stores: Array<{ close(): Promise<void> }> = [];
function newStore(name = uniqueDbName()) {
  const store = createIdbCheckpointStore(name);
  stores.push(store);
  return { store, name };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(stores.splice(0).map((s) => s.close()));
});

/** Read or write a raw slot, bypassing the store, to set up corrupt/future saves. */
async function raw(name: string) {
  const db = await openDB(name, 1);
  return {
    get: (key: string) => db.get("checkpoints", key),
    put: (key: string, value: unknown) => db.put("checkpoints", value, key),
    close: () => db.close(),
  };
}

describe("checkpoint store", () => {
  it("starts empty, commits the first checkpoint and loads it back", async () => {
    const { store } = newStore();
    expect(await store.load()).toEqual({ status: "empty" });

    const result = await store.commit(firstDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sequence).toBe(1);
    expect(await store.load()).toEqual({ status: "ready", checkpoint: result.value });
  });

  it("rotates the committed current into previous and numbers the new current", async () => {
    const { store, name } = newStore();
    const first = await store.commit(firstDraft());
    if (!first.ok) throw new Error("setup failed");

    const second = await store.commit(nextDraft(first.value));

    expect(second.ok && second.value.sequence).toBe(2);
    const slots = await raw(name);
    expect((await slots.get("current")).sequence).toBe(2);
    expect(await slots.get("previous")).toEqual(first.value);
    slots.close();
  });

  it("rejects a stale parentSequence without touching the newer checkpoint", async () => {
    const { store } = newStore();
    const first = await store.commit(firstDraft());
    if (!first.ok) throw new Error("setup failed");
    const second = await store.commit(nextDraft(first.value));
    if (!second.ok) throw new Error("setup failed");

    // A second tab still holds sequence 1 and tries to build on it.
    const stale = await store.commit(nextDraft(first.value));

    expect(stale).toMatchObject({ ok: false, error: "stale" });
    expect(await store.load()).toEqual({ status: "ready", checkpoint: second.value });
  });

  it("rejects a second initial checkpoint when one already exists", async () => {
    const { store } = newStore();
    const first = await store.commit(firstDraft());
    if (!first.ok) throw new Error("setup failed");

    expect(await store.commit(firstDraft())).toMatchObject({ ok: false, error: "stale" });
    expect(await store.load()).toEqual({ status: "ready", checkpoint: first.value });
  });

  it("rejects an invalid candidate and writes nothing", async () => {
    const { store } = newStore();
    const draft = { ...firstDraft(), week: 13 };

    expect(await store.commit(draft)).toMatchObject({ ok: false, error: "invalid" });
    expect(await store.load()).toEqual({ status: "empty" });
  });

  it("leaves current and previous untouched when the write fails midway", async () => {
    const { store, name } = newStore();
    const first = await store.commit(firstDraft());
    if (!first.ok) throw new Error("setup failed");
    const second = await store.commit(nextDraft(first.value));
    if (!second.ok) throw new Error("setup failed");

    // Fail the second put of the transaction (the new current) after previous was already rewritten.
    const realPut = IDBObjectStore.prototype.put;
    let calls = 0;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      calls += 1;
      if (calls === 2) throw new Error("disk full");
      return realPut.apply(this, args);
    });
    const failed = await store.commit(nextDraft(second.value));
    vi.restoreAllMocks();

    expect(failed).toMatchObject({ ok: false, error: "write-failed" });
    expect(await store.load()).toEqual({ status: "ready", checkpoint: second.value });
    const slots = await raw(name);
    expect(await slots.get("previous")).toEqual(first.value);
    slots.close();

    // Retrying the same candidate afterwards succeeds exactly once, from the intact checkpoint.
    const retried = await store.commit(nextDraft(second.value));
    expect(retried.ok && retried.value.sequence).toBe(3);
  });
});

describe("checkpoint recovery and protection", () => {
  async function twoCheckpoints() {
    const { store, name } = newStore();
    const first = await store.commit(firstDraft());
    if (!first.ok) throw new Error("setup failed");
    const second = await store.commit(nextDraft(first.value));
    if (!second.ok) throw new Error("setup failed");
    return { store, name, first: first.value, second: second.value };
  }

  it("offers explicit recovery when current is corrupt and previous is valid", async () => {
    const { store, name, first } = await twoCheckpoints();
    const slots = await raw(name);
    await slots.put("current", { schemaVersion: 1, sequence: "garbage" });

    expect(await store.load()).toEqual({ status: "recoverable", previous: first });
    // Nothing is promoted until the player confirms.
    expect(await slots.get("current")).toEqual({ schemaVersion: 1, sequence: "garbage" });
    slots.close();
  });

  it("promotes previous to current on confirmation so later saves derive from it", async () => {
    const { store, name, first } = await twoCheckpoints();
    const slots = await raw(name);
    await slots.put("current", { corrupt: true });
    slots.close();

    const recovered = await store.recoverFromPrevious(first.sequence);

    expect(recovered).toEqual({ ok: true, value: first });
    expect(await store.load()).toEqual({ status: "ready", checkpoint: first });
    const next = await store.commit(nextDraft(first));
    expect(next.ok && next.value.parentSequence).toBe(first.sequence);
  });

  it("refuses to recover when current became valid in the meantime", async () => {
    const { store, first } = await twoCheckpoints();

    expect(await store.recoverFromPrevious(first.sequence)).toMatchObject({
      ok: false,
      error: "stale",
    });
  });

  it("refuses ordinary saves while current is corrupt, so recovery data is not orphaned", async () => {
    const { store, name, second } = await twoCheckpoints();
    const slots = await raw(name);
    await slots.put("current", "garbage");

    expect(await store.commit(nextDraft(second))).toMatchObject({
      ok: false,
      error: "recovery-required",
    });
    expect(await store.commit(firstDraft())).toMatchObject({
      ok: false,
      error: "recovery-required",
    });
    slots.close();
  });

  it("blocks and preserves a save written by a newer schema version", async () => {
    const { store, name, first } = await twoCheckpoints();
    const future = { schemaVersion: 2, sequence: 9, somethingNew: { a: 1 } };
    const slots = await raw(name);
    await slots.put("current", future);

    expect(await store.load()).toEqual({ status: "unsupported", schemaVersion: 2 });
    expect(await store.commit(nextDraft(first))).toMatchObject({
      ok: false,
      error: "unsupported-save",
    });
    expect(await store.recoverFromPrevious(first.sequence)).toMatchObject({
      ok: false,
      error: "unsupported-save",
    });
    expect(await store.reset()).toMatchObject({ ok: false, error: "unsupported-save" });
    expect(await slots.get("current")).toEqual(future);
    slots.close();
  });

  it("reports an unusable save only when neither slot restores, and resets only then", async () => {
    const { store, name } = newStore();
    await store.load();
    const slots = await raw(name);
    await slots.put("current", { broken: true });
    await slots.put("previous", 42);

    expect(await store.load()).toEqual({ status: "unusable" });
    expect(await store.reset()).toEqual({ ok: true, value: null });
    expect(await store.load()).toEqual({ status: "empty" });
    slots.close();
  });

  it("never resets a usable save", async () => {
    const { store, second } = await twoCheckpoints();

    expect(await store.reset()).toMatchObject({ ok: false, error: "stale" });
    expect(await store.load()).toEqual({ status: "ready", checkpoint: second });
  });
});
