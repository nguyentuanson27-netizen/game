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

/**
 * Seed the week-12 report from the stored week-1 report (same company state, so its settlement
 * result stays exactly what D4 produces), as a normal checkpoint write that rotates the old
 * current into `previous`. The shipped proof loop authors no decisions after week 1, so a real
 * run cannot reach week 12; this exercises the `report -> Prototype Complete` boundary only.
 * Reload the page afterwards so the app resumes from it.
 */
export function seedWeekTwelveReport(
  page: Page,
  { keepPendingCallbacks = false }: { keepPendingCallbacks?: boolean } = {},
): Promise<void> {
  return page.evaluate(
    ({ dbName, keep }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("checkpoints", "readwrite");
          const store = tx.objectStore("checkpoints");
          const get = store.get("current");
          get.onsuccess = () => {
            const current = get.result;
            if (current?.phase !== "report") {
              tx.abort();
              reject(new Error("seeding needs a settled report"));
              return;
            }
            store.put(current, "previous");
            store.put(
              {
                ...current,
                sequence: current.sequence + 1,
                parentSequence: current.sequence,
                week: 12,
                weekDecisions: [],
                // Closing the prototype needs every required callback resolved; seed that state
                // unless a test wants the unresolved one.
                pendingCallbacks: keep ? current.pendingCallbacks : [],
                settlement: { ...current.settlement, week: 12 },
              },
              "current",
            );
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error ?? new Error("seed aborted"));
        };
      }),
    { dbName: "bicycle-platform-prototype", keep: keepPendingCallbacks },
  );
}
