import { describe, expect, it } from "vitest";
import histories from "../../../content/prototype/proof-histories.json";
import { allHold } from "../../../src/game/domain/conditions.ts";
import type { Checkpoint, EventCheckpoint } from "../../../src/game/persistence/checkpoint.ts";
import { proofPack, type Raw, walk } from "../helpers.ts";
import { assertNoMetricConditions, enumerate } from "./enumerate.ts";

// T19: the shared-crisis proof played by the real rules (selection, callbacks, settlement, Next
// Week) from real choices, with the T18 fixture as the authority for what must happen.

const pack = proofPack();
const CRISIS = "evt.proof.public_rider_dispute";
const history = (id: string): Raw => histories.histories.find((h) => h.id === id);

/** The choices a fixture history makes at its chain nodes; every other decision takes option 1. */
const chooser = (h: Raw) => {
  const byNode: Record<string, string> = Object.fromEntries(
    h.decisions.map((d: Raw) => [d.node, d.option]),
  );
  return (c: EventCheckpoint) => byNode[c.activeEvent.eventId] ?? c.activeEvent.optionIds[0] ?? "";
};

const atCrisis = (c: Checkpoint) =>
  c.phase === "event" && c.activeEvent.eventId === CRISIS && c.weekDecisions.length === 0;

function toCrisis(id: string) {
  const h = history(id);
  const played = walk(pack, chooser(h), atCrisis);
  const crisis = played.checkpoint as EventCheckpoint;
  return { h, played, crisis };
}

describe("both demonstration histories reach the shared crisis through real choices (AC-06)", () => {
  for (const id of ["history.a_rider_support", "history.b_decline"]) {
    it(`${id}: callbacks arrive in the documented weeks and the crisis offers the documented options`, () => {
      const { h, played, crisis } = toCrisis(id);

      expect(crisis.week).toBe(10);
      expect(crisis.activeEvent.optionIds).toEqual(h.crisisSelectableOptionIds);
      // Same crisis identity in every history, delivered by its callback in week 10.
      const variant = h.callbackState["cb.rider_voice_followup"].variant;
      expect(played.shown[7]?.[0]).toBe(variant);
      expect(crisis.activeEvent.eventId).toBe(CRISIS);
      // The documented state before the crisis, read from the committed checkpoint. Metrics are not
      // compared: the fixture assumes no other content, and the placeholder beats move them.
      expect([...crisis.policies].sort()).toEqual([...h.stateBeforeCrisis.policies].sort());
      expect([...crisis.memories].sort()).toEqual([...h.stateBeforeCrisis.memories].sort());
      expect(crisis.npcStatus["npc.recurring_rider"]).toBe(
        h.stateBeforeCrisis["npc.recurring_rider.status"],
      );
      expect(Object.values(crisis.recurringCosts).reduce((a, b) => a + b, 0)).toBe(
        h.stateBeforeCrisis.recurringPolicyCost,
      );
      expect(crisis.pendingCallbacks.map((p) => p.callbackId)).toEqual(["cb.public_rider_dispute"]);
      expect(crisis.activeEvent.optionIds.length).toBeGreaterThanOrEqual(2);
      expect(crisis.activeEvent.optionIds.length).toBeLessThanOrEqual(4);
    });

    it(`${id}: every unavailable crisis option is explained by the committed state, and played to Prototype Complete`, () => {
      const { h, crisis } = toCrisis(id);
      const event = pack.events.get(CRISIS);
      if (!event) throw new Error("no crisis");

      for (const gone of h.crisisUnavailable) {
        const option = event.options.find((o) => o.id === gone.option);
        expect(option, gone.option).toBeDefined();
        expect(allHold(option?.requires ?? [], crisis), gone.option).toBe(false);
        expect(crisis.activeEvent.optionIds).not.toContain(gone.option);
      }
      // The documented crisis choice is selectable and the run finishes from it.
      const finished = walk(
        pack,
        chooser(h),
        (c) => c.phase === "complete" || (c.phase === "report" && c.week === 12),
      );
      expect(finished.checkpoint.pendingCallbacks).toEqual([]);
      expect(finished.checkpoint.resolvedEventIds).toContain(CRISIS);
    });
  }

  it("the two histories differ in selectable options for the documented policy, relationship and precedent reasons, not in dialogue or numbers", () => {
    const a = toCrisis("history.a_rider_support").crisis;
    const b = toCrisis("history.b_decline").crisis;
    const onlyA = a.activeEvent.optionIds.filter((o) => !b.activeEvent.optionIds.includes(o));
    const onlyB = b.activeEvent.optionIds.filter((o) => !a.activeEvent.optionIds.includes(o));

    expect(onlyA).toEqual(["opt.crisis.cite_policy", "opt.crisis.joint_statement"]);
    expect(onlyB).toEqual(["opt.crisis.announce_new_policy", "opt.crisis.quiet_settlement"]);
    expect(a.activeEvent.optionIds.filter((o) => b.activeEvent.optionIds.includes(o))).toEqual([
      "opt.crisis.hold_and_review",
    ]);
    // The difference is read from policies, the rider relationship and the precedent only.
    const event = pack.events.get(CRISIS);
    const reasons = new Set<string>();
    for (const option of event?.options ?? []) {
      if (![...onlyA, ...onlyB].includes(option.id)) continue;
      for (const condition of option.requires) {
        reasons.add("set" in condition ? condition.set : condition.ref);
        expect("ref" in condition && condition.ref.startsWith("metric.")).toBe(false);
      }
    }
    expect([...reasons].sort()).toEqual(["memories", "npc.recurring_rider.status", "policies"]);
    assertNoMetricConditions(pack);
  });

  it("the changed-context probe C reaches the same crisis with a closure instead of a variant", () => {
    const { h, played, crisis } = toCrisis("history.c_changed_context_probe");

    expect(played.shown[7]?.some((id) => id.startsWith("var."))).toBe(false);
    expect(crisis.resolvedCallbacks).toEqual([
      {
        callbackId: "cb.rider_voice_followup",
        week: 7,
        resolvedBy: h.callbackState["cb.rider_voice_followup"].closure,
      },
    ]);
    expect(crisis.activeEvent.optionIds).toEqual(h.crisisSelectableOptionIds);
  });
});

