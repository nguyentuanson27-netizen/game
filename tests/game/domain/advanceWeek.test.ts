import { describe, expect, it } from "vitest";
import { advanceWeek } from "../../../src/game/domain/advanceWeek.ts";
import { reportLines } from "../../../src/game/domain/reportLines.ts";
import { settleWeek } from "../../../src/game/domain/settlement.ts";
import type { ReportCheckpoint } from "../../../src/game/persistence/checkpoint.ts";
import {
  packFrom,
  playablePack,
  proofPack,
  replayToSettlement,
  resolvedSettlementAt,
  settlementAt,
  testEvent,
  testOption,
  weekTwelvePack,
} from "../helpers.ts";

const FUND_THEN_SHIFT = ["opt.rider_claim.fund_policy", "opt.fallback.arrange_extra_shift"];

function reportAfter(pack = playablePack(), optionIds = FUND_THEN_SHIFT): ReportCheckpoint {
  const draft = settleWeek(replayToSettlement(pack, 1, optionIds));
  if (draft.phase !== "report") throw new Error("expected a report");
  return { ...draft, sequence: 4 };
}

function advanced(report: ReportCheckpoint, pack = playablePack()) {
  const result = advanceWeek(pack, report);
  if (!result.ok) throw new Error(result.message);
  return result.draft;
}

describe("Next Week into a week the content has not authored", () => {
  it("is refused for the shipped proof pack: week 2 has no playable slot", () => {
    const pack = proofPack();
    const report = reportAfter(pack);

    const result = advanceWeek(pack, report);

    expect(result).toMatchObject({ ok: false, reason: "no-content" });
    expect(!result.ok && result.message).toContain("week 2");
  });

  it("is refused for every week while the plan has no decisions, never producing a zero-decision week", () => {
    const pack = proofPack();
    for (const week of [1, 5, 11]) {
      const draft = settleWeek(settlementAt(pack, week));
      if (draft.phase !== "report") throw new Error("expected a report");

      expect(advanceWeek(pack, { ...draft, sequence: 2 })).toMatchObject({
        ok: false,
        reason: "no-content",
      });
    }
  });
});

describe("Next Week into a week with too few authored decisions", () => {
  it("is refused for exactly one authored slot: a week needs 2-4 decisions", () => {
    const pack = playablePack([2], 1);
    const report = reportAfter(pack);

    const result = advanceWeek(pack, report);

    expect(result).toMatchObject({ ok: false, reason: "no-content" });
    expect(!result.ok && result.message).toContain("week 2");
  });

  it("is accepted from two authored slots", () => {
    const pack = playablePack([2], 2);

    expect(advanceWeek(pack, reportAfter(pack))).toMatchObject({ ok: true });
  });
});

