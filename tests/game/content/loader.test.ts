import { describe, expect, it } from "vitest";
import { ContentError, loadContentPack } from "../../../src/game/content/loader.ts";
import { loadProofPack } from "../../../src/game/content/proof.ts";
import { startCampaign } from "../../../src/game/domain/campaign.ts";
import { proofPack, type Raw, rawChain, rawLoop, unauthoredPack } from "../helpers.ts";

function rejected(mutate: (chain: Raw, loop: Raw) => void) {
  const chain = rawChain();
  const loop = rawLoop();
  mutate(chain, loop);
  try {
    loadContentPack(chain, loop);
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return (error as ContentError).issues.join("\n");
  }
  throw new Error("content was accepted but should have been rejected");
}

const event = (chain: Raw, id: string) => chain.events.find((e: Raw) => e.id === id);

describe("proof content boundary", () => {
  it("loads the bundled T18 proof content with its semantic ids intact", () => {
    const pack = loadProofPack();

    expect([...pack.events.keys()].sort()).toEqual([
      "evt.proof.fallback_shift_roster",
      "evt.proof.public_rider_dispute",
      "evt.proof.rider_claim",
      "evt.routine.bike_checkup",
      "evt.routine.customer_feedback",
      "evt.routine.merchant_packaging",
      "evt.routine.rainy_week",
      "var.rider_voice_followup.aggrieved",
      "var.rider_voice_followup.engaged",
    ]);
    expect([...pack.callbacks.keys()]).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
    expect(pack.fallbackEventId).toBe("evt.proof.fallback_shift_roster");
    expect(pack.weeklyBudget).toEqual([2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2]);
  });

  it("keeps callback windows, ordering and option semantics as authored", () => {
    const pack = proofPack();

    const followup = pack.callbacks.get("cb.rider_voice_followup");
    expect(followup?.window).toMatchObject({ earliestWeek: 7, latestWeek: 8 });
    expect(followup?.tieOrder).toBe(1);
    expect(pack.callbacks.get("cb.public_rider_dispute")?.window).toMatchObject({
      earliestWeek: 10,
      latestWeek: 11,
    });

    const settle = pack.events
      .get("evt.proof.rider_claim")
      ?.options.find((o) => o.id === "opt.rider_claim.settle_and_part");
    expect(settle?.confirmation).toBe("required");
    expect(settle?.effects).toContainEqual({
      kind: "npcStatusSet",
      npc: "npc.recurring_rider",
      status: "departed",
    });

    const joint = pack.events
      .get("evt.proof.public_rider_dispute")
      ?.options.find((o) => o.id === "opt.crisis.joint_statement");
    expect(joint?.requires).toEqual([
      { op: "eq", ref: "npc.recurring_rider.status", value: "ally" },
      { op: "has", set: "policies", id: "policy.rider_support_fund" },
    ]);
  });

  it("rejects a missing required field", () => {
    const issues = rejected((chain) => {
      delete event(chain, "evt.proof.rider_claim").situation;
    });
    expect(issues).toContain("proof-chain: events.0.situation");
  });

  it("rejects an unknown effect kind instead of ignoring it", () => {
    const issues = rejected((chain) => {
      event(chain, "evt.proof.rider_claim").options[0].effects.push({
        kind: "flagAdd",
        id: "flag.x",
      });
    });
    expect(issues).toContain("events.0.options.0.effects.8");
  });

  it("rejects a condition operator the proof does not use", () => {
    const issues = rejected((chain) => {
      event(chain, "evt.proof.public_rider_dispute").options[1].requires.push({
        op: "gte",
        ref: "metric.cash",
        value: 10,
      });
    });
    expect(issues).toContain("proof-chain:");
  });

  it("rejects a misspelled authored key rather than dropping it", () => {
    const issues = rejected((chain) => {
      const e = event(chain, "evt.proof.rider_claim");
      e.eligibilty = e.eligibility;
      delete e.eligibility;
    });
    expect(issues).toContain("eligibilty");
  });

  it("rejects a non-semantic id and a wrong value type", () => {
    expect(
      rejected((chain) => {
        event(chain, "evt.proof.rider_claim").options[0].id = "FundPolicy";
      }),
    ).toContain("not a semantic id");
    expect(
      rejected((chain) => {
        event(chain, "evt.proof.rider_claim").options[0].effects[0].delta = "10";
      }),
    ).toContain("effects.0.delta");
  });

  it("rejects an event with fewer than two authored options", () => {
    const issues = rejected((chain) => {
      event(chain, "evt.proof.fallback_shift_roster").options.pop();
    });
    expect(issues).toContain("options");
  });

  it("rejects references that do not resolve", () => {
    expect(
      rejected((chain) => {
        event(chain, "evt.proof.rider_claim").options[0].effects[1].id = "policy.missing_fund";
      }),
    ).toContain("unknown policy policy.missing_fund");
    expect(
      rejected((chain) => {
        event(chain, "evt.proof.rider_claim").options[0].effects[3].status = "famous";
      }),
    ).toContain("has no status famous");
    expect(
      rejected((chain) => {
        chain.callbacks[0].variants[0].event = "var.nope.nothing";
      }),
    ).toContain("unknown variant event var.nope.nothing");
    expect(
      rejected((_, loop) => {
        loop.weeks[0].slots[0] = "evt.proof.nope";
      }),
    ).toContain("unknown event evt.proof.nope");
  });

  it("rejects a callback whose source option belongs to a different event", () => {
    const issues = rejected((chain) => {
      chain.callbacks[0].sourceDecision.options = ["opt.crisis.hold_and_review"];
    });
    expect(issues).toContain("is not an option of evt.proof.rider_claim");
  });

  it("rejects duplicate ids and a plan that exceeds the weekly budget", () => {
    expect(
      rejected((chain) => {
        chain.events[1].options[0].id = chain.events[0].options[0].id;
      }),
    ).toContain("duplicate option id");
    expect(
      rejected((_, loop) => {
        loop.weeks[0].slots = [
          "evt.proof.rider_claim",
          "evt.proof.fallback_shift_roster",
          "evt.proof.rider_claim",
        ];
      }),
    ).toContain("budget is 2");
  });

  it("rejects a week 1 authored with fewer than two decisions", () => {
    const empty = rejected((_, loop) => {
      loop.weeks[0].slots = [];
    });
    expect(empty).toContain("week 1 needs at least 2 slots");

    // One decision a week breaks the 2-4 decisions contract: it could start and settle on one.
    const single = rejected((_, loop) => {
      loop.weeks[0].slots = ["evt.proof.rider_claim"];
    });
    expect(single).toContain("week 1 needs at least 2 slots");
  });

  it("still loads and starts the two-slot proof pack, and keeps incomplete later weeks loadable", () => {
    const pack = unauthoredPack();
    expect(pack.plan[0]).toHaveLength(2);
    expect(startCampaign(pack)).toMatchObject({ week: 1, phase: "event" });
    // Later weeks may stay unfinished (Next Week refuses them); only week 1 must be playable.
    expect(pack.plan[1]).toHaveLength(0);
    // The shipped route authors two decisions in every week.
    expect(proofPack().plan.map((slots) => slots.length)).toEqual(Array(12).fill(2));
  });

  it("rejects content that is not an object at all", () => {
    expect(() => loadContentPack("not content", null)).toThrow(ContentError);
  });
});
