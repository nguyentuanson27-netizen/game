import { expect, type Page, test } from "@playwright/test";
import { readCurrent } from "./helpers/checkpoint.ts";
import { closeWeek, heading, options, playRoutineWeeks } from "./helpers/journey.ts";

const CRISIS_TITLE = "Chuyện tài xế lên báo địa phương";
const HOLD = "Hoãn phát ngôn hai ngày, rà soát các ca tai nạn";
const CITE = "Công bố quy định quỹ hỗ trợ và số ca đã chi";
const JOINT = "Cùng tài xế quen mặt ra thông báo chung";
const ANNOUNCE = "Công bố quỹ hỗ trợ tài xế ngay bây giờ";
const QUIET = "Dàn xếp riêng với các tài xế liên quan, đề nghị gỡ bài";

async function toCrisis(page: Page, setup: RegExp, followUp: RegExp) {
  await page.goto("./");
  await page.getByRole("button", { name: setup }).click();
  await expect(heading(page, "Tuần mưa kéo dài")).toBeVisible();
  await options(page).first().click();
  await closeWeek(page, 1);
  await playRoutineWeeks(page, 2, 6, true);
  // Week 7: the follow-up callback, answered with a documented choice.
  await expect(page.getByText("Tuần 7 · Quyết định 1/2")).toBeVisible();
  await page.getByRole("button", { name: followUp }).click();
  await options(page).first().click();
  await closeWeek(page, 7);
  await playRoutineWeeks(page, 8, 9, true);
  await expect(page.getByText("Tuần 10 · Quyết định 1/2")).toBeVisible();
  await expect(heading(page, CRISIS_TITLE)).toBeVisible();
}

const optionTexts = (page: Page) => options(page).locator(".option__text").allTextContents();

test.describe("two histories reach the same crisis with different options (AC-06)", () => {
  test("history A (rider-support fund) offers the policy and relationship options", async ({
    page,
  }) => {
    await toCrisis(page, /Lập quỹ hỗ trợ sửa xe/, /Giữ kênh nhắn riêng như hiện nay/);

    expect(await optionTexts(page)).toEqual([HOLD, CITE, JOINT]);
    const saved = await readCurrent(page);
    expect(saved?.activeEvent?.optionIds).toEqual([
      "opt.crisis.hold_and_review",
      "opt.crisis.cite_policy",
      "opt.crisis.joint_statement",
    ]);

    // Reopening at the crisis restores the same options and writes nothing.
    await page.reload();
    await expect(heading(page, CRISIS_TITLE)).toBeVisible();
    expect(await optionTexts(page)).toEqual([HOLD, CITE, JOINT]);
    expect(await readCurrent(page)).toEqual(saved);
  });

  test("history B (declined claim) offers the new-policy and quiet-settlement options", async ({
    page,
  }) => {
    await toCrisis(
      page,
      /Từ chối: đây là rủi ro nghề/,
      /Đăng trả lời công khai, giữ nguyên quyết định/,
    );

    expect(await optionTexts(page)).toEqual([HOLD, ANNOUNCE, QUIET]);
    const saved = await readCurrent(page);
    expect(saved?.activeEvent?.optionIds).toEqual([
      "opt.crisis.hold_and_review",
      "opt.crisis.announce_new_policy",
      "opt.crisis.quiet_settlement",
    ]);
    await page.reload();
    expect(await optionTexts(page)).toEqual([HOLD, ANNOUNCE, QUIET]);
    expect(await readCurrent(page)).toEqual(saved);

    // Resolving the crisis resolves the callback once and the run continues to the next slot.
    await page.getByRole("button", { name: new RegExp(ANNOUNCE) }).click();
    await expect(page.getByText("Tuần 10 · Quyết định 2/2")).toBeVisible();
    const after = await readCurrent(page);
    expect(after?.pendingCallbacks).toEqual([]);
    expect(after?.resolvedCallbacks?.map((r) => r.callbackId)).toEqual([
      "cb.rider_voice_followup",
      "cb.public_rider_dispute",
    ]);
  });
});
