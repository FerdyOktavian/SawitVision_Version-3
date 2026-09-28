import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";
import IconButton from "./IconButton";

function Modal({ open, onClose, title, eyebrow, children, role = "dialog", className = "", closeOnBackdrop = true }) {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const modal = modalRef.current;
    const focusableSelector = "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex='-1'])";
    const initialTarget = modal?.querySelector("[data-autofocus]") || modal?.querySelector(focusableSelector) || modal;
    initialTarget?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !modal) return;
      const focusable = [...modal.querySelectorAll(focusableSelector)];
      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        ref={modalRef}
        className={`ui-modal ${className}`.trim()}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="ui-modal__header">
          <div>
            {eyebrow && <p>{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <IconButton type="button" onClick={onClose} aria-label="Tutup dialog">
            <Icon name="close" />
          </IconButton>
        </header>
        <div className="ui-modal__content">{children}</div>
      </section>
    </div>
  );
}

export default Modal;
