const VARIANTS = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  indigo: 'bg-indigo-bg text-indigo',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface text-muted',
};

/**
 * Status pill with a leading dot.
 *
 * @param {object} props
 * @param {'success'|'warning'|'indigo'|'danger'|'neutral'} [props.variant]
 */
export default function Pill({ variant = 'success', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-[11px] py-[3px] text-xs font-medium ${VARIANTS[variant]}`}
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-current opacity-80" aria-hidden="true" />
      {children}
    </span>
  );
}
