import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { activateTwice } from "./helpers/actions.ts";
import { readCurrent, readSlot, seedWeekTwelveReport } from "./helpers/checkpoint.ts";
import { startStaticServer } from "./helpers/static-server.ts";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const basePath = "/game/";
const readSlots = async (page: Page) => ({
  current: await readSlot(page, "current"),
  previous: await readSlot(page, "previous"),
});
const FALLBACK_TITLE = "Ca làm cuối tuần chưa đủ người";

const value = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator("xpath=following-sibling::dd[1]");

/** Week 1: fund the rider policy, then take the extra evening shift. */
async function playWeekOne(page: Page) {
  await page.getByRole("button", { name: /Lập quỹ hỗ trợ sửa xe/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();
  await page.getByRole("button", { name: /Thưởng nhẹ để có thêm người nhận ca tối/ }).click();
  await expect(page.getByRole("button", { name: "Tổng kết tuần" })).toBeVisible();
}

async function expectWeekOneReport(page: Page) {
  await expect(page.getByRole("heading", { level: 2, name: "Báo cáo tuần 1" })).toBeVisible();
  await expect(value(page, "Đơn giao hàng hoàn thành")).toHaveText("19");
  await expect(value(page, "Chuyến chở khách hoàn thành")).toHaveText("13");
  await expect(value(page, "Doanh thu")).toHaveText("77");
  await expect(value(page, "Chi phí cố định")).toHaveText("71");
  await expect(value(page, "Kết quả tuần")).toHaveText("+6");
  await expect(value(page, "Tiền mặt hiện có")).toHaveText("53");
}

test.describe("a week through settlement (AC-04)", () => {
  test("settles once and restores the report after a reload", async ({ page }) => {
    await page.goto("./");
    await playWeekOne(page);
    // Every decision is committed; the week is not settled until the player asks.
    expect(await readCurrent(page)).toMatchObject({ sequence: 3, phase: "settlement" });

    await activateTwice(page.getByRole("button", { name: "Tổng kết tuần" }));
    await expectWeekOneReport(page);
    const saved = await readCurrent(page);
    expect(saved).toMatchObject({
      sequence: 4,
      phase: "report",
      week: 1,
      metrics: { cash: 53 },
    });

    await page.reload();

    await expectWeekOneReport(page);
    // Same checkpoint: the reload neither settled again nor saved anything.
    expect(await readCurrent(page)).toEqual(saved);
  });

  test("restores the report offline after the service worker is ready", async ({ page }) => {
    const server = await startStaticServer(distDir, basePath);
    try {
      await page.goto(server.url);
      await playWeekOne(page);
      await page.getByRole("button", { name: "Tổng kết tuần" }).click();
      await expectWeekOneReport(page);
      const saved = await readCurrent(page);

      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      await server.stop();
      await page.reload();

      await expectWeekOneReport(page);
      expect(await readCurrent(page)).toEqual(saved);
    } finally {
      await server.stop();
    }
  });
});

test.describe("Next Week and the end of the prototype (AC-04, AC-05)", () => {
  async function settleWeekOne(page: Page) {
    await page.goto("./");
    await playWeekOne(page);
    await page.getByRole("button", { name: "Tổng kết tuần" }).click();
    await expectWeekOneReport(page);
  }

  test("refuses Next Week into a week the proof loop has not authored, and keeps the report", async ({
    page,
  }) => {
    await settleWeekOne(page);
    const saved = await readSlots(page);

    await page.getByRole("button", { name: "Tuần tiếp theo" }).click();

    await expect(page.getByRole("alert")).toContainText("Tuần tiếp theo chưa có nội dung");
    await expectWeekOneReport(page);
    await expect(page.getByText(/Tuần 2/)).toHaveCount(0);
    // Nothing was written and nothing can be skipped into: a reload shows the same report.
    expect(await readSlots(page)).toEqual(saved);
    await page.reload();
    await expectWeekOneReport(page);
    expect(await readSlots(page)).toEqual(saved);
  });

  test("closes the prototype from a seeded week-12 report, once, and restores it after a reload", async ({
    page,
  }) => {
    await settleWeekOne(page);
    await seedWeekTwelveReport(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Báo cáo tuần 12" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tuần tiếp theo" })).toHaveCount(0);
    const seeded = await readCurrent(page);

    await activateTwice(page.getByRole("button", { name: "Kết thúc bản nguyên mẫu" }));

    await expect(page.getByRole("heading", { level: 2, name: "Prototype Complete" })).toBeVisible();
    const done = await readCurrent(page);
    expect(done).toMatchObject({
      sequence: (seeded?.sequence ?? 0) + 1,
      phase: "complete",
      week: 12,
      metrics: { cash: 53 },
    });
    expect(done?.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);

    await page.reload();

    await expect(page.getByRole("heading", { level: 2, name: "Prototype Complete" })).toBeVisible();
    expect(await readCurrent(page)).toEqual(done);
  });
});
