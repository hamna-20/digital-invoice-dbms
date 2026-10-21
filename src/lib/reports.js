/** Grouping functions behind the Reports page. All take plain invoice arrays. */

import { INVOICE_STATUS } from '../config/constants';
import { invoiceSubtotal, invoiceTax, invoiceTotal, lineSubtotal, lineTax } from './invoiceMath';
import { monthKey } from './dates';

const issuedInvoices = (invoices) => invoices.filter((invoice) => invoice.status !== INVOICE_STATUS.DRAFT);

const customerName = (customers, customerId) =>
  customers.find((customer) => customer.id === customerId)?.name || 'Unknown customer';

/** Newest date first, then highest id - the shared invoice ordering. */
export function newestFirst(invoices) {
  return [...invoices].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

export function dailySales(invoices) {
  const groups = new Map();
  issuedInvoices(invoices).forEach((invoice) => {
    const row = groups.get(invoice.date) || { date: invoice.date, invoiceCount: 0, taxable: 0, tax: 0, total: 0 };
    row.invoiceCount += 1;
    row.taxable += invoiceSubtotal(invoice);
    row.tax += invoiceTax(invoice);
    row.total += invoiceTotal(invoice);
    groups.set(invoice.date, row);
  });
  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function monthlySales(invoices) {
  const groups = new Map();
  issuedInvoices(invoices).forEach((invoice) => {
    const month = monthKey(invoice.date);
    const row = groups.get(month) || { month, invoiceCount: 0, taxable: 0, tax: 0, total: 0 };
    row.invoiceCount += 1;
    row.taxable += invoiceSubtotal(invoice);
    row.tax += invoiceTax(invoice);
    row.total += invoiceTotal(invoice);
    groups.set(month, row);
  });
  return Array.from(groups.values()).sort((a, b) => b.month.localeCompare(a.month));
}

export function taxReport(invoices) {
  const groups = new Map();
  issuedInvoices(invoices).forEach((invoice) => {
    invoice.lines.forEach((line) => {
      const rate = Number(line.taxRate) || 0;
      const row = groups.get(rate) || { rate, taxable: 0, tax: 0 };
      row.taxable += lineSubtotal(line);
      row.tax += lineTax(line);
      groups.set(rate, row);
    });
  });
  return Array.from(groups.values()).sort((a, b) => b.rate - a.rate);
}

export function customerWise(invoices, customers) {
  const groups = new Map();
  issuedInvoices(invoices).forEach((invoice) => {
    const row = groups.get(invoice.customerId) || {
      customerId: invoice.customerId,
      invoiceCount: 0,
      taxable: 0,
      tax: 0,
      total: 0,
    };
    row.invoiceCount += 1;
    row.taxable += invoiceSubtotal(invoice);
    row.tax += invoiceTax(invoice);
    row.total += invoiceTotal(invoice);
    groups.set(invoice.customerId, row);
  });
  return Array.from(groups.values())
    .map((row) => ({ ...row, name: customerName(customers, row.customerId) }))
    .sort((a, b) => b.total - a.total);
}

export function productWise(invoices) {
  const groups = new Map();
  issuedInvoices(invoices).forEach((invoice) => {
    invoice.lines.forEach((line) => {
      const row = groups.get(line.productId) || {
        productId: line.productId,
        name: line.name,
        qty: 0,
        revenue: 0,
        tax: 0,
      };
      row.qty += Number(line.qty) || 0;
      row.revenue += lineSubtotal(line);
      row.tax += lineTax(line);
      groups.set(line.productId, row);
    });
  });
  return Array.from(groups.values()).sort((a, b) => b.revenue - a.revenue);
}

export function invoiceHistory(invoices, customers) {
  return newestFirst(invoices).map((invoice) => ({
    id: invoice.id,
    date: invoice.date,
    customerName: customerName(customers, invoice.customerId),
    status: invoice.status,
    total: invoiceTotal(invoice),
  }));
}
