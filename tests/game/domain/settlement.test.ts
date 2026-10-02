import { describe, expect, it } from "vitest";
import histories from "../../../content/prototype/proof-histories.json";
import { resolveChoice } from "../../../src/game/domain/resolveChoice.ts";
import {
  computeSettlement,
  FAILURE_CASH_THRESHOLD,
  settleWeek,
} from "../../../src/game/domain/settlement.ts";
import { INITIAL_METRICS, initialCampaignState } from "../../../src/game/domain/worldState.ts";
import {
  PROBE_HISTORY_A,
  PROBE_HISTORY_B,
  probeChainPack,
  proofPack,
  replayToSettlement,
  startAt,
} from "../helpers.ts";

const base = () => initialCampaignState(proofPack());
const settle = (over: Partial<ReturnType<typeof base>> = {}) =>
  computeSettlement({ ...base(), ...over }, 1);

describe("D4 settlement arithmetic", () => {
  it("settles the baseline week: 18 deliveries + 12 rides, gross 72, cost 65, cash +7", () => {
    expect(settle()).toEqual({
      week: 1,
      deliveryJobs: 18,
      rideJobs: 12,
      grossIncome: 72,
      weeklyCost: 65,
      cashDelta: 7,
    });
  });

  it("truncates the factors toward zero and clamps jobs to 0..40 and 0..30", () => {
    // 45 -> -0.5 -> 0 ; 39 -> -1.1 -> -1 ; trust 36 -> -14/15 -> 0 ; trust 34 -> -1.07 -> -1
    expect(settle({ metrics: { ...INITIAL_METRICS, riderNetwork: 45 } })).toMatchObject({
      deliveryJobs: 18,
      rideJobs: 12,
    });
    expect(settle({ metrics: { ...INITIAL_METRICS, riderNetwork: 39 } })).toMatchObject({
      deliveryJobs: 17,
      rideJobs: 11,
    });
    expect(settle({ metrics: { ...INITIAL_METRICS, publicTrust: 36 } }).rideJobs).toBe(12);
    expect(settle({ metrics: { ...INITIAL_METRICS, publicTrust: 34 } }).rideJobs).toBe(11);

    const maxed = settle({
      metrics: { ...INITIAL_METRICS, riderNetwork: 100, merchantNetwork: 100, publicTrust: 100 },
      demandModifiers: { delivery: 50, ride: 50 },
    });
    expect(maxed).toMatchObject({ deliveryJobs: 40, rideJobs: 30, grossIncome: 40 * 2 + 30 * 3 });
    const floored = settle({ demandModifiers: { delivery: -99, ride: -99 } });
    expect(floored).toMatchObject({ deliveryJobs: 0, rideJobs: 0, grossIncome: 0, cashDelta: -65 });
  });

  it("uses both bicycle services: each service has its own merchant/trust/demand inputs", () => {
    const merchants = settle({ metrics: { ...INITIAL_METRICS, merchantNetwork: 70 } });
    expect(merchants).toMatchObject({ deliveryJobs: 21, rideJobs: 12 });

    const trust = settle({ metrics: { ...INITIAL_METRICS, publicTrust: 80 } });
    expect(trust).toMatchObject({ deliveryJobs: 18, rideJobs: 14 });

    const riders = settle({ metrics: { ...INITIAL_METRICS, riderNetwork: 70 } });
    expect(riders).toMatchObject({ deliveryJobs: 20, rideJobs: 14 });

    const demand = settle({ demandModifiers: { delivery: 3, ride: -2 } });
    expect(demand).toMatchObject({ deliveryJobs: 21, rideJobs: 10, grossIncome: 21 * 2 + 10 * 3 });
  });

  it("charges the sum of every recurring policy cost", () => {
    const result = settle({
      recurringCosts: { "policy.rider_support_fund": 9, "policy.rider_review_seat": 2 },
    });

    expect(result).toMatchObject({ weeklyCost: 76, cashDelta: 72 - 76 });
  });
});

