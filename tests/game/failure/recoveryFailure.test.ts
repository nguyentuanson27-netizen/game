import { afterEach, describe, expect, it } from "vitest";
import { choose } from "../../../src/game/ui/session.ts";
import { corruptSlot, firstDraft, nextDraft, proofPack } from "../helpers.ts";
import { newCtx } from "./boundaries.ts";
import { type Fault, injectDeleteFault, injectPutFault, rawSlots, SECRET } from "./faults.ts";

const faults: Fault[] = [];
const closers: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fault of faults.splice(0)) fault.restore();
  await Promise.all(closers.splice(0).map((close) => close()));
});

async function twoSavesWithBrokenCurrent() {
  const ctx = newCtx();
  closers.push(() => ctx.store.close());
  const first = await ctx.store.commit(firstDraft());
  if (!first.ok) throw new Error("setup failed");
  const second = await ctx.store.commit(nextDraft(first.value));
  if (!second.ok) throw new Error("setup failed");
  await corruptSlot(ctx.name, "current", { schemaVersion: 1, broken: true });
  return { ctx, first: first.value };
}

describe("failed recovery and reset (D3)", () => {
  it("a failed promotion leaves the corrupt current and the valid previous untouched, and retry recovers", async () => {
    const { ctx, first } = await twoSavesWithBrokenCurrent();
    const before = await rawSlots(ctx.name);

    const fault = injectPutFault("throw", 1);
    faults.push(fault);
    const failed = await ctx.store.recoverFromPrevious(first.sequence);
    fault.restore();

    expect(fault.fired).toBe(true);
    expect(failed).toMatchObject({
      ok: false,
      error: "write-failed",
      message: "QuotaExceededError",
    });
    expect(JSON.stringify(failed)).not.toContain(SECRET);
    expect(await rawSlots(ctx.name)).toEqual(before);
    expect(await ctx.store.load()).toEqual({ status: "recoverable", previous: first });

    expect(await ctx.store.recoverFromPrevious(first.sequence)).toEqual({ ok: true, value: first });
    expect(await ctx.store.load()).toEqual({ status: "ready", checkpoint: first });
  });

  it("an aborted promotion rolls back as a unit", async () => {
    const { ctx, first } = await twoSavesWithBrokenCurrent();
    const before = await rawSlots(ctx.name);

    const fault = injectPutFault("abort", 1);
    faults.push(fault);
    const failed = await ctx.store.recoverFromPrevious(first.sequence);
    fault.restore();

    expect(failed).toMatchObject({ ok: false, error: "write-failed", message: "AbortError" });
    expect(await rawSlots(ctx.name)).toEqual(before);
  });

  it("a recovered checkpoint can be saved from again, deriving from the recovered sequence", async () => {
    const { ctx, first } = await twoSavesWithBrokenCurrent();
    await ctx.store.recoverFromPrevious(first.sequence);
    const pack = proofPack();
    if (first.phase !== "event") throw new Error("expected an event");

    const chosen = await choose(ctx.store, pack, first, "opt.rider_claim.decline");

    expect(chosen.ok).toBe(true);
    const slots = await rawSlots(ctx.name);
    expect(slots.current).toMatchObject({
      sequence: first.sequence + 1,
      parentSequence: first.sequence,
    });
    expect(slots.previous).toEqual(first);
  });

  it("a failed reset clears nothing and retry clears once; a usable save is never cleared", async () => {
    const ctx = newCtx();
    closers.push(() => ctx.store.close());
    await ctx.store.load();
    await corruptSlot(ctx.name, "current", "garbage");
    await corruptSlot(ctx.name, "previous", 42);
    const before = await rawSlots(ctx.name);

    const fault = injectDeleteFault();
    faults.push(fault);
    const failed = await ctx.store.reset();
    fault.restore();

    expect(failed).toMatchObject({
      ok: false,
      error: "write-failed",
      message: "QuotaExceededError",
    });
    expect(JSON.stringify(failed)).not.toContain(SECRET);
    expect(await rawSlots(ctx.name)).toEqual(before);
    expect((await ctx.store.load()).status).toBe("unusable");

    expect(await ctx.store.reset()).toEqual({ ok: true, value: null });
    expect((await ctx.store.load()).status).toBe("empty");
  });
});
