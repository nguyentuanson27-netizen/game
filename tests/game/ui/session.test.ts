import { openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap, recover, resetCampaign } from "../../../src/game/ui/session.ts";
import { firstDraft, nextDraft, proofPack, spyOn, uniqueDbName } from "../helpers.ts";

const open: Array<{ close(): Promise<void> }> = [];
function setup() {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  open.push(inner);
  return { name, inner, store: spyOn(inner), pack: proofPack() };
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

const RIDER_CLAIM_OPTIONS = [
  "opt.rider_claim.fund_policy",
  "opt.rider_claim.decline",
  "opt.rider_claim.settle_and_part",
];

describe("starting and resuming the first event", () => {
  it("saves the chosen active event before it can be presented", async () => {
    const { store, inner, pack } = setup();
    const release = store.holdNextCommit();

    let presented = false;
    const booting = bootstrap(store, pack).then((state) => {
      presented = state.kind === "event";
      return state;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    // The commit has been requested but has not completed: nothing may be presented yet.
    expect(store.commits).toHaveLength(1);
    expect(presented).toBe(false);
    expect(await inner.load()).toEqual({ status: "empty" });

    release();
    const state = await booting;

    expect(state.kind).toBe("event");
    const stored = await inner.load();
    expect(stored.status).toBe("ready");
    if (state.kind !== "event" || stored.status !== "ready") return;
    expect(stored.checkpoint).toEqual(state.checkpoint);
    expect(stored.checkpoint).toMatchObject({
      sequence: 1,
      parentSequence: null,
      week: 1,
      phase: "event",
      weekDecisions: [],
      activeEvent: { eventId: "evt.proof.rider_claim", optionIds: RIDER_CLAIM_OPTIONS },
    });
    expect(state.presented.options.map((o) => o.id)).toEqual(RIDER_CLAIM_OPTIONS);
  });

  it("starts from the D4 state and the authored initial relationship", async () => {
    const { store, pack } = setup();

    const state = await bootstrap(store, pack);

    if (state.kind !== "event") throw new Error(`unexpected ${state.kind}`);
    expect(state.checkpoint.metrics).toEqual({
      cash: 50,
      riderNetwork: 50,
      merchantNetwork: 40,
      publicTrust: 50,
    });
    expect(state.checkpoint.npcStatus).toEqual({ "npc.recurring_rider": "neutral" });
    expect(state.checkpoint.policies).toEqual([]);
    expect(state.checkpoint.memories).toEqual([]);
  });

  it("reopens on the same event and options without saving or rerolling", async () => {
    const { store, pack } = setup();
    const first = await bootstrap(store, pack);
    if (first.kind !== "event") throw new Error("setup failed");

    const reopened = await bootstrap(store, pack);

    expect(reopened).toEqual(first);
    expect(store.commits).toHaveLength(1);
  });

  it("resumes from a fresh store instance on the same database, as after a reload", async () => {
    const { name, store, pack } = setup();
    const first = await bootstrap(store, pack);
    if (first.kind !== "event") throw new Error("setup failed");

    const reloaded = createIdbCheckpointStore(name);
    open.push(reloaded);
    const resumed = await bootstrap(reloaded, pack);

    expect(resumed).toEqual(first);
  });

  it("blocks presentation when the first save fails, then retries to exactly one checkpoint", async () => {
    const { store, inner, pack } = setup();
    store.failNextCommits(1);

    const failed = await bootstrap(store, pack);

    expect(failed).toMatchObject({ kind: "save-error", error: "write-failed" });
    expect(await inner.load()).toEqual({ status: "empty" });

    const retried = await bootstrap(store, pack);

    expect(retried.kind).toBe("event");
    expect((await inner.load()).status).toBe("ready");
    // Both attempts built the same draft: there is no reroll between attempts.
    expect(store.commits[0]).toEqual(store.commits[1]);
    if (retried.kind === "event") expect(retried.checkpoint.sequence).toBe(1);
  });

  it("converges two concurrent starts on one checkpoint instead of overwriting", async () => {
    const { store, inner, pack } = setup();

    const [a, b] = await Promise.all([bootstrap(store, pack), bootstrap(store, pack)]);

    expect(a.kind).toBe("event");
    expect(b.kind).toBe("event");
    const stored = await inner.load();
    if (stored.status !== "ready" || a.kind !== "event" || b.kind !== "event") throw new Error("x");
    expect(stored.checkpoint.sequence).toBe(1);
    expect(a.checkpoint).toEqual(stored.checkpoint);
    expect(b.checkpoint).toEqual(stored.checkpoint);
  });
});

describe("recovery and protection at the session level", () => {
  async function savedTwice() {
    const ctx = setup();
    const first = await ctx.inner.commit(firstDraft());
    if (!first.ok) throw new Error("setup failed");
    const second = await ctx.inner.commit(nextDraft(first.value));
    if (!second.ok) throw new Error("setup failed");
    return { ...ctx, first: first.value, second: second.value };
  }

  async function corrupt(name: string, key: "current" | "previous", value: unknown) {
    const db = await openDB(name, 1);
    await db.put("checkpoints", value, key);
    db.close();
  }

  it("asks before recovering the previous checkpoint, then resumes it", async () => {
    const { name, store, pack, first } = await savedTwice();
    await corrupt(name, "current", { schemaVersion: 1, nonsense: true });

    const asked = await bootstrap(store, pack);
    expect(asked).toEqual({ kind: "recover", previous: first });

    const recovered = await recover(store, pack, first);
    expect(recovered.kind).toBe("event");
    if (recovered.kind === "event") expect(recovered.checkpoint).toEqual(first);
  });

  it("blocks an unsupported newer save without writing to it", async () => {
    const { name, store, inner, pack } = await savedTwice();
    const future = { schemaVersion: 2, sequence: 7, extra: "kept" };
    await corrupt(name, "current", future);
    const writesBefore = store.commits.length;

    const state = await bootstrap(store, pack);

    expect(state).toEqual({ kind: "unsupported", schemaVersion: 2 });
    expect(store.commits).toHaveLength(writesBefore);
    const db = await openDB(name, 1);
    expect(await db.get("checkpoints", "current")).toEqual(future);
    db.close();
    expect((await inner.load()).status).toBe("unsupported");
  });

  it("reports an unusable save and only a confirmed reset starts a new campaign", async () => {
    const { name, store, pack } = setup();
    await store.load();
    await corrupt(name, "current", "garbage");

    const blocked = await bootstrap(store, pack);
    expect(blocked).toEqual({ kind: "unusable" });
    expect(store.commits).toHaveLength(0);

    const fresh = await resetCampaign(store, pack);
    expect(fresh.kind).toBe("event");
  });

  it("refuses to present a checkpoint that disagrees with the content, leaving it untouched", async () => {
    const { store, inner, pack } = setup();
    const draft = firstDraft();
    const bad = {
      ...draft,
      activeEvent: { ...draft.activeEvent, optionIds: draft.activeEvent.optionIds.slice(0, 2) },
    };
    const saved = await inner.commit(bad);
    if (!saved.ok) throw new Error("setup failed");

    const state = await bootstrap(store, pack);

    expect(state).toMatchObject({ kind: "invalid-checkpoint" });
    expect(await inner.load()).toEqual({ status: "ready", checkpoint: saved.value });
    expect(store.commits).toHaveLength(0);
  });
});
