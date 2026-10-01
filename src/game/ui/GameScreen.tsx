import { useCallback, useEffect, useState } from "react";
import type { ContentPack } from "../content/loader.ts";
import type { CheckpointStore } from "../persistence/store.ts";
import { EventCard } from "./EventCard.tsx";
import { bootstrap, recover, resetCampaign, type SessionState } from "./session.ts";

interface GameScreenProps {
  store: CheckpointStore;
  pack: ContentPack;
}

type Screen = { kind: "loading" } | SessionState;

export function GameScreen({ store, pack }: GameScreenProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

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
        <EventCard
          // A new key per checkpoint so per-event UI state never leaks across events.
          key={`${checkpoint.sequence}:${checkpoint.activeEvent.eventId}`}
          week={checkpoint.week}
          slot={checkpoint.weekDecisions.length + 1}
          slotCount={pack.plan[checkpoint.week - 1]?.length ?? 0}
          presented={presented}
        />
      );
    }

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
