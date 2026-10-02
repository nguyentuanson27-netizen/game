import { describe, expect, it } from "vitest";
import { ContentError, loadContentPack } from "../../src/game/content/loader.ts";
import {
  type ContentIssue,
  crisisDivergenceIssues,
  validateContentPack,
} from "../../src/game/validation/validatePack.ts";
import {
  type LabCallback,
  labPack,
  packFrom,
  proofPack,
  type Raw,
  rawChain,
  rawLoop,
  testEvent,
  testOption,
} from "../game/helpers.ts";

// T17: CONTENT checks on the actual prototype pack, then known-bad fixtures that each must be
// rejected with reproducible information. The validator reuses the runtime (loader, evaluator,
// selection, resolution, settlement); this file only states what must hold.

const codes = (issues: ContentIssue[]) => issues.map((i) => i.code);
// Lab packs are built on the proof pack and leave its own events unplayed; those leftovers are not
// what a lab control is about.
const relevant = (issues: ContentIssue[]) =>
  issues.filter(
    (i) =>
      !["unreachable-event", "unreachable-option"].includes(i.code) &&
      !/cb\.(rider|public)|evt\.proof\./.test(i.message),
  );
const CRISIS = "evt.proof.public_rider_dispute";

describe("the actual prototype pack", () => {
  const pack = proofPack();
  const result = validateContentPack(pack);

  it("has no validation issue", () => {
    expect(result.issues).toEqual([]);
  });

  it("records what was considered", () => {
    expect(result.summary).toEqual({
      events: 9,
      chains: 1,
      callbacks: 2,
      closures: 1,
      states: 361,
      transitions: 630,
      completedEndings: 18,
      fallbackSubstitutions: 0,
    });
    // Evidence line for tasks/evidence (run `npm run test:content`).
    process.stdout.write(`CONTENT ${JSON.stringify(result.summary)}\n`);
  });

  it("keeps the shared crisis divergent across reachable histories, each version 2-4 options", () => {
    if (!result.enumeration) throw new Error("no enumeration");

    expect(crisisDivergenceIssues(result.enumeration, CRISIS)).toEqual([]);
    expect(
      [...(result.enumeration.presented.get(CRISIS) ?? [])].map((s) => s.split(",").length).sort(),
    ).toEqual([2, 3, 3, 4]);
  });

  it("uses no fallback on any reachable history: the plan has no gap to hide", () => {
    expect(result.enumeration?.substitutions).toEqual([]);
  });
});

