import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../src/App.tsx";
import { ContentError } from "../../../src/game/content/loader.ts";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import {
  corruptSlot,
  firstDraft,
  nextDraft,
  PROBE_HISTORY_A,
  packFrom,
  playablePack,
  probeChainPack,
  proofPack,
  replayToSettlement,
  resolvedSettlementAt,
  seedDraft,
  spyOn,
  testEvent,
  testOption,
  unauthoredPack,
  uniqueDbName,
  weekTwelvePack,
} from "../helpers.ts";

afterEach(cleanup);

function setup() {
  const name = uniqueDbName();
  const inner = createIdbCheckpointStore(name);
  return { name, inner, store: spyOn(inner) };
}

const optionButtons = () =>
  within(screen.getByRole("group", { name: "Phương án" })).getAllByRole("button");

describe("the first event on screen", () => {
  it("shows no choices until the active event is saved, then shows the saved options", async () => {
    const { inner, store } = setup();
    const release = store.holdNextCommit();
    render(<App store={store} loadPack={proofPack} />);

    await waitFor(() => expect(store.commits).toHaveLength(1));
    expect(screen.queryByRole("button", { name: /quỹ hỗ trợ/ })).toBeNull();
    expect(screen.queryByRole("group", { name: "Phương án" })).toBeNull();
    expect(await inner.load()).toEqual({ status: "empty" });

    await act(async () => release());

    expect(await screen.findByRole("heading", { name: "Chiếc xe hỏng sau ca mưa" })).toBeTruthy();
    expect(optionButtons()).toHaveLength(3);
    expect((await inner.load()).status).toBe("ready");
  });

  it("uses large tap targets and semantic buttons for the options", async () => {
    const { store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });

    for (const button of optionButtons()) {
      expect(button.tagName).toBe("BUTTON");
      expect(button.getAttribute("type")).toBe("button");
      expect(button.className).toContain("option");
    }
    expect(screen.getByText("Tuần 1 · Quyết định 1/2")).toBeTruthy();
  });

  it("creates exactly one first checkpoint even when effects run twice (StrictMode)", async () => {
    const { inner, store } = setup();
    render(
      <StrictMode>
        <App store={store} loadPack={proofPack} />
      </StrictMode>,
    );

    await screen.findByRole("group", { name: "Phương án" });

    expect(optionButtons()).toHaveLength(3);
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.sequence).toBe(1);
  });

  it("shows the same event and options after reopening, without saving again", async () => {
    const { store } = setup();
    const first = render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    const before = optionButtons().map((b) => b.textContent);
    first.unmount();

    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });

    expect(optionButtons().map((b) => b.textContent)).toEqual(before);
    expect(store.commits).toHaveLength(1);
  });

  it("shows an error and no choices when the first save fails, and recovers on retry", async () => {
    const { inner, store } = setup();
    store.failNextCommits(1);
    render(<App store={store} loadPack={proofPack} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Không lưu được tiến trình");
    expect(screen.queryByRole("group", { name: "Phương án" })).toBeNull();
    expect(await inner.load()).toEqual({ status: "empty" });

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    await screen.findByRole("group", { name: "Phương án" });
    expect(screen.queryByRole("alert")).toBeNull();
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.sequence).toBe(1);
  });
});

