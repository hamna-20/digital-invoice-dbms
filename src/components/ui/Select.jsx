import { useId } from 'react';

const FIELD =
  'w-full rounded-input border border-input-border bg-card px-3 py-2.5 text-[13px] text-ink focus:border-input-focus focus:outline-none focus:ring-4 focus:ring-brand/15';

/** Native select popups follow the field radius where the browser allows it. */
const FIELD_STYLE = { borderRadius: '11px' };

/**
 * Labelled native select. Options are passed as children.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 */
export default function Select({ label, error, id, className = '', children, ...rest }) {
  const generatedId = useId();
  const fieldId = id || generatedId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={`${FIELD} ${error ? 'border-danger' : ''}`}
        style={FIELD_STYLE}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
