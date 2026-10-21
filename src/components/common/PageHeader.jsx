/**
 * Page title row with an optional subtitle and right-aligned tools.
 *
 * @param {object} props
 * @param {node} [props.children] - tools group (search, primary action...)
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.4px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}
