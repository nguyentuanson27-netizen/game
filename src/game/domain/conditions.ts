import type { Condition } from "../content/schema.ts";
import type { WorldState } from "./worldState.ts";

function readRef(ref: string, state: WorldState): string | number | undefined {
  if (ref.startsWith("metric.")) {
    return state.metrics[ref.slice("metric.".length) as keyof WorldState["metrics"]];
  }
  const npc = /^npc\.(.+)\.status$/.exec(ref);
  return npc ? state.npcStatus[`npc.${npc[1]}`] : undefined;
}

/** Evaluate one allowlisted condition against committed state. Pure; never executes content. */
export function conditionHolds(condition: Condition, state: WorldState): boolean {
  switch (condition.op) {
    case "has":
      return (condition.set === "policies" ? state.policies : state.memories).includes(
        condition.id,
      );
    case "notHas":
      return !(condition.set === "policies" ? state.policies : state.memories).includes(
        condition.id,
      );
    case "eq":
      return readRef(condition.ref, state) === condition.value;
    case "neq":
      return readRef(condition.ref, state) !== condition.value;
  }
}

/** All conditions are AND; an empty list always holds. */
export function allHold(conditions: readonly Condition[], state: WorldState): boolean {
  return conditions.every((c) => conditionHolds(c, state));
}
