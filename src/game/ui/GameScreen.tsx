import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentPack } from "../content/loader.ts";
import type { AdvanceFailure } from "../domain/advanceWeek.ts";
import { reportLines } from "../domain/reportLines.ts";
import type {
  EventCheckpoint,
  ReportCheckpoint,
  SettlementCheckpoint,
} from "../persistence/checkpoint.ts";
import type { CheckpointStore } from "../persistence/store.ts";
import { EventCard } from "./EventCard.tsx";
import {
  bootstrap,
  choose,
  nextWeek,
  recover,
  resetCampaign,
  type SessionState,
  settle,
} from "./session.ts";
import { WeeklyReport } from "./WeeklyReport.tsx";

interface GameScreenProps {
  store: CheckpointStore;
  pack: ContentPack;
}

const NEXT_WEEK_REFUSALS: Record<AdvanceFailure, string> = {
  "no-content": "Tuần tiếp theo chưa có nội dung. Bản nguyên mẫu dừng ở báo cáo này.",
  "invalid-content":
    "Nội dung của tuần tiếp theo không hợp lệ nên chưa thể sang tuần mới. Bản nguyên mẫu dừng ở báo cáo này.",
  "pending-callbacks":
    "Vẫn còn hậu quả cần xử lý từ các quyết định trước, nên chưa thể kết thúc bản nguyên mẫu.",
  "overdue-callbacks":
    "Có một hậu quả từ quyết định trước đã quá hạn mà chưa được xử lý, nên chưa thể sang tuần mới. Bản nguyên mẫu dừng ở báo cáo này.",
};

type Screen = { kind: "loading" } | SessionState;
type ActionResult =
  | { ok: true; state: SessionState; feedback?: string }
  | { ok: false; error: string; message: string };

