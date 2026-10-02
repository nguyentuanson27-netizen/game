import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// GitHub Pages serves project sites from /<repository>/. CI/deploy sets BASE_PATH;
// local dev and tests default to "/".
function resolveBase(raw: string | undefined): string {
  const trimmed = (raw ?? "/").trim();
  if (trimmed === "" || trimmed === "/") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig({
  base: resolveBase(process.env.BASE_PATH),
  plugins: [
    react(),
    VitePWA({
      // User-controlled updates: a new service worker waits until the player accepts it.
      registerType: "prompt",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Nền tảng xe đạp — bản nguyên mẫu",
        short_name: "Nguyên mẫu",
        description: "Bản nguyên mẫu trò chơi mô phỏng quyết định về nền tảng xe đạp.",
        lang: "vi",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f4f1ea",
        theme_color: "#1f3a3d",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        cleanupOutdatedCaches: true,
        // First install has no old version to disturb; later updates still wait for the prompt.
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/game/**/*.test.{ts,tsx}",
      "tests/content/**/*.test.ts",
    ],
    setupFiles: ["./tests/setup.ts"],
    alias: {
      "virtual:pwa-register/react": fileURLToPath(
        new URL("./tests/stubs/pwa-register-react.ts", import.meta.url),
      ),
    },
  },
});
