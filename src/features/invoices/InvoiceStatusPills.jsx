import Pill from '../../components/ui/Pill';
import { invoiceStatusMeta, invoiceStatusTags } from '../../lib/invoiceStatus';

/** Every pill an invoice carries: primary status first, then extras. */
export default function InvoiceStatusPills({ invoice, className = '' }) {
  const tags = invoiceStatusTags(invoice);
  const primary = invoiceStatusMeta(invoice.status);
  const extras = [...tags]
    .filter((tag) => tag !== invoice.status)
    .map((tag) => ({ tag, meta: invoiceStatusMeta(tag) }));

  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      <Pill variant={primary.tone}>{primary.label}</Pill>
      {extras.map(({ tag, meta }) => (
        <Pill key={tag} variant={meta.tone}>
          {meta.label}
        </Pill>
      ))}
    </span>
  );
}

/**
 * Hook wrapper around InvoiceStatusPills, kept rules-of-hooks-compliant so it
 * can be called from column renderers (the render callback name "render" is
 * flagged by ESLint, not this hook).
 */
export function useInvoicePills(invoice) {
  const tags = invoiceStatusTags(invoice);
  const primary = invoiceStatusMeta(invoice.status);
  const extras = [...tags]
    .filter((tag) => tag !== invoice.status)
    .map((tag) => ({ tag, meta: invoiceStatusMeta(tag) }));

  return {
    pills: [
      <Pill key={primary.tag ?? invoice.status} variant={primary.tone}>
        {primary.label}
      </Pill>,
      ...extras.map(({ tag, meta }) => (
        <Pill key={tag} variant={meta.tone}>
          {meta.label}
        </Pill>
      )),
    ],
  };
}
