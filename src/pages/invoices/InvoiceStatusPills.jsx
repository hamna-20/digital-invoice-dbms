import Pill from '../../components/ui/Pill';
import { invoiceStatusMeta, invoiceStatusTags, primaryInvoiceStatusForDisplay } from '../../lib/invoiceStatus';

/** Every pill an invoice carries: primary status first, then extras. */
export default function InvoiceStatusPills({ invoice, className = '' }) {
  const primary = primaryInvoiceStatusForDisplay(invoice);
  const tagList = invoiceStatusTags(invoice);
  const extras = [...tagList]
    .filter((tag) => tag !== primary.status)
    .map((tag) => ({ tag, meta: invoiceStatusMeta(tag) }));

  const pills = [<Pill key={primary.status} variant={primary.tone}>{primary.label}</Pill>];
  for (const { tag, meta } of extras) {
    pills.push(<Pill key={tag} variant={meta.tone}>{meta.label}</Pill>);
  }

  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {pills}
    </span>
  );
}

export function useInvoiceStatusDisplay(invoice) {
  const primary = primaryInvoiceStatusForDisplay(invoice);
  return {
    primary,
    isFullyReturned: primary.status === 'returned',
  };
}

/**
 * Hook wrapper mirroring `useInvoicePills` from the feature folder so the
 * shared page import surface is rules-of-hooks-compliant.
 */
export function useInvoicePills(invoice) {
  const primary = primaryInvoiceStatusForDisplay(invoice);
  const tagList = invoiceStatusTags(invoice);
  const extras = [...tagList]
    .filter((tag) => tag !== primary.status)
    .map((tag) => ({ tag, meta: invoiceStatusMeta(tag) }));

  return {
    primary,
    isFullyReturned: primary.status === 'returned',
    pills: [
      <Pill key={primary.status} variant={primary.tone}>
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

