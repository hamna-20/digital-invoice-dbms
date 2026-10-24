/**
 * Invoices backed by the authenticated backend API.
 *
 * The UI keeps its own shape (date, lines, qty) while the API uses
 * invoiceDate/items/quantity. The numeric database id is kept as `id` for API
 * calls; `number` is the human-facing invoice number (e.g. INV-1001).
 */

import { requestApi } from './apiClient';

/** The API derives "overdue"; the UI treats issued invoices as "pending". */
const STATUS_FROM_API = {
  draft: 'draft',
  issued: 'pending',
  paid: 'paid',
  overdue: 'overdue',
  cancelled: 'cancelled',
};

function toAppInvoice(invoice) {
  if (!invoice || invoice.id === undefined || !invoice.invoiceNumber) {
    throw new Error('The backend returned an invalid invoice record.');
  }

  return {
    id: String(invoice.id),
    number: invoice.invoiceNumber,
    customerId: String(invoice.customerId),
    date: invoice.invoiceDate,
    dueDate: invoice.dueDate || '',
    status: STATUS_FROM_API[invoice.status] || invoice.status,
    lines: (invoice.items || []).map((item) => ({
      productId: item.productId === null || item.productId === undefined ? '' : String(item.productId),
      name: item.productName,
      code: item.productCode || '',
      price: Number(item.unitPrice) || 0,
      taxRate: Number(item.taxRate) || 0,
      qty: Number(item.quantity) || 0,
      lineSubtotal: Number(item.lineSubtotal) || 0,
      lineTax: Number(item.lineTax) || 0,
      lineTotal: Number(item.lineTotal) || 0,
    })),
    subtotal: Number(invoice.subtotal) || 0,
    taxTotal: Number(invoice.taxTotal) || 0,
    grandTotal: Number(invoice.grandTotal) || 0,
    notes: invoice.notes || '',
    paidAt: invoice.paidAt || null,
    createdAt: invoice.createdAt,
  };
}

/** Only customer, dates and product quantities are sent; prices come from the DB. */
function toApiInvoice(invoice) {
  return {
    customerId: Number(invoice.customerId),
    invoiceDate: invoice.date,
    dueDate: invoice.dueDate || null,
    items: invoice.lines
      .filter((line) => line.productId && Number(line.qty) > 0)
      .map((line) => ({
        productId: Number(line.productId),
        quantity: Number(line.qty),
      })),
  };
}

export async function listInvoices() {
  const invoices = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await requestApi(`/invoices?page=${page}&limit=100`);
    if (!Array.isArray(result.invoices)) {
      throw new Error('The backend returned an invalid invoice list.');
    }
    invoices.push(...result.invoices.map(toAppInvoice));
    totalPages = Number(result.pagination?.totalPages);
    if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
      throw new Error('The backend returned invalid invoice pagination data.');
    }
    page += 1;
  }

  return invoices;
}

/** Creates a draft, or replaces an existing draft. */
export async function saveInvoice(userId, invoice) {
  const isUpdate = Boolean(invoice.id);
  const path = isUpdate ? `/invoices/${encodeURIComponent(invoice.id)}` : '/invoices';
  const result = await requestApi(path, {
    method: isUpdate ? 'PUT' : 'POST',
    body: toApiInvoice(invoice),
  });
  return toAppInvoice(result.invoice);
}

/** Saves the draft, then performs the draft -> issued transition. */
export async function issueInvoice(userId, invoice) {
  const saved = await saveInvoice(userId, invoice);
  const result = await requestApi(`/invoices/${encodeURIComponent(saved.id)}/issue`, {
    method: 'PATCH',
  });
  return toAppInvoice(result.invoice);
}

export async function markInvoicePaid(userId, invoiceId) {
  const result = await requestApi(`/invoices/${encodeURIComponent(invoiceId)}/pay`, {
    method: 'PATCH',
  });
  return toAppInvoice(result.invoice);
}

export async function cancelInvoice(userId, invoiceId) {
  const result = await requestApi(`/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'PATCH',
  });
  return toAppInvoice(result.invoice);
}

/** Only drafts can be deleted; the API responds with 409 otherwise. */
export async function deleteInvoice(userId, invoiceId) {
  await requestApi(`/invoices/${encodeURIComponent(invoiceId)}`, { method: 'DELETE' });
}
