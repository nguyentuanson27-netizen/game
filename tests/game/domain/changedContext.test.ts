import { describe, expect, it } from "vitest";
import { advanceWeek } from "../../../src/game/domain/advanceWeek.ts";
import { resumeCheckpoint } from "../../../src/game/domain/campaign.ts";
import { reportLines } from "../../../src/game/domain/reportLines.ts";
import { resolveChoice } from "../../../src/game/domain/resolveChoice.ts";
import { computeSettlement } from "../../../src/game/domain/settlement.ts";
import type { Checkpoint, EventCheckpoint } from "../../../src/game/persistence/checkpoint.ts";
import {
  type LabCallback,
  labEvent,
  labPack,
  packFrom,
  pickFirst,
  proofPack,
  type Raw,
  testEvent,
  testOption,
  walk,
} from "../helpers.ts";

const SEAT = "policy.rider_review_seat";
const has = { op: "has", set: "policies", id: SEAT };
const notHas = { op: "notHas", set: "policies", id: SEAT };
const atReport = (week: number) => (c: Checkpoint) => c.phase === "report" && c.week === week;
const atSlot = (week: number, decided: number) => (c: Checkpoint) =>
  c.phase === "event" && c.week === week && c.weekDecisions.length === decided;

const CLOSURE_ID_OF_PROOF = "closure.rider_voice_followup.departed";
const CLOSURE_TEXT =
  "Người tài xế từng phản ánh đã rời mạng lưới sau thỏa thuận. Không còn ai trong nhóm đứng ra hỏi lại chuyện đó, và vụ việc được ghi là đã khép.";

// ---------------------------------------------------------------------------------------------
// The proof pack, played through its real rules
// ---------------------------------------------------------------------------------------------