describe("choosing an option", () => {
  const tapFirstOption = () => fireEvent.click(optionButtons()[0] as HTMLElement);

  it("shows feedback and the next event only after the choice is saved", async () => {
    const { inner, store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    const release = store.holdNextCommit();

    tapFirstOption();

    await waitFor(() => expect(store.commits).toHaveLength(2));
    // Saving: nothing is acknowledged, the choices cannot be tapped again.
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("heading", { name: "Chiếc xe hỏng sau ca mưa" })).toBeTruthy();
    for (const button of optionButtons()) expect((button as HTMLButtonElement).disabled).toBe(true);

    await act(async () => release());

    expect((await screen.findByRole("status")).textContent).toContain("Họ cảm ơn");
    expect(screen.getByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" })).toBeTruthy();
    expect(screen.getByText("Tuần 1 · Quyết định 2/2")).toBeTruthy();
    expect(optionButtons()).toHaveLength(2);
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.sequence).toBe(2);
  });

  it("shows an error and no feedback when the save fails, and applies the choice once on retry", async () => {
    const { inner, store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    store.failNextCommits(1);

    tapFirstOption();

    expect((await screen.findByRole("alert")).textContent).toContain("Không lưu được lựa chọn");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("heading", { name: "Chiếc xe hỏng sau ca mưa" })).toBeTruthy();
    expect((await inner.load()) as unknown).toMatchObject({ checkpoint: { sequence: 1 } });

    tapFirstOption();

    expect((await screen.findByRole("status")).textContent).toContain("Họ cảm ơn");
    expect(screen.queryByRole("alert")).toBeNull();
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint.sequence).toBe(2);
    expect(stored.checkpoint.metrics.riderNetwork).toBe(60);
    expect(stored.checkpoint.weekDecisions).toHaveLength(1);
  });

  it("commits once when the same option is activated twice in a row", async () => {
    const { inner, store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    const button = optionButtons()[0] as HTMLElement;

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await screen.findByRole("status");
    expect(store.commits).toHaveLength(2);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint.sequence).toBe(2);
    expect(stored.checkpoint.metrics.riderNetwork).toBe(60);
    expect(stored.checkpoint.recurringCosts).toEqual({ "policy.rider_support_fund": 6 });
  });

  it("keeps the committed result and next event after reopening, without repeating feedback", async () => {
    const { store } = setup();
    const first = render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    tapFirstOption();
    await screen.findByRole("status");
    const options = optionButtons().map((b) => b.textContent);
    first.unmount();

    render(<App store={store} loadPack={proofPack} />);

    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    expect(optionButtons().map((b) => b.textContent)).toEqual(options);
    expect(screen.queryByRole("status")).toBeNull();
    expect(store.commits).toHaveLength(2);
  });

  it("reaches the end-of-decisions screen after the last slot and resumes on it", async () => {
    const { store } = setup();
    const first = render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    tapFirstOption();
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    tapFirstOption();

    await screen.findByRole("heading", { name: "Tuần 1: đã xong các quyết định" });
    expect(screen.queryByRole("group", { name: "Phương án" })).toBeNull();
    first.unmount();

    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("heading", { name: "Tuần 1: đã xong các quyết định" });
  });

  it("asks to reload instead of overwriting when another tab already saved a decision", async () => {
    const ctx = setup();
    render(<App store={ctx.store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    // Another tab commits the same decision first.
    const other = createIdbCheckpointStore(ctx.name);
    const current = await other.load();
    if (current.status !== "ready" || current.checkpoint.phase !== "event") throw new Error("x");
    const { resolveChoice } = await import("../../../src/game/domain/resolveChoice.ts");
    const resolved = resolveChoice(proofPack(), current.checkpoint, "opt.rider_claim.decline");
    if (!resolved.ok) throw new Error("x");
    await other.commit(resolved.draft);

    tapFirstOption();

    expect((await screen.findByRole("alert")).textContent).toContain("đã thay đổi ở tab");
    const stored = await ctx.inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint.metrics.riderNetwork).toBe(40);
    await other.close();
  });
});

