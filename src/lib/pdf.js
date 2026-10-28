import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './dates';
import { formatMoney, formatNumber } from './format';
import { invoiceSubtotal, invoiceTax, invoiceTotal, lineTax, lineTotal } from './invoiceMath';
import { invoiceStatusMeta } from './invoiceStatus';

const LIGHT = {
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  line: [232, 236, 243],
  surface: [248, 250, 252],
};

const valueOrDash = (value) => (value === null || value === undefined || value === '' ? '—' : value);

/** Quantities already approved for return, keyed by invoice line id. */
function returnedQuantities(invoice) {
  const map = new Map();
  for (const record of invoice.returns || []) {
    if (record.status !== 'approved') continue;
    for (const item of record.items || []) {
      const key = String(item.invoiceItemId);
      map.set(key, (map.get(key) || 0) + (Number(item.quantity) || 0));
    }
  }
  return map;
}

/**
 * Draws one invoice on the page that is currently active in `doc`.
 * The caller owns page creation so several invoices can share one PDF.
 */
function drawInvoice(doc, invoice, customer, seller = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const columnX = pageWidth / 2 + 10;
  let y = margin;

  // Try to use Poppins if embedded; fall back gracefully to Helvetica.
  const setFont = (style = 'normal') => {
    try {
      doc.setFont('Poppins', style);
    } catch (error) {
      doc.setFont('Helvetica', style === 'bold' ? 'bold' : 'normal');
    }
  };

  setFont();
  doc.setTextColor(...LIGHT.ink);
  doc.setFontSize(16);
  doc.text(seller.business || 'Your business', margin, y + 14);

  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(9);
  doc.text(`NTN: ${valueOrDash(seller.ntn)} · STRN: ${valueOrDash(seller.strn)}`, margin, y + 30);
  let headerBottom = y + 30;
  if (seller.address) {
    doc.text(seller.address, margin, y + 42);
    headerBottom = y + 42;
  }

  // Invoice number, date and status in the top right.
  setFont();
  doc.setTextColor(...LIGHT.ink);
  doc.setFontSize(11);
  doc.text(invoice.number || String(invoice.id || ''), pageWidth - margin, y + 14, { align: 'right' });

  const invoiceTags = [];
  if ((invoice.returns || []).some((record) => record.status === 'draft' || record.status === 'approved')) {
    invoiceTags.push('Return');
  }
  const creditsApplied = Number(invoice.financialSummary?.creditsApplied) || 0;
  if ((invoice.creditNotes || []).length > 0 || creditsApplied > 0) invoiceTags.push('Credit');

  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(9);
  doc.text(formatDate(invoice.date), pageWidth - margin, y + 30, { align: 'right' });
  if (invoice.dueDate) {
    doc.text(`Due ${formatDate(invoice.dueDate)}`, pageWidth - margin, y + 42, { align: 'right' });
    headerBottom = Math.max(headerBottom, y + 42);
  }
  const statusLabel = invoiceStatusMeta(invoice.status).label;
  doc.text([statusLabel, ...invoiceTags].filter(Boolean).join(' · '), pageWidth - margin, y + (invoice.dueDate ? 54 : 42), {
    align: 'right',
  });
  headerBottom = Math.max(headerBottom, y + (invoice.dueDate ? 54 : 42));

  y = headerBottom + 16;
  doc.setDrawColor(...LIGHT.line);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // Bill to (left) and Prepared by (right).
  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(9);
  doc.text('Bill to', margin, y);
  doc.text('Prepared by', columnX, y);

  y += 14;
  doc.setTextColor(...LIGHT.ink);
  doc.setFontSize(11);
  doc.text(customer?.name || 'Unknown customer', margin, y);

  const preparedBy = invoice.preparedBy || seller.preparedBy || null;
  doc.text(preparedBy?.name || '—', columnX, y);

  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(9);
  let leftY = y + 13;
  const customerMeta = [
    customer?.ntn ? `NTN/CNIC: ${customer.ntn}` : '',
    customer?.address || '',
  ]
    .filter(Boolean)
    .join(', ');
  if (customerMeta) {
    doc.splitTextToSize(customerMeta, pageWidth / 2 - margin - 20).forEach((line) => {
      doc.text(line, margin, leftY);
      leftY += 11;
    });
  }

  let rightY = y + 13;
  if (preparedBy?.email) {
    doc.text(preparedBy.email, columnX, rightY);
    rightY += 11;
  }
  if (seller.email && seller.email !== preparedBy?.email) {
    doc.text(seller.email, columnX, rightY);
    rightY += 11;
  }

  y = Math.max(leftY, rightY) + 8;

  // Show approved returned units separately from quantities still returnable.
  const returned = returnedQuantities(invoice);
  const rows = (invoice.lines || []).map((line) => {
    const alreadyReturned = returned.get(String(line.id)) || 0;
    const returnable = Math.max((Number(line.qty) || 0) - alreadyReturned, 0);
    const taxRate = Number(line.taxRate) || 0;
    return [
      line.name || '',
      formatNumber(line.qty),
      formatMoney(line.price),
      taxRate > 0 ? `${formatMoney(lineTax(line))} (${formatNumber(taxRate)}%)` : formatMoney(lineTax(line)),
      formatNumber(alreadyReturned),
      formatNumber(returnable),
      formatMoney(lineTotal(line)),
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Item', 'Qty', 'Unit price', 'Tax', 'Returned', 'Returnable', 'Line total']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'Helvetica',
      fontSize: 9,
      textColor: LIGHT.ink,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
    },
    headStyles: {
      fillColor: LIGHT.surface,
      textColor: LIGHT.muted,
      fontSize: 8,
      fontStyle: 'normal',
      lineWidth: 0.5,
      lineColor: LIGHT.line,
    },
    bodyStyles: {
      lineWidth: 0.5,
      lineColor: LIGHT.line,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 18;
  if (y > pageHeight - 190) {
    doc.addPage();
    y = margin;
  }

  const financials = invoice.financialSummary || {
    originalTotal: invoiceTotal(invoice),
    amountPaid: 0,
    otherCreditApplied: 0,
    customerCreditApplied: 0,
    outstanding: invoiceTotal(invoice),
  };

  const labelX = pageWidth - margin - 190;
  const valueX = pageWidth - margin;

  const lineRow = (label, value, bold = false) => {
    setFont();
    doc.setTextColor(...LIGHT.muted);
    doc.setFontSize(9);
    doc.text(label, labelX, y + 10);
    doc.setTextColor(...LIGHT.ink);
    if (bold) setFont('bold');
    doc.text(value, valueX, y + 10, { align: 'right' });
    y += 14;
  };

  const divider = () => {
    y += 4;
    doc.setDrawColor(...LIGHT.line);
    doc.line(labelX, y, valueX, y);
    y += 4;
  };

  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(9);
  doc.text('Account summary', labelX, y + 10);
  y += 16;

  lineRow('Subtotal', formatMoney(invoiceSubtotal(invoice)));
  lineRow('Tax', formatMoney(invoiceTax(invoice)));
  divider();
  lineRow('Invoice total', formatMoney(financials.originalTotal), true);
  lineRow('Completed payments', formatMoney(financials.amountPaid));
  if (Number(financials.otherCreditApplied) > 0) {
    lineRow('Other credit applied', formatMoney(financials.otherCreditApplied));
  }
  lineRow('Customer credit applied', formatMoney(financials.customerCreditApplied));
  divider();
  lineRow('Unpaid amount', formatMoney(financials.outstanding), true);

  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(8);
  doc.text(
    'Unpaid amount = total - payments - applied credits',
    valueX,
    y + 10,
    { align: 'right' }
  );
}

/**
 * Generate a PDF that matches the Invoice view layout.
 * @param {object} invoice
 * @param {object|null} customer
 * @param {object} seller - { business, ntn, strn, address, email, preparedBy? }
 * @returns {jsPDF}
 */
export function generateInvoicePdf(invoice, customer, seller = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  drawInvoice(doc, invoice, customer, seller);
  return doc;
}

/**
 * One PDF containing several invoices, each starting on a new page. Used for
 * the filtered download on the invoice list, so the export matches exactly what
 * the user can see.
 *
 * @param {Array} invoices
 * @param {(invoice: object) => object|null} customerById
 * @param {object} seller
 * @returns {jsPDF}
 */
export function generateInvoicesPdf(invoices, customerById, seller = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  (invoices || []).forEach((invoice, index) => {
    if (index > 0) doc.addPage();
    drawInvoice(doc, invoice, customerById ? customerById(invoice) : null, seller);
  });
  return doc;
}

/** Convenience helper that downloads one invoice PDF. */
export function downloadInvoicePdf(invoice, customer, seller, filename) {
  const doc = generateInvoicePdf(invoice, customer, seller);
  doc.save(filename || `${invoice.number || invoice.id}.pdf`);
}

/** Downloads the currently filtered invoices as a single multi-page PDF. */
export function downloadInvoicesPdf(invoices, customerById, seller, filename) {
  if (!invoices || invoices.length === 0) return;
  const doc = generateInvoicesPdf(invoices, customerById, seller);
  doc.save(filename || 'invoices.pdf');
}
