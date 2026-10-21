/**
 * Filter/segmented pill button.
 *
 * @param {object} props
 * @param {boolean} [props.active] - inverted (chipActiveBg) styling
 */
export default function Chip({ active = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-pill border px-[15px] py-[7px] text-xs font-medium transition-colors ${
        active
          ? 'border-chip-active bg-chip-active text-card'
          : 'border-line bg-card text-muted hover:border-ink/20 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
