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
  activeEvent: { eventId: string; optionIds: string[] };
}

/** Read the committed `current` checkpoint straight from IndexedDB, bypassing the app. */
function readCurrent(page: Page): Promise<StoredCheckpoint | null> {
  return page.evaluate(
    (dbName) =>
      new Promise<StoredCheckpoint | null>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction("checkpoints").objectStore("checkpoints").get("current");
          get.onerror = () => reject(get.error);
          get.onsuccess = () => {
            db.close();
            resolve((get.result as StoredCheckpoint | undefined) ?? null);
          };
        };
      }),
    "bicycle-platform-prototype",
  );
}

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
    expect(saved?.activeEvent.optionIds).toHaveLength(3);

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
});
