import type { ContentPack } from "../content/loader.ts";
import type { Checkpoint } from "../persistence/checkpoint.ts";

/** The part of a checkpoint that conditions read. */
export type WorldState = Pick<Checkpoint, "metrics" | "policies" | "memories" | "npcStatus">;

/** D4 initial visible state. Hidden values start neutral only when used, so none exist yet. */
export const INITIAL_METRICS: Checkpoint["metrics"] = {
  cash: 50,
  riderNetwork: 50,
  merchantNetwork: 40,
  publicTrust: 50,
};

export function initialWorldState(pack: ContentPack): WorldState {
  const npcStatus: Record<string, string> = {};
  for (const npc of pack.npcs.values()) {
    if (npc.initialStatus !== null) npcStatus[npc.id] = npc.initialStatus;
  }
  return { metrics: { ...INITIAL_METRICS }, policies: [], memories: [], npcStatus };
}
