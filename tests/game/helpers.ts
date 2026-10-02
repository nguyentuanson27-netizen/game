import { openDB } from "idb";
import proofChain from "../../content/prototype/proof-chain.json";
import proofLoop from "../../content/prototype/proof-loop.json";
import { type ContentPack, loadContentPack } from "../../src/game/content/loader.ts";
import { advanceWeek } from "../../src/game/domain/advanceWeek.ts";
import { startCampaign } from "../../src/game/domain/campaign.ts";
import { nextStep } from "../../src/game/domain/nextStep.ts";
import { resolveChoice } from "../../src/game/domain/resolveChoice.ts";
import { settleWeek, settleWeekClosingCallbacks } from "../../src/game/domain/settlement.ts";
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

/**
 * The proof pack with weeks 2-12 left unauthored, as the shipped loop was before the playable
 * route existed: incomplete content still loads, but `Next Week` into those weeks is refused.
 */
export const unauthoredPack = () =>
  packFrom((_, loop) => {
    for (const entry of loop.weeks) if (entry.week > 1) entry.slots = [];
  });

/** A first checkpoint positioned at `week`, as if earlier weeks had been played without effect. */
export function startAt(pack: ContentPack, week: number): EventCheckpoint {
  const state = initialCampaignState(pack);
  const next = nextStep(pack, week as EventCheckpoint["week"], [], state);
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

/**
 * A plain copy of an authored callback event, for tests that read its effects, option rules or
 * report lines through ordinary planning. The loader refuses to plan a callback's own event (only
 * its callback delivers it), so the copy gets a new id, `.probe` option ids and no `deliveredBy`.
 * Returns the copy's id; option ids are the originals plus `.probe`.
 */
export function addProbeCopy(chain: Raw, eventId: string): string {
  const original = chain.events.find((e: Raw) => e.id === eventId);
  if (!original) throw new Error(`no event ${eventId}`);
  const copy = structuredClone(original);
  copy.id = `${eventId}.probe`;
  copy.role = "setup";
  delete copy.deliveredBy;
  for (const option of copy.options) option.id = `${option.id}.probe`;
  chain.events.push(copy);
  return copy.id;
}

/**
 * The three authored chain nodes (setup, follow-up variant, shared crisis) planned into week 3 as
 * plain `.probe` copies, so effects, report lines and paper settlements of a whole history can be
 * checked in one week without callback delivery. Option ids carry `.probe` after the first.
 */
export function probeChainPack(variant: "engaged" | "aggrieved" = "engaged"): ContentPack {
  return packFrom((chain, loop) => {
    const follow = addProbeCopy(chain, `var.rider_voice_followup.${variant}`);
    const crisis = addProbeCopy(chain, "evt.proof.public_rider_dispute");
    loop.weeks[2].slots = ["evt.proof.rider_claim", follow, crisis];
  });
}

export const PROBE_HISTORY_A = [
  "opt.rider_claim.fund_policy",
  "opt.rider_voice.engaged.keep_informal.probe",
  "opt.crisis.joint_statement.probe",
];
export const PROBE_HISTORY_B = [
  "opt.rider_claim.decline",
  "opt.rider_voice.aggrieved.hold_line.probe",
  "opt.crisis.announce_new_policy.probe",
];

export interface LabCallback {
  id: string;
  earliest: number;
  latest: number;
  tieOrder: number;
  /** Extra eligibility conditions. */
  eligibility?: Raw[];
  /** Conditions of the main variant `evt.lab.<name>`; empty (always valid) by default. */
  variantWhen?: Raw[];
  /** A second variant `evt.lab.<name>_alt`, tried after the main one. */
  alt?: { when: Raw[] };
  /** Resolve an invalid context by a report closure (`closure.lab.<name>`) instead of staying pending. */
  closure?: boolean;
}

export const labEvent = (id: string) => `evt.lab.${id}`;
export const labOption = (id: string, n: 1 | 2 = 1) => `opt.lab.${id}.o${n}`;

/**
 * A synthetic pack for callback scheduling: a week-1 setup whose one option schedules every given
 * callback, `evt.test.week_beat` filling the other slots (2 a week unless `slots` overrides a
 * week), and one two-option variant event per callback. Test-only; no canonical story is added.
 * It goes through the real loader, so windows, tie orders and references are validated.
 */
export function labPack(
  callbacks: LabCallback[],
  slots: Record<number, number> = {},
  mutate: (chain: Raw, loop: Raw) => void = () => {},
): ContentPack {
  return packFrom((chain, loop) => {
    chain.events.push(
      testEvent(
        "evt.test.week_beat",
        [testOption("opt.test.week_beat.steady"), testOption("opt.test.week_beat.push")],
        { repeatable: true },
      ),
      testEvent(
        "evt.lab.setup",
        [
          testOption(
            "opt.lab.setup.go",
            callbacks.map((cb) => ({ kind: "callbackSchedule", callback: cb.id })),
          ),
          testOption("opt.lab.setup.wait"),
        ],
        { role: "setup" },
      ),
    );
    for (const cb of callbacks) {
      const name = cb.id.replace("cb.lab.", "");
      chain.events.push(
        testEvent(
          labEvent(name),
          [testOption(labOption(name, 1)), testOption(labOption(name, 2))],
          { role: "callbackVariant", deliveredBy: cb.id },
        ),
      );
      if (cb.alt) {
        chain.events.push(
          testEvent(
            `${labEvent(name)}_alt`,
            [testOption(`${labOption(name, 1)}_alt`), testOption(`${labOption(name, 2)}_alt`)],
            { role: "callbackVariant", deliveredBy: cb.id },
          ),
        );
      }
      if (cb.closure) {
        chain.closures.push({
          id: `closure.lab.${name}`,
          type: "reportClosure",
          callback: cb.id,
          consumesEventSlot: false,
          playerChoice: false,
          reportText: `Hậu quả ${name} đã được khép lại trong báo cáo tuần.`,
          effects: [],
        });
      }
      chain.callbacks.push({
        id: cb.id,
        chain: "chain.rider_dispute",
        sourceDecision: {
          event: "evt.lab.setup",
          options: ["opt.lab.setup.go"],
          scheduledBy: "callbackSchedule effect",
        },
        required: true,
        window: { earliestWeek: cb.earliest, latestWeek: cb.latest, weekBasis: "absolute" },
        tieOrder: cb.tieOrder,
        eligibility: cb.eligibility ?? [],
        consumesEventSlot: "yes",
        variants: [
          { event: labEvent(name), when: cb.variantWhen ?? [] },
          ...(cb.alt ? [{ event: `${labEvent(name)}_alt`, when: cb.alt.when }] : []),
        ],
        changedContext: {
          invalidWhen: "no variant is valid",
          resolution: cb.closure
            ? {
                type: "reportClosure",
                closure: `closure.lab.${name}`,
                closedInReportOfWeek: "the first week of the window",
              }
            : {
                type: "none",
                reportClosureAllowed: false,
                reason: "this lab callback has no closure",
              },
          appliesUnchosenOption: false,
          slotShortageCancels: false,
        },
      });
    }
    for (const entry of loop.weeks) {
      entry.slots =
        entry.week === 1
          ? ["evt.lab.setup", "evt.test.week_beat"]
          : Array.from({ length: slots[entry.week] ?? 2 }, () => "evt.test.week_beat");
    }
    mutate(chain, loop);
  });
}

export interface Walk {
  checkpoint: Checkpoint;
  /** Event ids shown, per week, in slot order. */
  shown: Record<number, string[]>;
  /** Every committed checkpoint in order, numbered like the store. */
  history: Checkpoint[];
}

/**
 * Play a campaign through the real pure transitions (choice, settlement, Next Week) without a
 * store. `pick` chooses an option for the active event; the walk stops before the first step whose
 * checkpoint satisfies `stop`. Failing settlement or a refused step throws, so a walk that returns
 * is a legal play.
 */
export function walk(
  pack: ContentPack,
  pick: (checkpoint: EventCheckpoint) => string,
  stop: (checkpoint: Checkpoint) => boolean,
  from?: Checkpoint,
): Walk {
  let checkpoint: Checkpoint = from ?? { ...startCampaign(pack), sequence: 1 };
  const history: Checkpoint[] = [checkpoint];
  const shown: Record<number, string[]> = {};
  const commit = (draft: CheckpointDraft) => {
    checkpoint = { ...draft, sequence: checkpoint.sequence + 1 } as Checkpoint;
    history.push(checkpoint);
  };
  for (let guard = 0; guard < 400; guard++) {
    if (stop(checkpoint)) return { checkpoint, shown, history };
    switch (checkpoint.phase) {
      case "event": {
        const week = checkpoint.week;
        shown[week] = [...(shown[week] ?? []), checkpoint.activeEvent.eventId];
        const resolved = resolveChoice(pack, checkpoint, pick(checkpoint));
        if (!resolved.ok) throw new Error(resolved.message);
        commit(resolved.draft);
        break;
      }
      case "settlement":
        commit(settleWeekClosingCallbacks(pack, checkpoint));
        break;
      case "report": {
        const advanced = advanceWeek(pack, checkpoint);
        if (!advanced.ok) throw new Error(`${advanced.reason}: ${advanced.message}`);
        commit(advanced.draft);
        break;
      }
      default:
        throw new Error(`walk cannot continue from ${checkpoint.phase}`);
    }
  }
  throw new Error("walk did not stop");
}

/** Always the first selectable option, except for the options named in `choices` by event id. */
export const pickFirst =
  (choices: Record<string, string> = {}) =>
  (checkpoint: EventCheckpoint): string =>
    choices[checkpoint.activeEvent.eventId] ?? checkpoint.activeEvent.optionIds[0] ?? "";