describe("the proof callbacks in their normal and changed contexts (AC-03)", () => {
  const pack = proofPack();
  const history = (setup: string) =>
    pickFirst({ "evt.proof.rider_claim": setup, "var.rider_voice_followup.engaged": "" });

  it("delivers the engaged variant when the rider was helped, and the aggrieved one when declined", () => {
    const helped = walk(pack, pickFirst(), atSlot(7, 0)).checkpoint;
    const declined = walk(
      pack,
      pickFirst({ "evt.proof.rider_claim": "opt.rider_claim.decline" }),
      atSlot(7, 0),
    ).checkpoint;

    expect(helped.phase === "event" && helped.activeEvent.eventId).toBe(
      "var.rider_voice_followup.engaged",
    );
    expect(declined.phase === "event" && declined.activeEvent.eventId).toBe(
      "var.rider_voice_followup.aggrieved",
    );
  });

  it("closes the follow-up in the week-7 report when the rider has departed, with no slot, no choice and no effect", () => {
    const pick = history("opt.rider_claim.settle_and_part");
    const week7 = walk(pack, pick, atSlot(7, 0));

    // Nothing is delivered in week 7: the rider is gone, so neither variant is valid.
    expect(week7.checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
    const ordinary = week7.checkpoint.phase === "event" && week7.checkpoint.activeEvent.eventId;
    expect(ordinary).toBe("evt.routine.bike_checkup");

    const report = walk(pack, pick, atReport(7), week7.checkpoint);
    const settled = report.checkpoint;
    if (settled.phase !== "report") throw new Error("expected the week-7 report");
    const beforeSettlement = report.history.at(-2) as Checkpoint;

    // Both of the week's slots went to ordinary events: the closure consumed none.
    expect(report.shown[7]).toEqual(["evt.routine.bike_checkup", "evt.routine.customer_feedback"]);
    expect(settled.weekDecisions).toHaveLength(2);
    expect(settled.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.public_rider_dispute"]);
    expect(settled.resolvedCallbacks).toEqual([
      {
        callbackId: "cb.rider_voice_followup",
        week: 7,
        resolvedBy: "closure.rider_voice_followup.departed",
      },
    ]);
    // The authored information reaches the player in the report, and the report is the only place.
    expect(reportLines(pack, settled)).toContain(CLOSURE_TEXT);
    // No decision effect: policies, relationships and memories are exactly what the choices left;
    // only the settlement's cash delta moved the company.
    expect(settled.policies).toEqual(beforeSettlement.policies);
    expect(settled.memories).toEqual(beforeSettlement.memories);
    expect(settled.npcStatus).toEqual(beforeSettlement.npcStatus);
    expect(settled.metrics).toEqual({
      ...beforeSettlement.metrics,
      cash: beforeSettlement.metrics.cash + computeSettlement(beforeSettlement, 7).cashDelta,
    });
    // The closure text is not a hidden-state dump: no ids reach the player.
    expect(reportLines(pack, settled).join(" ")).not.toMatch(/cb\.|npc\.|prec\.|mem\./);
  });

  it("still reaches the shared crisis with 2-4 options after a closure, and closes the callback once", () => {
    const pick = history("opt.rider_claim.settle_and_part");

    const crisis = walk(pack, pick, atSlot(10, 0)).checkpoint;

    if (crisis.phase !== "event") throw new Error("expected the crisis");
    expect(crisis.activeEvent.eventId).toBe("evt.proof.public_rider_dispute");
    expect(crisis.activeEvent.optionIds).toEqual([
      "opt.crisis.hold_and_review",
      "opt.crisis.announce_new_policy",
      "opt.crisis.quiet_settlement",
    ]);
    expect(
      crisis.resolvedCallbacks.filter((r) => r.callbackId === "cb.rider_voice_followup"),
    ).toHaveLength(1);
  });

  it("closes a follow-up whose original context was invalidated after the setup, in either history", () => {
    // A test-only beat in week 5 makes the rider leave, whatever the player did in week 1.
    const leaving = labLeaving();
    for (const setup of ["opt.rider_claim.fund_policy", "opt.rider_claim.decline"]) {
      const { checkpoint, shown } = walk(
        leaving,
        pickFirst({
          "evt.proof.rider_claim": setup,
          "evt.test.rider_leaves": "opt.test.rider_leaves.go",
        }),
        atReport(7),
      );
      if (checkpoint.phase !== "report") throw new Error("expected a report");

      expect(Object.values(shown).flat()).not.toContain("var.rider_voice_followup.engaged");
      expect(Object.values(shown).flat()).not.toContain("var.rider_voice_followup.aggrieved");
      expect(checkpoint.resolvedCallbacks[0]).toMatchObject({
        callbackId: "cb.rider_voice_followup",
        resolvedBy: "closure.rider_voice_followup.departed",
      });
    }
  });
});

function labLeaving() {
  // The proof pack plus a test-only beat in week 5 that makes the rider leave.
  return packFrom((chain, loop) => {
    chain.events.push(
      testEvent(
        "evt.test.rider_leaves",
        [
          testOption("opt.test.rider_leaves.go", [
            { kind: "npcStatusSet", npc: "npc.recurring_rider", status: "departed" },
          ]),
          testOption("opt.test.rider_leaves.stay"),
        ],
        { repeatable: false },
      ),
    );
    loop.weeks[4].slots = ["evt.test.rider_leaves", "evt.routine.rainy_week"];
  });
}

// ---------------------------------------------------------------------------------------------
// Synthetic variants and closures
// ---------------------------------------------------------------------------------------------

/** A week-3 beat that grants (or not) the policy the variants read; callbacks open in week 5-6. */
function flipPack(callback: Partial<LabCallback>) {
  return labPack(
    [
      {
        id: "cb.lab.m",
        earliest: 5,
        latest: 6,
        tieOrder: 150,
        variantWhen: [has],
        ...callback,
      },
    ],
    {},
    (chain, loop) => {
      chain.events.push(
        testEvent(
          "evt.test.flip",
          [
            testOption("opt.test.flip.on", [{ kind: "policyAdd", id: SEAT }]),
            testOption("opt.test.flip.off"),
          ],
          { repeatable: false },
        ),
      );
      loop.weeks[2].slots = ["evt.test.flip", "evt.test.week_beat"];
    },
  );
}
const flip = (on: boolean) =>
  pickFirst({ "evt.test.flip": on ? "opt.test.flip.on" : "opt.test.flip.off" });

describe("variant selection reads the latest committed state", () => {
  const pack = flipPack({ alt: { when: [notHas] } });

  it("shows the main variant or the authored alternate depending on what happened since the setup", () => {
    const main = walk(pack, flip(true), atSlot(5, 0)).checkpoint;
    const alternate = walk(pack, flip(false), atSlot(5, 0)).checkpoint;

    expect(main.phase === "event" && main.activeEvent.eventId).toBe(labEvent("m"));
    expect(alternate.phase === "event" && alternate.activeEvent.eventId).toBe(
      `${labEvent("m")}_alt`,
    );
  });

  it("resumes the same variant: the saved event is exactly what the committed state selects", () => {
    for (const on of [true, false]) {
      const saved = walk(pack, flip(on), atSlot(5, 0)).checkpoint as EventCheckpoint;

      const resumed = resumeCheckpoint(pack, saved);

      expect(resumed.ok && resumed.presented?.event.id).toBe(saved.activeEvent.eventId);
    }
  });

  it("refuses a resumed save that shows the other variant", () => {
    const saved = walk(pack, flip(true), atSlot(5, 0)).checkpoint as EventCheckpoint;
    const swapped: EventCheckpoint = {
      ...saved,
      activeEvent: {
        eventId: `${labEvent("m")}_alt`,
        optionIds: [`opt.lab.m.o1_alt`, `opt.lab.m.o2_alt`],
      },
    };

    expect(resumeCheckpoint(pack, swapped).ok).toBe(false);
  });
});

describe("a callback whose context is invalid", () => {
  it("is closed by its authored report closure in the first week its window is open", () => {
    const pack = flipPack({ closure: true });

    const { checkpoint, shown } = walk(pack, flip(false), atReport(5));
    if (checkpoint.phase !== "report") throw new Error("expected a report");

    // Not delivered, no slot used, closed in the report of week 5 (the window's first week).
    expect(shown[5]).toEqual(["evt.test.week_beat", "evt.test.week_beat"]);
    expect(checkpoint.pendingCallbacks).toEqual([]);
    expect(checkpoint.resolvedCallbacks).toEqual([
      { callbackId: "cb.lab.m", week: 5, resolvedBy: "closure.lab.m" },
    ]);
    expect(reportLines(pack, checkpoint)).toContain(
      "Hậu quả m đã được khép lại trong báo cáo tuần.",
    );
  });

  it("is closed when its eligibility no longer holds, not only when no variant matches", () => {
    const pack = flipPack({ closure: true, variantWhen: [], eligibility: [has] });

    const { checkpoint } = walk(pack, flip(false), atReport(5));

    expect(checkpoint.resolvedCallbacks.map((r) => r.resolvedBy)).toEqual(["closure.lab.m"]);
  });

  it("is delivered normally, and not closed, when the context still holds", () => {
    const pack = flipPack({ closure: true });

    const { checkpoint, shown } = walk(pack, flip(true), atReport(5));

    expect(shown[5]?.[0]).toBe(labEvent("m"));
    expect(checkpoint.resolvedCallbacks.map((r) => r.resolvedBy)).toEqual([labEvent("m")]);
  });

  it("stays pending and is never silently dropped when it has no closure, then blocks Next Week at its deadline", () => {
    const pack = flipPack({});

    const week5 = walk(pack, flip(false), atReport(5)).checkpoint;
    expect(week5.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.lab.m"]);
    expect(week5.resolvedCallbacks).toEqual([]);

    const week6 = walk(pack, flip(false), atReport(6)).checkpoint;
    expect(week6.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.lab.m"]);
  });

  it("never applies an option the player did not choose when it is closed", () => {
    const pack = flipPack({ closure: true });
    const { history } = walk(pack, flip(false), atReport(5));
    const before = history.at(-2) as Checkpoint;
    const after = history.at(-1) as Checkpoint;

    expect(after.policies).toEqual(before.policies);
    expect(after.memories).toEqual(before.memories);
    expect(after.npcStatus).toEqual(before.npcStatus);
    expect(after.recurringCosts).toEqual(before.recurringCosts);
    expect(after.weekDecisions).toEqual(before.weekDecisions);
  });

  it("is resumed as closed: a report that still lists a closable callback as pending is refused", () => {
    const pack = flipPack({ closure: true });
    const { checkpoint } = walk(pack, flip(false), atReport(5));
    if (checkpoint.phase !== "report") throw new Error("expected a report");

    expect(resumeCheckpoint(pack, checkpoint).ok).toBe(true);

    const unclosed = resumeCheckpoint(pack, {
      ...checkpoint,
      resolvedCallbacks: [],
      pendingCallbacks: [
        {
          callbackId: "cb.lab.m",
          scheduledWeek: 1,
          sourceEventId: "evt.lab.setup",
          sourceOptionId: "opt.lab.setup.go",
        },
      ],
    });
    expect(unclosed.ok).toBe(false);
    expect(!unclosed.ok && unclosed.issues.join()).toContain("should have been closed");

    const wrong = resumeCheckpoint(pack, {
      ...checkpoint,
      resolvedCallbacks: [{ callbackId: "cb.lab.m", week: 5, resolvedBy: CLOSURE_ID_OF_PROOF }],
    });
    expect(wrong.ok).toBe(false);
  });

  it("is checked at resume in the settlement phase too: nothing is closed before the report", () => {
    const pack = flipPack({ closure: true });
    const { checkpoint } = walk(pack, flip(false), (c) => c.phase === "settlement" && c.week === 5);

    // Still pending and resumable: the closure belongs to the committed settlement, not before.
    expect(checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.lab.m"]);
    expect(resumeCheckpoint(pack, checkpoint).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// Ordinary fallback
// ---------------------------------------------------------------------------------------------

describe("ordinary events and the authored fallback (AC-03)", () => {
  // Week 2 plans an event that needs the review seat; without the seat it cannot be shown.
  const needsSeat = testEvent(
    "evt.test.needs_seat",
    ["a", "b", "c"].map((n) => testOption(`opt.test.needs_seat.${n}`, [], [has])),
    { repeatable: false },
  );
  const gapPack = (weeks: Record<number, string[]>) =>
    labPack([], {}, (chain, loop) => {
      chain.events.push(needsSeat);
      for (const [week, slots] of Object.entries(weeks)) loop.weeks[Number(week) - 1].slots = slots;
    });

  it("uses the fallback when the planned event has no eligible options, counting it in the week's budget", () => {
    const pack = gapPack({ 2: ["evt.test.needs_seat", "evt.test.week_beat"] });

    const { shown, checkpoint } = walk(pack, pickFirst(), atReport(2));

    expect(shown[2]).toEqual(["evt.proof.fallback_shift_roster", "evt.test.week_beat"]);
    // The fallback is a decision like any other: 2 slots, 2 decisions, and it is recorded as used.
    expect(checkpoint.weekDecisions).toHaveLength(2);
    expect(checkpoint.resolvedEventIds).toContain("evt.proof.fallback_shift_roster");
  });

  it("never revives a locked option to fill the fallback gap or the 2-4 minimum", () => {
    // Two of three options are locked: only one selectable, so the event cannot be shown.
    const oneLeft = labPack([], {}, (chain, loop) => {
      chain.events.push(
        testEvent(
          "evt.test.mostly_locked",
          [
            testOption("opt.test.mostly_locked.a"),
            testOption("opt.test.mostly_locked.b", [], [has]),
            testOption("opt.test.mostly_locked.c", [], [has]),
          ],
          { repeatable: false },
        ),
      );
      loop.weeks[1].slots = ["evt.test.mostly_locked", "evt.test.week_beat"];
    });

    const { shown } = walk(oneLeft, pickFirst(), atReport(2));

    expect(shown[2]?.[0]).toBe("evt.proof.fallback_shift_roster");
  });

  it("shows a planned event with locked options as soon as 2 remain selectable, in authored order", () => {
    const twoLeft = labPack([], {}, (chain, loop) => {
      chain.events.push(
        testEvent(
          "evt.test.partly_locked",
          [
            testOption("opt.test.partly_locked.a"),
            testOption("opt.test.partly_locked.b", [], [has]),
            testOption("opt.test.partly_locked.c"),
          ],
          { repeatable: false },
        ),
      );
      loop.weeks[1].slots = ["evt.test.partly_locked", "evt.test.week_beat"];
    });

    const { checkpoint } = walk(twoLeft, pickFirst(), atSlot(2, 0));

    expect(checkpoint.phase === "event" && checkpoint.activeEvent).toEqual({
      eventId: "evt.test.partly_locked",
      optionIds: ["opt.test.partly_locked.a", "opt.test.partly_locked.c"],
    });
  });

  it("does not repeat the fallback: a second gap is refused explicitly and writes nothing", () => {
    // Week 2 uses the fallback for its first gap; the second gap in the same week has no cover.
    const pack = gapPack({ 2: ["evt.test.needs_seat", "evt.test.needs_seat"] });
    const first = walk(pack, pickFirst(), atSlot(2, 0)).checkpoint as EventCheckpoint;
    expect(first.activeEvent.eventId).toBe("evt.proof.fallback_shift_roster");

    const resolved = resolveChoice(pack, first, first.activeEvent.optionIds[0] ?? "");

    expect(resolved).toMatchObject({ ok: false, reason: "no-next-event" });
  });

  it("surfaces an uncovered gap at Next Week as invalid content instead of inventing an event", () => {
    const pack = gapPack({
      2: ["evt.test.needs_seat", "evt.test.week_beat"],
      3: ["evt.test.needs_seat", "evt.test.week_beat"],
    });
    const week2 = walk(pack, pickFirst(), atReport(2)).checkpoint;
    if (week2.phase !== "report") throw new Error("expected a report");

    expect(advanceWeek(pack, week2)).toMatchObject({ ok: false, reason: "invalid-content" });
  });

  it("keeps 2-4 selectable options in every event shown on the proof histories", () => {
    const pack = proofPack();
    for (const setup of [
      "opt.rider_claim.fund_policy",
      "opt.rider_claim.decline",
      "opt.rider_claim.settle_and_part",
    ]) {
      const { history } = walk(
        pack,
        pickFirst({ "evt.proof.rider_claim": setup }),
        (c) => c.phase === "complete" || (c.phase === "report" && c.week === 12),
      );
      for (const checkpoint of history) {
        if (checkpoint.phase !== "event") continue;
        expect(checkpoint.activeEvent.optionIds.length).toBeGreaterThanOrEqual(2);
        expect(checkpoint.activeEvent.optionIds.length).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe("fallback and cooldown content rules", () => {
  it("rejects a fallback with eligibility, locked options or a callback role", () => {
    const fallback = (chain: Raw) =>
      chain.events.find((e: Raw) => e.id === "evt.proof.fallback_shift_roster");
    expect(() => packFrom((chain) => fallback(chain).eligibility.push(has))).toThrow(
      /must not have eligibility/,
    );
    expect(() =>
      packFrom((chain) => {
        fallback(chain).options[0].requires.push(has);
        fallback(chain).options[0].unavailableBecause = "x";
      }),
    ).toThrow(/needs 2-4 unconditional options/);
    expect(() =>
      packFrom((chain) => (fallback(chain).deliveredBy = "cb.public_rider_dispute")),
    ).toThrow();
  });

  it("rejects an authored cooldown instead of silently ignoring it", () => {
    expect(() =>
      packFrom((chain) => {
        chain.events.find((e: Raw) => e.id === "evt.routine.rainy_week").cooldownWeeks = 2;
      }),
    ).toThrow(/cooldownWeeks is not supported yet/);
  });

  it("rejects a closure that its callback does not name", () => {
    expect(() =>
      packFrom((chain) => {
        chain.closures[0].callback = "cb.public_rider_dispute";
      }),
    ).toThrow(/does not name it as its report closure/);
  });
});
