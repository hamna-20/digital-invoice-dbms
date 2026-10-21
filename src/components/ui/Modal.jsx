import { useEffect } from 'react';

/**
 * Centred dialog on a blurred overlay. Closes on overlay click or Escape.
 * The overlay is a real button so it is keyboard accessible.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {string} [props.title]
 * @param {'sm'|'md'} [props.size] - sm is used for confirm dialogs
 * @param {node} [props.footer] - right-aligned actions
 */
export default function Modal({ open, onClose, title, size = 'md', footer, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-20 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-overlay backdrop-blur-[4px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal-panel relative w-full overflow-y-auto overscroll-contain rounded-modal bg-card p-6 shadow-modal ${
          size === 'sm' ? 'max-w-[420px]' : 'max-w-[720px]'
        }`}
        style={{ maxHeight: 'calc(100vh - 32px)' }}
      >
        <div className="mb-[18px] flex items-center justify-between gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-avatar bg-surface text-[14px] text-muted transition-colors hover:bg-line hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}
