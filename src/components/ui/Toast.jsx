/**
 * Bottom-centred toast. Stays mounted so it can fade and slide in 200ms.
 *
 * @param {object} props
 * @param {boolean} props.visible
 */
export default function Toast({ message, visible }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-toast bg-ink px-5 py-[11px] text-[13px] font-medium text-page shadow-toast transition-all duration-200 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      {message}
    </div>
  );
}
