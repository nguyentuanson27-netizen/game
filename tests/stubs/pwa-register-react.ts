// Vitest stand-in for the vite-plugin-pwa virtual module: no service worker in unit tests.
const noop = () => {};

export function useRegisterSW() {
  return {
    offlineReady: [false, noop] as [boolean, (value: boolean) => void],
    needRefresh: [false, noop] as [boolean, (value: boolean) => void],
    updateServiceWorker: async () => {},
  };
}
