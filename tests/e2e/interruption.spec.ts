import { expect, type Page, test } from "@playwright/test";
import { readSlot, type StoredCheckpoint } from "./helpers/checkpoint.ts";
import {
  arm,
  crash,
  type Interruption,
  waitUntilHeld,
  withInterruptions,
} from "./helpers/interruption.ts";

// AC-04 / AC-05 / AC-07 on the real browser persistence boundary (IndexedDB in Chromium and
// WebKit), not an in-memory substitute. Interruptions are injected inside the page:
//  - abort-before-commit: the transaction is aborted after its writes were issued, then the page
//    is closed; the browser must leave only the complete old checkpoint.
//  - hold-after-commit: the browser commits, the app is kept from learning of it, and the page is
//    closed before any feedback; the complete new checkpoint must survive and no feedback shows.

const EVENT_TITLE = "Chiếc xe hỏng sau ca mưa";
const FALLBACK_TITLE = "Ca làm cuối tuần chưa đủ người";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 2, name });
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name });
const options = (page: Page) => page.getByRole("group", { name: "Phương án" });
const feedback = (page: Page) => page.locator("p.feedback");
/** Feedback already on screen from an earlier, acknowledged action stays; only new text counts. */
const feedbackTexts = (page: Page) => feedback(page).allTextContents();

interface Slots {
  current: StoredCheckpoint | null;
  previous: StoredCheckpoint | null;
}
const slots = async (page: Page): Promise<Slots> => ({
  current: await readSlot(page, "current"),
  previous: await readSlot(page, "previous"),
});

async function playToSettlement(page: Page) {
  await button(page, /Lập quỹ hỗ trợ sửa xe/).click();
  await expect(heading(page, FALLBACK_TITLE)).toBeVisible();
  await button(page, /Thưởng nhẹ để có thêm người nhận ca tối/).click();
  await expect(button(page, "Tổng kết tuần")).toBeVisible();
}

interface Boundary {
  name: string;
  /** The very first save has no earlier state and is interrupted while the app boots. */
  atBoot?: boolean;
  prepare(page: Page): Promise<void>;
  trigger(page: Page): Promise<void>;
  /** The screen that shows the complete OLD state. */
  old(page: Page): Promise<void>;
  /** The screen that shows the complete NEW state. */
  next(page: Page): Promise<void>;
  /** Extra facts about the committed checkpoint. */
  committed(current: StoredCheckpoint): void;
}

const BOUNDARIES: Boundary[] = [
  {
    name: "first active-event save",
    atBoot: true,
    prepare: async () => {},
    trigger: async () => {},
    old: async (page) => {
      // Nothing was saved, so there is no old state: the app starts over with the same first event.
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
    },
    next: async (page) => {
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
      await expect(options(page).getByRole("button")).toHaveCount(3);
    },
    committed: (cp) => expect(cp).toMatchObject({ sequence: 1, parentSequence: null, week: 1 }),
  },
  {
    name: "ordinary choice save",
    prepare: async (page) => {
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
    },
    trigger: (page) => button(page, /Lập quỹ hỗ trợ sửa xe/).click(),
    old: (page) => expect(heading(page, EVENT_TITLE)).toBeVisible(),
    next: (page) => expect(heading(page, FALLBACK_TITLE)).toBeVisible(),
    committed: (cp) =>
      expect(cp).toMatchObject({
        metrics: { riderNetwork: 60 },
        recurringCosts: { "policy.rider_support_fund": 6 },
        weekDecisions: [{ slot: 1, optionId: "opt.rider_claim.fund_policy" }],
      }),
  },
  {
    name: "confirmed irreversible choice save (AC-07)",
    prepare: async (page) => {
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
    },
    trigger: async (page) => {
      await button(page, /Trả một lần để họ rút phản ánh/).click();
      await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
    },
    old: (page) => expect(heading(page, EVENT_TITLE)).toBeVisible(),
    next: (page) => expect(heading(page, FALLBACK_TITLE)).toBeVisible(),
    committed: (cp) =>
      expect(cp).toMatchObject({
        metrics: { cash: 42, riderNetwork: 45 },
        npcStatus: { "npc.recurring_rider": "departed" },
      }),
  },
  {
    name: "settlement save",
    prepare: async (page) => {
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
      await playToSettlement(page);
    },
    trigger: (page) => button(page, "Tổng kết tuần").click(),
    old: (page) => expect(button(page, "Tổng kết tuần")).toBeVisible(),
    next: (page) => expect(heading(page, "Báo cáo tuần 1")).toBeVisible(),
    committed: (cp) =>
      expect(cp).toMatchObject({ phase: "report", week: 1, metrics: { cash: 53 } }),
  },
  {
    name: "Next Week save",
    prepare: async (page) => {
      await expect(heading(page, EVENT_TITLE)).toBeVisible();
      await playToSettlement(page);
      await button(page, "Tổng kết tuần").click();
      await expect(heading(page, "Báo cáo tuần 1")).toBeVisible();
    },
    trigger: (page) => button(page, "Tuần tiếp theo").click(),
    old: async (page) => {
      await expect(heading(page, "Báo cáo tuần 1")).toBeVisible();
      await expect(button(page, "Tuần tiếp theo")).toBeVisible();
    },
    next: (page) => expect(heading(page, "Tuần 2")).toBeVisible(),
    committed: (cp) =>
      expect(cp).toMatchObject({ week: 2, phase: "settlement", metrics: { cash: 53 } }),
  },
];

