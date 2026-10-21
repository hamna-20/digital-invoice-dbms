/**
 * Bordered surface used for every panel.
 *
 * @param {object} props
 * @param {string} [props.title] - renders a header when present
 * @param {node} [props.actions] - right side of the header
 * @param {string} [props.bodyClassName] - override the body padding (e.g. "p-0" for tables)
 */
export default function Card({ title, actions, children, className = '', bodyClassName = 'px-5 py-[18px]' }) {
  return (
    <section className={`mb-[18px] overflow-hidden rounded-card border border-line bg-card shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2.5 border-b border-line px-5 py-4">
          {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
