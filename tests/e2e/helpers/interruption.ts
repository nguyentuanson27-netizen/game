import type { BrowserContext, Page } from "@playwright/test";

export type Interruption =
  /** Abort the checkpoint transaction after its writes were issued but before it commits. */
  | "abort-before-commit"
  /** Let the transaction commit, but hold the completion event back from the app. */
  | "hold-after-commit";

declare global {
  interface Window {
    __interrupt: { mode: Interruption | null; held: Array<() => void>; heldCount: number };
  }
}

/**
 * Installed before the app loads. It wraps two real IndexedDB entry points of the page:
 * - `put` of the `current` checkpoint can abort its own transaction (so the browser rolls the
 *   whole transaction back, exactly as when a page dies before the commit);
 * - the `complete` event of a read-write transaction can be held back from the app's listener.
 *   The browser has already committed by then, so the data is durable while the app has not yet
 *   been told: closing the page at that moment is "closure before feedback".
 * Nothing runs unless `window.__interrupt.mode` is armed.
 */
function installInterruptions(initialMode: Interruption | null) {
  window.__interrupt = { mode: initialMode, held: [], heldCount: 0 };

  const realPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args) {
    const request = realPut.apply(this, args);
    if (window.__interrupt.mode === "abort-before-commit" && args[1] === "current") {
      window.__interrupt.mode = null;
      this.transaction.abort();
    }
    return request;
  };

  const realAdd = IDBTransaction.prototype.addEventListener;
  IDBTransaction.prototype.addEventListener = function (
    this: IDBTransaction,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (type !== "complete" || typeof listener !== "function") {
      return realAdd.call(this, type, listener, options);
    }
    const wrapped = (event: Event) => {
      if (window.__interrupt.mode === "hold-after-commit" && this.mode === "readwrite") {
        window.__interrupt.mode = null;
        window.__interrupt.heldCount += 1;
        window.__interrupt.held.push(() => listener.call(this, event));
        return;
      }
      listener.call(this, event);
    };
    return realAdd.call(this, type, wrapped, options);
  } as typeof IDBTransaction.prototype.addEventListener;
}

/** Arm interruptions for one page only (a new page in the same context is unaffected). */
export function withInterruptions(page: Page, initialMode: Interruption | null = null) {
  return page.addInitScript(installInterruptions, initialMode);
}

export const arm = (page: Page, mode: Interruption) =>
  page.evaluate((m) => {
    window.__interrupt.mode = m;
  }, mode);

/** Wait until a commit reached the browser's storage while the app was kept in the dark. */
export const waitUntilHeld = (page: Page) =>
  page.waitForFunction(() => window.__interrupt.heldCount > 0);

/** Close like a crash: no `beforeunload`, no chance to run pending app code. */
export async function crash(page: Page) {
  await page.close({ runBeforeUnload: false });
}

export type { BrowserContext };
