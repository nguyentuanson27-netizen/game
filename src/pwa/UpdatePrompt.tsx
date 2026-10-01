export interface UpdatePromptProps {
  offlineReady: boolean;
  needRefresh: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

/** Presentational notice; the update is applied only when the player taps "Cập nhật". */
export function UpdatePrompt({
  offlineReady,
  needRefresh,
  onUpdate,
  onDismiss,
}: UpdatePromptProps) {
  if (!needRefresh && !offlineReady) return null;

  return (
    <section className="notice" role="status" aria-live="polite">
      <p className="notice__text">
        {needRefresh
          ? "Đã có phiên bản mới. Cập nhật khi bạn sẵn sàng; ứng dụng sẽ không tự tải lại."
          : "Ứng dụng đã sẵn sàng để mở khi không có mạng."}
      </p>
      <div className="notice__actions">
        {needRefresh ? (
          <button type="button" className="button button--primary" onClick={onUpdate}>
            Cập nhật
          </button>
        ) : null}
        <button type="button" className="button" onClick={onDismiss}>
          {needRefresh ? "Để sau" : "Đóng"}
        </button>
      </div>
    </section>
  );
}
