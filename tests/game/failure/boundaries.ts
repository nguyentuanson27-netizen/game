import type { ContentPack } from "../../../src/game/content/loader.ts";
import type { Checkpoint } from "../../../src/game/persistence/checkpoint.ts";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import type { CheckpointStore } from "../../../src/game/persistence/store.ts";
import { bootstrap, choose, nextWeek, settle } from "../../../src/game/ui/session.ts";
import { proofPack, seedDraft, settlementAt, uniqueDbName } from "../helpers.ts";

export interface Ctx {
  name: string;
  store: CheckpointStore & { close(): Promise<void> };
  pack: ContentPack;
}

export interface Boundary {
  name: string;
  /** Number of `put`s in this boundary's write transaction. */
  puts: number;
  /** Reach the state just before the write, using only fault-free actions. */
  prepare(ctx: Ctx): Promise<void>;
  /** Perform the write. `from` is the checkpoint the UI would still hold (defaults to the stored one). */
  act(ctx: Ctx, from?: Checkpoint): Promise<{ ok: boolean; error?: string; message?: string }>;
}

export function newCtx(): Ctx {
  const name = uniqueDbName();
  return { name, store: createIdbCheckpointStore(name), pack: proofPack() };
}

async function stored(ctx: Ctx): Promise<Checkpoint> {
  const loaded = await ctx.store.load();
  if (loaded.status !== "ready") throw new Error(`expected a ready save, got ${loaded.status}`);
  return loaded.checkpoint;
}

const must = <T extends { ok: boolean; message?: string }>(r: T, what: string): T => {
  if (!r.ok) throw new Error(`${what} failed: ${r.message}`);
  return r;
};

async function playWeekOne(ctx: Ctx) {
  await bootstrap(ctx.store, ctx.pack);
  for (const optionId of ["opt.rider_claim.fund_policy", "opt.fallback.arrange_extra_shift"]) {
    const cp = await stored(ctx);
    if (cp.phase !== "event") throw new Error("expected an event");
    must(await choose(ctx.store, ctx.pack, cp, optionId), "choice");
  }
}

async function settleStored(ctx: Ctx) {
  const cp = await stored(ctx);
  if (cp.phase !== "settlement") throw new Error("expected settlement");
  must(await settle(ctx.store, ctx.pack, cp), "settlement");
}

export const BOUNDARIES: Boundary[] = [
  {
    name: "initial active-event save",
    puts: 1,
    prepare: async () => {},
    act: async (ctx) => {
      const state = await bootstrap(ctx.store, ctx.pack);
      return state.kind === "event"
        ? { ok: true }
        : { ok: false, error: state.kind, message: "message" in state ? state.message : undefined };
    },
  },
  {
    name: "choice save",
    puts: 2,
    prepare: async (ctx) => {
      await bootstrap(ctx.store, ctx.pack);
    },
    act: async (ctx, from) => {
      const cp = from ?? (await stored(ctx));
      if (cp.phase !== "event") throw new Error("expected an event");
      return choose(ctx.store, ctx.pack, cp, "opt.rider_claim.fund_policy");
    },
  },
  {
    name: "last-choice save (week enters settlement)",
    puts: 2,
    prepare: async (ctx) => {
      await bootstrap(ctx.store, ctx.pack);
      const cp = await stored(ctx);
      if (cp.phase !== "event") throw new Error("expected an event");
      must(await choose(ctx.store, ctx.pack, cp, "opt.rider_claim.decline"), "choice");
    },
    act: async (ctx, from) => {
      const cp = from ?? (await stored(ctx));
      if (cp.phase !== "event") throw new Error("expected an event");
      return choose(ctx.store, ctx.pack, cp, "opt.fallback.leave_roster_as_is");
    },
  },
  {
    name: "settlement save",
    puts: 2,
    prepare: playWeekOne,
    act: async (ctx, from) => {
      const cp = from ?? (await stored(ctx));
      if (cp.phase !== "settlement") throw new Error("expected settlement");
      return settle(ctx.store, ctx.pack, cp);
    },
  },
  {
    name: "Next Week save",
    puts: 2,
    prepare: async (ctx) => {
      await playWeekOne(ctx);
      await settleStored(ctx);
    },
    act: async (ctx, from) => {
      const cp = from ?? (await stored(ctx));
      if (cp.phase !== "report") throw new Error("expected a report");
      return nextWeek(ctx.store, ctx.pack, cp);
    },
  },
  {
    name: "week-12 Prototype Complete save",
    puts: 2,
    prepare: async (ctx) => {
      const seeded = await ctx.store.commit(seedDraft(settlementAt(ctx.pack, 12)));
      must(seeded, "seed");
      await settleStored(ctx);
    },
    act: async (ctx, from) => {
      const cp = from ?? (await stored(ctx));
      if (cp.phase !== "report") throw new Error("expected a report");
      return nextWeek(ctx.store, ctx.pack, cp);
    },
  },
];
