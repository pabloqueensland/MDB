import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  description?: string;
  eyebrow?: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, description, eyebrow, busy = false, onClose, children }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();

    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} className="school-modal" aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          onClose();
        }
      }}>
      <div className="modal-heading">
        <span className="section-number">{eyebrow}</span>
        <button className="modal-close" aria-label={`Close ${title.toLowerCase()}`} disabled={busy} onClick={onClose}>×</button>
      </div>
      <h2 id={titleId}>{title}</h2>
      {description && <p className="intro" id={descriptionId}>{description}</p>}
      {children}
    </dialog>
  );
}
