import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/App.tsx";

afterEach(cleanup);

describe("App shell", () => {
  it("identifies itself as a prototype with semantic landmarks", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Nền tảng xe đạp");
    expect(screen.getByText("Bản nguyên mẫu")).toBeTruthy();
  });

  it("shows no update notice until the service worker reports one", () => {
    render(<App />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