export function GameScreen({ store, pack }: GameScreenProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Feedback exists only after a successful commit; a tap that is repeated while one is being
  // saved is ignored (ref, not state, so two taps in the same frame cannot both pass).
  const [feedback, setFeedback] = useState<string | null>(null);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const choosing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    bootstrap(store, pack).then((next) => {
      if (!cancelled) setScreen(next);
    });
    return () => {
      cancelled = true;
    };
  }, [store, pack]);

  const run = useCallback(async (task: () => Promise<SessionState>) => {
    setBusy(true);
    try {
      setScreen(await task());
    } finally {
      setBusy(false);
      setConfirmingReset(false);
    }
  }, []);

  // Every progressing action (choice, settlement, Next Week) goes through here: one at a time
  // (ref, not state, so two taps in the same frame cannot both pass), and the next screen and any
  // feedback come only from a committed result.
  const commit = useCallback(
    async (task: () => Promise<ActionResult>, failure: string) => {
      if (choosing.current) return;
      choosing.current = true;
      setBusy(true);
      setChoiceError(null);
      try {
        const result = await task();
        if (result.ok) {
          setFeedback(result.feedback ?? null);
          setScreen(result.state);
        } else if (result.error === "stale") {
          setFeedback(null);
          setScreen({ kind: "save-error", error: "stale", message: result.message });
        } else if (result.error === "recovery-required" || result.error === "unsupported-save") {
          // The stored save changed under us (corrupt, or written by a newer version): stop
          // playing and show the blocking recovery/unsupported screen from what is really stored.
          setFeedback(null);
          setScreen(await bootstrap(store, pack));
        } else if (Object.hasOwn(NEXT_WEEK_REFUSALS, result.error)) {
          // Nothing failed to save: Next Week was refused on purpose and the report stays.
          setChoiceError(NEXT_WEEK_REFUSALS[result.error as AdvanceFailure]);
        } else {
          setChoiceError(failure);
        }
      } finally {
        choosing.current = false;
        setBusy(false);
      }
    },
    [store, pack],
  );

  const onChoose = (checkpoint: EventCheckpoint, optionId: string) =>
    commit(
      () => choose(store, pack, checkpoint, optionId),
      "Không lưu được lựa chọn. Chưa có thay đổi nào được ghi nhận; hãy chạm lại để thử.",
    );
  const onSettle = (checkpoint: SettlementCheckpoint) =>
    commit(
      () => settle(store, pack, checkpoint),
      "Không lưu được kết quả tuần. Chưa có thay đổi nào được ghi nhận; hãy chạm lại để thử.",
    );
  const onNextWeek = (checkpoint: ReportCheckpoint) =>
    commit(
      () => nextWeek(store, pack, checkpoint),
      "Không lưu được việc sang tuần mới. Chưa có thay đổi nào được ghi nhận; hãy chạm lại để thử.",
    );

  switch (screen.kind) {
    case "loading":
      return (
        <section className="card" aria-busy="true">
          <p>Đang tải tiến trình…</p>
        </section>
      );

    case "event": {
      const { checkpoint, presented } = screen;
      return (
        <>
          {feedback ? <Feedback text={feedback} /> : null}
          <EventCard
            // A new key per checkpoint so per-event UI state never leaks across events.
            key={`${checkpoint.sequence}:${checkpoint.activeEvent.eventId}`}
            week={checkpoint.week}
            slot={checkpoint.weekDecisions.length + 1}
            slotCount={pack.plan[checkpoint.week - 1]?.length ?? 0}
            presented={presented}
            busy={busy}
            error={choiceError}
            onChoose={(optionId) => void onChoose(checkpoint, optionId)}
          />
        </>
      );
    }

    case "settlement": {
      const { checkpoint } = screen;
      return (
        <>
          {feedback ? <Feedback text={feedback} /> : null}
          <section className="card" aria-labelledby="settlement-title" aria-busy={busy}>
            <h2 id="settlement-title" className="card__title">
              {checkpoint.weekDecisions.length === 0
                ? `Tuần ${checkpoint.week}`
                : `Tuần ${checkpoint.week}: đã xong các quyết định`}
            </h2>
            <p>
              {checkpoint.weekDecisions.length === 0
                ? "Tuần này chưa có tình huống cần quyết định. Hãy tổng kết để xem kết quả tuần."
                : "Mọi quyết định của tuần đã được lưu. Hãy tổng kết để xem kết quả tuần."}
            </p>
            <div className="notice__actions">
              <button
                type="button"
                className="button button--primary"
                disabled={busy}
                onClick={() => void onSettle(checkpoint)}
              >
                Tổng kết tuần
              </button>
            </div>
            {choiceError ? (
              <p role="alert" className="event__error">
                {choiceError}
              </p>
            ) : null}
          </section>
        </>
      );
    }

    case "report": {
      const { checkpoint } = screen;
      return (
        <WeeklyReport
          checkpoint={checkpoint}
          lines={reportLines(pack, checkpoint)}
          busy={busy}
          error={choiceError}
          onNextWeek={() => void onNextWeek(checkpoint)}
        />
      );
    }

    case "failed":
      return (
        <WeeklyReport
          checkpoint={screen.checkpoint}
          lines={reportLines(pack, screen.checkpoint)}
          failed
        />
      );

    case "complete":
      return (
        <section className="card" aria-labelledby="complete-title">
          <h2 id="complete-title" className="card__title">
            Prototype Complete
          </h2>
          <p>
            Bạn đã hoàn thành 12 tuần của bản nguyên mẫu. Tiền mặt cuối cùng:{" "}
            {screen.checkpoint.metrics.cash}. Bản nguyên mẫu dừng ở đây.
          </p>
        </section>
      );

    case "save-error": {
      const stale = screen.error === "stale";
      return (
        <section className="notice" role="alert">
          <p className="notice__text">
            {stale
              ? "Tiến trình đã thay đổi ở tab hoặc cửa sổ khác. Hãy tải lại bản mới nhất."
              : "Không lưu được tiến trình. Chưa có thay đổi nào được ghi nhận."}
          </p>
          <div className="notice__actions">
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => void run(() => bootstrap(store, pack))}
            >
              {stale ? "Tải lại" : "Thử lại"}
            </button>
          </div>
        </section>
      );
    }

    case "load-error":
      return (
        <section className="notice" role="alert">
          <p className="notice__text">
            Không đọc được bộ nhớ của trình duyệt. Tiến trình hiện có không bị thay đổi.
          </p>
          <div className="notice__actions">
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => void run(() => bootstrap(store, pack))}
            >
              Thử lại
            </button>
          </div>
        </section>
      );

    case "recover": {
      const { previous } = screen;
      return (
        <section className="notice" role="alert">
          <p className="notice__text">
            Không đọc được bản lưu hiện tại, nhưng còn bản lưu trước đó (tuần {previous.week}). Bạn
            có muốn khôi phục bản lưu trước đó không?
          </p>
          <div className="notice__actions">
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => void run(() => recover(store, pack, previous))}
            >
              Khôi phục bản lưu trước
            </button>
          </div>
        </section>
      );
    }

    case "unsupported":
      return (
        <section className="notice" role="alert">
          <p className="notice__text">
            Bản lưu này do một phiên bản mới hơn của ứng dụng tạo ra. Phiên bản này sẽ không mở hay
            ghi đè nó. Hãy cập nhật ứng dụng.
          </p>
        </section>
      );

    case "invalid-checkpoint":
      return (
        <section className="notice" role="alert">
          <p className="notice__text">
            Bản lưu không khớp với nội dung trò chơi hiện tại. Không có gì bị thay đổi hoặc xóa.
          </p>
        </section>
      );

    case "unusable":
      return (
        <section className="notice" role="alert">
          <p className="notice__text">
            Không đọc được bản lưu nào. Bạn có thể xóa và bắt đầu lại từ đầu.
          </p>
          <div className="notice__actions">
            {confirmingReset ? (
              <>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={busy}
                  onClick={() => void run(() => resetCampaign(store, pack))}
                >
                  Xác nhận xóa và bắt đầu lại
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => setConfirmingReset(false)}
                >
                  Hủy
                </button>
              </>
            ) : (
              <button type="button" className="button" onClick={() => setConfirmingReset(true)}>
                Xóa và bắt đầu lại
              </button>
            )}
          </div>
        </section>
      );
  }
}

function Feedback({ text }: { text: string }) {
  return (
    <p role="status" className="feedback">
      {text}
    </p>
  );
}
