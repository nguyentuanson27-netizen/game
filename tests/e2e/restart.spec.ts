import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, chromium, expect, type Page, test, webkit } from "@playwright/test";
import { readSlot } from "./helpers/checkpoint.ts";
import { startStaticServer } from "./helpers/static-server.ts";

// AC-04 and AC-07 across a real restart of the whole browser, offline, with a persistent profile:
// the browser process is closed (not just the page), the server is gone, and the app has to come
// back from the service worker cache and IndexedDB on disk. Between restarts the browser clock
// jumps ahead to show that time away never advances a week.

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const basePath = "/game/";
const DAY = 24 * 60 * 60 * 1000;
const EVENT_TITLE = "Chiếc xe hỏng sau ca mưa";
const FALLBACK_TITLE = "Ca làm cuối tuần chưa đủ người";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 2, name });
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name });
const choices = (page: Page) => page.getByRole("group", { name: "Phương án" }).getByRole("button");
const slots = async (page: Page) => ({
  current: await readSlot(page, "current"),
  previous: await readSlot(page, "previous"),
});

test.describe("restarting the browser offline (AC-04, AC-07)", () => {
  test.setTimeout(180_000);

  test("every AC-04 boundary and the AC-07 result survive a full restart, and time away changes nothing", async ({
    browserName,
  }, testInfo) => {
    const use = testInfo.project.use;
    const profile = await mkdtemp(join(tmpdir(), "bicycle-profile-"));
    const server = await startStaticServer(distDir, basePath);
    let serverUp = true;
    let context: BrowserContext | undefined;
    let page!: Page;
    let restarts = 0;

    const launch = async () => {
      const type = browserName === "webkit" ? webkit : chromium;
      context = await type.launchPersistentContext(profile, {
        viewport: use.viewport ?? { width: 390, height: 844 },
        deviceScaleFactor: use.deviceScaleFactor,
        isMobile: use.isMobile,
        hasTouch: use.hasTouch,
        executablePath: use.launchOptions?.executablePath,
      });
      // Time away: every start is a month later than the last.
      await context.clock.setFixedTime(new Date(Date.UTC(2027, 0, 1) + restarts * 30 * DAY));
      page = await context.newPage();
      await page.goto(server.url);
      // The jump really happened in the page, so "time away" below is a real absence.
      const now = await page.evaluate(() => Date.now());
      expect(now).toBeGreaterThanOrEqual(Date.UTC(2027, 0, 1) + restarts * 30 * DAY);
    };

    /** Close the whole browser (and the server, after the first time) and start it again. */
    const restart = async () => {
      const before = await slots(page);
      await context?.close();
      if (serverUp) {
        await server.stop();
        serverUp = false;
      }
      restarts += 1;
      await launch();
      return before;
    };

    try {
      await launch();

      // 1. Unanswered event.
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
      await expect(choices(page)).toHaveCount(3);
      const optionTexts = await choices(page).allTextContents();
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

      let before = await restart();
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
      expect(await choices(page).allTextContents()).toEqual(optionTexts);
      expect(await slots(page)).toEqual(before);
      expect(before.current).toMatchObject({ sequence: 1, week: 1, phase: "event" });

      // 2. AC-07: a confirmation left open across a restart is a cancel; nothing was committed.
      await button(page, /Trả một lần để họ rút phản ánh/).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      before = await restart();
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(await slots(page)).toEqual(before);
      expect(before.current?.sequence).toBe(1);

      // 3. AC-07: the confirmed result survives, exactly once, with no feedback replayed.
      await button(page, /Trả một lần để họ rút phản ánh/).click();
      await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
      await expect(heading(page, FALLBACK_TITLE)).toBeVisible();
      before = await restart();
      await expect(heading(page, FALLBACK_TITLE)).toBeVisible();
      await expect(page.locator("p.feedback")).toHaveCount(0);
      expect(await slots(page)).toEqual(before);
      expect(before.current).toMatchObject({
        sequence: 2,
        metrics: { cash: 42, riderNetwork: 45 },
        npcStatus: { "npc.recurring_rider": "departed" },
        weekDecisions: [{ slot: 1, optionId: "opt.rider_claim.settle_and_part" }],
      });

      // 4. Every decision of the week committed, awaiting settlement.
      await button(page, /Thưởng nhẹ để có thêm người nhận ca tối/).click();
      await expect(button(page, "Tổng kết tuần")).toBeVisible();
      before = await restart();
      await expect(button(page, "Tổng kết tuần")).toBeVisible();
      expect(await slots(page)).toEqual(before);
      expect(before.current).toMatchObject({ phase: "settlement", week: 1 });

      // 5. Settled report: reopening never settles again.
      await button(page, "Tổng kết tuần").click();
      await expect(heading(page, "Báo cáo tuần 1")).toBeVisible();
      before = await restart();
      await expect(heading(page, "Báo cáo tuần 1")).toBeVisible();
      expect(await slots(page)).toEqual(before);
      // 50 - 8 (settlement) - 3 (extra shift) + 7 (D4 baseline week) = 46, once.
      expect(before.current).toMatchObject({ phase: "report", metrics: { cash: 46 } });

      // 6. After Next Week: the next week, not a skipped or repeated one.
      await button(page, "Tuần tiếp theo").click();
      await expect(heading(page, "Tuần 2")).toBeVisible();
      before = await restart();
      await expect(heading(page, "Tuần 2")).toBeVisible();
      expect(await slots(page)).toEqual(before);
      expect(before.current).toMatchObject({ week: 2, phase: "settlement", metrics: { cash: 46 } });

      // 7. Through to week 12, restarting in the middle of the run and at the endpoint.
      for (let week = 2; week <= 12; week++) {
        await button(page, "Tổng kết tuần").click();
        await expect(heading(page, `Báo cáo tuần ${week}`)).toBeVisible();
        if (week === 7) {
          before = await restart();
          await expect(heading(page, "Báo cáo tuần 7")).toBeVisible();
          expect(await slots(page)).toEqual(before);
        }
        await button(page, week === 12 ? "Kết thúc bản nguyên mẫu" : "Tuần tiếp theo").click();
        if (week < 12) await expect(heading(page, `Tuần ${week + 1}`)).toBeVisible();
      }
      await expect(heading(page, "Prototype Complete")).toBeVisible();
      before = await restart();
      await expect(heading(page, "Prototype Complete")).toBeVisible();
      expect(await slots(page)).toEqual(before);
      // 46 after week 1, then +7 for each of weeks 2..12 (rider network 47, jobs unchanged).
      expect(before.current).toMatchObject({
        phase: "complete",
        week: 12,
        metrics: { cash: 46 + 11 * 7 },
      });
      // Eight month-long absences later, the week is still the week the player left.
      expect(restarts).toBeGreaterThanOrEqual(8);
    } finally {
      await context?.close().catch(() => undefined);
      await server.stop();
      await rm(profile, { recursive: true, force: true });
    }
  });
});
