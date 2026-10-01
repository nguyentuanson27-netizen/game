import { z } from "zod";
import { idSchema } from "../content/schema.ts";

// A checkpoint is one whole, self-contained game state (G0 D3). It carries only what resume needs
// and what a current consumer reads; later tasks widen it when they add a writer or a reader.
// Fields added after T08 use `.default(...)` so an older unreleased v1 save still reads.

export const SCHEMA_VERSION = 1;

const metricValue = z.number().int().min(0).max(100);

const common = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  sequence: z.number().int().min(1),
  /** Sequence this checkpoint was derived from; null only for the very first checkpoint. */
  parentSequence: z.number().int().min(1).nullable(),
  week: z.number().int().min(1).max(12),
  /** Decisions already resolved in the current week, in slot order. */
  weekDecisions: z.array(
    z.strictObject({ slot: z.number().int().min(1), eventId: idSchema, optionId: idSchema }),
  ),
  metrics: z.strictObject({
    // Cash is not clamped: D4 lets it go below zero (failure is Cash < -25).
    cash: z.number().int(),
    riderNetwork: metricValue,
    merchantNetwork: metricValue,
    publicTrust: metricValue,
  }),
  policies: z.array(idSchema),
  memories: z.array(idSchema),
  npcStatus: z.record(idSchema, z.string().min(1)),
  /** Weekly cost each policy adds (D4 `recurringPolicyCost` is their sum). Read by settlement. */
  recurringCosts: z.record(idSchema, z.number().int()).default({}),
  /**
   * Required callbacks scheduled by committed choices. Metadata only: delivery, windows and
   * ordering come from content and are the scheduler's concern (T15).
   */
  pendingCallbacks: z
    .array(
      z.strictObject({
        callbackId: idSchema,
        scheduledWeek: z.number().int().min(1).max(12),
        sourceEventId: idSchema,
        sourceOptionId: idSchema,
      }),
    )
    .default([]),
};

export const checkpointSchema = z
  .discriminatedUnion("phase", [
    z.strictObject({
      ...common,
      phase: z.literal("event"),
      /** The event shown to the player and the exact options that were selectable when saved. */
      activeEvent: z.strictObject({
        eventId: idSchema,
        optionIds: z.array(idSchema).min(2).max(4),
      }),
    }),
    z.strictObject({
      ...common,
      /** Every decision slot of the week is resolved; the week awaits settlement. */
      phase: z.literal("settlement"),
      activeEvent: z.null(),
    }),
  ])
  .refine((c) => (c.parentSequence === null ? c.sequence === 1 : c.parentSequence < c.sequence), {
    message: "parentSequence must be null for sequence 1 and lower than sequence otherwise",
    path: ["parentSequence"],
  });

export type Checkpoint = z.infer<typeof checkpointSchema>;
export type EventCheckpoint = Extract<Checkpoint, { phase: "event" }>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A candidate the store has not numbered yet; the store assigns `sequence` inside the write. */
export type CheckpointDraft = DistributiveOmit<Checkpoint, "sequence">;

export type EventCheckpointDraft = Extract<CheckpointDraft, { phase: "event" }>;
