/**
 * Pure invoice arithmetic: line totals, tax and invoice totals.
 *
 * Invoices loaded from the API carry authoritative server-calculated values,
 * so those are preferred. Draft rows in the editor have no such fields, which
 * keeps the live preview working with the same helpers.
 */

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/** Amount of a single line before tax (qty x price). */
export function lineSubtotal(line) {
  if (isFiniteNumber(line.lineSubtotal)) return line.lineSubtotal;
  return (Number(line.qty) || 0) * (Number(line.price) || 0);
}

export function lineTax(line) {
  if (isFiniteNumber(line.lineTax)) return line.lineTax;
  return (lineSubtotal(line) * (Number(line.taxRate) || 0)) / 100;
}

/** Line amount including tax (qty x price x (1 + tax / 100)). */
export function lineTotal(line) {
  if (isFiniteNumber(line.lineTotal)) return line.lineTotal;
  return lineSubtotal(line) + lineTax(line);
}

export function invoiceSubtotal(invoice) {
  if (isFiniteNumber(invoice.subtotal)) return invoice.subtotal;
  return invoice.lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export function invoiceTax(invoice) {
  if (isFiniteNumber(invoice.taxTotal)) return invoice.taxTotal;
  return invoice.lines.reduce((sum, line) => sum + lineTax(line), 0);
}

/** Invoice total = subtotal + tax. */
export function invoiceTotal(invoice) {
  if (isFiniteNumber(invoice.grandTotal)) return invoice.grandTotal;
  return invoiceSubtotal(invoice) + invoiceTax(invoice);
}

/** Lines actually billed (skips empty rows in the editor). */
export function billedLines(invoice) {
  return invoice.lines.filter((line) => line.productId && Number(line.qty) > 0);
}
