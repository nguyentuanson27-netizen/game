import { describe, expect, it } from "vitest";
import { presentEvent } from "../../../src/game/domain/presentation.ts";
import { resolveChoice } from "../../../src/game/domain/resolveChoice.ts";
import { initialCampaignState } from "../../../src/game/domain/worldState.ts";
import type { EventCheckpoint } from "../../../src/game/persistence/checkpoint.ts";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { choose } from "../../../src/game/ui/session.ts";
import {
  addProbeCopy,
  packFrom,
  startAt,
  testEvent,
  testOption,
  uniqueDbName,
} from "../helpers.ts";

const CRISIS = "evt.proof.public_rider_dispute.probe";

// Week 3 (budget 3): setup -> a test-only beat that can cost the player the rider's support ->
// a plain copy of the shared crisis. The copy is placed here only to read same-week state; the real
// crisis is delivered by its callback (see callbacks.test.ts).
const estrange = testEvent("evt.test.estrange_rider", [
  testOption("opt.test.estrange_rider.cut_ties", [
    { kind: "npcStatusSet", npc: "npc.recurring_rider", status: "resentful" },
  ]),
  testOption("opt.test.estrange_rider.keep_close"),
]);
const pack = packFrom((chain, loop) => {
  chain.events.push(estrange);
  addProbeCopy(chain, "evt.proof.public_rider_dispute");
  loop.weeks[2].slots = ["evt.proof.rider_claim", "evt.test.estrange_rider", CRISIS];
});

function play(optionIds: string[]): { checkpoint: EventCheckpoint; activeOptionIds: string[] } {
  let checkpoint = startAt(pack, 3);
  for (const optionId of optionIds) {
    const resolved = resolveChoice(pack, checkpoint, optionId);
    if (!resolved.ok) throw new Error(resolved.message);
    if (resolved.draft.phase !== "event") throw new Error("week ended early");
    checkpoint = {
      ...resolved.draft,
      sequence: checkpoint.sequence + 1,
    };
  }
  return { checkpoint, activeOptionIds: checkpoint.activeEvent.optionIds };
}

const FUND = "opt.rider_claim.fund_policy";
const DECLINE = "opt.rider_claim.decline";
const SETTLE = "opt.rider_claim.settle_and_part";
const CUT = "opt.test.estrange_rider.cut_ties";
const KEEP = "opt.test.estrange_rider.keep_close";

