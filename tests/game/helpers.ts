import { openDB } from "idb";
import proofChain from "../../content/prototype/proof-chain.json";
import proofLoop from "../../content/prototype/proof-loop.json";
import { type ContentPack, loadContentPack } from "../../src/game/content/loader.ts";
import { startCampaign } from "../../src/game/domain/campaign.ts";
import { nextStep } from "../../src/game/domain/nextStep.ts";
import { resolveChoice } from "../../src/game/domain/resolveChoice.ts";
import { settleWeek } from "../../src/game/domain/settlement.ts";
import { initialCampaignState } from "../../src/game/domain/worldState.ts";
import type {
  Checkpoint,
  CheckpointDraft,
  EventCheckpoint,
  ReportCheckpoint,
  SettlementCheckpoint,
} from "../../src/game/persistence/checkpoint.ts";
import type { CheckpointStore, LoadResult, StoreResult } from "../../src/game/persistence/store.ts";

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

/** Overwrite a raw slot behind the store's back to simulate corruption or a newer save. */
export async function corruptSlot(dbName: string, key: "current" | "previous", value: unknown) {
  const db = await openDB(dbName, 1);
  await db.put("checkpoints", value, key);
  db.close();
}

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

/** Proof content plus test-only additions; still goes through the real loader and validation. */
export function packFrom(mutate: (chain: Raw, loop: Raw) => void): ContentPack {
  const chain = rawChain();
  const loop = rawLoop();
  mutate(chain, loop);
  return loadContentPack(chain, loop);
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

/** Apply `optionIds` in order from the start of `week`, numbering checkpoints like the store. */
export function replay(pack: ContentPack, week: number, optionIds: string[]): Checkpoint {
  let checkpoint: Checkpoint = startAt(pack, week);
  for (const optionId of optionIds) {
    if (checkpoint.phase !== "event") throw new Error("the week had no event left");
    const resolved = resolveChoice(pack, checkpoint, optionId);
    if (!resolved.ok) throw new Error(resolved.message);
    checkpoint = { ...resolved.draft, sequence: checkpoint.sequence + 1 };
  }
  return checkpoint;
}

/** Replay a week that must end with every slot resolved, awaiting settlement. */
export function replayToSettlement(
  pack: ContentPack,
  week: number,
  optionIds: string[],
): SettlementCheckpoint {
  const checkpoint = replay(pack, week, optionIds);
  if (checkpoint.phase !== "settlement") throw new Error("expected the settlement phase");
  return checkpoint;
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

/** A checkpoint at `week` with every slot resolved and nothing settled, from the initial state. */
export function settlementAt(
  pack: ContentPack,
  week: number,
  over: Partial<SettlementCheckpoint> = {},
): SettlementCheckpoint {
  return {
    schemaVersion: 1,
    sequence: 1,
    parentSequence: null,
    week: week as SettlementCheckpoint["week"],
    weekDecisions: [],
    ...initialCampaignState(pack),
    phase: "settlement",
    activeEvent: null,
    ...over,
  };
}

/** The draft that stores `checkpoint` as the very first save (for seeding a store in tests). */
export function seedDraft(checkpoint: Checkpoint): CheckpointDraft {
  const { sequence: _sequence, ...rest } = checkpoint;
  return { ...rest, parentSequence: null };
}

/** The week-1 report of the production proof pack after fund policy + extra evening shift. */
export function weekOneReport(pack: ContentPack = proofPack()): ReportCheckpoint {
  const draft = settleWeek(
    replayToSettlement(pack, 1, [
      "opt.rider_claim.fund_policy",
      "opt.fallback.arrange_extra_shift",
    ]),
  );
  if (draft.phase !== "report") throw new Error("expected a report");
  return { ...draft, sequence: 4 };
}

/**
 * The proof pack plus a test-only, repeatable beat used `slotsPerWeek` times in each of `weeks`
 * (default 2: the contract is 2-4 decisions a week), so the Next Week mechanism can be exercised.
 * The shipped proof loop authors no decisions after week 1.
 */
export function playablePack(weeks: number[] = [2], slotsPerWeek = 2): ContentPack {
  return packFrom((chain, loop) => {
    chain.events.push(
      testEvent(
        "evt.test.week_beat",
        [testOption("opt.test.week_beat.steady"), testOption("opt.test.week_beat.push")],
        { repeatable: true },
      ),
    );
    for (const week of weeks) {
      loop.weeks[week - 1].slots = Array.from({ length: slotsPerWeek }, () => "evt.test.week_beat");
    }
  });
}

/** `playablePack` with week 12 authored too, so a seeded week-12 state matches its content plan. */
export const weekTwelvePack = () => playablePack([2, 12]);

/**
 * A coherent settlement checkpoint for a week the pack authors (see `playablePack`): every planned
 * slot carries a resolved decision, as resume requires. Test-only; it claims nothing about the
 * shipped campaign, whose weeks 2-12 are not authored.
 */
export function resolvedSettlementAt(
  pack: ContentPack,
  week: number,
  over: Partial<SettlementCheckpoint> = {},
): SettlementCheckpoint {
  const slots = pack.plan[week - 1] ?? [];
  if (slots.length < 2) throw new Error(`week ${week} is not authored in this pack`);
  return settlementAt(pack, week, {
    weekDecisions: slots.map((eventId, index) => ({
      slot: index + 1,
      eventId,
      optionId: "opt.test.week_beat.steady",
    })),
    ...over,
  });
}
