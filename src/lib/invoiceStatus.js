import { INVOICE_STATUS, INVOICE_STATUS_META } from '../config/constants';

/**
 * The API stores the money state and derives "overdue" at read time. These are
 * the only translations the UI needs; everything else passes through.
 */
export const API_STATUS_MAP = {
  draft: 'draft',
  issued: 'pending',
  partially_paid: 'partially_paid',
  paid: 'paid',
  overdue: 'overdue',
  void: 'cancelled',
  cancelled: 'cancelled',
};

/** Extra, document-level tags shown next to the financial status. */
export const INVOICE_DOC_TAG = {
  RETURN: 'return',
  CREDIT: 'credit',
};

export const INVOICE_DOC_TAG_META = {
  return: { label: 'Return', tone: 'indigo' },
  credit: { label: 'Credit', tone: 'success' },
};

export const INVOICE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: INVOICE_STATUS.DRAFT, label: 'Draft' },
  { value: INVOICE_STATUS.PENDING, label: 'Pending' },
  { value: INVOICE_STATUS.PARTIALLY_PAID, label: 'Partially paid' },
  { value: INVOICE_STATUS.OVERDUE, label: 'Overdue' },
  { value: INVOICE_STATUS.PAID, label: 'Paid' },
  { value: INVOICE_DOC_TAG.RETURN, label: 'Return' },
  { value: INVOICE_DOC_TAG.CREDIT, label: 'Credit' },
  { value: INVOICE_STATUS.CANCELLED, label: 'Cancelled' },
];

export function normalizeInvoiceStatus(status) {
  return API_STATUS_MAP[status] || status;
}

/**
 * The status history keeps the backend's own wording ("Issued", not the list's
 * "Pending"), because each row describes the state at that moment.
 */
const INVOICE_HISTORY_STATUS_META = {
  draft: INVOICE_STATUS_META.draft,
  issued: { label: 'Issued', tone: 'warning' },
  partially_paid: INVOICE_STATUS_META.partially_paid,
  paid: INVOICE_STATUS_META.paid,
  void: INVOICE_STATUS_META.cancelled,
  cancelled: INVOICE_STATUS_META.cancelled,
};

export function invoiceHistoryStatusMeta(status) {
  return INVOICE_HISTORY_STATUS_META[status] || invoiceStatusMeta(status);
}

export function invoiceStatusMeta(status) {
  const normalized = normalizeInvoiceStatus(status);
  return (
    INVOICE_STATUS_META[normalized] ||
    INVOICE_DOC_TAG_META[normalized] || {
      label: String(status || 'Unknown').replaceAll('_', ' '),
      tone: 'neutral',
    }
  );
}

/**
 * An invoice can be in more than one state at once. The backend supplies the
 * financial tags (e.g. overdue + partially paid); this adds the document tags
 * the invoice list filters on.
 *
 * A return is shown while it is pending or approved. A rejected/cancelled
 * return is still stored in history, but it no longer changes the invoice.
 */
export function invoiceStatusTags(invoice) {
  const tags = new Set(
    invoice.statuses?.length ? invoice.statuses.map(normalizeInvoiceStatus) : [normalizeInvoiceStatus(invoice.status)]
  );

  const returns = invoice.returns || [];
  if (returns.some((record) => record.status === 'draft' || record.status === 'approved')) {
    tags.add(INVOICE_DOC_TAG.RETURN);
  }

  const creditsApplied = Number(invoice.financialSummary?.creditsApplied) || 0;
  if ((invoice.creditNotes || []).length > 0 || creditsApplied > 0) {
    tags.add(INVOICE_DOC_TAG.CREDIT);
  }

  return tags;
}

export function invoiceHasStatus(invoice, value) {
  if (value === 'all') return true;
  return invoiceStatusTags(invoice).has(value);
}
