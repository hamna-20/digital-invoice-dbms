const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none';

const VARIANTS = {
  primary: 'rounded-md bg-slate-800 text-white hover:bg-slate-900',
  secondary:
    'rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'rounded-md bg-transparent text-slate-600 hover:bg-slate-100',
  danger:
    'rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-50',
};

const SIZES = {
  md: 'h-9 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  icon,
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
      {!loading && icon && (
        <span className="h-4 w-4 shrink-0 flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
