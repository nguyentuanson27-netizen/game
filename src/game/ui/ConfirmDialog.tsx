import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  /** The action being confirmed, in the player's words. */
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for a major irreversible option (SPEC section 24). Native modal `<dialog>`:
 * focus moves into it, Escape cancels, and focus returns to the opener. Cancelling is only a UI
 * event; it never touches game state. Focus starts on "Hủy" so a stray tap cannot confirm.
 */
export function ConfirmDialog({ action, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Feature-detected so environments without modal <dialog> still show it as an open dialog.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    cancelRef.current?.focus();
    return () => {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-text"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h3 id="confirm-title" className="card__title">
        Xác nhận quyết định
      </h3>
      <p id="confirm-text" className="confirm__text">
        “{action}” là quyết định lớn và không thể hoàn tác. Bạn có chắc chắn không?
      </p>
      <div className="notice__actions">
        <button ref={cancelRef} type="button" className="button" onClick={onCancel}>
          Hủy
        </button>
        <button type="button" className="button button--primary" onClick={onConfirm}>
          Xác nhận
        </button>
      </div>
    </dialog>
  );
}