describe("bad content is rejected at load with the problem named", () => {
  const rejects = (mutate: (chain: Raw, loop: Raw) => void, message: RegExp) => {
    const chain = rawChain();
    const loop = rawLoop();
    mutate(chain, loop);
    let thrown: unknown;
    try {
      loadContentPack(chain, loop);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ContentError);
    expect((thrown as ContentError).issues.join("\n")).toMatch(message);
  };
  const event = (chain: Raw, id: string) => chain.events.find((e: Raw) => e.id === id);

  it("duplicate semantic ids (event, option, callback)", () => {
    rejects((chain) => chain.events.push(structuredClone(chain.events[0])), /duplicate event id/);
    rejects((chain) => {
      event(chain, "evt.proof.public_rider_dispute").options[1].id = "opt.crisis.hold_and_review";
    }, /duplicate option id/);
    rejects(
      (chain) => chain.callbacks.push(structuredClone(chain.callbacks[0])),
      /duplicate callback id/,
    );
  });

  it("unknown event, option, callback, policy, memory and NPC references", () => {
    rejects(
      (_, loop) => (loop.weeks[1].slots[0] = "evt.nope.missing"),
      /unknown event evt.nope.missing/,
    );
    rejects(
      (chain) => (chain.callbacks[0].sourceDecision.event = "evt.nope.missing"),
      /unknown source event/,
    );
    rejects(
      (chain) => (chain.callbacks[0].sourceDecision.options = ["opt.nope.missing"]),
      /unknown source option/,
    );
    rejects((chain) => {
      event(chain, "evt.proof.rider_claim").options[0].effects.push({
        kind: "callbackSchedule",
        callback: "cb.nope.missing",
      });
    }, /unknown callback cb.nope.missing/);
    rejects(
      (chain) => (chain.closures[0].callback = "cb.nope.missing"),
      /unknown callback cb.nope.missing/,
    );
    rejects((chain) => {
      event(chain, "evt.proof.public_rider_dispute").options[1].requires[0].id =
        "policy.nope.missing";
    }, /unknown policies id policy.nope.missing/);
    rejects((chain) => {
      event(chain, "evt.proof.public_rider_dispute").options[5].requires[0].id = "mem.nope.missing";
    }, /unknown memories id mem.nope.missing/);
    rejects((chain) => {
      event(chain, "evt.proof.public_rider_dispute").options[3].requires[0].value = "famous";
    }, /unknown status famous/);
    rejects(
      (chain) => (event(chain, "evt.proof.rider_claim").speaker = "npc.nope.missing"),
      /unknown speaker/,
    );
  });

  it("malformed callback windows and tie ordering", () => {
    rejects(
      (chain) => (chain.callbacks[0].window.earliestWeek = 9),
      /earliestWeek is after latestWeek/,
    );
    rejects((chain) => (chain.callbacks[0].window.latestWeek = 13), /window\.latestWeek/);
    rejects((chain) => (chain.callbacks[0].window.earliestWeek = 0), /window\.earliestWeek/);
    rejects((chain) => (chain.callbacks[0].tieOrder = 0), /tieOrder/);
    rejects(
      (chain) => (chain.callbacks[1].tieOrder = chain.callbacks[0].tieOrder),
      /tieOrder 1 is also used by/,
    );
  });

  it("structurally invalid option counts and callbacks that are not required", () => {
    rejects((chain) => event(chain, "evt.proof.fallback_shift_roster").options.pop(), /options/);
    rejects((chain) => (chain.callbacks[0].required = false), /required/);
  });
});

// ---------------------------------------------------------------------------------------------
// Bounded checks on packs that load but are not valid content
// ---------------------------------------------------------------------------------------------

const cb = (name: string, earliest: number, latest: number, tieOrder: number): LabCallback => ({
  id: `cb.lab.${name}`,
  earliest,
  latest,
  tieOrder: 100 + tieOrder,
});

describe("deadline and contention validation", () => {
  it("rejects oversubscribed required callbacks with the schedule that ran out", () => {
    const pack = labPack([cb("x", 3, 3, 1), cb("y", 3, 3, 2), cb("z", 3, 3, 3)]);

    const { issues } = validateContentPack(pack);

    expect(codes(issues)).toContain("callback-capacity");
    const capacity = issues.find((i) => i.code === "callback-capacity");
    expect(capacity?.message).toContain("cb.lab.z is undelivered at the end of its last week 3");
    expect(capacity?.message).toContain("week 3: 2 slot(s) -> cb.lab.x, cb.lab.y");
    // The same infeasibility is also a refused history the runtime reaches, with a replayable path.
    const dead = issues.find((i) => i.code === "dead-end");
    expect(dead?.message).toContain("overdue-callbacks");
    expect(dead?.path).toEqual([
      "opt.lab.setup.go",
      ...Array(dead?.path?.length ? dead.path.length - 1 : 0).fill(expect.any(String)),
    ]);
  });

  it("rejects a window whose weeks have no authored slots (insufficient weekly capacity)", () => {
    const pack = labPack([cb("x", 3, 3, 1)], { 3: 0 });

    const { issues } = validateContentPack(pack);

    expect(codes(issues)).toEqual(expect.arrayContaining(["callback-capacity", "ordinary-gap"]));
  });

  it("rejects a callback whose window closes before its source decision can be played", () => {
    // The setup is week 1; a window ending in week 1 can never be delivered after it... use week 0
    // style by moving the setup later in the plan.
    const pack = labPack([cb("x", 1, 2, 1)], {}, (_, loop) => {
      loop.weeks[0].slots = ["evt.test.week_beat", "evt.test.week_beat"];
      loop.weeks[4].slots = ["evt.lab.setup", "evt.test.week_beat"];
    });

    const { issues } = validateContentPack(pack);

    expect(codes(issues)).toContain("callback-window-before-source");
  });

  it("rejects a callback whose source event is never played", () => {
    const pack = labPack([cb("x", 3, 4, 1)], {}, (_, loop) => {
      loop.weeks[0].slots = ["evt.test.week_beat", "evt.test.week_beat"];
    });

    expect(codes(validateContentPack(pack).issues)).toContain("callback-never-scheduled");
  });

  it("accepts overlapping windows and equal deadlines that fit, in authored tie order", () => {
    const pack = labPack([cb("a", 3, 4, 1), cb("b", 3, 4, 2), cb("c", 4, 5, 3)]);

    expect(relevant(validateContentPack(pack).issues)).toEqual([]);
  });

  it("accepts the tight equal-deadline case that exactly fills the week", () => {
    const pack = labPack([cb("a", 3, 3, 1), cb("b", 3, 3, 2)]);

    expect(relevant(validateContentPack(pack).issues)).toEqual([]);
  });
});

