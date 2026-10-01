import { afterEach, describe, expect, it } from "vitest";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap } from "../../../src/game/ui/session.ts";
import { BOUNDARIES, type Boundary, type Ctx, newCtx } from "./boundaries.ts";
import { type Fault, type FaultKind, injectPutFault, lostAck, rawSlots, SECRET } from "./faults.ts";

const ctxs: Ctx[] = [];
const faults: Fault[] = [];
function fresh(): Ctx {
  const ctx = newCtx();
  ctxs.push(ctx);
  return ctx;
}
afterEach(async () => {
  for (const fault of faults.splice(0)) fault.restore();
  await Promise.all(ctxs.splice(0).map((c) => c.store.close()));
});

/** The slots after a fault-free run of the boundary: the only acceptable end state. */
async function golden(boundary: Boundary) {
  const ctx = fresh();
  await boundary.prepare(ctx);
  const result = await boundary.act(ctx);
  expect(result.ok, `${boundary.name} fault-free`).toBe(true);
  return rawSlots(ctx.name);
}

const cases: Array<{ boundary: Boundary; kind: FaultKind; at: number }> = BOUNDARIES.flatMap(
  (boundary) =>
    (["throw", "abort"] as const).flatMap((kind) =>
      Array.from({ length: boundary.puts }, (_, i) => ({ boundary, kind, at: i + 1 })),
    ),
);

describe("save failure at every write boundary (AC-05)", () => {
  for (const { boundary, kind, at } of cases) {
    it(`${boundary.name}: ${kind} on put ${at} writes nothing, blocks progress, and retry lands exactly once`, async () => {
      const expected = await golden(boundary);
      const ctx = fresh();
      await boundary.prepare(ctx);
      const before = await rawSlots(ctx.name);

      const fault = injectPutFault(kind, at);
      faults.push(fault);
      const failed = await boundary.act(ctx);
      fault.restore();

      // The failure fired, was reported, and left both slots exactly as they were.
      expect(fault.fired).toBe(true);
      expect(failed.ok).toBe(false);
      expect(await rawSlots(ctx.name)).toEqual(before);
      // The error carries no browser message, so no payload or secret can leak through it.
      expect(JSON.stringify(failed)).not.toContain(SECRET);

      // Reopening without retrying resumes the previous complete state, never a mixture, and
      // nothing is saved or reset on the way. (The very first save has no earlier state.)
      if (before.current) {
        const reopened = createIdbCheckpointStore(ctx.name);
        try {
          const state = await bootstrap(reopened, ctx.pack);
          expect(["event", "settlement", "report", "complete"]).toContain(state.kind);
          expect(await rawSlots(ctx.name)).toEqual(before);
        } finally {
          await reopened.close();
        }
      }

      // Retrying applies the action exactly once: the end state equals the fault-free run.
      const retried = await boundary.act(ctx);
      expect(retried.ok).toBe(true);
      expect(await rawSlots(ctx.name)).toEqual(expected);
    });
  }
});

describe("a write that committed but whose acknowledgement was lost (AC-05)", () => {
  for (const boundary of BOUNDARIES.filter((b) => b.name !== "initial active-event save")) {
    it(`${boundary.name}: the old checkpoint cannot be replayed, and reload shows the committed state once`, async () => {
      const expected = await golden(boundary);
      const ctx = fresh();
      await boundary.prepare(ctx);
      const loaded = await ctx.store.load();
      if (loaded.status !== "ready") throw new Error("setup failed");
      const held = loaded.checkpoint; // what the UI still holds after the "failure"

      const lossy = {
        ...ctx,
        store: Object.assign(lostAck(ctx.store), { close: ctx.store.close }),
      };
      const failed = await boundary.act(lossy, held);
      expect(failed).toMatchObject({ ok: false });
      expect(lossy.store.lost).toBe(1);

      // Retrying from the stale in-memory checkpoint is rejected rather than applied twice.
      const replay = await boundary.act(ctx, held);
      expect(replay).toMatchObject({ ok: false, error: "stale" });

      // Reloading shows the one committed result, identical to a fault-free run.
      const state = await bootstrap(ctx.store, ctx.pack);
      expect(state.kind).not.toBe("save-error");
      expect(await rawSlots(ctx.name)).toEqual(expected);
    });
  }
});
