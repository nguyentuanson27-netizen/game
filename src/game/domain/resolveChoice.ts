import type { ContentPack } from "../content/loader.ts";
import type { Effect, EventOption } from "../content/schema.ts";
import type { CheckpointDraft, EventCheckpoint } from "../persistence/checkpoint.ts";
import { nextStep } from "./nextStep.ts";
import type { CampaignState } from "./worldState.ts";

export type ResolveResult =
  | { ok: true; draft: CheckpointDraft; option: EventOption }
  | { ok: false; reason: "not-selectable" | "no-next-event"; message: string };

const clampNetwork = (value: number) => Math.min(100, Math.max(0, value));

function applyEffect(
  state: CampaignState,
  effect: Effect,
  source: { week: number; eventId: string; optionId: string },
): CampaignState {
  switch (effect.kind) {
    case "metricAdjust": {
      const next = state.metrics[effect.metric] + effect.delta;
      // Cash may go negative (D4 failure rule is Cash < -25); the networks and trust clamp to 0..100.
      const value = effect.metric === "cash" ? next : clampNetwork(next);
      return { ...state, metrics: { ...state.metrics, [effect.metric]: value } };
    }
    case "policyAdd":
      return state.policies.includes(effect.id)
        ? state
        : { ...state, policies: [...state.policies, effect.id] };
    case "memoryAdd":
      return state.memories.includes(effect.id)
        ? state
        : { ...state, memories: [...state.memories, effect.id] };
    case "recurringCostAdjust":
      return {
        ...state,
        recurringCosts: {
          ...state.recurringCosts,
          [effect.source]: (state.recurringCosts[effect.source] ?? 0) + effect.delta,
        },
      };
    case "npcStatusSet":
      return { ...state, npcStatus: { ...state.npcStatus, [effect.npc]: effect.status } };
    case "callbackSchedule":
      return state.pendingCallbacks.some((p) => p.callbackId === effect.callback)
        ? state
        : {
            ...state,
            pendingCallbacks: [
              ...state.pendingCallbacks,
              {
                callbackId: effect.callback,
                scheduledWeek: source.week,
                sourceEventId: source.eventId,
                sourceOptionId: source.optionId,
              },
            ],
          };
  }
}

/**
 * Turn one tap into the single checkpoint that records the whole decision: the choice, every
 * effect (visible metrics, policies, relationships, precedents, recurring cost, scheduled
 * callbacks) and the next decision slot evaluated against that updated state. Pure: it never
 * writes, so a failed or repeated save cannot apply anything twice.
 */
export function resolveChoice(
  pack: ContentPack,
  checkpoint: EventCheckpoint,
  optionId: string,
): ResolveResult {
  const { eventId, optionIds } = checkpoint.activeEvent;
  const option = pack.events.get(eventId)?.options.find((o) => o.id === optionId);
  if (!option || !optionIds.includes(optionId)) {
    return { ok: false, reason: "not-selectable", message: `${optionId} is not selectable` };
  }

  const source = { week: checkpoint.week, eventId, optionId };
  const start: CampaignState = {
    metrics: checkpoint.metrics,
    policies: checkpoint.policies,
    memories: checkpoint.memories,
    npcStatus: checkpoint.npcStatus,
    recurringCosts: checkpoint.recurringCosts,
    pendingCallbacks: checkpoint.pendingCallbacks,
  };
  const state = option.effects.reduce((s, e) => applyEffect(s, e, source), start);

  const weekDecisions = [
    ...checkpoint.weekDecisions,
    { slot: checkpoint.weekDecisions.length + 1, eventId, optionId },
  ];
  const next = nextStep(pack, checkpoint.week, weekDecisions.length, state);
  if (!next.ok) return { ok: false, reason: "no-next-event", message: next.message };

  const base = {
    schemaVersion: checkpoint.schemaVersion,
    parentSequence: checkpoint.sequence,
    week: checkpoint.week,
    weekDecisions,
    ...state,
  };
  const draft: CheckpointDraft =
    next.phase === "event"
      ? { ...base, phase: "event", activeEvent: next.activeEvent }
      : { ...base, phase: "settlement", activeEvent: null };
  return { ok: true, draft, option };
}
