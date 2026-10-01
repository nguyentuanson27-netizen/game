import { expect, test } from "@playwright/test";

test.describe("prototype shell", () => {
  test("launches as a labelled prototype in the portrait viewport", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByRole("heading", { level: 1, name: "Nền tảng xe đạp" })).toBeVisible();
    await expect(page.getByText("Bản nguyên mẫu")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("does not overflow horizontally at 390x844", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByRole("main")).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });

  test("serves a valid web manifest from the repository sub-path", async ({ page, request }) => {
    await page.goto("./");

    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
    const manifestUrl = new URL(href ?? "", page.url()).toString();
    const response = await request.get(manifestUrl);
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.orientation).toBe("portrait");
    expect(new URL(manifest.start_url, manifestUrl).pathname).toBe("/game/");
    expect(new URL(manifest.scope, manifestUrl).pathname).toBe("/game/");
    for (const icon of manifest.icons) {
      const res = await request.get(new URL(icon.src, manifestUrl).toString());
      expect(res.ok(), `${icon.src} should load`).toBe(true);
    }
  });

  test("opens the app shell offline once the service worker is ready", async ({
    page,
    context,
  }) => {
    await page.goto("./");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Wait until the page is controlled so the reload below is served by the service worker.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { level: 1, name: "Nền tảng xe đạp" })).toBeVisible();
    await expect(page.getByText("Bản nguyên mẫu")).toBeVisible();
  });
});
