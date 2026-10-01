import { z } from "zod";
import { idSchema } from "../content/schema.ts";

// A checkpoint is one whole, self-contained game state (G0 D3). It carries only what resume needs
// and what a current consumer reads; later tasks widen it when they add a writer or a reader.

export const SCHEMA_VERSION = 1;

const metricValue = z.number().int().min(0).max(100);

export const checkpointSchema = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    sequence: z.number().int().min(1),
    /** Sequence this checkpoint was derived from; null only for the very first checkpoint. */
    parentSequence: z.number().int().min(1).nullable(),
    week: z.number().int().min(1).max(12),
    phase: z.literal("event"),
    /** The event shown to the player and the exact options that were selectable when it was saved. */
    activeEvent: z.strictObject({
      eventId: idSchema,
      optionIds: z.array(idSchema).min(2).max(4),
    }),
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
  })
  .refine((c) => (c.parentSequence === null ? c.sequence === 1 : c.parentSequence < c.sequence), {
    message: "parentSequence must be null for sequence 1 and lower than sequence otherwise",
    path: ["parentSequence"],
  });

export type Checkpoint = z.infer<typeof checkpointSchema>;

/** A candidate the store has not numbered yet; the store assigns `sequence` inside the write. */
export type CheckpointDraft = Omit<Checkpoint, "sequence">;
