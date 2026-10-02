import type { ContentPack } from "../../src/game/content/loader.ts";
import type { EventCheckpoint } from "../../src/game/persistence/checkpoint.ts";
import { choose, nextWeek, type SessionState, settle } from "../../src/game/ui/session.ts";
import type { SpyStore } from "./helpers.ts";

/**
 * Play the real route through the session functions and a real store until `stop` holds. `pick`
 * chooses the option of each active event (default: the first selectable one).
 */
export async function playUntil(
  store: SpyStore,
  pack: ContentPack,
  state: SessionState,
  stop: (state: SessionState) => boolean,
  pick: (checkpoint: EventCheckpoint) => string = (c) => c.activeEvent.optionIds[0] ?? "",
): Promise<SessionState> {
  let current = state;
  for (let guard = 0; guard < 200; guard++) {
    if (stop(current)) return current;
    let result: Awaited<ReturnType<typeof choose>> | Awaited<ReturnType<typeof settle>>;
    if (current.kind === "event") {
      result = await choose(store, pack, current.checkpoint, pick(current.checkpoint));
    } else if (current.kind === "settlement") {
      result = await settle(store, pack, current.checkpoint);
    } else if (current.kind === "report") {
      result = await nextWeek(store, pack, current.checkpoint);
    } else {
      throw new Error(`cannot play from ${current.kind}`);
    }
    if (!result.ok) throw new Error(result.message);
    current = result.state;
  }
  throw new Error("did not reach the stop state");
}

export const atSlot = (week: number, decided: number) => (state: SessionState) =>
  state.kind === "event" &&
  state.checkpoint.week === week &&
  state.checkpoint.weekDecisions.length === decided;
