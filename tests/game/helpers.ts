import { openDB } from "idb";
import proofChain from "../../content/prototype/proof-chain.json";
import proofLoop from "../../content/prototype/proof-loop.json";
import { loadContentPack } from "../../src/game/content/loader.ts";
import { startCampaign } from "../../src/game/domain/campaign.ts";
import type { Checkpoint, CheckpointDraft } from "../../src/game/persistence/checkpoint.ts";

// biome-ignore lint/suspicious/noExplicitAny: tests mutate arbitrary authored JSON to build invalid content
export type Raw = any;

export const rawChain = (): Raw => structuredClone(proofChain);
export const rawLoop = (): Raw => structuredClone(proofLoop);
export const proofPack = () => loadContentPack(rawChain(), rawLoop());

export const firstDraft = () => startCampaign(proofPack());

/** The draft that follows `checkpoint` unchanged (a stand-in for a later save). */
export function nextDraft(checkpoint: Checkpoint): CheckpointDraft {
  const { sequence, ...rest } = checkpoint;
  return { ...rest, parentSequence: sequence };
}

let dbCounter = 0;
export const uniqueDbName = () => `test-db-${++dbCounter}`;

import type { CheckpointStore, LoadResult, StoreResult } from "../../src/game/persistence/store.ts";

export interface SpyStore extends CheckpointStore {
  commits: CheckpointDraft[];
  /** Make the next `n` commits fail like a browser write error (nothing is written). */
  failNextCommits(n: number): void;
  /** Hold the next commit before it reaches the real store; call the returned function to release. */
  holdNextCommit(): () => void;
}

/** Wraps a real store so tests can observe, fail or delay writes without faking persistence. */
export function spyOn(inner: CheckpointStore): SpyStore {
  let failures = 0;
  let gate: Promise<void> | null = null;
  const commits: CheckpointDraft[] = [];
  return {
    commits,
    failNextCommits: (n) => {
      failures = n;
    },
    holdNextCommit: () => {
      let release = () => {};
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },
    load: (): Promise<LoadResult> => inner.load(),
    async commit(draft) {
      commits.push(draft);
      if (gate) {
        const waiting = gate;
        gate = null;
        await waiting;
      }
      if (failures > 0) {
        failures -= 1;
        return {
          ok: false,
          error: "write-failed",
          message: "injected failure",
        } satisfies StoreResult<never>;
      }
      return inner.commit(draft);
    },
    recoverFromPrevious: (n) => inner.recoverFromPrevious(n),
    reset: () => inner.reset(),
  };
}

/** Overwrite a raw slot behind the store's back to simulate corruption or a newer save. */
export async function corruptSlot(dbName: string, key: "current" | "previous", value: unknown) {
  const db = await openDB(dbName, 1);
  await db.put("checkpoints", value, key);
  db.close();
}

import { type ContentPack, loadContentPack as loadPack } from "../../src/game/content/loader.ts";
import { nextStep } from "../../src/game/domain/nextStep.ts";
import { initialCampaignState } from "../../src/game/domain/worldState.ts";
import type { EventCheckpoint } from "../../src/game/persistence/checkpoint.ts";

/** Proof content plus test-only additions; still goes through the real loader and validation. */
export function packFrom(mutate: (chain: Raw, loop: Raw) => void): ContentPack {
  const chain = rawChain();
  const loop = rawLoop();
  mutate(chain, loop);
  return loadPack(chain, loop);
}

/** A first checkpoint positioned at `week`, as if earlier weeks had been played without effect. */
export function startAt(pack: ContentPack, week: number): EventCheckpoint {
  const state = initialCampaignState(pack);
  const next = nextStep(pack, week as EventCheckpoint["week"], 0, state);
  if (!next.ok || next.phase !== "event") throw new Error("nothing to present");
  return {
    schemaVersion: 1,
    sequence: 1,
    parentSequence: null,
    week: week as EventCheckpoint["week"],
    weekDecisions: [],
    ...state,
    phase: "event",
    activeEvent: next.activeEvent,
  };
}

/** A small authored event used only by tests. */
export function testEvent(id: string, options: Raw[], extra: Raw = {}): Raw {
  return {
    id,
    chain: null,
    role: "setup",
    title: "Tình huống thử nghiệm",
    stage: "street_startup",
    speaker: "npc.ops_contact",
    category: "operational",
    whyNow: "Dành cho kiểm thử.",
    situation: "Một tình huống chỉ dùng trong kiểm thử.",
    options,
    repeatable: false,
    ...extra,
  };
}

export function testOption(id: string, effects: Raw[] = [], requires: Raw[] = []): Raw {
  return {
    id,
    text: `Phương án ${id}`,
    hint: "Gợi ý thử nghiệm.",
    requires,
    ...(requires.length > 0 ? { unavailableBecause: "Chưa đủ điều kiện." } : {}),
    confirmation: "none",
    effects,
    feedback: "Đã xử lý.",
  };
}
