import { afterEach, describe, expect, it } from "vitest";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap, choose, nextWeek, settle } from "../../../src/game/ui/session.ts";
import { proofPack, seedDraft, settlementAt, spyOn, uniqueDbName } from "../helpers.ts";

const open: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

function newStore() {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  open.push(inner);
  return { name, inner, store: spyOn(inner), pack: proofPack() };
}

/** Week 1 fully played and settled: the player is looking at the report. */
async function atReport() {
  const ctx = newStore();
  let state = await bootstrap(ctx.store, ctx.pack);
  for (const optionId of ["opt.rider_claim.fund_policy", "opt.fallback.arrange_extra_shift"]) {
    if (state.kind !== "event") throw new Error(`expected an event, got ${state.kind}`);
    const result = await choose(ctx.store, ctx.pack, state.checkpoint, optionId);
    if (!result.ok) throw new Error(result.message);
    state = result.state;
  }
  if (state.kind !== "settlement") throw new Error(`expected settlement, got ${state.kind}`);
  const settled = await settle(ctx.store, ctx.pack, state.checkpoint);
  if (!settled.ok || settled.state.kind !== "report") throw new Error("settlement failed");
  return { ...ctx, report: settled.state.checkpoint };
}

describe("Next Week through the checkpoint store", () => {
  it("advances one week in one commit and shows it only after the commit", async () => {
    const { store, inner, pack, report } = await atReport();
    const commitsBefore = store.commits.length;
    const release = store.holdNextCommit();

    let finished = false;
    const advancing = nextWeek(store, pack, report).then((r) => {
      finished = true;
      return r;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(finished).toBe(false);
    expect((await inner.load()) as unknown).toMatchObject({
      checkpoint: { phase: "report", week: 1 },
    });

    release();
    const result = await advancing;

    expect(store.commits).toHaveLength(commitsBefore + 1);
    expect(result.ok && result.state.kind).toBe("settlement");
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint).toMatchObject({
      week: 2,
      phase: "settlement",
      sequence: report.sequence + 1,
      weekDecisions: [],
      metrics: report.metrics,
    });
  });

  it("stays on the report and keeps the previous checkpoint when the save fails, then advances once on retry", async () => {
    const { store, inner, pack, report } = await atReport();
    store.failNextCommits(1);

    const failed = await nextWeek(store, pack, report);

    expect(failed).toMatchObject({ ok: false, error: "write-failed" });
    expect(await inner.load()).toEqual({ status: "ready", checkpoint: report });

    const retried = await nextWeek(store, pack, report);

    expect(retried.ok).toBe(true);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint.week).toBe(2);
    expect(stored.checkpoint.sequence).toBe(report.sequence + 1);
  });

  it("cannot advance twice from the same report", async () => {
    const { store, inner, pack, report } = await atReport();

    const first = await nextWeek(store, pack, report);
    const again = await nextWeek(store, pack, report);

    expect(first.ok).toBe(true);
    expect(again).toMatchObject({ ok: false, error: "stale" });
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.week).toBe(2);
  });

  it("reopens in the new week and phase without settling or saving again", async () => {
    const { name, store, pack, report } = await atReport();
    const advanced = await nextWeek(store, pack, report);
    if (!advanced.ok) throw new Error("setup failed");

    const reloaded = createIdbCheckpointStore(name);
    open.push(reloaded);
    const reopenedStore = spyOn(reloaded);
    const resumed = await bootstrap(reopenedStore, pack);

    expect(resumed).toEqual(advanced.state);
    expect(resumed.kind === "settlement" && resumed.checkpoint.week).toBe(2);
    expect(resumed.kind === "settlement" && resumed.checkpoint.metrics.cash).toBe(
      report.metrics.cash,
    );
    expect(reopenedStore.commits).toHaveLength(0);
  });

  it("walks all 12 weeks with no week skipped, no week settled twice and the callbacks preserved", async () => {
    const { store, inner, pack, report } = await atReport();
    const weeks: number[] = [report.week];
    let state = await nextWeek(store, pack, report).then((r) => {
      if (!r.ok) throw new Error(r.message);
      return r.state;
    });

    while (state.kind === "settlement") {
      const settled = await settle(store, pack, state.checkpoint);
      if (!settled.ok || settled.state.kind !== "report") throw new Error("settlement failed");
      weeks.push(settled.state.checkpoint.week);
      const next = await nextWeek(store, pack, settled.state.checkpoint);
      if (!next.ok) throw new Error(next.message);
      state = next.state;
    }

    expect(weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(state.kind).toBe("complete");
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    // 1 start + 2 choices + 12 settlements + 12 advances; every save derived from the previous one.
    expect(stored.checkpoint.sequence).toBe(27);
    expect(stored.checkpoint).toMatchObject({
      phase: "complete",
      week: 12,
      // Week 1 ended on 53 and each later empty week settles +6 once (62 riders, fund cost 71).
      metrics: { cash: 53 + 11 * 6 },
    });
    expect(stored.checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
    // Reopening the endpoint neither advances nor saves.
    const again = await bootstrap(store, pack);
    expect(again.kind).toBe("complete");
    expect(store.commits).toHaveLength(27);
  });

  it("settles week 12 and then closes the prototype instead of opening week 13", async () => {
    const ctx = newStore();
    const seeded = await ctx.inner.commit(seedDraft(settlementAt(ctx.pack, 12)));
    if (!seeded.ok || seeded.value.phase !== "settlement") throw new Error("setup failed");

    const settled = await settle(ctx.store, ctx.pack, seeded.value);
    if (!settled.ok || settled.state.kind !== "report") throw new Error("settlement failed");
    const done = await nextWeek(ctx.store, ctx.pack, settled.state.checkpoint);

    expect(done.ok && done.state.kind).toBe("complete");
    const stored = await ctx.inner.load();
    expect(stored.status === "ready" && stored.checkpoint).toMatchObject({
      phase: "complete",
      week: 12,
    });
  });
});
