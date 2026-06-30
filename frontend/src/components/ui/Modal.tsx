import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      className="m-auto w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-neutral-950/40"
      onClose={onClose}
      ref={dialogRef}
    >
      {title ? (
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
          <button
            className="text-neutral-400 hover:text-neutral-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
      ) : null}
      <div className="px-5 py-5">{children}</div>
    </dialog>
  );
}
