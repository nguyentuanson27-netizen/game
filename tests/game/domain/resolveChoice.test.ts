import { describe, expect, it } from "vitest";
import { resolveChoice } from "../../../src/game/domain/resolveChoice.ts";
import type { EventCheckpoint } from "../../../src/game/persistence/checkpoint.ts";
import { firstDraft, proofPack } from "../helpers.ts";

const pack = proofPack();
const initial = (): EventCheckpoint => ({ ...firstDraft(), sequence: 1 });

function resolve(checkpoint: EventCheckpoint, optionId: string) {
  const result = resolveChoice(pack, checkpoint, optionId);
  if (!result.ok) throw new Error(result.message);
  return result.draft;
}

const SOURCE = { eventId: "evt.proof.rider_claim" };
const FALLBACK_OPTIONS = ["opt.fallback.arrange_extra_shift", "opt.fallback.leave_roster_as_is"];

describe("resolving one choice into one complete checkpoint", () => {
  it("fund_policy commits metrics, policy, recurring cost, relationship, precedent and callbacks together", () => {
    const draft = resolve(initial(), "opt.rider_claim.fund_policy");

    expect(draft).toMatchObject({
      parentSequence: 1,
      week: 1,
      phase: "event",
      metrics: { cash: 50, riderNetwork: 60, merchantNetwork: 40, publicTrust: 50 },
      policies: ["policy.rider_support_fund"],
      recurringCosts: { "policy.rider_support_fund": 6 },
      npcStatus: { "npc.recurring_rider": "ally" },
      memories: ["prec.rider_dispute.negotiated", "mem.rider_claim_on_record"],
      weekDecisions: [{ slot: 1, ...SOURCE, optionId: "opt.rider_claim.fund_policy" }],
    });
    expect(draft.pendingCallbacks).toEqual([
      {
        callbackId: "cb.rider_voice_followup",
        scheduledWeek: 1,
        sourceEventId: "evt.proof.rider_claim",
        sourceOptionId: "opt.rider_claim.fund_policy",
      },
      {
        callbackId: "cb.public_rider_dispute",
        scheduledWeek: 1,
        sourceEventId: "evt.proof.rider_claim",
        sourceOptionId: "opt.rider_claim.fund_policy",
      },
    ]);
  });

  it("evaluates the next slot against the updated state in the same draft", () => {
    const draft = resolve(initial(), "opt.rider_claim.fund_policy");

    expect(draft.phase).toBe("event");
    expect(draft.activeEvent).toEqual({
      eventId: "evt.proof.fallback_shift_roster",
      optionIds: FALLBACK_OPTIONS,
    });
  });

  it("decline sets the declined precedent and a resentful rider without a policy", () => {
    const draft = resolve(initial(), "opt.rider_claim.decline");

    expect(draft).toMatchObject({
      metrics: { riderNetwork: 40, cash: 50 },
      policies: [],
      recurringCosts: {},
      npcStatus: { "npc.recurring_rider": "resentful" },
      memories: ["prec.rider_dispute.declined", "mem.rider_claim_on_record"],
    });
    expect(draft.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
  });

  it("settle_and_part spends cash and marks the rider departed", () => {
    const draft = resolve(initial(), "opt.rider_claim.settle_and_part");

    expect(draft).toMatchObject({
      metrics: { cash: 42, riderNetwork: 45 },
      npcStatus: { "npc.recurring_rider": "departed" },
      memories: ["prec.rider_dispute.suppressed", "mem.rider_claim_on_record"],
    });
  });

  it("ends the week's decisions with a settlement-phase checkpoint and no active event", () => {
    const afterFirst = { ...resolve(initial(), "opt.rider_claim.decline"), sequence: 2 };
    if (afterFirst.phase !== "event") throw new Error("expected event phase");

    const draft = resolve(afterFirst, "opt.fallback.leave_roster_as_is");

    expect(draft).toMatchObject({
      phase: "settlement",
      activeEvent: null,
      parentSequence: 2,
      metrics: { cash: 52, publicTrust: 48, riderNetwork: 40 },
      weekDecisions: [
        { slot: 1, optionId: "opt.rider_claim.decline" },
        { slot: 2, eventId: "evt.proof.fallback_shift_roster" },
      ],
    });
  });

  it("clamps networks and trust to 0..100 but lets cash go below zero", () => {
    const high = { ...initial(), metrics: { ...initial().metrics, riderNetwork: 95 } };
    expect(resolve(high, "opt.rider_claim.fund_policy").metrics.riderNetwork).toBe(100);

    const low = { ...initial(), metrics: { ...initial().metrics, riderNetwork: 3, cash: -30 } };
    expect(resolve(low, "opt.rider_claim.settle_and_part").metrics).toMatchObject({
      riderNetwork: 0,
      cash: -38,
    });
  });

  it("never duplicates a policy, memory or pending callback and adds recurring cost per effect", () => {
    const base = initial();
    const repeated: EventCheckpoint = {
      ...base,
      policies: ["policy.rider_support_fund"],
      memories: ["mem.rider_claim_on_record"],
      recurringCosts: { "policy.rider_support_fund": 6 },
      pendingCallbacks: [
        {
          callbackId: "cb.rider_voice_followup",
          scheduledWeek: 1,
          sourceEventId: "evt.proof.rider_claim",
          sourceOptionId: "opt.rider_claim.fund_policy",
        },
      ],
    };

    const draft = resolve(repeated, "opt.rider_claim.fund_policy");

    expect(draft.policies).toEqual(["policy.rider_support_fund"]);
    expect(draft.memories).toEqual(["mem.rider_claim_on_record", "prec.rider_dispute.negotiated"]);
    expect(draft.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
    expect(draft.recurringCosts).toEqual({ "policy.rider_support_fund": 12 });
  });

  it("rejects an option that was not selectable when the event was saved", () => {
    expect(resolveChoice(pack, initial(), "opt.fallback.arrange_extra_shift")).toMatchObject({
      ok: false,
      reason: "not-selectable",
    });
    const trimmed: EventCheckpoint = {
      ...initial(),
      activeEvent: {
        eventId: "evt.proof.rider_claim",
        optionIds: ["opt.rider_claim.fund_policy", "opt.rider_claim.decline"],
      },
    };
    expect(resolveChoice(pack, trimmed, "opt.rider_claim.settle_and_part")).toMatchObject({
      ok: false,
      reason: "not-selectable",
    });
  });

  it("is pure: the committed checkpoint it was given is not mutated", () => {
    const checkpoint = initial();
    const snapshot = structuredClone(checkpoint);

    resolve(checkpoint, "opt.rider_claim.fund_policy");

    expect(checkpoint).toEqual(snapshot);
  });
});
