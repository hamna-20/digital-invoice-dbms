/** Pure invoice arithmetic: line totals, tax and invoice totals. */

/** Amount of a single line before tax (qty x price). */
export function lineSubtotal(line) {
  return (Number(line.qty) || 0) * (Number(line.price) || 0);
}

export function lineTax(line) {
  return (lineSubtotal(line) * (Number(line.taxRate) || 0)) / 100;
}

/** Line amount including tax (qty x price x (1 + tax / 100)). */
export function lineTotal(line) {
  return lineSubtotal(line) + lineTax(line);
}

export function invoiceSubtotal(invoice) {
  return invoice.lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export function invoiceTax(invoice) {
  return invoice.lines.reduce((sum, line) => sum + lineTax(line), 0);
}

/** Invoice total = subtotal + tax. */
export function invoiceTotal(invoice) {
  return invoiceSubtotal(invoice) + invoiceTax(invoice);
}

/** Lines actually billed (skips empty rows in the editor). */
export function billedLines(invoice) {
  return invoice.lines.filter((line) => line.productId && Number(line.qty) > 0);
}
