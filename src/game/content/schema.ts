import { z } from "zod";

// Runtime boundary for authored prototype content (G0 D2). Everything here is data: nothing in
// the JSON is ever executed. Objects are strict so a typo in an authored key fails loudly instead
// of being dropped. Only the condition/effect shapes the T18 proof pack uses are accepted;
// anything else (e.g. gte/lte, flagAdd) is rejected until content actually needs it.

/** Stable semantic id: lowercase dot-separated segments, e.g. `opt.rider_claim.fund_policy`. */
export const idSchema = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/, "not a semantic id");

export const METRICS = ["cash", "riderNetwork", "merchantNetwork", "publicTrust"] as const;
export const metricSchema = z.enum(METRICS);
export type Metric = z.infer<typeof metricSchema>;

const metricRefSchema = z.enum(METRICS.map((m) => `metric.${m}`) as [string, ...string[]]);
const npcStatusRefSchema = z.string().regex(/^npc\.[a-z0-9_]+\.status$/, "not an npc status ref");

export const conditionSchema = z.union([
  z.strictObject({
    op: z.enum(["eq", "neq"]),
    ref: z.union([metricRefSchema, npcStatusRefSchema]),
    value: z.union([z.string(), z.number()]),
  }),
  z.strictObject({
    op: z.enum(["has", "notHas"]),
    set: z.enum(["policies", "memories"]),
    id: idSchema,
  }),
]);
export type Condition = z.infer<typeof conditionSchema>;

export const effectSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("metricAdjust"),
    metric: metricSchema,
    delta: z.number().int(),
  }),
  z.strictObject({ kind: z.literal("policyAdd"), id: idSchema }),
  z.strictObject({
    kind: z.literal("recurringCostAdjust"),
    source: idSchema,
    delta: z.number().int(),
  }),
  z.strictObject({ kind: z.literal("npcStatusSet"), npc: idSchema, status: z.string().min(1) }),
  z.strictObject({ kind: z.literal("memoryAdd"), id: idSchema }),
  z.strictObject({ kind: z.literal("callbackSchedule"), callback: idSchema }),
]);
export type Effect = z.infer<typeof effectSchema>;

export const optionSchema = z.strictObject({
  id: idSchema,
  text: z.string().min(1),
  hint: z.string().min(1),
  requires: z.array(conditionSchema),
  unavailableBecause: z.string().min(1).optional(),
  confirmation: z.enum(["none", "required"]),
  confirmationNote: z.string().min(1).optional(),
  effects: z.array(effectSchema),
  feedback: z.string().min(1),
  reportLine: z.string().min(1).optional(),
});
export type EventOption = z.infer<typeof optionSchema>;

/** Authoring annotations kept in the fixture for reviewers; the runtime never reads them. */
const note = z.unknown().optional();

export const eventSchema = z.strictObject({
  id: idSchema,
  chain: idSchema.nullable(),
  role: z.enum(["setup", "callbackVariant", "sharedCrisis", "fallback"]),
  title: z.string().min(1),
  stage: z.enum(["street_startup", "local_platform", "city_player"]),
  speaker: idSchema,
  category: z.enum(["operational", "character", "strategic", "crisis", "opportunity"]),
  whyNow: z.string().min(1),
  situation: z.string().min(1),
  eligibility: z.array(conditionSchema).optional(),
  deliveredBy: idSchema.optional(),
  contextLines: z
    .strictObject({
      note: z.string().optional(),
      lines: z.array(z.strictObject({ when: z.array(conditionSchema), text: z.string().min(1) })),
    })
    .optional(),
  options: z.array(optionSchema).min(2),
  cooldownWeeks: z.number().int().positive().nullable().optional(),
  repeatable: z.boolean().optional(),
  placement: note,
  selectableCoverage: note,
  memoryCreated: note,
  requiredCallbacksScheduled: note,
  optionAvailabilityDriversAC06: note,
  fallbackRules: note,
});
export type GameEvent = z.infer<typeof eventSchema>;

const callbackResolutionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("reportClosure"),
    closure: idSchema,
    closedInReportOfWeek: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal("none"),
    reportClosureAllowed: z.literal(false),
    reason: z.string().min(1),
  }),
]);

// Callback metadata is validated and kept intact so T15 can schedule from it. T08-T12 only
// persist which callbacks were scheduled; they never deliver one.
export const callbackSchema = z.strictObject({
  id: idSchema,
  chain: idSchema,
  sourceDecision: z.strictObject({
    event: idSchema,
    options: z.array(idSchema).min(1),
    scheduledBy: z.string().min(1),
  }),
  required: z.boolean(),
  window: z.strictObject({
    earliestWeek: z.number().int().min(1).max(12),
    latestWeek: z.number().int().min(1).max(12),
    weekBasis: z.string().min(1),
  }),
  tieOrder: z.number().int().positive(),
  tieOrderNote: z.string().optional(),
  eligibility: z.array(conditionSchema),
  consumesEventSlot: z.string().min(1),
  variants: z.array(z.strictObject({ event: idSchema, when: z.array(conditionSchema) })).min(1),
  variantNote: z.string().optional(),
  changedContext: z.strictObject({
    invalidWhen: z.string().min(1),
    resolution: callbackResolutionSchema,
    appliesUnchosenOption: z.literal(false),
    slotShortageCancels: z.literal(false),
  }),
  pendingRule: z.string().optional(),
});
export type CallbackDef = z.infer<typeof callbackSchema>;

export const closureSchema = z.strictObject({
  id: idSchema,
  type: z.literal("reportClosure"),
  callback: idSchema,
  consumesEventSlot: z.literal(false),
  playerChoice: z.literal(false),
  reportText: z.string().min(1),
  effects: z.array(effectSchema).max(0),
  effectsNote: z.string().optional(),
});

const npcSchema = z.strictObject({
  id: idSchema,
  role: z.string().min(1),
  purpose: z.string().min(1),
  statuses: z.array(z.string().min(1)),
  initialStatus: z.string().min(1).nullable(),
  usableAsPartner: z.string().optional(),
  unusableWhen: z.string().optional(),
});
export type NpcDef = z.infer<typeof npcSchema>;

const policySchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1),
  createdBy: z.array(idSchema),
  readBy: z.array(idSchema),
});

const memorySchema = z.strictObject({
  id: idSchema,
  kind: z.enum(["memory", "precedent"]),
  meaning: z.string().optional(),
  createdBy: z.union([z.string(), z.array(z.string())]),
  readBy: z.array(z.string()),
  note: z.string().optional(),
});

const chainSchema = z.strictObject({
  id: idSchema,
  thesis: z.string().min(1),
  shape: z.string().min(1),
  nodes: z.array(idSchema),
  callbacks: z.array(idSchema),
  convergence: z.string().min(1),
});

export const weeklyBudgetSchema = z.array(z.number().int().min(2).max(4)).length(12);

export const proofChainSchema = z.strictObject({
  fixture: z.looseObject({ id: z.string().min(1), weeklyBudget: weeklyBudgetSchema }),
  vocabulary: z.unknown(),
  npcs: z.array(npcSchema),
  policies: z.array(policySchema),
  memories: z.array(memorySchema),
  chains: z.array(chainSchema),
  events: z.array(eventSchema).min(1),
  callbacks: z.array(callbackSchema),
  closures: z.array(closureSchema),
});
export type ProofChain = z.infer<typeof proofChainSchema>;

/**
 * Which authored event occupies which decision slot of which week in the playable proof loop.
 * This is only the order the loop walks; it is not the T15 callback scheduler.
 */
export const proofLoopSchema = z.strictObject({
  id: z.string().min(1),
  note: z.string().min(1),
  weeks: z
    .array(
      z.strictObject({
        week: z.number().int().min(1).max(12),
        slots: z.array(idSchema),
      }),
    )
    .length(12),
});
export type ProofLoop = z.infer<typeof proofLoopSchema>;
