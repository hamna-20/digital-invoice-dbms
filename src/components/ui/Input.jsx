import { useId } from 'react';

const FIELD =
  'w-full rounded-input border bg-card px-3 py-2.5 text-[13px] text-ink placeholder:text-muted focus:outline-none focus:ring-4 focus:ring-brand/15';

/**
 * Labelled text input with optional hint, error and trailing control (e.g. eye toggle).
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error] - shown under the field and marks it invalid
 * @param {string} [props.hint]
 * @param {node} [props.trailing]
 */
export default function Input({ label, error, hint, trailing, id, className = '', ...rest }) {
  const generatedId = useId();
  const fieldId = id || generatedId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={`${FIELD} ${error ? 'border-danger' : 'border-input-border focus:border-input-focus'} ${
            trailing ? 'pr-11' : ''
          }`}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>}
      </div>
      {hint && !error && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
