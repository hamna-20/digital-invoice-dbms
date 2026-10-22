/**
 * Gradient summary card with a decorative translucent circle.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.value - already formatted
 * @param {string} [props.subLine]
 * @param {string} [props.gradient] - one of the bg-grad-stat-* classes
 */
export default function StatCard({ label, value, subLine, gradient = 'bg-grad-stat-sales', darkText = false }) {
  return (
    <div className={`relative overflow-hidden rounded-card px-[18px] pb-4 pt-[18px] text-white shadow-stat ${gradient}`}>
      <span
        className="absolute -right-[30px] -top-[30px] h-[110px] w-[110px] rounded-avatar bg-white/[0.12]"
        aria-hidden="true"
      />
      <div className={`relative ${darkText ? 'dark:text-[#352A31]' : ''}`}>
        <p className={`text-xs text-white/90 ${darkText ? 'dark:text-[#352A31]/80' : ''}`}>{label}</p>
        <p className="mt-1.5 text-[21px] font-semibold tracking-[-0.3px]">{value}</p>
        {subLine && <p className={`mt-0.5 text-xs text-white/[0.85] ${darkText ? 'dark:text-[#352A31]/80' : ''}`}>{subLine}</p>}
      </div>
    </div>
  );
}
