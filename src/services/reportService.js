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
    tax: row.taxRecorded,
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
  }));
}

export async function getProductReport(params = {}) {
  const rows = await fetchAllPages('/reports/products', params, (data) => data.products || []);
  return rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    qty: row.quantitySold,
    revenue: row.salesSubtotal,
    tax: row.taxAmount,
  }));
}

export async function getInvoiceHistory(params = {}) {
  const rows = await fetchAllPages('/reports/invoice-history', params, (data) => data.invoices || []);
  return rows.map((row) => ({
    id: row.invoiceNumber,
    date: row.invoiceDate,
    customerName: row.customerName,
    status: row.status,
    total: row.grandTotal,
  }));
}

/** Raw summary; available for future screens/charts. */
export async function getReportSummary(params = {}) {
  return requestApi(`/reports/summary${buildQuery(params)}`);
}
