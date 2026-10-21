const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70';

const VARIANTS = {
  primary:
    'bg-grad-brand text-white shadow-primary hover:-translate-y-px hover:shadow-primary-hover active:translate-y-0',
  ghost: 'border border-line bg-card text-ink shadow-card hover:bg-surface',
  danger: 'bg-danger text-white shadow-danger',
  'link-danger': 'border border-danger-border bg-card text-danger hover:bg-danger-hover-bg',
};

const SIZES = {
  md: 'rounded-btn px-[18px] py-2.5 text-[13px]',
  sm: 'rounded-btn-sm px-[11px] py-1.5 text-xs',
};

/**
 * @param {object} props
 * @param {'primary'|'ghost'|'danger'|'link-danger'} [props.variant]
 * @param {'md'|'sm'} [props.size]
 * @param {boolean} [props.loading] - disables the button and shows a spinner
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
