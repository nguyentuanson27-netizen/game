import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { startStaticServer } from "./helpers/static-server.ts";

// Output of the `npm run build` that playwright.config.ts runs before the tests (sub-path /game/).
const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const basePath = "/game/";
const EVENT_TITLE = "Chiếc xe hỏng sau ca mưa";

interface StoredCheckpoint {
  sequence: number;
  parentSequence: number | null;
  week: number;
  phase: string;
  activeEvent: { eventId: string; optionIds: string[] } | null;
  metrics: { riderNetwork: number };
  policies: string[];
  recurringCosts: Record<string, number>;
  npcStatus: Record<string, string>;
  memories: string[];
  pendingCallbacks: { callbackId: string }[];
  weekDecisions: { slot: number; optionId: string }[];
}

/** Read a committed slot straight from IndexedDB, bypassing the app. */
function readSlot(page: Page, key: "current" | "previous"): Promise<StoredCheckpoint | null> {
  return page.evaluate(
    ({ dbName, slot }) =>
      new Promise<StoredCheckpoint | null>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction("checkpoints").objectStore("checkpoints").get(slot);
          get.onerror = () => reject(get.error);
          get.onsuccess = () => {
            db.close();
            resolve((get.result as StoredCheckpoint | undefined) ?? null);
          };
        };
      }),
    { dbName: "bicycle-platform-prototype", slot: key },
  );
}

const readCurrent = (page: Page) => readSlot(page, "current");

const options = (page: Page) => page.getByRole("group", { name: "Phương án" }).getByRole("button");

test.describe("unanswered event resume (AC-04)", () => {
  test("saves the active event before it is interactive and restores it after a reload", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 2, name: EVENT_TITLE })).toBeVisible();
    await expect(options(page)).toHaveCount(3);

    // Once the options are on screen, the event they belong to is already committed.
    const saved = await readCurrent(page);
    expect(saved).toMatchObject({
      sequence: 1,
      parentSequence: null,
      week: 1,
      activeEvent: { eventId: "evt.proof.rider_claim" },
    });
    expect(saved?.activeEvent?.optionIds).toHaveLength(3);

    const before = await options(page).allTextContents();
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    await page.reload();

    await expect(page.getByRole("heading", { level: 2, name: EVENT_TITLE })).toBeVisible();
    expect(await options(page).allTextContents()).toEqual(before);
    // Same checkpoint: nothing was rerolled or saved again.
    expect(await readCurrent(page)).toEqual(saved);
  });

  test("resumes the same event and options offline after the service worker is ready", async ({
    page,
  }) => {
    // A dedicated server we can stop makes "offline" real in every engine; see smoke.spec.ts.
    const server = await startStaticServer(distDir, basePath);
    try {
      await page.goto(server.url);
      await expect(page.getByRole("heading", { level: 2, name: EVENT_TITLE })).toBeVisible();
      const before = await options(page).allTextContents();
      const saved = await readCurrent(page);
      expect(saved?.sequence).toBe(1);

      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

      await server.stop();
      await page.reload();

      await expect(page.getByRole("heading", { level: 2, name: EVENT_TITLE })).toBeVisible();
      expect(await options(page).allTextContents()).toEqual(before);
      expect(await readCurrent(page)).toEqual(saved);
    } finally {
      await server.stop();
    }
  });

  test.describe("after a committed choice (AC-04)", () => {
    const FALLBACK_TITLE = "Ca làm cuối tuần chưa đủ người";

    async function chooseFundPolicy(page: Page) {
      await page.getByRole("button", { name: /Lập quỹ hỗ trợ sửa xe/ }).click();
      // The PWA offline-ready notice is also a status region, so match the feedback by its text.
      await expect(page.getByRole("status").filter({ hasText: "Họ cảm ơn" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();
    }

    function expectCommittedChoice(saved: StoredCheckpoint | null) {
      expect(saved).toMatchObject({
        sequence: 2,
        parentSequence: 1,
        phase: "event",
        metrics: { riderNetwork: 60 },
        policies: ["policy.rider_support_fund"],
        recurringCosts: { "policy.rider_support_fund": 6 },
        npcStatus: { "npc.recurring_rider": "ally" },
        weekDecisions: [{ slot: 1, optionId: "opt.rider_claim.fund_policy" }],
        activeEvent: { eventId: "evt.proof.fallback_shift_roster" },
      });
      expect(saved?.memories).toContain("prec.rider_dispute.negotiated");
      expect(saved?.pendingCallbacks.map((p) => p.callbackId)).toEqual([
        "cb.rider_voice_followup",
        "cb.public_rider_dispute",
      ]);
    }

    test("keeps the whole decision and the next event after a reload", async ({ page }) => {
      await page.goto("./");
      await chooseFundPolicy(page);

      // The feedback is only visible once the single checkpoint holding everything is committed.
      const saved = await readCurrent(page);
      expectCommittedChoice(saved);
      expect((await readSlot(page, "previous"))?.sequence).toBe(1);
      const before = await options(page).allTextContents();

      await page.reload();

      await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();
      expect(await options(page).allTextContents()).toEqual(before);
      expect(await readCurrent(page)).toEqual(saved);
    });

    test("keeps it when reopened offline after the service worker is ready", async ({ page }) => {
      const server = await startStaticServer(distDir, basePath);
      try {
        await page.goto(server.url);
        await chooseFundPolicy(page);
        const saved = await readCurrent(page);
        expectCommittedChoice(saved);

        await page.evaluate(async () => {
          await navigator.serviceWorker.ready;
        });
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
        await server.stop();
        await page.reload();

        await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();
        expect(await readCurrent(page)).toEqual(saved);
      } finally {
        await server.stop();
      }
    });

    test("applies a double tap once", async ({ page }) => {
      await page.goto("./");
      const button = page.getByRole("button", { name: /Lập quỹ hỗ trợ sửa xe/ });
      await expect(button).toBeVisible();

      await button.dblclick();
      await expect(page.getByRole("heading", { level: 2, name: FALLBACK_TITLE })).toBeVisible();

      expectCommittedChoice(await readCurrent(page));
    });
  });
});