describe("confirmation for a major irreversible option", () => {
  const SETTLE = /Trả một lần để họ rút phản ánh/;
  const tapSettle = () => fireEvent.click(screen.getByRole("button", { name: SETTLE }));

  it("commits an ordinary choice on tap with no dialog", async () => {
    const { store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });

    fireEvent.click(screen.getByRole("button", { name: /Lập quỹ hỗ trợ sửa xe/ }));

    expect(screen.queryByRole("dialog")).toBeNull();
    await screen.findByRole("status");
    expect(store.commits).toHaveLength(2);
  });

  it("asks first, focusing the safe answer, and writes nothing while asking", async () => {
    const { inner, store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    const before = await inner.load();

    tapSettle();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/không thể hoàn tác/)).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Hủy" }));
    expect(store.commits).toHaveLength(1);
    expect(await inner.load()).toEqual(before);
  });

  it("cancel leaves the event unresolved with no state change, callback or checkpoint", async () => {
    const { inner, store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    const before = await inner.load();
    tapSettle();
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("heading", { name: "Chiếc xe hỏng sau ca mưa" })).toBeTruthy();
    expect(optionButtons()).toHaveLength(3);
    expect(store.commits).toHaveLength(1);
    expect(await inner.load()).toEqual(before);
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.pendingCallbacks).toEqual([]);
  });

  it("treats the dialog's cancel event (Escape) like Hủy", async () => {
    const { store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    tapSettle();
    const dialog = await screen.findByRole("dialog");

    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(store.commits).toHaveLength(1);
  });

  it("confirm commits exactly once, and the result survives reopening", async () => {
    const { inner, store } = setup();
    const first = render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    tapSettle();
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Xác nhận" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect((await screen.findByRole("status")).textContent).toContain("Họ nhận khoản tiền");
    expect(store.commits).toHaveLength(2);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint).toMatchObject({
      sequence: 2,
      metrics: { cash: 42, riderNetwork: 45 },
      npcStatus: { "npc.recurring_rider": "departed" },
    });
    first.unmount();

    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    expect(store.commits).toHaveLength(2);
    expect(await inner.load()).toEqual(stored);
  });

  it("shows an error and applies nothing if the confirmed save fails, then commits once on retry", async () => {
    const { inner, store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    store.failNextCommits(1);
    tapSettle();
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Xác nhận" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain("Không lưu được lựa chọn");
    expect(screen.queryByRole("status")).toBeNull();
    expect((await inner.load()) as unknown).toMatchObject({ checkpoint: { sequence: 1 } });

    tapSettle();
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Xác nhận" }),
    );

    await screen.findByRole("status");
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.metrics.cash).toBe(42);
  });
});

describe("settling the week", () => {
  async function reachSettlement(store: ReturnType<typeof setup>["store"]) {
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    fireEvent.click(optionButtons()[0] as HTMLElement);
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    fireEvent.click(optionButtons()[0] as HTMLElement);
    return screen.findByRole("button", { name: "Tổng kết tuần" });
  }

  it("settles on tap and shows the report only after the checkpoint is saved", async () => {
    const { inner, store } = setup();
    const button = await reachSettlement(store);
    const release = store.holdNextCommit();

    fireEvent.click(button);

    await waitFor(() => expect(store.commits).toHaveLength(4));
    expect(screen.queryByRole("heading", { name: "Báo cáo tuần 1" })).toBeNull();
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await act(async () => release());

    const report = await screen.findByRole("heading", { name: "Báo cáo tuần 1" });
    expect(report).toBeTruthy();
    expect(screen.getByText("Đơn giao hàng hoàn thành").nextSibling?.textContent).toBe("19");
    expect(screen.getByText("Chuyến chở khách hoàn thành").nextSibling?.textContent).toBe("13");
    expect(screen.getByText("Kết quả tuần").nextSibling?.textContent).toBe("+6");
    expect(screen.getByText("Tiền mặt hiện có").nextSibling?.textContent).toBe("53");
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.phase).toBe("report");
  });

  it("settles once on a repeated tap and once more is impossible after a reload", async () => {
    const { inner, store } = setup();
    const button = await reachSettlement(store);

    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByRole("heading", { name: "Báo cáo tuần 1" });

    expect(store.commits).toHaveLength(4);
    cleanup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("heading", { name: "Báo cáo tuần 1" });
    expect(store.commits).toHaveLength(4);
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.metrics.cash).toBe(53);
  });

  it("shows an error and no report when the save fails, and settles once on retry", async () => {
    const { inner, store } = setup();
    const button = await reachSettlement(store);
    store.failNextCommits(1);

    fireEvent.click(button);

    expect((await screen.findByRole("alert")).textContent).toContain("Không lưu được kết quả tuần");
    expect(screen.queryByRole("heading", { name: "Báo cáo tuần 1" })).toBeNull();
    expect((await inner.load()) as unknown).toMatchObject({ checkpoint: { phase: "settlement" } });

    fireEvent.click(screen.getByRole("button", { name: "Tổng kết tuần" }));

    await screen.findByRole("heading", { name: "Báo cáo tuần 1" });
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.metrics.cash).toBe(53);
  });
});

