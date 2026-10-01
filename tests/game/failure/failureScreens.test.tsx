import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../src/App.tsx";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { corruptSlot, proofPack, spyOn, uniqueDbName } from "../helpers.ts";
import { lostAck, rawSlots, SECRET } from "./faults.ts";

afterEach(cleanup);

function setup() {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  return { name, inner, store: spyOn(inner) };
}

const options = () =>
  within(screen.getByRole("group", { name: "Phương án" })).getAllByRole("button");
const tapFirst = () => fireEvent.click(options()[0] as HTMLElement);

type Ctx = ReturnType<typeof setup>;

async function toSettlement(ctx: Ctx) {
  render(<App store={ctx.store} loadPack={proofPack} />);
  await screen.findByRole("group", { name: "Phương án" });
  tapFirst();
  await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
  tapFirst();
  return screen.findByRole("button", { name: "Tổng kết tuần" });
}

async function toReport(ctx: Ctx) {
  fireEvent.click(await toSettlement(ctx));
  return screen.findByRole("button", { name: "Tuần tiếp theo" });
}

const noMoreProgress = {
  nextEvent: () => screen.queryByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" }),
  settle: () => screen.queryByRole("button", { name: "Tổng kết tuần" }),
  report: () => screen.queryByRole("heading", { name: "Báo cáo tuần 1" }),
  nextWeek: () => screen.queryByRole("button", { name: "Tuần tiếp theo" }),
  week2: () => screen.queryByRole("heading", { name: "Tuần 2" }),
};

describe("a failed save never lets the player move on (AC-05)", () => {
  it("failed choice: no feedback, no next event, no settlement, same event stays", async () => {
    const ctx = setup();
    render(<App store={ctx.store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    const before = await rawSlots(ctx.name);
    ctx.store.failNextCommits(1);

    tapFirst();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Chưa có thay đổi nào được ghi nhận");
    expect(alert.textContent).not.toContain("injected failure");
    expect(screen.queryByRole("status")).toBeNull();
    expect(noMoreProgress.nextEvent()).toBeNull();
    expect(noMoreProgress.settle()).toBeNull();
    expect(screen.getByRole("heading", { name: "Chiếc xe hỏng sau ca mưa" })).toBeTruthy();
    expect(await rawSlots(ctx.name)).toEqual(before);
  });

  it("failed settlement: no report, no Next Week, still unsettled", async () => {
    const ctx = setup();
    const settleButton = await toSettlement(ctx);
    const before = await rawSlots(ctx.name);
    ctx.store.failNextCommits(1);

    fireEvent.click(settleButton);

    expect((await screen.findByRole("alert")).textContent).toContain("Không lưu được kết quả tuần");
    expect(noMoreProgress.report()).toBeNull();
    expect(noMoreProgress.nextWeek()).toBeNull();
    expect(noMoreProgress.week2()).toBeNull();
    expect(await rawSlots(ctx.name)).toEqual(before);
  });

  it("failed Next Week: stays on the report, no week 2, no second settlement", async () => {
    const ctx = setup();
    const nextButton = await toReport(ctx);
    const before = await rawSlots(ctx.name);
    ctx.store.failNextCommits(1);

    fireEvent.click(nextButton);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Không lưu được việc sang tuần mới",
    );
    expect(noMoreProgress.report()).toBeTruthy();
    expect(noMoreProgress.week2()).toBeNull();
    expect(noMoreProgress.settle()).toBeNull();
    expect(await rawSlots(ctx.name)).toEqual(before);
  });

  it("two failures in a row still change nothing, and the third attempt lands once", async () => {
    const ctx = setup();
    const nextButton = await toReport(ctx);
    const before = await rawSlots(ctx.name);
    ctx.store.failNextCommits(2);

    fireEvent.click(nextButton);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Tuần tiếp theo" }));
    await screen.findByRole("alert");
    expect(await rawSlots(ctx.name)).toEqual(before);

    fireEvent.click(screen.getByRole("button", { name: "Tuần tiếp theo" }));
    await screen.findByRole("heading", { name: "Tuần 2" });
    const after = await rawSlots(ctx.name);
    expect(after.current).toMatchObject({ week: 2, parentSequence: before.current.sequence });
    expect(after.previous).toEqual(before.current);
  });
});

describe("a committed write whose acknowledgement was lost (AC-05)", () => {
  it("choice: retry is rejected as stale, reload shows the one committed decision", async () => {
    const ctx = setup();
    const lossy = lostAck(ctx.store, 1); // the first-event save is acknowledged; later ones are lost
    render(<App store={lossy} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });

    tapFirst();
    expect((await screen.findByRole("alert")).textContent).toContain("Không lưu được lựa chọn");
    expect(lossy.lost).toBe(1);

    tapFirst(); // retry from the stale in-memory checkpoint
    const stale = await screen.findByRole("alert");
    expect(stale.textContent).toContain("đã thay đổi ở tab");
    fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));

    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    const slots = await rawSlots(ctx.name);
    expect(slots.current).toMatchObject({
      sequence: 2,
      metrics: { riderNetwork: 60 },
      recurringCosts: { "policy.rider_support_fund": 6 },
    });
    expect(slots.current.weekDecisions).toHaveLength(1);
  });

  it("settlement and Next Week: the lost acknowledgement never settles or advances twice", async () => {
    const ctx = setup();
    await toSettlement(ctx);
    // From here on every acknowledgement is lost, but the writes commit.
    const lossy = lostAck(ctx.store);
    cleanup();
    render(<App store={lossy} loadPack={proofPack} />);
    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Không lưu được kết quả tuần");

    fireEvent.click(screen.getByRole("button", { name: "Tổng kết tuần" }));
    await screen.findByText(/đã thay đổi ở tab/);
    fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));

    await screen.findByRole("heading", { name: "Báo cáo tuần 1" });
    const settled = await rawSlots(ctx.name);
    expect(settled.current).toMatchObject({ phase: "report", metrics: { cash: 53 } });

    fireEvent.click(screen.getByRole("button", { name: "Tuần tiếp theo" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Không lưu được việc sang tuần mới",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tuần tiếp theo" }));
    await screen.findByText(/đã thay đổi ở tab/);
    fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));

    await screen.findByRole("heading", { name: "Tuần 2" });
    const advanced = await rawSlots(ctx.name);
    expect(advanced.current).toMatchObject({ week: 2, phase: "settlement", metrics: { cash: 53 } });
    expect(advanced.current.sequence).toBe(settled.current.sequence + 1);
  });
});

