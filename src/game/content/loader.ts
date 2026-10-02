import type { z } from "zod";
import {
  type CallbackDef,
  type Condition,
  type Effect,
  type GameEvent,
  type NpcDef,
  type ProofLoop,
  proofChainSchema,
  proofLoopSchema,
} from "./schema.ts";

/** Authored content failed validation. The message lists every problem; nothing is coerced. */
export class ContentError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid content:\n- ${issues.join("\n- ")}`);
    this.name = "ContentError";
    this.issues = issues;
  }
}

export interface ContentPack {
  events: ReadonlyMap<string, GameEvent>;
  callbacks: ReadonlyMap<string, CallbackDef>;
  npcs: ReadonlyMap<string, NpcDef>;
  policyIds: ReadonlySet<string>;
  memoryIds: ReadonlySet<string>;
  /** Slot plan per week, index 0 = week 1. */
  plan: ReadonlyArray<ReadonlyArray<string>>;
  /** Decision budget per week, index 0 = week 1. */
  weeklyBudget: ReadonlyArray<number>;
  /** The authored state-independent fallback event, if the pack has one. */
  fallbackEventId: string | null;
}

function zodIssues(prefix: string, error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${prefix}${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
}

/** Validate authored JSON and resolve every reference. Throws {@link ContentError}. */
export function loadContentPack(rawChain: unknown, rawLoop: unknown): ContentPack {
  const chainResult = proofChainSchema.safeParse(rawChain);
  const loopResult = proofLoopSchema.safeParse(rawLoop);
  const schemaIssues = [
    ...(chainResult.success ? [] : zodIssues("proof-chain: ", chainResult.error)),
    ...(loopResult.success ? [] : zodIssues("proof-loop: ", loopResult.error)),
  ];
  if (!chainResult.success || !loopResult.success) throw new ContentError(schemaIssues);

  const chain = chainResult.data;
  const loop = loopResult.data;
  const issues: string[] = [];

  const unique = <T extends { id: string }>(kind: string, items: T[]): Map<string, T> => {
    const map = new Map<string, T>();
    for (const item of items) {
      if (map.has(item.id)) issues.push(`duplicate ${kind} id ${item.id}`);
      map.set(item.id, item);
    }
    return map;
  };

  const events = unique("event", chain.events);
  const callbacks = unique("callback", chain.callbacks);
  const npcs = unique("npc", chain.npcs);
  const policies = unique("policy", chain.policies);
  const memories = unique("memory", chain.memories);
  const closures = unique("closure", chain.closures);
  const chains = unique("chain", chain.chains);

  const optionIds = new Set<string>();
  for (const event of chain.events) {
    for (const option of event.options) {
      if (optionIds.has(option.id)) issues.push(`duplicate option id ${option.id}`);
      optionIds.add(option.id);
    }
  }

  const checkCondition = (where: string, c: Condition) => {
    if ("set" in c) {
      const known = c.set === "policies" ? policies : memories;
      if (!known.has(c.id)) issues.push(`${where}: unknown ${c.set} id ${c.id}`);
      return;
    }
    const npcRef = /^npc\.(.+)\.status$/.exec(c.ref);
    if (!npcRef) return;
    const npc = npcs.get(`npc.${npcRef[1]}`);
    if (!npc) issues.push(`${where}: unknown npc in ${c.ref}`);
    else if (typeof c.value !== "string" || !npc.statuses.includes(c.value)) {
      issues.push(`${where}: ${c.ref} compares with unknown status ${String(c.value)}`);
    }
  };

  const checkEffect = (where: string, e: Effect) => {
    switch (e.kind) {
      case "policyAdd":
        if (!policies.has(e.id)) issues.push(`${where}: unknown policy ${e.id}`);
        break;
      case "recurringCostAdjust":
        if (!policies.has(e.source)) issues.push(`${where}: unknown policy ${e.source}`);
        break;
      case "memoryAdd":
        if (!memories.has(e.id)) issues.push(`${where}: unknown memory ${e.id}`);
        break;
      case "callbackSchedule":
        if (!callbacks.has(e.callback)) issues.push(`${where}: unknown callback ${e.callback}`);
        break;
      case "npcStatusSet": {
        const npc = npcs.get(e.npc);
        if (!npc) issues.push(`${where}: unknown npc ${e.npc}`);
        else if (!npc.statuses.includes(e.status)) {
          issues.push(`${where}: npc ${e.npc} has no status ${e.status}`);
        }
        break;
      }
      case "metricAdjust":
        break;
    }
  };

  for (const event of chain.events) {
    if (!npcs.has(event.speaker)) issues.push(`${event.id}: unknown speaker ${event.speaker}`);
    if (event.chain !== null && !chains.has(event.chain)) {
      issues.push(`${event.id}: unknown chain ${event.chain}`);
    }
    if (event.deliveredBy && !callbacks.has(event.deliveredBy)) {
      issues.push(`${event.id}: unknown callback ${event.deliveredBy}`);
    }
    for (const c of event.eligibility ?? []) checkCondition(event.id, c);
    for (const line of event.contextLines?.lines ?? []) {
      for (const c of line.when) checkCondition(`${event.id} contextLines`, c);
    }
    for (const option of event.options) {
      for (const c of option.requires) checkCondition(option.id, c);
      for (const e of option.effects) checkEffect(option.id, e);
      if (option.requires.length > 0 && !option.unavailableBecause) {
        issues.push(`${option.id}: conditional option needs unavailableBecause`);
      }
    }
  }

  for (const cb of chain.callbacks) {
    if (cb.window.earliestWeek > cb.window.latestWeek) {
      issues.push(`${cb.id}: window earliestWeek is after latestWeek`);
    }
    if (!events.has(cb.sourceDecision.event)) {
      issues.push(`${cb.id}: unknown source event ${cb.sourceDecision.event}`);
    }
    const sourceEvent = events.get(cb.sourceDecision.event);
    for (const id of cb.sourceDecision.options) {
      if (!optionIds.has(id)) issues.push(`${cb.id}: unknown source option ${id}`);
      else if (sourceEvent && !sourceEvent.options.some((o) => o.id === id)) {
        issues.push(`${cb.id}: source option ${id} is not an option of ${sourceEvent.id}`);
      }
    }
    for (const c of cb.eligibility) checkCondition(cb.id, c);
    for (const variant of cb.variants) {
      const variantEvent = events.get(variant.event);
      if (!variantEvent) issues.push(`${cb.id}: unknown variant event ${variant.event}`);
      else if (variantEvent.deliveredBy !== cb.id) {
        // Resolving a delivered event resolves the callback named by `deliveredBy`.
        issues.push(`${cb.id}: variant event ${variant.event} is not marked deliveredBy ${cb.id}`);
      }
      for (const c of variant.when) checkCondition(cb.id, c);
    }
    const resolution = cb.changedContext.resolution;
    if (resolution.type === "reportClosure" && !closures.has(resolution.closure)) {
      issues.push(`${cb.id}: unknown closure ${resolution.closure}`);
    }
  }
  // The authored tie order is what makes equal deadlines deterministic, so it must be unique.
  const tieOrders = new Map<number, string>();
  for (const cb of chain.callbacks) {
    const other = tieOrders.get(cb.tieOrder);
    if (other !== undefined)
      issues.push(`${cb.id}: tieOrder ${cb.tieOrder} is also used by ${other}`);
    tieOrders.set(cb.tieOrder, cb.id);
  }
  for (const event of chain.events) {
    const owners = chain.callbacks.filter((cb) => cb.variants.some((v) => v.event === event.id));
    if (event.deliveredBy && !owners.some((cb) => cb.id === event.deliveredBy)) {
      issues.push(`${event.id}: deliveredBy ${event.deliveredBy} does not list it as a variant`);
    }
  }
  for (const closure of chain.closures) {
    if (!callbacks.has(closure.callback)) {
      issues.push(`${closure.id}: unknown callback ${closure.callback}`);
    }
  }
  for (const npc of chain.npcs) {
    if (npc.initialStatus !== null && !npc.statuses.includes(npc.initialStatus)) {
      issues.push(`${npc.id}: initialStatus ${npc.initialStatus} is not one of its statuses`);
    }
  }

  const fallbacks = chain.events.filter((e) => e.role === "fallback");
  if (fallbacks.length > 1) issues.push("more than one fallback event; only one is supported");

  const plan = checkPlan(loop, events, chain.fixture.weeklyBudget, issues);

  if (issues.length > 0) throw new ContentError(issues);

  return {
    events,
    callbacks,
    npcs,
    policyIds: new Set(policies.keys()),
    memoryIds: new Set(memories.keys()),
    plan,
    weeklyBudget: chain.fixture.weeklyBudget,
    fallbackEventId: fallbacks[0]?.id ?? null,
  };
}

function checkPlan(
  loop: ProofLoop,
  events: ReadonlyMap<string, GameEvent>,
  budget: number[],
  issues: string[],
): string[][] {
  const plan: string[][] = [];
  loop.weeks.forEach((entry, index) => {
    if (entry.week !== index + 1) issues.push(`proof-loop: week ${index + 1} is out of order`);
    const cap = budget[index] ?? 0;
    if (entry.slots.length > cap) {
      issues.push(
        `proof-loop: week ${entry.week} has ${entry.slots.length} slots, budget is ${cap}`,
      );
    }
    for (const id of entry.slots) {
      const event = events.get(id);
      if (!event) issues.push(`proof-loop: week ${entry.week} names unknown event ${id}`);
      else if (event.deliveredBy) {
        // A callback event is only ever delivered by its callback; planning it would bypass the
        // window, the priority rules and the resolution of the callback.
        issues.push(
          `proof-loop: week ${entry.week} plans ${id}, which ${event.deliveredBy} delivers`,
        );
      }
    }
    plan.push([...entry.slots]);
  });
  // The campaign starts in week 1, so week 1 must meet the 2-4 decisions a week contract (SPEC
  // section 5). Later weeks may stay unfinished and still load; `Next Week` refuses them.
  if ((plan[0]?.length ?? 0) < 2) issues.push("proof-loop: week 1 needs at least 2 slots");
  return plan;
}