describe("contrasting policy histories from G0 and the T18 fixture", () => {
  const pack = proofPack();
  const afterSetup = (optionId: string) => {
    const resolved = resolveChoice(pack, startAt(pack, 1), optionId);
    if (!resolved.ok) throw new Error(resolved.message);
    return resolved.draft;
  };
  const jobs = (s: ReturnType<typeof computeSettlement>) => ({
    deliveries: s.deliveryJobs,
    rides: s.rideJobs,
    gross: s.grossIncome,
    cost: s.weeklyCost,
    cashDelta: s.cashDelta,
  });
  const byId = (id: string) => histories.histories.find((h) => h.id === id);

  it("history A (rider-support fund): 19 + 13, gross 77, cost 71, cash +6", () => {
    expect(jobs(computeSettlement(afterSetup("opt.rider_claim.fund_policy"), 1))).toEqual({
      deliveries: 19,
      rides: 13,
      gross: 77,
      cost: 71,
      cashDelta: 6,
    });
  });

  it("history B (decline): 17 + 11, gross 67, cost 65, cash +2", () => {
    expect(jobs(computeSettlement(afterSetup("opt.rider_claim.decline"), 1))).toEqual({
      deliveries: 17,
      rides: 11,
      gross: 67,
      cost: 65,
      cashDelta: 2,
    });
  });

  it("matches the fixture's paper settlement for A, B and the changed-context probe C", () => {
    const cases: Array<[string, string]> = [
      ["history.a_rider_support", "opt.rider_claim.fund_policy"],
      ["history.b_decline", "opt.rider_claim.decline"],
      ["history.c_changed_context_probe", "opt.rider_claim.settle_and_part"],
    ];
    for (const [historyId, optionId] of cases) {
      const paper = byId(historyId)?.paperSettlementWeek3;
      expect(jobs(computeSettlement(afterSetup(optionId), 3)), historyId).toEqual(paper);
    }
  });

  it("matches the fixture's week-10 paper settlement after the full A and B paths", () => {
    // Replays setup -> follow-up variant -> shared crisis inside one week by planning plain copies
    // of the three authored nodes into week 3; the fixture's numbers depend only on the effects.
    const paths = probeChainPack("engaged");
    const pathsB = probeChainPack("aggrieved");
    const a = replayToSettlement(paths, 3, PROBE_HISTORY_A);
    const b = replayToSettlement(pathsB, 3, PROBE_HISTORY_B);

    const toPaper = (s: ReturnType<typeof computeSettlement>) => ({
      deliveries: s.deliveryJobs,
      rides: s.rideJobs,
      gross: s.grossIncome,
      cost: s.weeklyCost,
      cashDelta: s.cashDelta,
    });
    expect(toPaper(computeSettlement(a, 10))).toEqual(
      byId("history.a_rider_support")?.paperSettlementWeek10,
    );
    expect(toPaper(computeSettlement(b, 10))).toEqual(
      byId("history.b_decline")?.paperSettlementWeek10,
    );
  });
});

describe("settling a committed week", () => {
  const pack = proofPack();
  const FUND_THEN_SHIFT = ["opt.rider_claim.fund_policy", "opt.routine.rainy_week.rain_gear"];
  const settlementCheckpoint = () => replayToSettlement(pack, 1, FUND_THEN_SHIFT);

  it("adds the cash delta once and leaves every other committed effect alone", () => {
    const before = settlementCheckpoint();

    const draft = settleWeek(before);

    // 19 + 13 jobs, gross 77, cost 65 + 6 = 71, cash 50 - 3 (extra shift) + 6.
    expect(draft).toMatchObject({
      phase: "report",
      activeEvent: null,
      parentSequence: before.sequence,
      week: 1,
      metrics: { cash: 53, riderNetwork: 62, merchantNetwork: 40, publicTrust: 50 },
      settlement: {
        week: 1,
        deliveryJobs: 19,
        rideJobs: 13,
        grossIncome: 77,
        weeklyCost: 71,
        cashDelta: 6,
      },
    });
    expect(draft.policies).toEqual(before.policies);
    expect(draft.memories).toEqual(before.memories);
    expect(draft.npcStatus).toEqual(before.npcStatus);
    expect(draft.recurringCosts).toEqual(before.recurringCosts);
    expect(draft.pendingCallbacks).toEqual(before.pendingCallbacks);
    expect(draft.weekDecisions).toEqual(before.weekDecisions);
    expect(draft.resolvedEventIds).toEqual(before.resolvedEventIds);
  });

  it("is pure", () => {
    const before = settlementCheckpoint();
    const snapshot = structuredClone(before);

    settleWeek(before);

    expect(before).toEqual(snapshot);
  });

  it("enters the explicit failed state only when cash after settlement is below -25", () => {
    const at = (cash: number) => {
      const checkpoint = settlementCheckpoint();
      return settleWeek({
        ...checkpoint,
        metrics: { ...checkpoint.metrics, cash },
        // Clear the fund so the delta is the plain +7 baseline-ish: assert on the cash instead.
        recurringCosts: {},
      });
    };
    // Fixture state: riderNetwork 62 -> 19 + 13 jobs, gross 77, cost 65 -> cashDelta +12.
    expect(FAILURE_CASH_THRESHOLD).toBe(-25);
    expect(at(-37)).toMatchObject({ phase: "report", metrics: { cash: -25 } });
    expect(at(-38)).toMatchObject({ phase: "failed", metrics: { cash: -26 } });
    expect(at(-60)).toMatchObject({ phase: "failed" });
  });
});