describe("changed-context and source wiring", () => {
  const SEAT = { op: "has", set: "policies", id: "policy.rider_review_seat" };
  const flip = (extra: Partial<LabCallback>) =>
    labPack([{ ...cb("m", 5, 6, 1), variantWhen: [SEAT], ...extra }], {}, (chain, loop) => {
      chain.events.push(
        testEvent(
          "evt.test.flip",
          [
            testOption("opt.test.flip.on", [{ kind: "policyAdd", id: "policy.rider_review_seat" }]),
            testOption("opt.test.flip.off"),
          ],
          { repeatable: false },
        ),
      );
      loop.weeks[2].slots = ["evt.test.flip", "evt.test.week_beat"];
    });

  it("rejects an invalidated callback with no closure, naming the history that strands it", () => {
    const { issues } = validateContentPack(flip({}));

    const dead = issues.find((i) => i.code === "dead-end");
    expect(dead?.message).toContain("overdue-callbacks");
    // The history that leaves the policy off is reproducible from its option ids.
    expect(dead?.path).toContain("opt.test.flip.off");
  });

  it("accepts the same change when its authored closure handles it, on every history", () => {
    expect(relevant(validateContentPack(flip({ closure: true })).issues)).toEqual([]);
  });

  it("rejects a source option that does not schedule its callback, and one that schedules it unlisted", () => {
    const missing = packFrom((chain) => {
      const option = chain.events
        .find((e: Raw) => e.id === "evt.proof.rider_claim")
        .options.find((o: Raw) => o.id === "opt.rider_claim.decline");
      option.effects = option.effects.filter(
        (e: Raw) => !(e.kind === "callbackSchedule" && e.callback === "cb.public_rider_dispute"),
      );
    });
    expect(codes(validateContentPack(missing).issues)).toContain("source-option-does-not-schedule");

    const unlisted = packFrom((chain) => {
      const callback = chain.callbacks.find((c: Raw) => c.id === "cb.public_rider_dispute");
      callback.sourceDecision.options = callback.sourceDecision.options.slice(0, 2);
    });
    expect(codes(validateContentPack(unlisted).issues)).toContain("non-source-option-schedules");
  });
});

