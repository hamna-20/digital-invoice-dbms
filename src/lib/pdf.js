import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INVOICE_STATUS_META } from '../config/constants';
import { formatDate } from './dates';
import { formatMoney } from './format';
import { invoiceSubtotal, invoiceTax, invoiceTotal, lineTax, lineTotal } from './invoiceMath';

const LIGHT = {
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  line: [232, 236, 243],
  surface: [248, 250, 252],
};

/**
 * Generate a PDF that matches the Invoice view layout.
 * @param {object} invoice
 * @param {object|null} customer
 * @param {object} seller - { business, businessNtn, businessAddress }
 * @returns {jsPDF}
 */
export function generateInvoicePdf(invoice, customer, seller = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Try to use Poppins if embedded; fall back gracefully to Helvetica.
  try {
    doc.setFont('Poppins', 'normal');
  } catch (error) {
    doc.setFont('Helvetica', 'normal');
  }

  doc.setTextColor(...LIGHT.ink);
  doc.setFontSize(16);
  doc.text(seller.business || '', margin, y + 16);
  y += 24;

  const sellerLine = [seller.businessNtn, seller.businessAddress].filter(Boolean).join(', ');
  if (sellerLine) {
    try {
      doc.setFont('Poppins', 'normal');
    } catch (error) {
      doc.setFont('Helvetica', 'normal');
    }
    doc.setTextColor(...LIGHT.muted);
    doc.setFontSize(9);
    doc.text(sellerLine, margin, y + 10);
    y += 16;
  }

  // Invoice number, date and status in the top right.
  try {
    doc.setFont('Poppins', 'normal');
  } catch (error) {
    doc.setFont('Helvetica', 'normal');
  }
  doc.setTextColor(...LIGHT.ink);
  doc.setFontSize(11);
  doc.text(invoice.id, pageWidth - margin, y - 6, { align: 'right' });

  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(9);
  doc.text(formatDate(invoice.date), pageWidth - margin, y + 8, { align: 'right' });

  const statusLabel = INVOICE_STATUS_META[invoice.status]?.label || invoice.status || '';
  doc.text(statusLabel, pageWidth - margin, y + 22, { align: 'right' });

  y += 28;
  doc.setDrawColor(...LIGHT.line);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // Billed to
  doc.setTextColor(...LIGHT.muted);
  doc.setFontSize(9);
  doc.text('Billed to', margin, y + 10);
  y += 18;

  doc.setTextColor(...LIGHT.ink);
  doc.setFontSize(11);
  doc.text(customer?.name || 'Unknown customer', margin, y + 12);
  y += 18;

  if (customer) {
    doc.setTextColor(...LIGHT.muted);
    doc.setFontSize(9);
    const billedLine = [customer.ntn, customer.address].filter(Boolean).join(', ');
    if (billedLine) {
      const wrapped = doc.splitTextToSize(billedLine, pageWidth - margin * 2);
      wrapped.forEach((line) => {
        doc.text(line, margin, y + 10);
        y += 12;
      });
    }
  }

  y += 12;

  // Line items table
  const rows = (invoice.lines || []).map((line) => [
    line.name || '',
    String(line.qty ?? ''),
    formatMoney(line.price),
    formatMoney(lineTax(line)),
    formatMoney(lineTotal(line)),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Product', 'Qty', 'Price', 'Tax', 'Total']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'Helvetica',
      fontSize: 9,
      textColor: LIGHT.ink,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
    },
    headStyles: {
      fillColor: [248, 250, 252],
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
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 16;

  const subtotal = invoiceSubtotal(invoice);
  const tax = invoiceTax(invoice);
  const total = invoiceTotal(invoice);

  const labelX = pageWidth - margin - 120;
  const valueX = pageWidth - margin;

  const lineRow = (label, value, bold = false) => {
    doc.setTextColor(...LIGHT.muted);
    doc.setFontSize(9);
    doc.text(label, labelX, y + 10);
    doc.setTextColor(...LIGHT.ink);
    doc.setFontSize(9);
    if (bold) {
      try {
        doc.setFont('Poppins', 'normal');
      } catch (error) {
        doc.setFont('Helvetica', 'bold');
      }
    }
    doc.text(value, valueX, y + 10, { align: 'right' });
    y += 14;
    try {
      doc.setFont('Poppins', 'normal');
    } catch (error) {
      doc.setFont('Helvetica', 'normal');
    }
  };

  lineRow('Subtotal', formatMoney(subtotal));
  lineRow('Tax', formatMoney(tax));
  y += 4;
  doc.setDrawColor(...LIGHT.line);
  doc.line(labelX, y, valueX, y);
  y += 4;
  lineRow('Total due', formatMoney(total), true);

  return doc;
}

/** Convenience helper that downloads the PDF. */
export function downloadInvoicePdf(invoice, customer, seller, filename) {
  const doc = generateInvoicePdf(invoice, customer, seller);
  doc.save(filename || `${invoice.id}.pdf`);
}