describe("Next Week (mechanism, on test-only content with a decision in week 2)", () => {
  it("advances exactly one week and resets only the week-local state", () => {
    const report = reportAfter();

    const draft = advanced(report);

    expect(draft).toMatchObject({
      week: 2,
      parentSequence: 4,
      phase: "event",
      activeEvent: { eventId: "evt.test.week_beat" },
      weekDecisions: [],
    });
    expect("settlement" in draft).toBe(false);
  });

  it("preserves the company, policies, relationships, memories, history and pending callbacks", () => {
    const report = reportAfter();

    const draft = advanced(report);

    expect(draft.metrics).toEqual(report.metrics);
    expect(draft.policies).toEqual(report.policies);
    expect(draft.memories).toEqual(report.memories);
    expect(draft.npcStatus).toEqual(report.npcStatus);
    expect(draft.recurringCosts).toEqual(report.recurringCosts);
    expect(draft.demandModifiers).toEqual(report.demandModifiers);
    expect(draft.resolvedEventIds).toEqual(report.resolvedEventIds);
    expect(draft.pendingCallbacks).toEqual(report.pendingCallbacks);
    expect(draft.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
  });

  it("does not settle again: cash and jobs are exactly what settlement committed", () => {
    const report = reportAfter();

    const draft = advanced(report);

    expect(draft.metrics.cash).toBe(report.metrics.cash);
    expect(report.metrics.cash).toBe(53);
  });

  it("opens the new week's first slot from the state settlement just committed", () => {
    // Week 2 offers a beat whose only valid options need the rider-support fund.
    const gated = testEvent("evt.test.week_two_beat", [
      testOption(
        "opt.test.week_two_beat.thank_fund",
        [],
        [{ op: "has", set: "policies", id: "policy.rider_support_fund" }],
      ),
      testOption(
        "opt.test.week_two_beat.praise_fund",
        [],
        [{ op: "has", set: "policies", id: "policy.rider_support_fund" }],
      ),
      testOption("opt.test.week_two_beat.shrug"),
    ]);
    const pack = packFrom((chain, loop) => {
      chain.events.push(gated);
      loop.weeks[1].slots = ["evt.test.week_two_beat", "evt.test.week_two_beat"];
    });

    const withFund = advanced(reportAfter(pack), pack);

    expect(withFund).toMatchObject({ week: 2, phase: "event" });
    expect(withFund.phase === "event" && withFund.activeEvent.optionIds).toEqual([
      "opt.test.week_two_beat.thank_fund",
      "opt.test.week_two_beat.praise_fund",
      "opt.test.week_two_beat.shrug",
    ]);

    // Without the fund only one option is valid. The authored fallback was already used in week 1
    // and is not repeatable, so there is no valid event: advancing is refused, nothing is invented.
    const noFund = reportAfter(pack, [
      "opt.rider_claim.decline",
      "opt.fallback.arrange_extra_shift",
    ]);
    const refused = advanceWeek(pack, noFund);
    expect(refused).toMatchObject({ ok: false, reason: "invalid-content" });
    // An authored week that cannot be presented is a different state from an unauthored week.
    expect(!refused.ok && refused.reason).not.toBe("no-content");
  });

  it("finishes with Prototype Complete after a seeded week-12 report with nothing pending, and never creates week 13", () => {
    const pack = weekTwelvePack();
    const draft = settleWeek(resolvedSettlementAt(pack, 12));
    if (draft.phase !== "report") throw new Error("expected a report");

    const done = advanced({ ...draft, sequence: 2, pendingCallbacks: [] }, pack);

    expect(done).toMatchObject({
      phase: "complete",
      week: 12,
      weekDecisions: [],
      activeEvent: null,
    });
  });

  it("refuses to complete the prototype while required callbacks are still pending", () => {
    const pack = weekTwelvePack();
    const draft = settleWeek(resolvedSettlementAt(pack, 12));
    if (draft.phase !== "report") throw new Error("expected a report");
    const pending = {
      callbackId: "cb.public_rider_dispute",
      scheduledWeek: 1,
      sourceEventId: "evt.proof.rider_claim",
      sourceOptionId: "opt.rider_claim.fund_policy",
    };

    const result = advanceWeek(pack, { ...draft, sequence: 2, pendingCallbacks: [pending] });

    expect(result).toMatchObject({ ok: false, reason: "pending-callbacks" });
  });

  it("is pure", () => {
    const report = reportAfter();
    const snapshot = structuredClone(report);

    advanced(report);

    expect(report).toEqual(snapshot);
  });
});

describe("weekly report lines", () => {
  it("lists only the authored report lines of this week's committed decisions", () => {
    const pack = packFrom((_, loop) => {
      loop.weeks[2].slots = [
        "evt.proof.rider_claim",
        "var.rider_voice_followup.engaged",
        "evt.proof.public_rider_dispute",
      ];
    });
    const settlement = replayToSettlement(pack, 3, [
      "opt.rider_claim.fund_policy",
      "opt.rider_voice.engaged.keep_informal",
      "opt.crisis.joint_statement",
    ]);

    expect(reportLines(pack, settlement)).toEqual([
      "Tài xế quen mặt đứng cạnh công ty trong thông báo chung; họ ghi nhận và chờ quỹ được mở rộng.",
    ]);
    expect(reportLines(pack, { weekDecisions: [] })).toEqual([]);
  });
});
