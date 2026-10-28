import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Centred dialog on a blurred overlay. Closes on overlay click or Escape.
 * The overlay is a real button so it is keyboard accessible.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {string} [props.title]
 * @param {'sm'|'md'|'lg'} [props.size] - sm is used for confirm dialogs
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

  return createPortal(
    <div className="modal-overlay fixed inset-0 z-20 flex items-center justify-center overflow-y-auto p-4 max-[600px]:items-start max-[600px]:p-2">
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
        className={`modal-panel relative my-auto flex w-full min-w-0 flex-col overflow-hidden rounded-modal bg-card p-6 shadow-modal max-[600px]:rounded-[16px] max-[600px]:p-4 ${
          size === 'sm' ? 'max-w-[420px]' : size === 'lg' ? 'max-w-[1200px]' : 'max-w-[720px]'
        }`}
      >
        <div className="mb-[18px] flex shrink-0 items-center justify-between gap-2.5 max-[600px]:mb-4">
          <h2 className="min-w-0 break-words text-[19px] font-semibold tracking-tight max-[600px]:text-[17px]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-avatar bg-surface text-[14px] text-muted transition-colors hover:bg-line hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer && (
          <div className="mt-5 flex shrink-0 flex-wrap justify-end gap-2.5 max-[480px]:grid max-[480px]:grid-cols-2 max-[480px]:gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
