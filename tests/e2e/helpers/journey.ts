import { expect, type Page } from "@playwright/test";

export const options = (page: Page) =>
  page.getByRole("group", { name: "Phương án" }).getByRole("button");
export const heading = (page: Page, name: string) => page.getByRole("heading", { level: 2, name });

/** Settle the finished week and move on, waiting for each step to be committed. */
export async function closeWeek(page: Page, week: number) {
  await page.getByRole("button", { name: "Tổng kết tuần" }).click();
  await expect(heading(page, `Báo cáo tuần ${week}`)).toBeVisible();
  await page.getByRole("button", { name: "Tuần tiếp theo" }).click();
}

/** Play weeks `from`..`to` with the first option of every decision, closing each but the last. */
export async function playRoutineWeeks(page: Page, from: number, to: number, closeLast = false) {
  for (let week = from; week <= to; week++) {
    await expect(page.getByText(`Tuần ${week} · Quyết định 1/2`)).toBeVisible();
    await options(page).first().click();
    await expect(page.getByText(`Tuần ${week} · Quyết định 2/2`)).toBeVisible();
    await options(page).first().click();
    if (week < to || closeLast) await closeWeek(page, week);
  }
}
