import { useId } from 'react';

const FIELD =
  'w-full rounded-input border border-input-border bg-card px-3 py-2.5 text-[13px] text-ink focus:border-input-focus focus:outline-none focus:ring-4 focus:ring-brand/15';

/**
 * Labelled textarea.
 *
 * @param {object} props
 * @param {number} [props.rows]
 * @param {string} [props.label]
 * @param {string} [props.error]
 */
export default function Textarea({ label, error, rows = 3, id, className = '', ...rest }) {
  const generatedId = useId();
  const fieldId = id || generatedId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={`${FIELD} ${error ? 'border-danger' : ''}`}
        {...rest}
      />
      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
