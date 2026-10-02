import { describe, expect, it } from "vitest";
import { advanceWeek } from "../../../src/game/domain/advanceWeek.ts";
import { checkCallbackCapacity } from "../../../src/game/domain/callbackCapacity.ts";
import { resumeCheckpoint } from "../../../src/game/domain/campaign.ts";
import { resolveChoice } from "../../../src/game/domain/resolveChoice.ts";
import {
  type Checkpoint,
  checkpointSchema,
  type EventCheckpoint,
} from "../../../src/game/persistence/checkpoint.ts";
import {
  type LabCallback,
  labEvent,
  labOption,
  labPack,
  packFrom,
  pickFirst,
  proofPack,
  type Raw,
  walk,
} from "../helpers.ts";

// Tie orders are offset so they never collide with the proof pack's own callbacks (1 and 2).
const cb = (name: string, earliest: number, latest: number, tieOrder: number): LabCallback => ({
  id: `cb.lab.${name}`,
  earliest,
  latest,
  tieOrder: 100 + tieOrder,
});

const atSlot = (week: number, decided: number) => (c: Checkpoint) =>
  c.phase === "event" && c.week === week && c.weekDecisions.length === decided;
const atReport = (week: number) => (c: Checkpoint) => c.phase === "report" && c.week === week;
const play = pickFirst();
/** Resolve the due callback with its first option; everything else with the first option too. */
const eventsOf = (shown: Record<number, string[]>, week: number) => shown[week] ?? [];

describe("a callback waits for its earliest week", () => {
  const pack = labPack([cb("a", 4, 5, 11)]);

  it("is not delivered in any earlier week and stays pending with its origin", () => {
    const { checkpoint, shown } = walk(pack, play, atSlot(4, 0));

    // Weeks 2 and 3 only ever showed ordinary events, although the callback was already pending.
    for (const week of [2, 3]) {
      expect(eventsOf(shown, week)).toEqual(["evt.test.week_beat", "evt.test.week_beat"]);
    }
    expect(checkpoint.pendingCallbacks).toEqual([
      {
        callbackId: "cb.lab.a",
        scheduledWeek: 1,
        sourceEventId: "evt.lab.setup",
        sourceOptionId: "opt.lab.setup.go",
      },
    ]);
  });

  it("is delivered in its earliest week, before the ordinary event planned for that slot", () => {
    const { checkpoint } = walk(pack, play, atSlot(4, 0));

    expect(checkpoint.phase === "event" && checkpoint.activeEvent).toEqual({
      eventId: labEvent("a"),
      optionIds: [labOption("a", 1), labOption("a", 2)],
    });
  });

  it("takes one of the week's slots instead of adding a decision", () => {
    const { shown, checkpoint } = walk(pack, play, atReport(4));

    expect(eventsOf(shown, 4)).toEqual([labEvent("a"), "evt.test.week_beat"]);
    // The week still has exactly its two authored slots.
    expect(checkpoint.weekDecisions).toHaveLength(2);
    expect(pack.plan[3]).toHaveLength(2);
  });

  it("applies none of its effects before the player resolves it", () => {
    const { history } = walk(pack, play, atSlot(4, 0));
    const delivered = history[history.length - 1] as EventCheckpoint;
    const before = history[history.length - 2] as Checkpoint;

    expect(delivered.metrics).toEqual(before.metrics);
    expect(delivered.policies).toEqual(before.policies);
    expect(delivered.pendingCallbacks).toEqual(before.pendingCallbacks);
    expect(delivered.resolvedCallbacks).toEqual([]);
  });
});

describe("resolving a delivered callback", () => {
  const pack = labPack([cb("a", 4, 5, 11)], {}, (chain) => {
    const variant = chain.events.find((e: Raw) => e.id === labEvent("a"));
    variant.options[0].effects = [{ kind: "metricAdjust", metric: "publicTrust", delta: 7 }];
  });

  it("applies the chosen option once and moves the callback from pending to resolved", () => {
    const { checkpoint } = walk(pack, play, atSlot(4, 0));
    if (checkpoint.phase !== "event") throw new Error("expected an event");

    const resolved = resolveChoice(pack, checkpoint, labOption("a", 1));
    if (!resolved.ok) throw new Error(resolved.message);

    expect(resolved.draft.metrics.publicTrust).toBe(checkpoint.metrics.publicTrust + 7);
    expect(resolved.draft.pendingCallbacks).toEqual([]);
    expect(resolved.draft.resolvedCallbacks).toEqual([
      { callbackId: "cb.lab.a", week: 4, resolvedBy: labEvent("a") },
    ]);
    expect(resolved.draft.resolvedEventIds).toContain(labEvent("a"));
  });

  it("is not delivered again afterwards, in that week or any later one", () => {
    const { shown } = walk(pack, play, atReport(5));

    const everything = Object.values(shown).flat();
    expect(everything.filter((id) => id === labEvent("a"))).toHaveLength(1);
  });

  it("is never scheduled a second time once it is resolved", () => {
    const { checkpoint } = walk(pack, play, atSlot(5, 0));
    if (checkpoint.phase !== "event") throw new Error("expected an event");
    // Re-run the setup choice, whose option schedules the callback again, from the resolved state.
    const replayed: EventCheckpoint = {
      ...checkpoint,
      activeEvent: {
        eventId: "evt.lab.setup",
        optionIds: ["opt.lab.setup.go", "opt.lab.setup.wait"],
      },
    };

    const resolved = resolveChoice(pack, replayed, "opt.lab.setup.go");
    if (!resolved.ok) throw new Error(resolved.message);

    expect(resolved.draft.pendingCallbacks).toEqual([]);
    expect(resolved.draft.resolvedCallbacks).toHaveLength(1);
  });
});

