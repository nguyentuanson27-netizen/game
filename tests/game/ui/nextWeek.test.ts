import { afterEach, describe, expect, it } from "vitest";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap, choose, nextWeek, settle } from "../../../src/game/ui/session.ts";
import {
  playablePack,
  proofPack,
  seedDraft,
  settlementAt,
  spyOn,
  uniqueDbName,
} from "../helpers.ts";

const open: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

/**
 * `pack` defaults to test-only content with one decision in week 2, so Next Week has a playable
 * week to advance into; the shipped proof loop authors no decisions after week 1.
 */
function newStore(pack = playablePack()) {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  open.push(inner);
  return { name, inner, store: spyOn(inner), pack };
}

/** Week 1 fully played and settled: the player is looking at the report. */
async function atReport(pack = playablePack()) {
  const ctx = newStore(pack);
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

describe("Next Week with the shipped proof pack", () => {
  it("is refused: the report stays the current checkpoint and nothing is saved", async () => {
    const pack = proofPack();
    const { store, inner, report } = await atReport(pack);
    const before = await inner.load();
    const commits = store.commits.length;

    const refused = await nextWeek(store, pack, report);

    expect(refused).toMatchObject({ ok: false, error: "no-content" });
    expect(store.commits).toHaveLength(commits);
    expect(await inner.load()).toEqual(before);
    expect(before).toEqual({ status: "ready", checkpoint: report });
    // Repeating it is refused the same way; the campaign cannot drift into zero-decision weeks.
    expect(await nextWeek(store, pack, report)).toMatchObject({ ok: false, error: "no-content" });
    expect(store.commits).toHaveLength(commits);
  });
});

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
    expect(result.ok && result.state.kind).toBe("event");
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint).toMatchObject({
      week: 2,
      phase: "event",
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
    expect(resumed.kind === "event" && resumed.checkpoint.week).toBe(2);
    expect(resumed.kind === "event" && resumed.checkpoint.metrics.cash).toBe(report.metrics.cash);
    expect(reopenedStore.commits).toHaveLength(0);
  });

  it("walks weeks 1-12 on test-only content with a decision every week: none skipped, none settled twice, callbacks preserved", async () => {
    const pack = playablePack([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const { store, inner, report } = await atReport(pack);
    const weeks: number[] = [report.week];
    let state = await nextWeek(store, pack, report).then((r) => {
      if (!r.ok) throw new Error(r.message);
      return r.state;
    });

    while (state.kind === "event") {
      const decided = await choose(store, pack, state.checkpoint, "opt.test.week_beat.steady");
      if (!decided.ok || decided.state.kind !== "settlement") throw new Error("choice failed");
      const settled = await settle(store, pack, decided.state.checkpoint);
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
    // 1 start + 2 choices + settle/advance of week 1 + (choice, settle, advance) for weeks 2-12.
    expect(stored.checkpoint.sequence).toBe(1 + 2 + 2 + 3 * 11);
    expect(stored.checkpoint).toMatchObject({
      phase: "complete",
      week: 12,
      // Week 1 ended on 53 and each later week settles +6 once (62 riders, fund cost 71).
      metrics: { cash: 53 + 11 * 6 },
    });
    expect(stored.checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
    // Reopening the endpoint neither advances nor saves.
    const commits = store.commits.length;
    expect((await bootstrap(store, pack)).kind).toBe("complete");
    expect(store.commits).toHaveLength(commits);
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
