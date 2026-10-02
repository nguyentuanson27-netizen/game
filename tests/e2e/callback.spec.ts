import { expect, type Page, test } from "@playwright/test";
import { readCurrent } from "./helpers/checkpoint.ts";

const options = (page: Page) => page.getByRole("group", { name: "Phương án" }).getByRole("button");
const heading = (page: Page, name: string) => page.getByRole("heading", { level: 2, name });

/** Settle the finished week and move on, waiting for each step to be committed. */
async function closeWeek(page: Page, week: number) {
  await page.getByRole("button", { name: "Tổng kết tuần" }).click();
  await expect(heading(page, `Báo cáo tuần ${week}`)).toBeVisible();
  await page.getByRole("button", { name: "Tuần tiếp theo" }).click();
}

test.describe("a required callback returns through the real loop (AC-02, AC-04)", () => {
  test("is delivered in week 7, resolves once and stays resolved after reloads", async ({
    page,
  }) => {
    await page.goto("./");

    // Week 1: fund the rider policy (schedules both callbacks), then the extra evening shift.
    await page.getByRole("button", { name: /Lập quỹ hỗ trợ sửa xe/ }).click();
    await expect(heading(page, "Ca làm cuối tuần chưa đủ người")).toBeVisible();
    await options(page).first().click();
    await closeWeek(page, 1);

    // Weeks 2-6: ordinary routine beats only. The callback is pending but its window is closed.
    for (let week = 2; week <= 6; week++) {
      await expect(page.getByText(`Tuần ${week} · Quyết định 1/2`)).toBeVisible();
      await options(page).first().click();
      await expect(page.getByText(`Tuần ${week} · Quyết định 2/2`)).toBeVisible();
      await options(page).first().click();
      await closeWeek(page, week);
    }

    // Week 7: the follow-up takes the first slot, before the ordinary beat planned for it.
    await expect(page.getByText("Tuần 7 · Quyết định 1/2")).toBeVisible();
    await expect(heading(page, "Người tài xế ấy giờ nói thay cả nhóm")).toBeVisible();
    const delivered = await readCurrent(page);
    expect(delivered).toMatchObject({
      week: 7,
      phase: "event",
      weekDecisions: [],
      activeEvent: { eventId: "var.rider_voice_followup.engaged" },
    });
    expect(delivered?.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
    expect(delivered?.resolvedCallbacks ?? []).toEqual([]);

    // Closing and reopening restores the same pending callback event; nothing is saved.
    await page.reload();
    await expect(heading(page, "Người tài xế ấy giờ nói thay cả nhóm")).toBeVisible();
    expect(await readCurrent(page)).toEqual(delivered);

    // Resolve it: one commit moves it from pending to resolved and the ordinary beat follows.
    await page.getByRole("button", { name: /Giữ kênh nhắn riêng như hiện nay/ }).click();
    await expect(page.getByText("Tuần 7 · Quyết định 2/2")).toBeVisible();
    await expect(heading(page, "Xe đạp cần bảo dưỡng")).toBeVisible();
    const resolved = await readCurrent(page);
    expect(resolved).toMatchObject({
      sequence: (delivered?.sequence ?? 0) + 1,
      week: 7,
      activeEvent: { eventId: "evt.routine.bike_checkup" },
      resolvedCallbacks: [
        {
          callbackId: "cb.rider_voice_followup",
          week: 7,
          resolvedBy: "var.rider_voice_followup.engaged",
        },
      ],
    });
    expect(resolved?.pendingCallbacks.map((p) => p.callbackId)).toEqual([
      "cb.public_rider_dispute",
    ]);

    // After another reload the resolved callback does not come back.
    await page.reload();
    await expect(heading(page, "Xe đạp cần bảo dưỡng")).toBeVisible();
    await expect(heading(page, "Người tài xế ấy giờ nói thay cả nhóm")).toHaveCount(0);
    expect(await readCurrent(page)).toEqual(resolved);
  });
});