describe("competing callbacks (AC-02)", () => {
  it("delivers the earliest deadline first, then the authored tie order, whatever order they were scheduled in", () => {
    // Scheduled in the order late, early, wide; delivered by deadline then tie order.
    const pack = labPack([cb("late", 3, 3, 21), cb("early", 3, 3, 20), cb("wide", 3, 4, 1)], {
      3: 3,
    });

    const { shown, checkpoint } = walk(pack, play, atReport(3));

    expect(eventsOf(shown, 3)).toEqual([labEvent("early"), labEvent("late"), labEvent("wide")]);
    expect(checkpoint.pendingCallbacks).toEqual([]);
  });

  it("uses the authored tie order for equal deadlines even when the other was scheduled first", () => {
    const first = labPack([cb("one", 3, 3, 5), cb("two", 3, 3, 6)]);
    const second = labPack([cb("two", 3, 3, 6), cb("one", 3, 3, 5)]);

    for (const pack of [first, second]) {
      const { shown } = walk(pack, play, atReport(3));
      expect(eventsOf(shown, 3)).toEqual([labEvent("one"), labEvent("two")]);
    }
  });

  it("lets a callback with the earlier deadline beat one with a smaller tie order", () => {
    const pack = labPack([cb("tied_first", 3, 4, 1), cb("due_sooner", 3, 3, 9)]);

    const { shown } = walk(pack, play, atReport(3));

    expect(eventsOf(shown, 3)).toEqual([labEvent("due_sooner"), labEvent("tied_first")]);
  });

  it("keeps a callback pending when the week has no slot left, with its deadline unchanged, and delivers it next week at the latest", () => {
    // Week 4 has 2 slots: the two deadline-4 callbacks take both; the deadline-5 one waits.
    const pack = labPack([cb("p", 4, 4, 1), cb("q", 4, 4, 2), cb("s", 4, 5, 3)]);

    const week4 = walk(pack, play, atReport(4));
    expect(eventsOf(week4.shown, 4)).toEqual([labEvent("p"), labEvent("q")]);
    // No ordinary event was shown: required callbacks beat them for every slot.
    expect(week4.checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.lab.s"]);
    expect(week4.checkpoint.pendingCallbacks[0]).toMatchObject({ scheduledWeek: 1 });
    expect(pack.callbacks.get("cb.lab.s")?.window.latestWeek).toBe(5);

    const week5 = walk(pack, play, atSlot(5, 0), week4.checkpoint);
    expect(week5.checkpoint.phase === "event" && week5.checkpoint.activeEvent.eventId).toBe(
      labEvent("s"),
    );
  });

  it("stops at an overdue callback instead of dropping it or moving its deadline", () => {
    // Three required deliveries whose last week is 3, but week 3 has two slots.
    const pack = labPack([cb("x", 3, 3, 1), cb("y", 3, 3, 2), cb("z", 3, 3, 3)]);
    const { checkpoint, shown } = walk(pack, play, atReport(3));
    if (checkpoint.phase !== "report") throw new Error("expected a report");

    expect(eventsOf(shown, 3)).toEqual([labEvent("x"), labEvent("y")]);
    expect(checkpoint.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.lab.z"]);

    const advanced = advanceWeek(pack, checkpoint);

    expect(advanced).toMatchObject({ ok: false, reason: "overdue-callbacks" });
    expect(!advanced.ok && advanced.message).toContain("cb.lab.z");
  });
});

describe("required-callback capacity check", () => {
  it("accepts the proof pack's two callbacks: disjoint windows with free slots", () => {
    const pack = proofPack();

    expect(
      checkCallbackCapacity(pack, ["cb.rider_voice_followup", "cb.public_rider_dispute"]),
    ).toEqual([]);
  });

  it("reports the callback that finds no slot, with the schedule that ran out", () => {
    const pack = labPack([cb("x", 3, 3, 1), cb("y", 3, 3, 2), cb("z", 3, 3, 3)]);

    const violations = checkCallbackCapacity(pack, ["cb.lab.x", "cb.lab.y", "cb.lab.z"]);

    // The lowest-priority callback is the one reported: authored order is never rearranged to fit.
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ callbackId: "cb.lab.z", latestWeek: 3 });
    expect(violations[0]?.message).toContain("week 3: 2 slot(s) -> cb.lab.x, cb.lab.y");
  });

  it("accepts the same callbacks when one has a later deadline with room", () => {
    const pack = labPack([cb("x", 3, 3, 1), cb("y", 3, 3, 2), cb("z", 3, 4, 3)]);

    expect(checkCallbackCapacity(pack, ["cb.lab.x", "cb.lab.y", "cb.lab.z"])).toEqual([]);
  });

  it("counts a week with no authored slots as no capacity", () => {
    const pack = labPack([cb("x", 3, 3, 1)], { 3: 0 });

    expect(checkCallbackCapacity(pack, ["cb.lab.x"])).toMatchObject([{ callbackId: "cb.lab.x" }]);
  });

  it("matches what the runtime does: whatever the check accepts is delivered by its deadline", () => {
    const pack = labPack([cb("x", 3, 3, 1), cb("y", 3, 4, 2), cb("z", 4, 4, 3)]);
    expect(checkCallbackCapacity(pack, ["cb.lab.x", "cb.lab.y", "cb.lab.z"])).toEqual([]);

    const { checkpoint } = walk(pack, play, atReport(4));

    expect(checkpoint.pendingCallbacks).toEqual([]);
  });
});

