import type { Locator } from "@playwright/test";

/**
 * Activate an element twice within one task, before the page can re-render. Playwright's
 * `dblclick()` sends the two clicks as separate protocol steps, so on a fast engine the first
 * click's commit can swap the screen and the second click would hit a different control.
 */
export function activateTwice(locator: Locator): Promise<void> {
  return locator.evaluate((element) => {
    (element as HTMLElement).click();
    (element as HTMLElement).click();
  });
}