describe("weekly report and Next Week", () => {
  // Week 2 needs two decisions to advance into; the shipped proof loop authors none yet.
  const playable = () => playablePack();

  async function reachReport(store: ReturnType<typeof setup>["store"]) {
    render(<App store={store} loadPack={playable} />);
    await screen.findByRole("group", { name: "Phương án" });
    fireEvent.click(optionButtons()[0] as HTMLElement);
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    fireEvent.click(optionButtons()[0] as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));
    return screen.findByRole("button", { name: "Tuần tiếp theo" });
  }

  it("shows the visible meters and no hidden or internal state", async () => {
    const { store } = setup();
    await reachReport(store);

    const text = document.body.textContent ?? "";
    expect(text).toContain("62/100");
    expect(text).toContain("40/100");
    expect(text).toContain("50/100");
    // Relationship status, precedents, policies, callbacks and arithmetic must not leak.
    expect(text).not.toMatch(/ally|resentful|departed|neutral|prec\.|mem\.|policy\.|cb\.|npc\./i);
    expect(text).not.toMatch(/factor|sentiment|hostility|morality|điểm đạo đức/i);
  });

  it("prints the authored report lines of the week's decisions", async () => {
    const pack = probeChainPack();
    const { inner, store } = setup();
    await inner.commit(seedDraft(replayToSettlement(pack, 3, PROBE_HISTORY_A)));
    render(<App store={store} loadPack={() => pack} />);

    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));

    await screen.findByRole("heading", { name: "Báo cáo tuần 3" });
    expect(
      screen.getByText(/Tài xế quen mặt đứng cạnh công ty trong thông báo chung/),
    ).toBeTruthy();
  });

  it("restores the same report after a reload without settling or saving", async () => {
    const { inner, store } = setup();
    await reachReport(store);
    const before = document.body.textContent;
    const saved = await inner.load();
    const commits = store.commits.length;
    cleanup();

    render(<App store={store} loadPack={playable} />);
    await screen.findByRole("heading", { name: "Báo cáo tuần 1" });

    expect(document.body.textContent).toBe(before);
    expect(store.commits).toHaveLength(commits);
    expect(await inner.load()).toEqual(saved);
  });

  it("refuses Next Week into a week the content has not authored, keeping the report", async () => {
    const { inner, store } = setup();
    render(<App store={store} loadPack={unauthoredPack} />);
    await screen.findByRole("group", { name: "Phương án" });
    fireEvent.click(optionButtons()[0] as HTMLElement);
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    fireEvent.click(optionButtons()[0] as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));
    const next = await screen.findByRole("button", { name: "Tuần tiếp theo" });
    const saved = await inner.load();
    const commits = store.commits.length;

    fireEvent.click(next);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Tuần tiếp theo chưa có nội dung");
    expect(alert.textContent).not.toContain("Không lưu được");
    expect(screen.getByRole("heading", { name: "Báo cáo tuần 1" })).toBeTruthy();
    expect(screen.queryByText(/Tuần 2/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Tổng kết tuần" })).toBeNull();
    expect(store.commits).toHaveLength(commits);
    expect(await inner.load()).toEqual(saved);
  });

  it("keeps an authored-content dead end distinct from unauthored content", async () => {
    // Week 2 is authored but needs the rider-support fund; declining week 1 means it cannot be shown.
    const needsFund = testEvent(
      "evt.test.needs_fund",
      ["a", "b"].map((n) =>
        testOption(
          `opt.test.needs_fund.${n}`,
          [],
          [{ op: "has", set: "policies", id: "policy.rider_support_fund" }],
        ),
      ),
    );
    const pack = packFrom((chain, loop) => {
      chain.events.push(needsFund);
      loop.weeks[1].slots = ["evt.test.needs_fund", "evt.test.needs_fund"];
    });
    const { inner, store } = setup();
    render(<App store={store} loadPack={() => pack} />);
    await screen.findByRole("group", { name: "Phương án" });
    fireEvent.click(screen.getByRole("button", { name: /Từ chối/ }));
    await screen.findByRole("heading", { name: "Ca làm cuối tuần chưa đủ người" });
    fireEvent.click(optionButtons()[0] as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));
    const next = await screen.findByRole("button", { name: "Tuần tiếp theo" });
    const saved = await inner.load();
    const commits = store.commits.length;

    fireEvent.click(next);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Nội dung của tuần tiếp theo không hợp lệ");
    expect(alert.textContent).not.toContain("chưa có nội dung");
    expect(screen.getByRole("heading", { name: "Báo cáo tuần 1" })).toBeTruthy();
    expect(store.commits).toHaveLength(commits);
    expect(await inner.load()).toEqual(saved);
  });

  it("advances one week on tap, only after the save, and a double tap advances once", async () => {
    const { inner, store } = setup();
    const next = await reachReport(store);
    const release = store.holdNextCommit();

    fireEvent.click(next);
    fireEvent.click(next);

    await waitFor(() => expect(store.commits).toHaveLength(5));
    expect(screen.getByRole("heading", { name: "Báo cáo tuần 1" })).toBeTruthy();
    expect((next as HTMLButtonElement).disabled).toBe(true);

    await act(async () => release());

    await screen.findByText("Tuần 2 · Quyết định 1/2");
    expect(store.commits).toHaveLength(5);
    const stored = await inner.load();
    if (stored.status !== "ready") throw new Error("expected ready");
    expect(stored.checkpoint).toMatchObject({ week: 2, phase: "event" });
    expect(stored.checkpoint.metrics.cash).toBe(53);
  });

  it("stays on the report with an error when the advance cannot be saved, then advances on retry", async () => {
    const { inner, store } = setup();
    const next = await reachReport(store);
    store.failNextCommits(1);

    fireEvent.click(next);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Không lưu được việc sang tuần mới",
    );
    expect(screen.getByRole("heading", { name: "Báo cáo tuần 1" })).toBeTruthy();
    expect(screen.queryByText("Tuần 2 · Quyết định 1/2")).toBeNull();
    expect((await inner.load()) as unknown).toMatchObject({
      checkpoint: { week: 1, phase: "report" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Tuần tiếp theo" }));

    await screen.findByText("Tuần 2 · Quyết định 1/2");
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint.week).toBe(2);
  });

  it("reopens in week 2 after a successful advance", async () => {
    const { store } = setup();
    fireEvent.click(await reachReport(store));
    await screen.findByText("Tuần 2 · Quyết định 1/2");
    cleanup();

    render(<App store={store} loadPack={playable} />);

    await screen.findByText("Tuần 2 · Quyết định 1/2");
    expect(store.commits).toHaveLength(5);
  });

  it("ends in Prototype Complete after the week-12 report, and reopens there", async () => {
    const pack = weekTwelvePack();
    const { inner, store } = setup();
    await inner.commit(seedDraft(resolvedSettlementAt(pack, 12)));
    render(<App store={store} loadPack={() => pack} />);

    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));
    await screen.findByRole("heading", { name: "Báo cáo tuần 12" });
    expect(screen.queryByRole("button", { name: "Tuần tiếp theo" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Kết thúc bản nguyên mẫu" }));

    await screen.findByRole("heading", { name: "Prototype Complete" });
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    render(<App store={store} loadPack={() => pack} />);
    await screen.findByRole("heading", { name: "Prototype Complete" });
    const stored = await inner.load();
    expect(stored.status === "ready" && stored.checkpoint).toMatchObject({
      phase: "complete",
      week: 12,
    });
  });

  it("will not close the prototype from week 12 while required callbacks are pending", async () => {
    const pack = weekTwelvePack();
    const { inner, store } = setup();
    await inner.commit(
      seedDraft(
        resolvedSettlementAt(pack, 12, {
          pendingCallbacks: [
            {
              callbackId: "cb.public_rider_dispute",
              scheduledWeek: 1,
              sourceEventId: "evt.proof.rider_claim",
              sourceOptionId: "opt.rider_claim.fund_policy",
            },
          ],
        }),
      ),
    );
    render(<App store={store} loadPack={() => pack} />);
    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));
    await screen.findByRole("heading", { name: "Báo cáo tuần 12" });
    const saved = await inner.load();
    const commits = store.commits.length;

    fireEvent.click(screen.getByRole("button", { name: "Kết thúc bản nguyên mẫu" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Vẫn còn hậu quả cần xử lý");
    expect(screen.getByRole("heading", { name: "Báo cáo tuần 12" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Prototype Complete" })).toBeNull();
    expect(store.commits).toHaveLength(commits);
    expect(await inner.load()).toEqual(saved);
  });

  it("offers no Next Week after the explicit failed state", async () => {
    const pack = playablePack([4]);
    const { inner, store } = setup();
    const broke = resolvedSettlementAt(pack, 4);
    await inner.commit(seedDraft({ ...broke, metrics: { ...broke.metrics, cash: -60 } }));
    render(<App store={store} loadPack={() => pack} />);

    fireEvent.click(await screen.findByRole("button", { name: "Tổng kết tuần" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Công ty đã cạn tiền");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("blocking and recovery screens", () => {
  async function twoSaves(ctx: ReturnType<typeof setup>) {
    const first = await ctx.inner.commit(firstDraft());
    if (!first.ok) throw new Error("setup failed");
    const second = await ctx.inner.commit(nextDraft(first.value));
    if (!second.ok) throw new Error("setup failed");
    return { first: first.value, second: second.value };
  }

  it("asks before recovering the previous checkpoint, then shows its event", async () => {
    const ctx = setup();
    await twoSaves(ctx);
    await corruptSlot(ctx.name, "current", { schemaVersion: 1, nonsense: true });
    render(<App store={ctx.store} loadPack={proofPack} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("bản lưu trước đó");
    expect(screen.queryByRole("group", { name: "Phương án" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục bản lưu trước" }));

    await screen.findByRole("group", { name: "Phương án" });
    const stored = await ctx.inner.load();
    expect(stored.status === "ready" && stored.checkpoint.sequence).toBe(1);
  });

  it("blocks a newer-version save with no way to overwrite it", async () => {
    const ctx = setup();
    await twoSaves(ctx);
    await corruptSlot(ctx.name, "current", { schemaVersion: 2, sequence: 5 });
    render(<App store={ctx.store} loadPack={proofPack} />);

    expect((await screen.findByRole("alert")).textContent).toContain("phiên bản mới hơn");
    expect(screen.queryByRole("button")).toBeNull();
    expect(ctx.store.commits).toHaveLength(0);
  });

  it("needs a second, explicit confirmation before clearing an unusable save", async () => {
    const ctx = setup();
    await ctx.inner.load();
    await corruptSlot(ctx.name, "current", "garbage");
    render(<App store={ctx.store} loadPack={proofPack} />);
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Xóa và bắt đầu lại" }));
    expect(ctx.store.commits).toHaveLength(0);
    expect((await ctx.inner.load()).status).toBe("unusable");

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa và bắt đầu lại" }));
    await screen.findByRole("group", { name: "Phương án" });
    expect((await ctx.inner.load()).status).toBe("ready");
  });

  it("blocks play with an explanation when the content is invalid", async () => {
    const { store } = setup();
    render(
      <App
        store={store}
        loadPack={() => {
          throw new ContentError(["broken"]);
        }}
      />,
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Nội dung trò chơi không hợp lệ",
    );
    expect(screen.queryByRole("group", { name: "Phương án" })).toBeNull();
    expect(store.commits).toHaveLength(0);
  });
});
