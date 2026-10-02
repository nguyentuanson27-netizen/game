import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../../../src/game/content/loader.ts";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import {
  bootstrap,
  choose,
  nextWeek,
  type SessionState,
  settle,
} from "../../../src/game/ui/session.ts";
import { proofPack, type SpyStore, spyOn, uniqueDbName } from "../helpers.ts";

const open: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

function setup(pack: ContentPack = proofPack()) {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  open.push(inner);
  return { name, inner, store: spyOn(inner), pack };
}

/** Play the real route (always the first option) until `stop` holds for the session state. */
async function playUntil(
  store: SpyStore,
  pack: ContentPack,
  state: SessionState,
  stop: (state: SessionState) => boolean,
): Promise<SessionState> {
  let current = state;
  for (let guard = 0; guard < 200; guard++) {
    if (stop(current)) return current;
    let result: Awaited<ReturnType<typeof choose>> | Awaited<ReturnType<typeof settle>>;
    if (current.kind === "event") {
      result = await choose(
        store,
        pack,
        current.checkpoint,
        current.checkpoint.activeEvent.optionIds[0] ?? "",
      );
    } else if (current.kind === "settlement") {
      result = await settle(store, pack, current.checkpoint);
    } else if (current.kind === "report") {
      result = await nextWeek(store, pack, current.checkpoint);
    } else {
      throw new Error(`cannot play from ${current.kind}`);
    }
    if (!result.ok) throw new Error(result.message);
    current = result.state;
  }
  throw new Error("did not reach the stop state");
}

const atSlot = (week: number, decided: number) => (state: SessionState) =>
  state.kind === "event" &&
  state.checkpoint.week === week &&
  state.checkpoint.weekDecisions.length === decided;

const VOICE = "var.rider_voice_followup.engaged";
const CRISIS = "evt.proof.public_rider_dispute";

/** The shipped route to the follow-up: fund policy in week 1, then ordinary weeks 2-6. */
async function atFollowUp() {
  const ctx = setup();
  const start = await bootstrap(ctx.store, ctx.pack);
  const state = await playUntil(ctx.store, ctx.pack, start, atSlot(7, 0));
  if (state.kind !== "event") throw new Error("expected the follow-up event");
  return { ...ctx, state };
}

describe("a pending callback comes back through the real loop", () => {
  it("is delivered at its first slot of week 7 and not before, with both callbacks still pending", async () => {
    const { state } = await atFollowUp();

    expect(state.checkpoint.activeEvent.eventId).toBe(VOICE);
    expect(state.checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
    expect(state.checkpoint.resolvedCallbacks).toEqual([]);
  });

  it("restores the same callback event after a reload without writing anything", async () => {
    const { name, state, pack } = await atFollowUp();

    const reloaded = createIdbCheckpointStore(name);
    open.push(reloaded);
    const reopened = spyOn(reloaded);
    const resumed = await bootstrap(reopened, pack);

    expect(resumed).toEqual(state);
    expect(reopened.commits).toHaveLength(0);
  });

  it("keeps the callback pending after a failed save, then resolves it exactly once on retry", async () => {
    const { inner, store, pack, state } = await atFollowUp();
    const before = await inner.load();
    const option = state.checkpoint.activeEvent.optionIds[1] ?? "";

    store.failNextCommits(1);
    const failed = await choose(store, pack, state.checkpoint, option);

    // No success, nothing written, the callback is still pending and still due.
    expect(failed.ok).toBe(false);
    expect(await inner.load()).toEqual(before);
    const resumed = await bootstrap(store, pack);
    expect(resumed).toEqual(state);

    const retried = await choose(store, pack, state.checkpoint, option);

    if (!retried.ok || retried.state.kind !== "event") throw new Error("retry failed");
    const done = retried.state.checkpoint;
    expect(done.resolvedCallbacks).toEqual([
      { callbackId: "cb.rider_voice_followup", week: 7, resolvedBy: VOICE },
    ]);
    expect(done.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.public_rider_dispute"]);
    // Week 7's second slot is an ordinary routine beat; the callback does not come back.
    expect(done.activeEvent.eventId).toBe("evt.routine.bike_checkup");
    expect(done.weekDecisions).toHaveLength(1);
  });

  it("resolves once when the same choice is activated twice at the same moment", async () => {
    const { inner, store, pack, state } = await atFollowUp();
    const option = state.checkpoint.activeEvent.optionIds[0] ?? "";

    const [a, b] = await Promise.all([
      choose(store, pack, state.checkpoint, option),
      choose(store, pack, state.checkpoint, option),
    ]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected a ready save");
    expect(stored.checkpoint.resolvedCallbacks).toHaveLength(1);
    expect(stored.checkpoint.sequence).toBe(state.checkpoint.sequence + 1);
  });

  it("does not deliver a resolved callback again after a reload, and delivers the crisis once in week 10", async () => {
    const { name, store, pack, state } = await atFollowUp();
    const resolved = await choose(
      store,
      pack,
      state.checkpoint,
      state.checkpoint.activeEvent.optionIds[0] ?? "",
    );
    if (!resolved.ok) throw new Error("resolution failed");

    const reloaded = createIdbCheckpointStore(name);
    open.push(reloaded);
    const reopened = spyOn(reloaded);
    const resumed = await bootstrap(reopened, pack);
    expect(resumed).toEqual(resolved.state);
    if (resumed.kind !== "event") throw new Error("expected an event");
    expect(resumed.checkpoint.activeEvent.eventId).not.toBe(VOICE);

    const crisis = await playUntil(reopened, pack, resumed, atSlot(10, 0));

    if (crisis.kind !== "event") throw new Error("expected the crisis");
    expect(crisis.checkpoint.activeEvent.eventId).toBe(CRISIS);
    expect(crisis.checkpoint.resolvedCallbacks.map((r) => r.callbackId)).toEqual([
      "cb.rider_voice_followup",
    ]);

    const afterCrisis = await choose(
      reopened,
      pack,
      crisis.checkpoint,
      crisis.checkpoint.activeEvent.optionIds[0] ?? "",
    );
    if (!afterCrisis.ok || afterCrisis.state.kind !== "event")
      throw new Error("crisis choice failed");
    expect(afterCrisis.state.checkpoint.pendingCallbacks).toEqual([]);
    expect(
      afterCrisis.state.checkpoint.resolvedCallbacks.map((r) => [r.callbackId, r.week]),
    ).toEqual([
      ["cb.rider_voice_followup", 7],
      ["cb.public_rider_dispute", 10],
    ]);
    expect(afterCrisis.state.checkpoint.activeEvent.eventId).toBe("evt.routine.rainy_week");
  });
});

describe("the shipped route to Prototype Complete", () => {
  it("plays weeks 1-12 with the first option everywhere, resolving both callbacks before the ending", async () => {
    const { store, pack } = setup();
    const start = await bootstrap(store, pack);

    const end = await playUntil(
      store,
      pack,
      start,
      (s) => s.kind === "report" && s.checkpoint.week === 12,
    );
    if (end.kind !== "report") throw new Error("expected the week-12 report");
    expect(end.checkpoint.pendingCallbacks).toEqual([]);

    const done = await nextWeek(store, pack, end.checkpoint);

    expect(done.ok && done.state.kind).toBe("complete");
  });
});
