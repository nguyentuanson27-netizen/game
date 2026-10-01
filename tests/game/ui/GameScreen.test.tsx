import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../src/App.tsx";
import { ContentError } from "../../../src/game/content/loader.ts";
import { createIdbCheckpointStore } from "../../../src/game/persistence/idbStore.ts";
import { corruptSlot, firstDraft, nextDraft, proofPack, spyOn, uniqueDbName } from "../helpers.ts";

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

  it("does not record a choice in this slice and writes nothing when an option is tapped", async () => {
    const { store } = setup();
    render(<App store={store} loadPack={proofPack} />);
    await screen.findByRole("group", { name: "Phương án" });

    fireEvent.click(optionButtons()[0] as HTMLElement);

    expect((await screen.findByRole("status")).textContent).toContain("chưa ghi nhận");
    expect(store.commits).toHaveLength(1);
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
