import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentPack } from "../content/loader.ts";
import type { EventCheckpoint } from "../persistence/checkpoint.ts";
import type { CheckpointStore } from "../persistence/store.ts";
import { EventCard } from "./EventCard.tsx";
import { bootstrap, choose, recover, resetCampaign, type SessionState } from "./session.ts";

interface GameScreenProps {
  store: CheckpointStore;
  pack: ContentPack;
}

type Screen = { kind: "loading" } | SessionState;

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

  const onChoose = useCallback(
    async (checkpoint: EventCheckpoint, optionId: string) => {
      if (choosing.current) return;
      choosing.current = true;
      setBusy(true);
      setChoiceError(null);
      try {
        const result = await choose(store, pack, checkpoint, optionId);
        if (result.ok) {
          setFeedback(result.feedback);
          setScreen(result.state);
        } else if (result.error === "stale") {
          setFeedback(null);
          setScreen({ kind: "save-error", error: "stale", message: result.message });
        } else {
          setChoiceError(
            "Không lưu được lựa chọn. Chưa có thay đổi nào được ghi nhận; hãy chạm lại để thử.",
          );
        }
      } finally {
        choosing.current = false;
        setBusy(false);
      }
    },
    [store, pack],
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

    case "settlement":
      return (
        <>
          {feedback ? <Feedback text={feedback} /> : null}
          <section className="card" aria-labelledby="settlement-title">
            <h2 id="settlement-title" className="card__title">
              Tuần {screen.checkpoint.week}: đã xong các quyết định
            </h2>
            <p>Mọi quyết định của tuần đã được lưu. Phần tổng kết tuần sẽ có ở bước sau.</p>
          </section>
        </>
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
