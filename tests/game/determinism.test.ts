import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// "Time away from the app does not advance in-game weeks" (SPEC section 3) and "never reroll":
// the game has no clock and no randomness at all. If any appears, a week could change with the
// wall clock or an event could differ between opens, so this guard fails and forces a decision.

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const FORBIDDEN: Array<[string, RegExp]> = [
  ["Date", /\bDate\b/],
  ["performance.now", /\bperformance\s*\.\s*now\b/],
  ["setTimeout", /\bsetTimeout\b/],
  ["setInterval", /\bsetInterval\b/],
  ["requestAnimationFrame", /\brequestAnimationFrame\b/],
  ["Math.random", /\bMath\s*\.\s*random\b/],
  ["crypto.getRandomValues", /\bgetRandomValues\b/],
];

describe("the game has no clock or randomness (AC-04)", () => {
  const files = sources("src/game");

  it("scans the game sources", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const [name, pattern] of FORBIDDEN) {
    it(`does not use ${name}`, () => {
      const offenders = files.filter((file) => pattern.test(readFileSync(file, "utf8")));
      expect(offenders).toEqual([]);
    });
  }
});
