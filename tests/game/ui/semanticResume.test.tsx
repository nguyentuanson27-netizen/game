import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../src/App.tsx";
import { settleWeek } from "../../../src/game/domain/settlement.ts";
import type { Checkpoint } from "../../../src/game/persistence/checkpoint.ts";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { bootstrap } from "../../../src/game/ui/session.ts";
import { rawSlots } from "../failure/faults.ts";
import {
  PROBE_HISTORY_A,
  probeChainPack,
  proofPack,
  replayToSettlement,
  seedDraft,
  settlementAt,
  startAt,
  uniqueDbName,
  weekOneReport,
} from "../helpers.ts";

afterEach(cleanup);

const pack = proofPack();

/** Store `checkpoint` as the only save (structurally valid, so the store accepts it as a seed). */
async function seeded(checkpoint: Checkpoint) {
  const name = uniqueDbName();
  const store = createIdbCheckpointStore(name);
  const saved = await store.commit(seedDraft(checkpoint));
  if (!saved.ok) throw new Error(`seed rejected: ${saved.message}`);
  return { name, store, before: await rawSlots(name) };
}

async function expectBlockedAndUntouched(checkpoint: Checkpoint) {
  const { name, store, before } = await seeded(checkpoint);
  try {
    const state = await bootstrap(store, pack);
    expect(state.kind).toBe("invalid-checkpoint");
    // Fail closed: the bad save is neither repaired, reset nor replaced.
    expect(await rawSlots(name)).toEqual(before);
    expect((await store.load()).status).toBe("ready");
  } finally {
    await store.close();
  }
}

async function expectResumes(checkpoint: Checkpoint) {
  const { store } = await seeded(checkpoint);
  try {
    expect((await bootstrap(store, pack)).kind).not.toBe("invalid-checkpoint");
  } finally {
    await store.close();
  }
}

describe("a save whose NPC status is not authored is not resumed", () => {
  it("blocks a known NPC with an unknown status and leaves the save untouched", async () => {
    const checkpoint = startAt(pack, 1);
    await expectBlockedAndUntouched({
      ...checkpoint,
      npcStatus: { "npc.recurring_rider": "famous" },
    });
  });

  it("still resumes every authored status", async () => {
    for (const status of ["ally", "neutral", "resentful", "departed"]) {
      await expectResumes({ ...startAt(pack, 1), npcStatus: { "npc.recurring_rider": status } });
    }
  });
});

describe("a save whose pending callback provenance is wrong is not resumed", () => {
  const pending = (over: Partial<Checkpoint["pendingCallbacks"][number]>) => ({
    callbackId: "cb.rider_voice_followup",
    scheduledWeek: 1,
    sourceEventId: "evt.proof.rider_claim",
    sourceOptionId: "opt.rider_claim.fund_policy",
    ...over,
  });

  it("blocks a valid callback id with a source event it does not belong to", async () => {
    await expectBlockedAndUntouched({
      ...startAt(pack, 1),
      pendingCallbacks: [pending({ sourceEventId: "evt.routine.rainy_week" })],
    });
  });

  it("blocks a valid callback id with an option that is not one of its sources", async () => {
    await expectBlockedAndUntouched({
      ...startAt(pack, 1),
      pendingCallbacks: [pending({ sourceOptionId: "opt.routine.rainy_week.rain_gear" })],
    });
  });

  it("blocks a source option that belongs to a different event than the callback's source", async () => {
    await expectBlockedAndUntouched({
      ...startAt(pack, 1),
      pendingCallbacks: [pending({ sourceOptionId: "opt.crisis.hold_and_review" })],
    });
  });

  it("still resumes the provenance the real choices write", async () => {
    await expectResumes({ ...startAt(pack, 1), pendingCallbacks: [pending({})] });
    await expectResumes({
      ...startAt(pack, 1),
      pendingCallbacks: [
        pending({
          callbackId: "cb.public_rider_dispute",
          sourceOptionId: "opt.rider_claim.decline",
        }),
      ],
    });
  });
});

describe("a Prototype Complete save with required callbacks pending is not resumed", () => {
  const complete = (pendingCallbacks: Checkpoint["pendingCallbacks"]): Checkpoint => ({
    ...settlementAt(pack, 12),
    phase: "complete",
    pendingCallbacks,
  });

  it("blocks a structurally valid complete checkpoint that still has a pending callback", async () => {
    await expectBlockedAndUntouched(
      complete([
        {
          callbackId: "cb.public_rider_dispute",
          scheduledWeek: 1,
          sourceEventId: "evt.proof.rider_claim",
          sourceOptionId: "opt.rider_claim.fund_policy",
        },
      ]),
    );
  });

  it("still resumes a complete checkpoint with nothing pending", async () => {
    await expectResumes(complete([]));
  });
});

describe("a report whose stored settlement was tampered with is not resumed", () => {
  const report = weekOneReport();
  const fields = ["deliveryJobs", "rideJobs", "grossIncome", "weeklyCost", "cashDelta"] as const;

  it("accepts the untouched report", async () => {
    await expectResumes(report);
  });

  for (const field of fields) {
    it(`blocks a changed ${field} and leaves the save untouched`, async () => {
      await expectBlockedAndUntouched({
        ...report,
        settlement: { ...report.settlement, [field]: report.settlement[field] + 999 },
      });
    });
  }

  it("blocks a tampered settlement in the failed state too", async () => {
    const week = replayToSettlement(pack, 1, [
      "opt.rider_claim.decline",
      "opt.routine.rainy_week.rain_fee",
    ]);
    const draft = settleWeek({ ...week, metrics: { ...week.metrics, cash: -90 } });
    if (draft.phase !== "failed") throw new Error("expected the failed state");
    await expectBlockedAndUntouched({
      ...draft,
      sequence: 4,
      settlement: { ...draft.settlement, grossIncome: draft.settlement.grossIncome + 1 },
    });
  });
});

describe("a failed week keeps its authored consequence lines", () => {
  it("shows the report line, the failure message and no hidden state", async () => {
    const lineFor = "Tài xế quen mặt đứng cạnh công ty trong thông báo chung";
    const crisisPack = probeChainPack();
    const week = replayToSettlement(crisisPack, 3, PROBE_HISTORY_A);
    const draft = settleWeek({ ...week, metrics: { ...week.metrics, cash: -90 } });
    if (draft.phase !== "failed") throw new Error("expected the failed state");
    const name = uniqueDbName();
    const store = createIdbCheckpointStore(name);
    await store.commit(seedDraft({ ...draft, sequence: 4 }));

    render(<App store={store} loadPack={() => crisisPack} />);

    expect((await screen.findByRole("alert")).textContent).toContain("Công ty đã cạn tiền");
    expect(screen.getByText(new RegExp(lineFor))).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/ally|resentful|departed|neutral|prec\.|mem\.|policy\.|cb\.|npc\./i);
    await store.close();
  });
});
