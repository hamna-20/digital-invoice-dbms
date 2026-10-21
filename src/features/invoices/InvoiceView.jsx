import { useState } from 'react';
import Pill from '../../components/ui/Pill';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { INVOICE_STATUS, INVOICE_STATUS_META } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatDate } from '../../lib/dates';
import { formatMoney, formatNumber } from '../../lib/format';
import { invoiceSubtotal, invoiceTax, invoiceTotal, lineTax, lineTotal } from '../../lib/invoiceMath';
import { downloadInvoicePdf } from '../../lib/pdf';
import InvoiceTotals from './InvoiceTotals';

const HEADING = 'border-b border-line py-2 text-xs font-medium text-muted';

/** Read-only invoice modal; the panel is the only thing shown when printing. */
export default function InvoiceView({ invoice, onClose, onEditDraft }) {
  const { customers, markInvoicePaid } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [markingPaid, setMarkingPaid] = useState(false);

  const customer = customers.find((item) => item.id === invoice.customerId);
  const status = INVOICE_STATUS_META[invoice.status];
  const sellerLine = [user.businessNtn, user.businessAddress].filter(Boolean).join(', ');

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      await markInvoicePaid(invoice.id);
      toast(`${invoice.id} marked as paid`);
    } catch (error) {
      toast(error.message);
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={invoice.id}
      footer={
        <>
          <Button variant="ghost" onClick={() => downloadInvoicePdf(invoice, customer, user, `${invoice.id}.pdf`)}>
            Download PDF
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            Print
          </Button>
          {invoice.status === INVOICE_STATUS.PENDING && (
            <Button loading={markingPaid} onClick={handleMarkPaid}>
              Mark as paid
            </Button>
          )}
          {invoice.status === INVOICE_STATUS.DRAFT && (
            <Button onClick={() => onEditDraft(invoice)}>Edit draft</Button>
          )}
        </>
      }
    >
      <div className="invoice-print-area rounded-card border border-line p-[22px]">
        <div className="mb-[18px] flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-line pb-4">
          <div>
            <p className="text-[19px] font-semibold">{user.business}</p>
            {sellerLine && <p className="mt-1 text-xs text-muted">{sellerLine}</p>}
          </div>
          <div className="text-right">
            <p className="font-semibold">{invoice.id}</p>
            <p className="text-xs text-muted">{formatDate(invoice.date)}</p>
            <div className="mt-1.5 flex justify-end">
              <Pill variant={status.tone}>{status.label}</Pill>
            </div>
          </div>
        </div>

        <div className="mb-3.5">
          <p className="text-xs text-muted">Billed to</p>
          <p className="text-[13px] font-semibold">{customer ? customer.name : 'Unknown customer'}</p>
          {customer && (
            <p className="text-xs text-muted">
              {customer.ntn}, {customer.address}
            </p>
          )}
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left">
              <th className={HEADING}>Product</th>
              <th className={`${HEADING} text-right`}>Qty</th>
              <th className={`${HEADING} text-right`}>Price</th>
              <th className={`${HEADING} text-right`}>Tax</th>
              <th className={`${HEADING} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={index} className="border-b border-line-soft text-[13px] last:border-0">
                <td className="py-2.5 pr-3">{line.name}</td>
                <td className="py-2.5 pl-3 text-right">{formatNumber(line.qty)}</td>
                <td className="py-2.5 pl-3 text-right">{formatMoney(line.price)}</td>
                <td className="py-2.5 pl-3 text-right">{formatMoney(lineTax(line))}</td>
                <td className="py-2.5 pl-3 text-right font-medium">{formatMoney(lineTotal(line))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <InvoiceTotals
          subtotal={invoiceSubtotal(invoice)}
          tax={invoiceTax(invoice)}
          total={invoiceTotal(invoice)}
        />
      </div>
    </Modal>
  );
}
