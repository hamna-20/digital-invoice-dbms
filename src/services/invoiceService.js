/**
 * Invoices backed by the authenticated backend API.
 * The UI keeps its own shape (date, lines, qty) while the API uses
 * invoiceDate/items/quantity. `id` is the numeric database id as a string;
 * `number` is the human-facing invoice number.
 */
import { requestApi } from './apiClient';

const STATUS_FROM_API = {
  draft: 'draft',
  issued: 'pending',
  partially_paid: 'partially_paid',
  paid: 'paid',
  overdue: 'overdue',
  void: 'cancelled',
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
    version: invoice.version ?? 0,
    status: STATUS_FROM_API[invoice.status] || invoice.status,
    statuses: (Array.isArray(invoice.statuses) && invoice.statuses.length > 0
      ? invoice.statuses
      : [invoice.status]
    ).map((entry) => STATUS_FROM_API[entry] || entry),
    lines: (invoice.items || []).map((item) => ({
      id: String(item.id),
      productId: item.productId === null || item.productId === undefined ? '' : String(item.productId),
      name: item.productName,
      code: item.productCode || '',
      price: Number(item.unitPrice) || 0,
      taxRate: Number(item.taxRate) || 0,
      qty: Number(item.quantity) || 0,
      lineSubtotal: Number(item.lineSubtotal) || 0,
      lineTax: Number(item.lineTax) || 0,
      lineTotal: Number(item.lineTotal) || 0,
      returnedQuantity: Number(item.returnedQuantity) || 0,
      pendingReturnQuantity: Number(item.pendingReturnQuantity) || 0,
      returnable: Number(item.returnable) || 0,
    })),
    subtotal: Number(invoice.subtotal) || 0,
    taxTotal: Number(invoice.taxTotal) || 0,
    grandTotal: Number(invoice.grandTotal) || 0,
    notes: invoice.notes || '',
    paidAt: invoice.paidAt || null,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt || null,
    preparedBy: invoice.preparedBy || null,
    financialSummary: invoice.financialSummary || null,
    payments: (invoice.payments || []).map((payment) => ({
      ...payment,
      id: String(payment.id),
      amount: Number(payment.amount) || 0,
    })),
    activities: invoice.activities || [],
    returns: (invoice.returns || []).map((record) => ({
      ...record,
      id: String(record.id),
      returnNumber: record.returnNumber || '',
      items: (record.items || []).map((item) => ({
        ...item,
        id: String(item.id),
        invoiceItemId: String(item.invoiceItemId),
      })),
    })),
  };
}

function toApiInvoice(invoice) {
  return {
    customerId: Number(invoice.customerId),
    invoiceDate: invoice.date,
    dueDate: invoice.dueDate || null,
    items: invoice.lines
      .filter((line) => line.productId && Number(line.qty) > 0)
      .map((line) => ({ productId: Number(line.productId), quantity: Number(line.qty) })),
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

export async function saveInvoice(userId, invoice) {
  const isUpdate = Boolean(invoice.id);
  const path = isUpdate ? `/invoices/${encodeURIComponent(invoice.id)}` : '/invoices';
  const result = await requestApi(path, {
    method: isUpdate ? 'PUT' : 'POST',
    body: toApiInvoice(invoice),
  });
  return toAppInvoice(result.invoice);
}

export async function issueInvoice(userId, invoice) {
  const saved = await saveInvoice(userId, invoice);
  const result = await requestApi(`/invoices/${encodeURIComponent(saved.id)}/issue`, { method: 'PATCH' });
  return toAppInvoice(result.invoice);
}

export async function markInvoicePaid(userId, invoiceId) {
  const result = await requestApi(`/invoices/${encodeURIComponent(invoiceId)}/pay`, { method: 'PATCH' });
  return toAppInvoice(result.invoice);
}

export async function recordInvoicePayment(invoiceId, payment) {
  const result = await requestApi(`/invoices/${encodeURIComponent(invoiceId)}/payments`, {
    method: 'POST',
    body: payment,
  });
  return { invoice: toAppInvoice(result.invoice), replayed: Boolean(result.replayed) };
}

export async function updateInvoicePayment(invoiceId, paymentId, payment) {
  const result = await requestApi(
    `/invoices/${encodeURIComponent(invoiceId)}/payments/${encodeURIComponent(paymentId)}`,
    { method: 'PATCH', body: payment }
  );
  return toAppInvoice(result.invoice);
}

export async function getInvoice(invoiceId) {
  const result = await requestApi(`/invoices/${encodeURIComponent(invoiceId)}`);
  return toAppInvoice(result.invoice);
}

export async function getInvoiceTimeline(invoiceId) {
  return requestApi(`/invoices/${encodeURIComponent(invoiceId)}/timeline`);
}

export async function createInvoiceReturn(invoiceId, input) {
  return requestApi(`/invoices/${encodeURIComponent(invoiceId)}/returns`, { method: 'POST', body: input });
}

export async function updateInvoiceReturn(invoiceId, returnId, input) {
  return requestApi(
    `/invoices/${encodeURIComponent(invoiceId)}/returns/${encodeURIComponent(returnId)}`,
    { method: 'PATCH', body: input }
  );
}

export async function decideInvoiceReturn(invoiceId, returnId, { approve, reason = '' } = {}) {
  const base = `/invoices/${encodeURIComponent(invoiceId)}/returns/${encodeURIComponent(returnId)}`;
  if (approve) return requestApi(`${base}/approve`, { method: 'PATCH' });
  return requestApi(`${base}/reject`, { method: 'PATCH', body: { reason } });
}

export async function cancelInvoice(invoiceId, { reason = '', confirmNumber = '' } = {}) {
  const result = await requestApi(`/invoices/${encodeURIComponent(invoiceId)}/void`, {
    method: 'PATCH',
    body: { reason, confirmNumber },
  });
  return toAppInvoice(result.invoice);
}

export async function deleteInvoice(invoiceId) {
  await requestApi(`/invoices/${encodeURIComponent(invoiceId)}`, { method: 'DELETE' });
}
