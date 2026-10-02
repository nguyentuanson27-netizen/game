import { afterEach, describe, expect, it } from "vitest";
import histories from "../../../content/prototype/proof-histories.json";
import type { EventCheckpoint } from "../../../src/game/persistence/checkpoint.ts";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap, choose, nextWeek } from "../../../src/game/ui/session.ts";
import { proofPack, spyOn, uniqueDbName } from "../helpers.ts";
import { atSlot, playUntil } from "../sessionPlay.ts";

// T19 against the real IndexedDB store: both demonstration histories are played through the
// session functions (one commit per tap, settlement, Next Week), then reopened and failed at the
// crisis decision.

const open: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

const CRISIS = "evt.proof.public_rider_dispute";
const pack = proofPack();
const history = (id: string) => histories.histories.find((h) => h.id === id);

const pickFor = (id: string) => {
  const byNode: Record<string, string> = Object.fromEntries(
    (history(id)?.decisions ?? []).map((d) => [d.node, d.option]),
  );
  return (c: EventCheckpoint) => byNode[c.activeEvent.eventId] ?? c.activeEvent.optionIds[0] ?? "";
};

async function playTo(id: string, stop: Parameters<typeof playUntil>[3]) {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  open.push(inner);
  const store = spyOn(inner);
  const start = await bootstrap(store, pack);
  const state = await playUntil(store, pack, start, stop, pickFor(id));
  return { name, inner, store, state };
}

const reopen = async (name: string) => {
  const reloaded = createIdbCheckpointStore(name);
  open.push(reloaded);
  const store = spyOn(reloaded);
  return { store, state: await bootstrap(store, pack) };
};

for (const id of ["history.a_rider_support", "history.b_decline"]) {
  const documented = history(id)?.crisisSelectableOptionIds;

  describe(`${id} through the checkpoint store`, () => {
    it("reaches the crisis with the documented options and restores them unchanged after a reopen", async () => {
      const { name, state } = await playTo(id, atSlot(10, 0));
      if (state.kind !== "event") throw new Error("expected the crisis");
      expect(state.checkpoint.activeEvent).toEqual({ eventId: CRISIS, optionIds: documented });

      const { store, state: resumed } = await reopen(name);

      // Same committed state, same selectable ids, nothing written, no second crisis callback.
      expect(resumed).toEqual(state);
      expect(store.commits).toHaveLength(0);
      if (resumed.kind !== "event") throw new Error("expected the crisis");
      expect(resumed.presented.options.map((o) => o.id)).toEqual(documented);
      expect(resumed.checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual([
        "cb.public_rider_dispute",
      ]);
    });

    it("restores the committed state at the boundary before the crisis week (week-9 report)", async () => {
      const { name, state } = await playTo(
        id,
        (s) => s.kind === "report" && s.checkpoint.week === 9,
      );

      const { store, state: resumed } = await reopen(name);

      expect(resumed).toEqual(state);
      expect(store.commits).toHaveLength(0);
      if (resumed.kind !== "report") throw new Error("expected a report");
      // Nothing is settled or advanced again: Next Week reaches the crisis, once.
      const next = await nextWeek(store, pack, resumed.checkpoint);
      if (!next.ok || next.state.kind !== "event") throw new Error("expected week 10");
      expect(next.state.checkpoint.activeEvent.eventId).toBe(CRISIS);
    });

    it("keeps the previous state usable when the crisis decision fails to save, and retries exactly once", async () => {
      const { name, inner, store, state } = await playTo(id, atSlot(10, 0));
      if (state.kind !== "event") throw new Error("expected the crisis");
      const before = await inner.load();
      const option = history(id)?.optionSequence.at(-1) ?? "";

      store.failNextCommits(1);
      const failed = await choose(store, pack, state.checkpoint, option);

      expect(failed.ok).toBe(false);
      expect(await inner.load()).toEqual(before);
      // The same crisis, same options, is still what a reopen shows.
      const { state: still } = await reopen(name);
      expect(still).toEqual(state);

      const retried = await choose(store, pack, state.checkpoint, option);

      if (!retried.ok || retried.state.kind !== "event") throw new Error("retry failed");
      const done = retried.state.checkpoint;
      expect(done.resolvedCallbacks.map((r) => r.callbackId)).toContain("cb.public_rider_dispute");
      expect(done.pendingCallbacks).toEqual([]);
      expect(done.sequence).toBe(state.checkpoint.sequence + 1);
      // Repeating the old tap is stale: the crisis is not resolved twice.
      const again = await choose(store, pack, state.checkpoint, option);
      expect(again.ok).toBe(false);
      expect((await inner.load()).status).toBe("ready");
      const stored = await inner.load();
      expect(stored.status === "ready" && stored.checkpoint.sequence).toBe(done.sequence);
    });
  });
}

describe("the two histories compared through the store (AC-06)", () => {
  it("offer different selectable ids at the same crisis, each with 2-4 options", async () => {
    const a = await playTo("history.a_rider_support", atSlot(10, 0));
    const b = await playTo("history.b_decline", atSlot(10, 0));
    if (a.state.kind !== "event" || b.state.kind !== "event") throw new Error("expected crises");

    const idsA = a.state.checkpoint.activeEvent.optionIds;
    const idsB = b.state.checkpoint.activeEvent.optionIds;

    expect(a.state.checkpoint.activeEvent.eventId).toBe(b.state.checkpoint.activeEvent.eventId);
    expect(idsA).not.toEqual(idsB);
    expect(idsA.some((id) => !idsB.includes(id))).toBe(true);
    for (const ids of [idsA, idsB]) {
      expect(ids.length).toBeGreaterThanOrEqual(2);
      expect(ids.length).toBeLessThanOrEqual(4);
    }
  });

  it("finish at Prototype Complete after the crisis, in one commit per step", async () => {
    const { store, state } = await playTo(
      "history.b_decline",
      (s) => s.kind === "report" && s.checkpoint.week === 12,
    );
    if (state.kind !== "report") throw new Error("expected the week-12 report");

    const done = await nextWeek(store, pack, state.checkpoint);

    expect(done.ok && done.state.kind).toBe("complete");
  });
});
