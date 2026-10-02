import { expect, type Page, test } from "@playwright/test";

// Live-site checks for the GitHub Pages deployment (see .github/workflows/deploy-pages.yml).
// EXPECTED_SHA is the commit the workflow just deployed; without it the SHA check is skipped.
const expectedSha = process.env.EXPECTED_SHA;
const heading = (page: Page) => page.getByRole("heading", { level: 1, name: "Nền tảng xe đạp" });

test.describe("deployed site under /game/", () => {
  test("is served from /game/", async ({ baseURL }) => {
    expect(new URL(baseURL ?? "").pathname).toBe("/game/");
  });

  test("serves the commit that was just deployed", async ({ request }) => {
    test.skip(!expectedSha, "EXPECTED_SHA not set");
    // Pages sits behind a CDN, so allow a short propagation window for the new version.
    await expect
      .poll(
        async () => {
          const res = await request.get(`deploy-info.json?cb=${Date.now()}`, {
            headers: { "cache-control": "no-cache" },
          });
          return res.ok() ? (await res.json()).sha : `HTTP ${res.status()}`;
        },
        { timeout: 120_000, intervals: [2_000, 5_000, 10_000] },
      )
      .toBe(expectedSha);
  });

  test("loads online with every request and asset under /game/", async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? "").origin;
    const sameOrigin: { url: string; status: number }[] = [];
    page.on("response", (res) => {
      if (new URL(res.url()).origin === origin) {
        sameOrigin.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto("./");
    await expect(heading(page)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();

    expect(sameOrigin.length).toBeGreaterThan(0);
    for (const { url, status } of sameOrigin) {
      expect(new URL(url).pathname.startsWith("/game/"), `${url} is under /game/`).toBe(true);
      expect(status, `${url} status`).toBeLessThan(400);
    }
    const paths = sameOrigin.map((r) => new URL(r.url).pathname);
    expect(paths.some((p) => /^\/game\/assets\/.+\.js$/.test(p))).toBe(true);
    expect(paths.some((p) => /^\/game\/assets\/.+\.css$/.test(p))).toBe(true);
  });

  test("serves a manifest and icons scoped to /game/", async ({ page, request }) => {
    await page.goto("./");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
    const manifestUrl = new URL(href ?? "", page.url()).toString();
    const response = await request.get(manifestUrl);
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.display).toBe("standalone");
    expect(new URL(manifest.start_url, manifestUrl).pathname).toBe("/game/");
    expect(new URL(manifest.scope, manifestUrl).pathname).toBe("/game/");
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      const res = await request.get(new URL(icon.src, manifestUrl).toString());
      expect(res.ok(), `${icon.src} should load`).toBe(true);
    }
  });

  test("registers a /game/ service worker that controls the page and precaches the shell", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(heading(page)).toBeVisible();

    const registration = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return { scope: reg.scope, script: reg.active?.scriptURL ?? null };
    });
    expect(new URL(registration.scope).pathname).toBe("/game/");
    expect(new URL(registration.script ?? "").pathname.startsWith("/game/")).toBe(true);

    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
      }
      return urls;
    });
    expect(cached.length).toBeGreaterThan(0);
    for (const url of cached) {
      expect(new URL(url).pathname.startsWith("/game/"), `${url} cached under /game/`).toBe(true);
    }
  });

  test("online load, then offline reload from the service worker", async ({ page, context }) => {
    await page.goto("./");
    await expect(heading(page)).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    try {
      // Prove offline is real: a request the service worker does not precache must fail.
      const reachable = await page.evaluate(async () => {
        try {
          await fetch(`deploy-info.json?offline=${Date.now()}`, { cache: "no-store" });
          return true;
        } catch {
          return false;
        }
      });
      expect(reachable).toBe(false);

      await page.reload();
      await expect(heading(page)).toBeVisible();
      await expect(page.getByText("Bản nguyên mẫu")).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