describe("the next event reads the state the previous choice just committed", () => {
  it("unlocks options earlier choices made valid", () => {
    expect(play([FUND, KEEP]).activeOptionIds).toEqual([
      "opt.crisis.hold_and_review.probe",
      "opt.crisis.cite_policy.probe",
      "opt.crisis.joint_statement.probe",
    ]);
    expect(play([DECLINE, KEEP]).activeOptionIds).toEqual([
      "opt.crisis.hold_and_review.probe",
      "opt.crisis.announce_new_policy.probe",
      "opt.crisis.quiet_settlement.probe",
    ]);
  });

  it("removes a contact's help when an earlier choice in the same week cost their support", () => {
    const kept = play([FUND, KEEP]);
    const lost = play([FUND, CUT]);

    expect(kept.activeOptionIds).toContain("opt.crisis.joint_statement.probe");
    expect(lost.checkpoint.npcStatus["npc.recurring_rider"]).toBe("resentful");
    // The fund still exists, so only the relationship explains the difference.
    expect(lost.checkpoint.policies).toContain("policy.rider_support_fund");
    expect(lost.activeOptionIds).not.toContain("opt.crisis.joint_statement.probe");
    expect(lost.activeOptionIds).toEqual([
      "opt.crisis.hold_and_review.probe",
      "opt.crisis.cite_policy.probe",
    ]);
  });

  it("never shows a stale start-of-week option set", () => {
    const stale = presentEvent(pack, CRISIS, initialCampaignState(pack));
    if (!stale.ok) throw new Error("expected presentable");
    const staleIds = stale.presented.options.map((o) => o.id);
    const { activeOptionIds } = play([FUND, CUT]);

    // Against the week-start state the crisis would offer `announce_new_policy`/`quiet_settlement`.
    expect(staleIds).toContain("opt.crisis.announce_new_policy.probe");
    expect(activeOptionIds).not.toContain("opt.crisis.announce_new_policy.probe");
    expect(activeOptionIds).not.toContain("opt.crisis.quiet_settlement.probe");
  });

  it("keeps 2-4 selectable options in every path through the week", () => {
    for (const setup of [FUND, DECLINE, SETTLE]) {
      for (const beat of [KEEP, CUT]) {
        const { activeOptionIds } = play([setup, beat]);
        expect(activeOptionIds.length, `${setup} / ${beat}`).toBeGreaterThanOrEqual(2);
        expect(activeOptionIds.length, `${setup} / ${beat}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("stores the option set evaluated from committed state, and reopening shows exactly that", async () => {
    const store = createIdbCheckpointStore(uniqueDbName());
    try {
      const { sequence: _first, ...firstDraft } = startAt(pack, 3);
      const first = await store.commit(firstDraft);
      if (!first.ok || first.value.phase !== "event") throw new Error("setup failed");
      let current = first.value;
      for (const optionId of [FUND, CUT]) {
        const result = await choose(store, pack, current, optionId);
        if (!result.ok || result.state.kind !== "event") throw new Error("choose failed");
        current = result.state.checkpoint;
      }

      const loaded = await store.load();
      if (loaded.status !== "ready" || loaded.checkpoint.phase !== "event") throw new Error("x");
      const reevaluated = presentEvent(pack, CRISIS, loaded.checkpoint);
      if (!reevaluated.ok) throw new Error("expected presentable");
      expect(loaded.checkpoint.activeEvent.optionIds).toEqual(
        reevaluated.presented.options.map((o) => o.id),
      );
      expect(loaded.checkpoint.activeEvent.optionIds).toEqual([
        "opt.crisis.hold_and_review.probe",
        "opt.crisis.cite_policy.probe",
      ]);
    } finally {
      await store.close();
    }
  });
});

describe("authored fallback when the planned event cannot be presented", () => {
  // Three options that all need the rider-support fund: with no fund none is selectable.
  const needsFund = testEvent(
    "evt.test.needs_fund",
    ["a", "b", "c"].map((n) =>
      testOption(
        `opt.test.needs_fund.${n}`,
        [],
        [{ op: "has", set: "policies", id: "policy.rider_support_fund" }],
      ),
    ),
  );
  // Two options, only one selectable without the fund: still fewer than two.
  const halfFund = testEvent("evt.test.half_fund", [
    testOption("opt.test.half_fund.open"),
    testOption(
      "opt.test.half_fund.fund_only",
      [],
      [{ op: "has", set: "policies", id: "policy.rider_support_fund" }],
    ),
  ]);
  const withFallbacks = packFrom((chain, loop) => {
    chain.events.push(needsFund, halfFund);
    loop.weeks[2].slots = ["evt.proof.rider_claim", "evt.test.needs_fund", "evt.test.half_fund"];
  });

  function afterSetup(optionId: string) {
    const resolved = resolveChoice(withFallbacks, startAt(withFallbacks, 3), optionId);
    if (!resolved.ok) throw new Error(resolved.message);
    return resolved;
  }

  it("uses the fallback instead of a planned event with fewer than two selectable options", () => {
    const { draft } = afterSetup(DECLINE);

    expect(draft.phase === "event" && draft.activeEvent).toEqual({
      eventId: "evt.proof.fallback_shift_roster",
      optionIds: ["opt.fallback.arrange_extra_shift", "opt.fallback.leave_roster_as_is"],
    });
  });

  it("does not use the fallback when the planned event has enough valid options", () => {
    const { draft } = afterSetup(FUND);

    expect(draft.phase === "event" && draft.activeEvent).toEqual({
      eventId: "evt.test.needs_fund",
      optionIds: ["opt.test.needs_fund.a", "opt.test.needs_fund.b", "opt.test.needs_fund.c"],
    });
  });

  it("treats a single selectable option as too few rather than reviving the invalid one", () => {
    const first = afterSetup(DECLINE).draft;
    if (first.phase !== "event") throw new Error("expected event");
    // Fallback resolved; the next planned event (half_fund) has one selectable option only.
    const second = resolveChoice(
      withFallbacks,
      { ...first, sequence: 2 },
      "opt.fallback.leave_roster_as_is",
    );

    // The fallback was just used and is not repeatable, so there is nothing valid to present.
    expect(second).toMatchObject({ ok: false, reason: "no-next-event" });
  });

  it("refuses to present rather than inventing a choice when no valid event exists", () => {
    const used: EventCheckpoint = {
      ...startAt(withFallbacks, 3),
      resolvedEventIds: ["evt.proof.fallback_shift_roster"],
    };

    expect(resolveChoice(withFallbacks, used, DECLINE)).toMatchObject({
      ok: false,
      reason: "no-next-event",
    });
  });

  it("does not present a non-repeatable event twice", () => {
    const state = {
      ...initialCampaignState(withFallbacks),
      resolvedEventIds: ["evt.proof.rider_claim"],
    };

    expect(presentEvent(withFallbacks, "evt.proof.rider_claim", state)).toMatchObject({
      ok: false,
      reason: "already-resolved",
    });
  });
});
