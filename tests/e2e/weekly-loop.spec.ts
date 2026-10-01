import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { activateTwice } from "./helpers/actions.ts";
import { readCurrent } from "./helpers/checkpoint.ts";
import { startStaticServer } from "./helpers/static-server.ts";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const basePath = "/game/";
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

  test("advances one week, restores it after a reload and does not settle again", async ({
    page,
  }) => {
    await settleWeekOne(page);
    const report = await readCurrent(page);

    await activateTwice(page.getByRole("button", { name: "Tuần tiếp theo" }));

    await expect(page.getByRole("heading", { level: 2, name: "Tuần 2" })).toBeVisible();
    const advanced = await readCurrent(page);
    expect(advanced).toMatchObject({
      sequence: (report?.sequence ?? 0) + 1,
      week: 2,
      phase: "settlement",
      metrics: { cash: 53 },
      weekDecisions: [],
    });
    expect(advanced?.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);

    await page.reload();

    await expect(page.getByRole("heading", { level: 2, name: "Tuần 2" })).toBeVisible();
    expect(await readCurrent(page)).toEqual(advanced);
  });

  test("restores the new week offline after the service worker is ready", async ({ page }) => {
    const server = await startStaticServer(distDir, basePath);
    try {
      await page.goto(server.url);
      await playWeekOne(page);
      await page.getByRole("button", { name: "Tổng kết tuần" }).click();
      await page.getByRole("button", { name: "Tuần tiếp theo" }).click();
      await expect(page.getByRole("heading", { level: 2, name: "Tuần 2" })).toBeVisible();
      const saved = await readCurrent(page);

      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      await server.stop();
      await page.reload();

      await expect(page.getByRole("heading", { level: 2, name: "Tuần 2" })).toBeVisible();
      expect(await readCurrent(page)).toEqual(saved);
    } finally {
      await server.stop();
    }
  });

  test("plays all twelve weeks to Prototype Complete without skipping or repeating a week", async ({
    page,
  }) => {
    await settleWeekOne(page);
    const seenWeeks = [1];
    for (let week = 2; week <= 12; week++) {
      await page.getByRole("button", { name: "Tuần tiếp theo" }).click();
      await expect(page.getByRole("heading", { level: 2, name: `Tuần ${week}` })).toBeVisible();
      await page.getByRole("button", { name: "Tổng kết tuần" }).click();
      await expect(
        page.getByRole("heading", { level: 2, name: `Báo cáo tuần ${week}` }),
      ).toBeVisible();
      seenWeeks.push(week);
    }
    expect(seenWeeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    await page.getByRole("button", { name: "Kết thúc bản nguyên mẫu" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Prototype Complete" })).toBeVisible();
    const done = await readCurrent(page);
    // 1 start + 2 choices + 12 settlements + 12 advances; week 1 ended on 53 cash, then +6 a week.
    expect(done).toMatchObject({
      sequence: 27,
      week: 12,
      phase: "complete",
      metrics: { cash: 53 + 11 * 6 },
    });

    await page.reload();

    await expect(page.getByRole("heading", { level: 2, name: "Prototype Complete" })).toBeVisible();
    expect(await readCurrent(page)).toEqual(done);
  });
});
