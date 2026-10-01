import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdatePrompt } from "../../src/pwa/UpdatePrompt.tsx";

afterEach(cleanup);

function setup(props: { offlineReady: boolean; needRefresh: boolean }) {
  const onUpdate = vi.fn();
  const onDismiss = vi.fn();
  render(<UpdatePrompt {...props} onUpdate={onUpdate} onDismiss={onDismiss} />);
  return { onUpdate, onDismiss };
}

describe("UpdatePrompt", () => {
  it("renders nothing when there is nothing to report", () => {
    setup({ offlineReady: false, needRefresh: false });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces offline readiness without offering an update", () => {
    setup({ offlineReady: true, needRefresh: false });

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cập nhật" })).toBeNull();
    expect(screen.getByRole("button", { name: "Đóng" })).toBeTruthy();
  });

  it("applies an update only when the player taps Cập nhật", () => {
    const { onUpdate, onDismiss } = setup({ offlineReady: false, needRefresh: true });

    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật" }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("lets the player postpone an update without applying it", () => {
    const { onUpdate, onDismiss } = setup({ offlineReady: false, needRefresh: true });

    fireEvent.click(screen.getByRole("button", { name: "Để sau" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