const MODES: Interruption[] = ["abort-before-commit", "hold-after-commit"];

test.describe("interrupting the real persistence boundary (AC-04, AC-05, AC-07)", () => {
  for (const boundary of BOUNDARIES) {
    for (const mode of MODES) {
      test(`${boundary.name}: ${mode}`, async ({ context }) => {
        const page = await context.newPage();
        await withInterruptions(page, boundary.atBoot ? mode : null);
        await page.goto("./");
        await boundary.prepare(page);
        const before: Slots | null = boundary.atBoot ? null : await slots(page);

        const feedbackBefore = boundary.atBoot ? [] : await feedbackTexts(page);
        if (!boundary.atBoot) await arm(page, mode);
        await boundary.trigger(page);

        if (mode === "abort-before-commit") {
          // The app is told the save failed; nothing was recorded, no feedback shows.
          await expect(page.getByRole("alert")).toBeVisible();
          expect(await feedbackTexts(page)).toEqual(feedbackBefore);
          if (before) expect(await slots(page)).toEqual(before);
        } else {
          // The browser committed, the app does not know yet: no feedback, no next screen...
          await waitUntilHeld(page);
          expect(await feedbackTexts(page)).toEqual(feedbackBefore);
          // ...yet the complete new checkpoint is already durable.
          const during = await slots(page);
          expect(during.current).not.toBeNull();
          if (before) {
            expect(during.current?.sequence).toBe((before.current?.sequence ?? 0) + 1);
            expect(during.previous).toEqual(before.current);
          }
        }
        const committedWhileOpen = mode === "hold-after-commit" ? await slots(page) : null;

        // The page dies here: before the commit (abort) or before any feedback (hold).
        await crash(page);
        const reopened = await context.newPage();
        await reopened.goto("./");

        if (mode === "hold-after-commit") {
          await boundary.next(reopened);
          await expect(feedback(reopened)).toHaveCount(0);
          expect(await slots(reopened)).toEqual(committedWhileOpen);
          if (committedWhileOpen?.current) boundary.committed(committedWhileOpen.current);
          return;
        }

        // Aborted: exactly the old complete state, with no alert and nothing half-written.
        await boundary.old(reopened);
        await expect(reopened.getByRole("alert")).toHaveCount(0);
        if (before) expect(await slots(reopened)).toEqual(before);

        // And the action then lands exactly once.
        if (!boundary.atBoot) {
          await boundary.trigger(reopened);
          await boundary.next(reopened);
        }
        const after = await slots(reopened);
        if (after.current) boundary.committed(after.current);
        if (before?.current) {
          expect(after.current?.sequence).toBe(before.current.sequence + 1);
          expect(after.previous).toEqual(before.current);
        }
      });
    }
  }
});
