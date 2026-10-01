import { afterEach, describe, expect, it } from "vitest";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap, choose, settle } from "../../../src/game/ui/session.ts";
import { corruptSlot, proofPack, spyOn, uniqueDbName } from "../helpers.ts";

const open: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

/** A campaign played through every decision of week 1, now awaiting settlement. */
async function atSettlement() {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  open.push(inner);
  const store = spyOn(inner);
  const pack = proofPack();
  let state = await bootstrap(store, pack);
  for (const optionId of ["opt.rider_claim.fund_policy", "opt.fallback.arrange_extra_shift"]) {
    if (state.kind !== "event") throw new Error(`expected an event, got ${state.kind}`);
    const result = await choose(store, pack, state.checkpoint, optionId);
    if (!result.ok) throw new Error(result.message);
    state = result.state;
  }
  if (state.kind !== "settlement") throw new Error(`expected settlement, got ${state.kind}`);
  return { name, inner, store, pack, checkpoint: state.checkpoint };
}

describe("settling the week through the checkpoint store", () => {
  it("commits the settlement once and reports only from the committed result", async () => {
    const { store, inner, pack, checkpoint } = await atSettlement();
    const commitsBefore = store.commits.length;
    const release = store.holdNextCommit();

    let finished = false;
    const settling = settle(store, pack, checkpoint).then((r) => {
      finished = true;
      return r;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(finished).toBe(false);
    expect((await inner.load()) as unknown).toMatchObject({ checkpoint: { phase: "settlement" } });

    release();
    const result = await settling;

    expect(store.commits).toHaveLength(commitsBefore + 1);
    expect(result.ok && result.state.kind).toBe("report");
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint).toMatchObject({
      phase: "report",
      week: 1,
      sequence: checkpoint.sequence + 1,
      metrics: { cash: 53 },
      settlement: { deliveryJobs: 19, rideJobs: 13, grossIncome: 77, weeklyCost: 71, cashDelta: 6 },
    });
  });

  it("keeps the unsettled week and blocks progress when the save fails, then settles once on retry", async () => {
    const { store, inner, pack, checkpoint } = await atSettlement();
    store.failNextCommits(1);

    const failed = await settle(store, pack, checkpoint);

    expect(failed).toMatchObject({ ok: false, error: "write-failed" });
    expect(await inner.load()).toEqual({ status: "ready", checkpoint });

    const retried = await settle(store, pack, checkpoint);

    expect(retried.ok).toBe(true);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    // Cash moved by exactly one weekly delta (47 -> 53), not two.
    expect(stored.checkpoint.metrics.cash).toBe(53);
    expect(stored.checkpoint.sequence).toBe(checkpoint.sequence + 1);
  });

  it("cannot settle the same week twice, even when the old checkpoint is reused", async () => {
    const { store, inner, pack, checkpoint } = await atSettlement();

    const first = await settle(store, pack, checkpoint);
    const again = await settle(store, pack, checkpoint);

    expect(first.ok).toBe(true);
    expect(again).toMatchObject({ ok: false, error: "stale" });
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.metrics.cash).toBe(53);
  });

  it("does not settle again after a reload: the report is restored as committed", async () => {
    const { name, store, pack, checkpoint } = await atSettlement();
    const first = await settle(store, pack, checkpoint);
    if (!first.ok) throw new Error("setup failed");
    const commits = store.commits.length;

    const reloaded = createIdbCheckpointStore(name);
    open.push(reloaded);
    const reopenedStore = spyOn(reloaded);
    const resumed = await bootstrap(reopenedStore, pack);
    const resumedAgain = await bootstrap(reopenedStore, pack);

    expect(resumed).toEqual(first.state);
    expect(resumedAgain).toEqual(first.state);
    expect(reopenedStore.commits).toHaveLength(0);
    expect(store.commits).toHaveLength(commits);
  });

  it("opens no next-week decision before the settlement commit, and none after it until Next Week", async () => {
    const { store, inner, pack, checkpoint } = await atSettlement();
    expect(checkpoint).toMatchObject({ phase: "settlement", week: 1, activeEvent: null });

    store.failNextCommits(1);
    await settle(store, pack, checkpoint);
    expect(await inner.load()).toEqual({ status: "ready", checkpoint });

    await settle(store, pack, checkpoint);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    // Settled, but still week 1 with no active event: advancing is a separate action (T12).
    expect(stored.checkpoint).toMatchObject({ phase: "report", week: 1, activeEvent: null });
  });

  it("enters the explicit failed state when cash ends below -25 and resumes there", async () => {
    const { name, store, inner, pack, checkpoint } = await atSettlement();
    // Put the campaign deep in debt through the store, as a prior history would have.
    const broke = { ...checkpoint, metrics: { ...checkpoint.metrics, cash: -60 } };
    await corruptSlot(name, "current", broke);

    const result = await settle(store, pack, broke);

    expect(result.ok && result.state.kind).toBe("failed");
    const reopened = await bootstrap(store, pack);
    expect(reopened.kind).toBe("failed");
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.phase).toBe("failed");
  });
});