describe("bounded enumeration of the proof pack's structure", () => {
  const result = enumerate(pack);

  it("reaches no dead end: every transition from every reachable state is accepted", () => {
    expect(result.refusals).toEqual([]);
    expect(result.complete.length).toBeGreaterThan(0);
  });

  it("presents every event with 2-4 selectable options in every reachable state", () => {
    for (const [eventId, sets] of result.presented) {
      for (const ids of sets) {
        const count = ids.split(",").length;
        expect(count, `${eventId} offered ${ids}`).toBeGreaterThanOrEqual(2);
        expect(count, `${eventId} offered ${ids}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("offers exactly the documented crisis option sets", () => {
    const documented = histories.reachableCrisisStates.states.map((s: Raw) =>
      s.crisisSelectable.join(","),
    );

    expect(new Set(result.presented.get(CRISIS))).toEqual(new Set(documented));
  });

  it("reaches 6 structurally distinct crisis states: the 7 documented ones, two of which differ only in a number", () => {
    // B + hold_line and B + route_to_ops change only metrics, so they are one structural state.
    const crisisStates = [...result.states.values()].filter(
      (r) =>
        r.checkpoint.phase === "event" &&
        r.checkpoint.activeEvent.eventId === CRISIS &&
        r.checkpoint.weekDecisions.length === 0,
    );

    expect(histories.reachableCrisisStates.states).toHaveLength(7);
    expect(crisisStates).toHaveLength(6);
    // Every documented state's crisis option set is the one some reached state offers.
    for (const documentedState of histories.reachableCrisisStates.states as Raw[]) {
      const offered = crisisStates.map(
        (r) => (r.checkpoint as EventCheckpoint).activeEvent.optionIds,
      );
      expect(offered).toContainEqual(documentedState.crisisSelectable);
    }
  });

  it("replays each of the 21 documented paths (setup, follow-up, crisis) to Prototype Complete under the real rules", () => {
    const owner = (optionId: string) =>
      [...pack.events.values()].find((e) => e.options.some((o) => o.id === optionId))?.id ?? "";
    let paths = 0;
    for (const state of histories.reachableCrisisStates.states as Raw[]) {
      for (const crisisOption of state.crisisSelectable as string[]) {
        const choices: Record<string, string> = {
          "evt.proof.rider_claim": state.setup,
          [CRISIS]: crisisOption,
        };
        if (!state.callback.startsWith("closure.")) choices[owner(state.callback)] = state.callback;

        const end = walk(
          pack,
          (c) => choices[c.activeEvent.eventId] ?? c.activeEvent.optionIds[0] ?? "",
          (c) => c.phase === "report" && c.week === 12,
        ).checkpoint;

        expect(
          end.pendingCallbacks,
          `${state.setup} > ${state.callback} > ${crisisOption}`,
        ).toEqual([]);
        expect(end.resolvedCallbacks).toHaveLength(2);
        paths++;
      }
    }
    expect(paths).toBe(21);
  });

  it("delivers both callbacks exactly once on every structurally distinct path to Prototype Complete", () => {
    expect(result.complete).toHaveLength(18);
    for (const end of result.complete) {
      const c = end.checkpoint;
      expect(c.pendingCallbacks).toEqual([]);
      expect(c.resolvedCallbacks.map((r) => r.callbackId).sort()).toEqual([
        "cb.public_rider_dispute",
        "cb.rider_voice_followup",
      ]);
      expect(c.resolvedEventIds).toContain(CRISIS);
    }
  });

  it("keeps each callback inside its authored window on every path", () => {
    for (const { checkpoint: c } of result.states.values()) {
      for (const r of c.resolvedCallbacks) {
        const window = pack.callbacks.get(r.callbackId)?.window;
        expect(r.week).toBeGreaterThanOrEqual(window?.earliestWeek ?? 99);
        expect(r.week).toBeLessThanOrEqual(window?.latestWeek ?? 0);
      }
    }
  });
});

describe("the company survives extreme play on the shipped route (D4 early-failure rule)", () => {
  const effectSum = (optionId: string, metrics: string[]) => {
    for (const event of pack.events.values()) {
      const option = event.options.find((o) => o.id === optionId);
      if (option) {
        return option.effects.reduce(
          (sum, e) =>
            e.kind === "metricAdjust" && metrics.includes(e.metric) ? sum + e.delta : sum,
          0,
        );
      }
    }
    return 0;
  };
  const best = (metrics: string[], sign: 1 | -1) => (c: EventCheckpoint) =>
    [...c.activeEvent.optionIds].sort(
      (x, y) => sign * (effectSum(y, metrics) - effectSum(x, metrics)),
    )[0] ?? "";
  const policies: Record<string, (c: EventCheckpoint) => string> = {
    "first option": (c) => c.activeEvent.optionIds[0] ?? "",
    "last option": (c) => c.activeEvent.optionIds.at(-1) ?? "",
    "most cash": best(["cash"], 1),
    "least cash": best(["cash"], -1),
    "most network and trust": best(["riderNetwork", "merchantNetwork", "publicTrust"], 1),
    "least network and trust": best(["riderNetwork", "merchantNetwork", "publicTrust"], -1),
  };

  for (const [name, policy] of Object.entries(policies)) {
    for (const setup of [
      "opt.rider_claim.fund_policy",
      "opt.rider_claim.decline",
      "opt.rider_claim.settle_and_part",
    ]) {
      it(`${name}, setup ${setup}: reaches the week-12 report without the failed state`, () => {
        const { history } = walk(
          pack,
          (c) => (c.activeEvent.eventId === "evt.proof.rider_claim" ? setup : policy(c)),
          (c) => c.phase === "report" && c.week === 12,
        );

        // walk() throws on the failed phase; also keep clear of the D4 threshold of -25.
        expect(Math.min(...history.map((c) => c.metrics.cash))).toBeGreaterThan(-25);
      });
    }
  }
});
