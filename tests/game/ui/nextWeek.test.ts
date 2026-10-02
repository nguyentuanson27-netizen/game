import { afterEach, describe, expect, it } from "vitest";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap, choose, nextWeek, settle } from "../../../src/game/ui/session.ts";
import {
  playablePack,
  resolvedSettlementAt,
  seedDraft,
  spyOn,
  unauthoredPack,
  uniqueDbName,
  weekTwelvePack,
} from "../helpers.ts";

const open: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

/**
 * `pack` defaults to test-only content with two decisions in weeks 2 and 12, so Next Week has a
 * playable week to advance into and a coherent week-12 state to seed; the shipped proof loop
 * authors no decisions after week 1.
 */
function newStore(pack = weekTwelvePack()) {
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

describe("Next Week into unauthored content", () => {
  it("is refused: the report stays the current checkpoint and nothing is saved", async () => {
    const pack = unauthoredPack();
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

describe("Next Week into a week with a single authored decision", () => {
  it("is refused and writes no checkpoint: a week needs 2-4 decisions", async () => {
    const pack = playablePack([2], 1);
    const { store, inner, report } = await atReport(pack);
    const before = await inner.load();
    const commits = store.commits.length;

    const refused = await nextWeek(store, pack, report);

    expect(refused).toMatchObject({ ok: false, error: "no-content" });
    expect(store.commits).toHaveLength(commits);
    expect(await inner.load()).toEqual(before);
    expect(before).toEqual({ status: "ready", checkpoint: report });
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

  it("walks weeks 1-12 on test-only content with two decisions every week: none skipped, none settled twice, the required callbacks are delivered in their windows and the prototype then closes", async () => {
    const pack = playablePack([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const { store, inner, report } = await atReport(pack);
    const weeks: number[] = [report.week];
    const shown: Record<number, string[]> = {};
    let current = report;

    while (current.week < 12) {
      const advanced = await nextWeek(store, pack, current);
      if (!advanced.ok) throw new Error("advance failed");
      let state = advanced.state;
      // Two authored decisions a week; a due callback takes one of them. Always the first option.
      while (state.kind === "event") {
        const week = state.checkpoint.week;
        const { eventId, optionIds } = state.checkpoint.activeEvent;
        shown[week] = [...(shown[week] ?? []), eventId];
        const decided = await choose(store, pack, state.checkpoint, optionIds[0] ?? "");
        if (!decided.ok) throw new Error("choice failed");
        state = decided.state;
      }
      if (state.kind !== "settlement") throw new Error("expected settlement");
      const settled = await settle(store, pack, state.checkpoint);
      if (!settled.ok || settled.state.kind !== "report") throw new Error("settlement failed");
      current = settled.state.checkpoint;
      weeks.push(current.week);
    }

    expect(weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // Fund policy in week 1 made the rider an ally: the follow-up opens in week 7 and the shared
    // crisis in week 10, each taking one of that week's two slots.
    expect(shown[7]).toEqual(["var.rider_voice_followup.engaged", "evt.test.week_beat"]);
    expect(shown[10]).toEqual(["evt.proof.public_rider_dispute", "evt.test.week_beat"]);
    expect(shown[6]).toEqual(["evt.test.week_beat", "evt.test.week_beat"]);
    expect(current.pendingCallbacks).toEqual([]);
    expect(current.resolvedCallbacks.map((r) => [r.callbackId, r.week])).toEqual([
      ["cb.rider_voice_followup", 7],
      ["cb.public_rider_dispute", 10],
    ]);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    // 1 start + 2 choices + settle of week 1, then (advance, 2 choices, settle) for weeks 2-12.
    expect(stored.checkpoint.sequence).toBe(1 + 2 + 1 + 4 * 11);

    const done = await nextWeek(store, pack, current);
    expect(done.ok && done.state.kind).toBe("complete");
  });

  it("does not complete the prototype while required callbacks are pending: the report stays and nothing is saved", async () => {
    const ctx = newStore();
    const pending = {
      callbackId: "cb.public_rider_dispute",
      scheduledWeek: 1,
      sourceEventId: "evt.proof.rider_claim",
      sourceOptionId: "opt.rider_claim.fund_policy",
    };
    const seeded = await ctx.inner.commit(
      seedDraft(resolvedSettlementAt(ctx.pack, 12, { pendingCallbacks: [pending] })),
    );
    if (!seeded.ok || seeded.value.phase !== "settlement") throw new Error("setup failed");
    const settled = await settle(ctx.store, ctx.pack, seeded.value);
    if (!settled.ok || settled.state.kind !== "report") throw new Error("settlement failed");
    const before = await ctx.inner.load();
    const commits = ctx.store.commits.length;

    const refused = await nextWeek(ctx.store, ctx.pack, settled.state.checkpoint);

    expect(refused).toMatchObject({ ok: false, error: "pending-callbacks" });
    expect(ctx.store.commits).toHaveLength(commits);
    expect(await ctx.inner.load()).toEqual(before);
    expect(before).toMatchObject({ status: "ready", checkpoint: { phase: "report", week: 12 } });
  });

  it("settles week 12 and then closes the prototype instead of opening week 13", async () => {
    const ctx = newStore();
    const seeded = await ctx.inner.commit(seedDraft(resolvedSettlementAt(ctx.pack, 12)));
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
