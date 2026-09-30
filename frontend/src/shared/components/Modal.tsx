import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  /** Impide cerrar mientras hay una operación en curso (p. ej. un cobro). */
  isDismissible?: boolean;
  children: ReactNode;
}

export function Modal({ title, description, onClose, isDismissible = true, children }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Enfoca el primer campo del formulario; si no hay, el primer botón (p. ej. "Cerrar").
    const dialog = dialogRef.current;
    const firstFocusable =
      dialog?.querySelector<HTMLElement>('input, select, textarea') ??
      dialog?.querySelector<HTMLElement>('button');
    firstFocusable?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDismissible) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDismissible, onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && isDismissible) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="modal__description">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            disabled={!isDismissible}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
