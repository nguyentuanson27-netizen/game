import type { Page } from "@playwright/test";

export interface StoredCheckpoint {
  sequence: number;
  parentSequence: number | null;
  week: number;
  phase: string;
  activeEvent: { eventId: string; optionIds: string[] } | null;
  metrics: { riderNetwork: number; cash: number };
  policies: string[];
  recurringCosts: Record<string, number>;
  npcStatus: Record<string, string>;
  memories: string[];
  pendingCallbacks: { callbackId: string }[];
  weekDecisions: { slot: number; optionId: string }[];
}

/** Read a committed slot straight from IndexedDB, bypassing the app. */
export function readSlot(
  page: Page,
  key: "current" | "previous",
): Promise<StoredCheckpoint | null> {
  return page.evaluate(
    ({ dbName, slot }) =>
      new Promise<StoredCheckpoint | null>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        // Peeking must never create the app's database: if it does not exist, abort the upgrade.
        open.onupgradeneeded = () => open.transaction?.abort();
        open.onerror = () => resolve(null);
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

export const readCurrent = (page: Page) => readSlot(page, "current");
