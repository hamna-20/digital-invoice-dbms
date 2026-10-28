import { requestApi } from './apiClient';

/**
 * Reports API client.
 *
 * The backend calculates all totals; these helpers only map the response to
 * the row shapes the existing Reports page/table already uses.
 */

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

/**
 * The Reports screen has no pagination UI, so load every page (up to the API
 * maximum) to keep its totals identical to the previous client-side view.
 * The cap prevents an unbounded loop if the backend ever reports bad metadata.
 */
async function fetchAllPages(path, params, extract) {
  const rows = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await requestApi(
      `${path}${buildQuery({ ...params, page, limit: PAGE_LIMIT })}`
    );
    rows.push(...extract(data));
    totalPages = Math.max(1, Number(data.pagination?.totalPages) || 1);
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);

  return rows;
}

/** Newest day first, matching the previous client-side report order. */
export async function getDailySales(params) {
  const data = await requestApi(`/reports/daily-sales${buildQuery(params)}`);
  return (data.days || [])
    .map((row) => ({
      date: row.date,
      invoiceCount: row.invoiceCount,
      taxable: row.salesSubtotal,
      tax: row.taxTotal,
      total: row.totalSales,
    }))
    .reverse();
}

/** Accepts the API's monthKey, or rebuilds it from year/month if absent. */
function monthlyKey(row) {
  if (typeof row.monthKey === 'string' && row.monthKey.length >= 7) return row.monthKey;
  if (Number.isInteger(row.year) && Number.isInteger(row.month) && row.month >= 1 && row.month <= 12) {
    return `${row.year}-${String(row.month).padStart(2, '0')}`;
  }
  return null;
}

/** Newest month first, matching the previous client-side report order. */
export async function getMonthlySales(params) {
  const data = await requestApi(`/reports/monthly-sales${buildQuery(params)}`);
  return (data.months || [])
    .map((row) => ({
      month: monthlyKey(row),
      invoiceCount: row.invoiceCount,
      taxable: row.salesSubtotal,
      tax: row.taxTotal,
      total: row.totalSales,
    }))
    .filter((row) => row.month)
    .reverse();
}

export async function getTaxReport(params) {
  const data = await requestApi(`/reports/tax${buildQuery(params)}`);
  return (data.rates || []).map((row) => ({
    rate: row.taxRate,
    taxable: row.taxableSales,
    tax: Number(row.taxRecorded) || 0,
    // Tax attributable to payments received so far. Credit-applied amounts are
    // intentionally left out, matching the backend's definition.
    collected: Number(row.taxCollected) || 0,
  }));
}

export async function getCustomerReport(params = {}) {
  const rows = await fetchAllPages('/reports/customers', params, (data) => data.customers || []);
  return rows.map((row) => ({
    customerId: row.customerId,
    name: row.name,
    invoiceCount: row.invoiceCount,
    taxable: row.salesSubtotal,
    tax: row.taxTotal,
    total: row.totalInvoiced,
    paid: row.paidAmount,
    outstanding: row.outstandingAmount,
    overdue: row.overdueAmount,
  }));
}

export async function getProductReport(params = {}) {
  const rows = await fetchAllPages('/reports/products', params, (data) => data.products || []);
  return rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    qty: row.quantitySold,
    invoiceCount: row.invoiceCount,
    revenue: row.salesSubtotal,
    tax: row.taxAmount,
    total: row.salesTotal,
  }));
}

export async function getInvoiceHistory(params = {}) {
  const rows = await fetchAllPages('/reports/invoice-history', params, (data) => data.invoices || []);
  return rows.map((row) => ({
    invoiceId: row.id,
    id: row.invoiceNumber,
    number: row.invoiceNumber,
    date: row.invoiceDate,
    dueDate: row.dueDate,
    customerName: row.customerName,
    status: row.status,
    statuses: row.statuses || [row.status],
    total: row.grandTotal,
    paid: null,
    returnCredit: null,
    outstanding: null,
  }));
}

/**
 * Period summary used by the report headline tiles. The backend aggregates all
 * invoices, so these numbers stay correct even when a table is paginated.
 */
export async function getReportSummary(params = {}) {
  return requestApi(`/reports/summary${buildQuery(params)}`);
}

/**
 * Return and credit statuses: return documents, credit notes and approved
 * return credits, each grouped by its own status. Flattened into one row set
 * so the Reports table can render all three sections in a single grid.
 */
export async function getReturnCreditStatus(params = {}) {
  const data = await requestApi(`/reports/return-credit-status${buildQuery(params)}`);
  return [
    ...(data.returnsByStatus || []).map((row) => ({
      key: `return-${row.status}`,
      section: 'Return document',
      status: row.status,
      count: row.count,
      total: row.totalCredit,
      applied: null,
      available: null,
    })),
    ...(data.creditNotesByStatus || []).map((row) => ({
      key: `note-${row.status}`,
      section: 'Credit note',
      status: row.status,
      count: row.count,
      total: row.totalAmount,
      applied: row.appliedAmount,
      available: row.unappliedAmount,
    })),
    ...(data.returnCreditsByStatus || []).map((row) => ({
      key: `credit-${row.status}`,
      section: 'Return credit',
      status: row.status,
      count: row.count,
      total: row.approvedAmount,
      applied: row.allocatedAmount,
      available: row.availableAmount,
    })),
  ];
}
