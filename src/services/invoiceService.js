/**
 * Invoices plus the stock and numbering rules that go with them.
 * Invoice ids come from a stored counter so a database sequence can replace it later.
 */

import { FIRST_INVOICE_NUMBER, INVOICE_STATUS, dataStorageKey } from '../config/constants';
import { get, set } from './storage';

const readRecord = (userId) => get(dataStorageKey(userId), {});

const writeRecord = (userId, record) => set(dataStorageKey(userId), record);

/** Total quantity per product, adding up duplicate lines. */
function aggregateQuantities(lines) {
  const demand = new Map();
  lines.forEach((line) => {
    const qty = Number(line.qty) || 0;
    if (!line.productId || qty <= 0) return;
    demand.set(line.productId, (demand.get(line.productId) || 0) + qty);
  });
  return demand;
}

/** Upserts the invoice, assigning the next INV- number when it has none. */
function writeInvoice(userId, record, invoice, status) {
  const invoices = record.invoices || [];
  let nextInvoiceNumber = record.nextInvoiceNumber || FIRST_INVOICE_NUMBER;
  const saved = { ...invoice, status };
  if (!saved.id) {
    saved.id = `INV-${nextInvoiceNumber}`;
    nextInvoiceNumber += 1;
  }
  const index = invoices.findIndex((item) => item.id === saved.id);
  if (index >= 0) invoices[index] = saved;
  else invoices.unshift(saved);
  writeRecord(userId, { ...record, invoices, nextInvoiceNumber });
  return saved;
}

export async function listInvoices(userId) {
  return readRecord(userId).invoices || [];
}

/** Saves a draft; stock is untouched. */
export async function saveInvoice(userId, invoice) {
  return writeInvoice(userId, readRecord(userId), invoice, INVOICE_STATUS.DRAFT);
}

/** Issues an invoice: validates stock, subtracts it, then stores the invoice as pending. */
export async function issueInvoice(userId, invoice) {
  const record = readRecord(userId);
  const products = record.products || [];
  const demand = aggregateQuantities(invoice.lines);

  demand.forEach((qty, productId) => {
    const product = products.find((item) => item.id === productId);
    if (!product || Number(product.stock) < qty) {
      throw new Error(`Not enough stock for ${product ? product.name : 'the selected product'}`);
    }
  });

  const updatedProducts = products.map((product) =>
    demand.has(product.id)
      ? { ...product, stock: Number(product.stock) - demand.get(product.id) }
      : product
  );
  return writeInvoice(userId, { ...record, products: updatedProducts }, invoice, INVOICE_STATUS.PENDING);
}

/** Removes an invoice; issued or paid invoices return their quantities to stock. */
export async function deleteInvoice(userId, invoiceId) {
  const record = readRecord(userId);
  const invoices = record.invoices || [];
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return;

  let products = record.products || [];
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    const demand = aggregateQuantities(invoice.lines);
    products = products.map((product) =>
      demand.has(product.id)
        ? { ...product, stock: Number(product.stock) + demand.get(product.id) }
        : product
    );
  }
  writeRecord(userId, {
    ...record,
    products,
    invoices: invoices.filter((item) => item.id !== invoiceId),
  });
}

export async function markInvoicePaid(userId, invoiceId) {
  const record = readRecord(userId);
  const invoices = (record.invoices || []).map((invoice) =>
    invoice.id === invoiceId ? { ...invoice, status: INVOICE_STATUS.PAID } : invoice
  );
  writeRecord(userId, { ...record, invoices });
}
