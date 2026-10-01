import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach } from "vitest";

// jsdom has no IndexedDB. The import above installs the in-memory implementation's globals; a
// fresh factory per test keeps saves from leaking between tests.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