describe("a saved callback state is checked on resume, never repaired", () => {
  const pack = labPack([cb("a", 4, 5, 11)]);
  const due = () => walk(pack, play, atSlot(4, 0)).checkpoint as EventCheckpoint;

  it("resumes the untouched checkpoint", () => {
    expect(resumeCheckpoint(pack, due())).toMatchObject({ ok: true });
  });

  it("refuses a save whose active event skips a due callback", () => {
    const tampered: EventCheckpoint = {
      ...due(),
      activeEvent: {
        eventId: "evt.test.week_beat",
        optionIds: ["opt.test.week_beat.steady", "opt.test.week_beat.push"],
      },
    };

    const result = resumeCheckpoint(pack, tampered);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.join()).toContain(
      "differs from the one the committed state selects",
    );
  });

  it("refuses a callback that is both pending and resolved", () => {
    const base = due();
    const tampered = {
      ...base,
      resolvedCallbacks: [{ callbackId: "cb.lab.a", week: 3, resolvedBy: labEvent("a") }],
      resolvedEventIds: [...base.resolvedEventIds, labEvent("a")],
    };

    const result = resumeCheckpoint(pack, tampered);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.join()).toContain("both pending and resolved");
  });

  it("refuses a resolution recorded by an event that is not the callback's variant", () => {
    const base = due();
    const tampered = {
      ...base,
      pendingCallbacks: [],
      resolvedCallbacks: [{ callbackId: "cb.lab.a", week: 3, resolvedBy: "evt.test.week_beat" }],
    };

    const result = resumeCheckpoint(pack, tampered);

    expect(!result.ok && result.issues.join()).toContain("not its variant");
  });

  it("refuses a pending callback scheduled in a later week or listed twice", () => {
    const base = due();
    const [pending] = base.pendingCallbacks;
    if (!pending) throw new Error("expected a pending callback");

    const later = resumeCheckpoint(pack, {
      ...base,
      pendingCallbacks: [{ ...pending, scheduledWeek: 9 }],
    });
    const twice = resumeCheckpoint(pack, {
      ...base,
      pendingCallbacks: [pending, pending],
    });

    expect(!later.ok && later.issues.join()).toContain("scheduled in a later week");
    expect(!twice.ok && twice.issues.join()).toContain("pending more than once");
  });

  it("still reads a save written before callbacks were resolved (no resolvedCallbacks field)", () => {
    const { resolvedCallbacks: _omitted, ...legacy } = due();

    const parsed = checkpointSchema.parse(legacy);

    expect(parsed.resolvedCallbacks).toEqual([]);
    expect(resumeCheckpoint(pack, parsed)).toMatchObject({ ok: true });
  });
});

describe("content that would make delivery ambiguous is rejected at load", () => {
  const extra = (chain: Raw, id: string, tieOrder: number) => {
    chain.callbacks.push({ ...structuredClone(chain.callbacks[0]), id, tieOrder });
  };

  it("rejects two callbacks sharing a tie order", () => {
    expect(() =>
      packFrom((chain) => {
        extra(chain, "cb.proof.twin", chain.callbacks[0].tieOrder);
      }),
    ).toThrow(/tieOrder 1 is also used by/);
  });

  it("rejects a plan that schedules a callback's own event as an ordinary slot", () => {
    expect(() =>
      packFrom((_, loop) => {
        loop.weeks[1].slots = [
          "var.rider_voice_followup.engaged",
          "evt.proof.fallback_shift_roster",
        ];
      }),
    ).toThrow(/which cb.rider_voice_followup delivers/);
  });

  it("rejects a variant event that is not marked as delivered by its callback", () => {
    expect(() =>
      packFrom((chain) => {
        delete chain.events.find((e: Raw) => e.id === "var.rider_voice_followup.engaged")
          .deliveredBy;
      }),
    ).toThrow(/not marked deliveredBy cb.rider_voice_followup/);
  });

  it("rejects a callback that is not required: optional follow-ups are ordinary events", () => {
    expect(() =>
      packFrom((chain) => {
        chain.callbacks[0].required = false;
      }),
    ).toThrow(/required/);
  });
});
