import { expect, type Page, test } from "@playwright/test";
import { activateTwice } from "./helpers/actions.ts";
import { readCurrent } from "./helpers/checkpoint.ts";

const EVENT_TITLE = "Chiếc xe hỏng sau ca mưa";
const FALLBACK_TITLE = "Ca làm cuối tuần chưa đủ người";
const options = (page: Page) => page.getByRole("group", { name: "Phương án" }).getByRole("button");
const settle = (page: Page) => page.getByRole("button", { name: /Trả một lần để họ rút phản ánh/ });

test.describe("confirmation of a major irreversible choice (AC-07)", () => {
  test("an ordinary choice commits on tap without a dialog", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /Lập quỹ hỗ trợ sửa xe/ }).click();

    await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("cancel changes nothing, even after a reload; confirm commits once and persists", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(options(page)).toHaveCount(3);
    const before = await readCurrent(page);
    expect(before?.sequence).toBe(1);

    await settle(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Hủy" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: EVENT_TITLE })).toBeVisible();
    expect(await readCurrent(page)).toEqual(before);
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: EVENT_TITLE })).toBeVisible();
    expect(await readCurrent(page)).toEqual(before);

    await settle(page).click();
    await activateTwice(page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }));

    await expect(page.getByRole("status").filter({ hasText: "Họ nhận khoản tiền" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();
    const saved = await readCurrent(page);
    expect(saved).toMatchObject({
      sequence: 2,
      npcStatus: { "npc.recurring_rider": "departed" },
      weekDecisions: [{ slot: 1, optionId: "opt.rider_claim.settle_and_part" }],
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();
    expect(await readCurrent(page)).toEqual(saved);
  });
});