describe("fallback, repeat and option-count validation", () => {
  const needsSeat = testEvent(
    "evt.test.needs_seat",
    ["a", "b", "c"].map((n) =>
      testOption(
        `opt.test.needs_seat.${n}`,
        [],
        [{ op: "has", set: "policies", id: "policy.rider_review_seat" }],
      ),
    ),
    { repeatable: false },
  );

  it("reports a gap the fallback covers once, and rejects the same gap twice with a reproducing path", () => {
    const covered = labPack([], {}, (chain, loop) => {
      chain.events.push(needsSeat);
      loop.weeks[1].slots = ["evt.test.needs_seat", "evt.test.week_beat"];
    });
    const coveredResult = validateContentPack(covered);
    // The planned event is shown nowhere (never selectable), which is itself surfaced.
    expect(coveredResult.summary?.fallbackSubstitutions).toBeGreaterThan(0);
    expect(codes(coveredResult.issues)).toContain("unreachable-event");

    const twice = labPack([], {}, (chain, loop) => {
      chain.events.push(needsSeat);
      loop.weeks[1].slots = ["evt.test.needs_seat", "evt.test.needs_seat"];
    });
    const dead = validateContentPack(twice).issues.find((i) => i.code === "dead-end");
    expect(dead?.message).toContain("no-next-event");
    expect(dead?.path?.length).toBeGreaterThan(0);
  });

  it("does not let the fallback hide an event that can never be presented (5 unconditional options)", () => {
    const pack = labPack([], {}, (chain, loop) => {
      chain.events.push(
        testEvent(
          "evt.test.too_many",
          ["a", "b", "c", "d", "e"].map((n) => testOption(`opt.test.too_many.${n}`)),
          { repeatable: false },
        ),
      );
      loop.weeks[1].slots = ["evt.test.too_many", "evt.test.week_beat"];
    });

    expect(codes(validateContentPack(pack).issues)).toContain("unreachable-event");
  });

  it("rejects an option that can never be selected", () => {
    const pack = packFrom((chain) => {
      const option = chain.events
        .find((e: Raw) => e.id === "evt.proof.public_rider_dispute")
        .options.find((o: Raw) => o.id === "opt.crisis.quiet_settlement");
      // Needs the review seat AND not the seat: impossible, so it is never selectable.
      option.requires.push(
        { op: "has", set: "policies", id: "policy.rider_review_seat" },
        { op: "notHas", set: "policies", id: "policy.rider_review_seat" },
      );
    });

    expect(validateContentPack(pack).issues).toContainEqual(
      expect.objectContaining({
        code: "unreachable-option",
        message: expect.stringContaining("opt.crisis.quiet_settlement"),
      }),
    );
  });

  it("rejects a non-repeatable event planned twice and a repeatable fallback", () => {
    const planned = packFrom((_, loop) => {
      loop.weeks[1].slots = ["evt.proof.rider_claim", "evt.proof.rider_claim"];
    });
    expect(codes(validateContentPack(planned).issues)).toContain("plan-repeats-event");

    const repeatable = packFrom((chain) => {
      chain.events.find((e: Raw) => e.id === "evt.proof.fallback_shift_roster").repeatable = true;
    });
    expect(codes(validateContentPack(repeatable).issues)).toContain("fallback-repeatable");
  });

  it("surfaces an ordinary content gap: a week authored with a single decision", () => {
    const pack = packFrom((_, loop) => {
      loop.weeks[3].slots = ["evt.routine.rainy_week"];
    });

    expect(codes(validateContentPack(pack).issues)).toContain("ordinary-gap");
  });

  it("rejects a plan over the weekly budget at load", () => {
    expect(() =>
      packFrom((_, loop) => {
        loop.weeks[0].slots = [
          "evt.routine.rainy_week",
          "evt.routine.rainy_week",
          "evt.routine.rainy_week",
        ];
      }),
    ).toThrow(/budget is 2/);
  });
});

describe("the shared crisis must keep diverging", () => {
  it("rejects a crisis that offers the same options in every history", () => {
    const pack = packFrom((chain) => {
      const crisis = chain.events.find((e: Raw) => e.id === "evt.proof.public_rider_dispute");
      for (const option of crisis.options) {
        option.requires = [];
        delete option.unavailableBecause;
      }
      // 6 unconditional options would be refused; keep exactly three, always selectable.
      crisis.options = crisis.options.slice(0, 3);
    });
    const { enumeration } = validateContentPack(pack);

    expect(enumeration && crisisDivergenceIssues(enumeration, CRISIS).map((i) => i.code)).toEqual([
      "crisis-no-divergence",
    ]);
  });
});