describe("the stored save changes under a running game (D3)", () => {
  async function playOneChoice(ctx: Ctx) {
    render(<App store={ctx.store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    tapFirst();
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
  }

  it("a corrupt current: the next tap shows the recovery prompt instead of a retry loop, and writes nothing", async () => {
    const ctx = setup();
    await playOneChoice(ctx);
    await corruptSlot(ctx.name, "current", { schemaVersion: 1, broken: true });
    const before = await rawSlots(ctx.name);

    tapFirst();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("bản lưu trước đó");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("group", { name: "Phương án" })).toBeNull();
    expect(await rawSlots(ctx.name)).toEqual(before);

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục bản lưu trước" }));

    // The recovered checkpoint is the first event again, and saving works from it.
    await screen.findByRole("heading", { name: "Chiếc xe hỏng sau ca mưa" });
    tapFirst();
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    expect((await rawSlots(ctx.name)).current).toMatchObject({ sequence: 2, parentSequence: 1 });
  });

  it("a newer-version save appearing mid-game blocks further play and is left untouched", async () => {
    const ctx = setup();
    await playOneChoice(ctx);
    const future = { schemaVersion: 2, sequence: 9, note: "kept" };
    await corruptSlot(ctx.name, "current", future);

    tapFirst();

    expect((await screen.findByRole("alert")).textContent).toContain("phiên bản mới hơn");
    expect(screen.queryByRole("button")).toBeNull();
    expect((await rawSlots(ctx.name)).current).toEqual(future);
  });

  it("a failed recovery explains itself, keeps both slots, and a retry recovers", async () => {
    const ctx = setup();
    await playOneChoice(ctx);
    await corruptSlot(ctx.name, "current", "garbage");
    cleanup();
    render(<App store={ctx.store} loadPack={proofPack} />);
    await screen.findByRole("button", { name: "Khôi phục bản lưu trước" });
    const before = await rawSlots(ctx.name);
    const realRecover = ctx.inner.recoverFromPrevious;
    let failing = true;
    ctx.store.recoverFromPrevious = async (n) =>
      failing
        ? { ok: false, error: "write-failed", message: "QuotaExceededError" }
        : realRecover.call(ctx.inner, n);

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục bản lưu trước" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Không lưu được tiến trình");
    expect(alert.textContent).not.toContain("QuotaExceededError");
    expect(await rawSlots(ctx.name)).toEqual(before);

    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    fireEvent.click(await screen.findByRole("button", { name: "Khôi phục bản lưu trước" }));
    await screen.findByRole("heading", { name: "Chiếc xe hỏng sau ca mưa" });
  });
});

describe("error contents", () => {
  it("never put browser messages or saved payloads on screen", async () => {
    const ctx = setup();
    render(<App store={ctx.store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    ctx.store.commit = async () => ({ ok: false, error: "write-failed", message: SECRET });

    tapFirst();

    const text = (await screen.findByRole("alert")).textContent ?? "";
    expect(text).not.toContain(SECRET);
    expect(document.body.textContent).not.toContain(SECRET);
    expect(document.body.textContent).not.toMatch(/policy\.|prec\.|mem\.|npc\./);
  });
});
