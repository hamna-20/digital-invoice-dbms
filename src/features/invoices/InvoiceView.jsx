import { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, CreditCardIcon, DownloadIcon, RotateCcwIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { INVOICE_STATUS, UNPAID_STATUSES } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatDate, formatDateTime, today } from '../../lib/dates';
import { formatMoney } from '../../lib/format';
import { downloadInvoicePdf } from '../../lib/pdf';
import { sellerDetails } from '../../lib/seller';
import { getInvoiceTimeline } from '../../services/invoiceService';
import InvoiceStatusPills from './InvoiceStatusPills';

const MONEY_PATTERN = /^\d{1,16}(?:\.\d{1,2})?$/;
const RESERVING_RETURN_STATUSES = new Set(['draft', 'pending', 'approved']);

/** Money helpers in integer paisa so floating point never touches a balance. */
const toPaisa = (value) => Math.round((Number(value) || 0) * 100);
const fromPaisa = (paisa) => paisa / 100;
const rs = (value) => `Rs. ${formatMoney(value)}`;

/**
 * Invoice document opened from the Invoices page. Shown as a modal so the
 * click always opens something visible. Payment, credit, return and cancel
 * actions keep the same service calls as before.
 */
export default function InvoiceView({ invoice, onClose, onEditDraft, showStatusHistory = false }) {
  const {
    customers,
    userProfile,
    recordInvoicePayment,
    cancelInvoice,
    createInvoiceReturn,
    decideInvoiceReturn,
  } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [panel, setPanel] = useState(null); // 'payment' | 'return' | 'cancel' | null
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState({ amount: '' });
  const [paymentCreditDue, setPaymentCreditDue] = useState('');
  const [creditReturnInput, setCreditReturnInput] = useState('');
  const [returnDraft, setReturnDraft] = useState({ reason: '', returnDate: today(), lines: {} });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [timeline, setTimeline] = useState(null);
  const [timelineError, setTimelineError] = useState('');
  const paymentKeyRef = useRef(null);
  const panelRef = useRef(null);

  const customer = customers.find((item) => item.id === invoice.customerId) || null;
  const seller = sellerDetails(user, userProfile || {});
  const preparedBy = invoice.preparedBy || { name: user?.name, email: user?.email };
  const businessName = userProfile?.business || user?.business || user?.name || '';

  const financials = invoice.financialSummary || {};
  const unpaid = Number(financials.unpaid ?? invoice.grandTotal) || 0;
  const statuses = invoice.statuses || [invoice.status];

  const unpaidPaisa = toPaisa(financials.unpaid);
  const creditOutstandingPaisa = Math.min(toPaisa(financials.creditOutstanding ?? 0), unpaidPaisa);
  const hasOutstandingCredit = creditOutstandingPaisa > 0;
  const creditOutstandingAmount = fromPaisa(creditOutstandingPaisa);
  const creditDueDate = financials.creditDueDate || '';

  const canRecordPayment = UNPAID_STATUSES.includes(invoice.status);
  const outstandingCapPaisa = toPaisa(financials.unpaid);
  const isFullyPaid = invoice.status === 'paid' || toPaisa(financials.unpaid) <= 0;
  const canCreateReturn =
    ![INVOICE_STATUS.DRAFT, INVOICE_STATUS.CANCELLED, 'void'].includes(invoice.status) && !isFullyPaid;
  const canCancel =
    [INVOICE_STATUS.PENDING, INVOICE_STATUS.OVERDUE].includes(invoice.status) &&
    toPaisa(financials.amountPaid) === 0;

  // Units held per invoice line: approved returns are permanent, pending and
  // draft returns reserve quantity until decided. Keys are strings.
  const heldByLine = new Map();
  for (const record of invoice.returns || []) {
    if (!RESERVING_RETURN_STATUSES.has(record.status)) continue;
    for (const item of record.items || []) {
      const key = String(item.invoiceItemId);
      heldByLine.set(key, (heldByLine.get(key) || 0) + item.quantity);
    }
  }
  const maxReturnable = (line) => Math.max(Number(line.qty) - (heldByLine.get(String(line.id)) || 0), 0);
  const returnableLines = (invoice.lines || []).filter((line) => line.id && maxReturnable(line) > 0);

  // Scroll the open form into view, so the user does not have to scroll manually.
  useEffect(() => {
    if (!panel) return;
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [panel]);

  // Scroll the reject form into view when Reject is clicked on a return.
  useEffect(() => {
    if (!rejectingId) return;
    document
      .getElementById(`reject-form-${rejectingId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [rejectingId]);

  // Timeline is only used on the Reports screen.
  useEffect(() => {
    if (!showStatusHistory) {
      setTimeline(null);
      setTimelineError('');
      return undefined;
    }
    let active = true;
    setTimelineError('');
    getInvoiceTimeline(invoice.id)
      .then((data) => active && setTimeline(data))
      .catch((error) => active && setTimelineError(error.message || 'Unable to load the status history.'));
    return () => {
      active = false;
    };
  }, [invoice.id, invoice.version, showStatusHistory]);

  const togglePanel = (name) => setPanel((current) => (current === name ? null : name));

  useEffect(() => {
    if (panel === 'cancel' && !canCancel) setPanel(null);
    if (panel === 'return' && !canCreateReturn) setPanel(null);
  }, [panel, canCancel, canCreateReturn]);

  const openPayment = () => {
    paymentKeyRef.current = crypto.randomUUID();
    setPayment({ amount: '' });
    setPaymentCreditDue('');
    togglePanel('payment');
  };

  const openCreditReturn = () => {
    setCreditReturnInput('');
    togglePanel('creditReturn');
  };

  const openReturn = () => {
    setReturnDraft({
      reason: '',
      returnDate: today(),
      lines: Object.fromEntries(
        returnableLines.map((line) => [String(line.id), { quantity: 0, disposition: 'saleable' }])
      ),
    });
    togglePanel('return');
  };

  const openCancel = () => {
    setCancelReason('');
    setCancelConfirm('');
    togglePanel('cancel');
  };

  const handleMarkPaid = async () => {
    if (unpaid <= 0) {
      toast('This invoice has no unpaid amount');
      return;
    }
    setBusy(true);
    try {
      await recordInvoicePayment(invoice.id, {
        amount: unpaid.toFixed(2),
        paymentDate: today(),
        expectedVersion: invoice.version,
        idempotencyKey: crypto.randomUUID(),
      });
      toast(`${invoice.number} marked as paid`);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    const paidText = payment.amount.trim();

    if (paidText && !MONEY_PATTERN.test(paidText)) {
      toast('Enter a valid paid amount with at most two decimal places');
      return;
    }
    const paidPaisa = toPaisa(paidText);
    if (paidPaisa < 0 || paidPaisa > toPaisa(unpaid)) {
      toast(`Paid amount must be between 0 and ${rs(unpaid)}`);
      return;
    }
    const remaining = toPaisa(unpaid) - paidPaisa;
    if (remaining > 0 && !paymentCreditDue) {
      toast('Enter a credit due date');
      return;
    }

    setBusy(true);
    try {
      const result = await recordInvoicePayment(invoice.id, {
        amount: paidText || '0.00',
        paymentKind: 'payment',
        creditDueDate: remaining > 0 ? paymentCreditDue : undefined,
        paymentDate: today(),
        expectedVersion: invoice.version,
        idempotencyKey: paymentKeyRef.current,
      });

      if (result?.replayed) toast('This payment was already recorded');
      else toast(`Payment recorded for ${invoice.number}`);

      setPayment({ amount: '' });
      paymentKeyRef.current = crypto.randomUUID();
      setPanel(null);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreditReturn = async (event) => {
    event.preventDefault();
    const text = creditReturnInput.trim();
    if (!MONEY_PATTERN.test(text)) {
      toast('Enter a valid credit return amount with at most two decimal places');
      return;
    }
    const returnPaisa = toPaisa(text);
    if (returnPaisa <= 0 || returnPaisa > creditOutstandingPaisa) {
      toast(`Credit return cannot be more than ${rs(creditOutstandingAmount)}`);
      return;
    }
    setBusy(true);
    try {
      await recordInvoicePayment(invoice.id, {
        amount: text,
        paymentKind: 'credit_return',
        paymentDate: today(),
        expectedVersion: invoice.version,
        idempotencyKey: crypto.randomUUID(),
      });
      toast(`Credit return of ${rs(text)} recorded`);
      setCreditReturnInput('');
      setPanel(null);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const setReturnLine = (key, patch) =>
    setReturnDraft((draft) => ({
      ...draft,
      lines: { ...draft.lines, [key]: { ...draft.lines[key], ...patch } },
    }));

  const handleCreateReturn = async (event) => {
    event.preventDefault();
    const reason = returnDraft.reason.trim();
    if (!reason) {
      toast('Enter a reason for the return');
      return;
    }

    const items = [];
    for (const line of returnableLines) {
      const entry = returnDraft.lines[String(line.id)] || {};
      const quantity = Number(entry.quantity) || 0;
      if (quantity <= 0) continue;
      const max = maxReturnable(line);
      if (quantity > max) {
        toast(`Return quantity for "${line.name}" cannot be more than ${max}`);
        return;
      }
      items.push({
        invoiceItemId: Number(line.id),
        quantity,
        disposition: entry.disposition || 'saleable',
      });
    }
    if (items.length === 0) {
      toast('Enter a quantity for at least one item');
      return;
    }

    setBusy(true);
    try {
      await createInvoiceReturn(invoice.id, {
        returnDate: returnDraft.returnDate,
        reason,
        items,
      });
      toast('Return created. Stock and balances update after approval.');
      setPanel(null);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDecideReturn = async (record, approve) => {
    if (!approve && !rejectReason.trim()) {
      toast('Enter a reason to reject this return');
      return;
    }
    setBusy(true);
    try {
      await decideInvoiceReturn(invoice.id, record.id, {
        approve,
        reason: approve ? '' : rejectReason.trim(),
      });
      toast(approve ? `Return ${record.returnNumber} approved` : `Return ${record.returnNumber} rejected`);
      setRejectingId(null);
      setRejectReason('');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    if (!cancelReason.trim()) {
      toast('Enter a reason to cancel');
      return;
    }
    if (cancelConfirm.trim() !== invoice.number) {
      toast(`Type ${invoice.number} to confirm cancellation`);
      return;
    }
    setBusy(true);
    try {
      await cancelInvoice(invoice.id, {
        reason: cancelReason.trim(),
        confirmNumber: cancelConfirm.trim(),
      });
      toast(`${invoice.number} cancelled`);
      onClose();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const timelineRows = [...(timeline?.history || [])].reverse();

  return (
    <Modal open onClose={onClose} title={invoice.number}>
      <div className="invoice-document mx-auto w-full max-w-[760px] space-y-7 rounded-2xl border border-line bg-card p-5 sm:p-8">
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-bold text-ink">{businessName}</p>
            <p className="mt-1 text-xs text-muted">Invoice</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-ink">{invoice.number}</p>
            <div className="mt-2 flex justify-end">
              <InvoiceStatusPills invoice={{ ...invoice, statuses }} />
            </div>
          </div>
        </div>

        {/* Bill to and dates */}
        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <div className="space-y-0.5">
            <p className="mb-1 font-semibold text-ink">Bill to</p>
            <p className="font-semibold text-ink">{customer?.name ?? 'Unknown customer'}</p>
            {customer?.ntn && (
              <p className="text-muted">
                NTN {customer.ntn}
                {customer.registration ? ` (${customer.registration})` : ''}
              </p>
            )}
            {customer?.address && <p className="text-muted">{customer.address}</p>}
            {customer?.phone && <p className="text-muted">{customer.phone}</p>}
          </div>
          <div className="space-y-1 sm:text-right">
            <p>
              <span className="font-semibold text-ink">Invoice date: </span>
              <span className="text-muted">{formatDate(invoice.date)}</span>
            </p>
            {invoice.dueDate && (
              <p>
                <span className="font-semibold text-ink">Due date: </span>
                <span className="text-muted">{formatDate(invoice.dueDate)}</span>
              </p>
            )}
            <p>
              <span className="font-semibold text-ink">Created by: </span>
              <span className="text-muted">
                {preparedBy?.name}
                {preparedBy?.email ? ` <${preparedBy.email}>` : ''}
              </span>
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Tax</th>
                <th className="py-2 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((line) => (
                <tr key={line.id} className="border-b border-line">
                  <td className="py-3">
                    <span className="text-ink">{line.name}</span>
                    {line.code && <span className="ml-2 text-xs text-muted">{line.code}</span>}
                  </td>
                  <td className="py-3 text-right tabular-nums">{line.qty}</td>
                  <td className="py-3 text-right tabular-nums">{rs(line.price)}</td>
                  <td className="py-3 text-right tabular-nums">{line.taxRate}%</td>
                  <td className="py-3 text-right font-medium tabular-nums">{rs(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto w-full max-w-[260px] space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="tabular-nums">{rs(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Tax</span>
            <span className="tabular-nums">{rs(invoice.taxTotal)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-ink pt-2 text-base font-bold">
            <span>Grand total</span>
            <span className="tabular-nums">{rs(invoice.grandTotal)}</span>
          </div>
          {Number(financials.returnValueSettled) > 0 && (
            <div className="flex justify-between text-xs text-muted">
              <span>Net after returns</span>
              <span className="tabular-nums">{rs(invoice.netTotal)}</span>
            </div>
          )}
        </div>

        {/* Account summary */}
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-muted">Account summary</p>
          <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            <SummaryRow label="Original total" value={rs(financials.originalTotal ?? invoice.grandTotal)} />
            <SummaryRow label="Return value" value={rs(financials.returnValueSettled ?? 0)} />
            <SummaryRow label="Amount paid" value={rs(financials.amountPaid ?? 0)} />
            <SummaryRow label="Credit given" value={rs(creditOutstandingAmount)} />
            {hasOutstandingCredit && creditDueDate && (
              <SummaryRow label="Credit due date" value={formatDate(creditDueDate)} />
            )}
            <SummaryRow label="Unpaid" value={rs(unpaid)} strong />
          </dl>
        </div>

        {/* Actions (hidden when printing) */}
        <div className="print:hidden border-t border-line pt-4 mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {onEditDraft && invoice.status === INVOICE_STATUS.DRAFT && (
              <Button size="sm" variant="secondary" onClick={() => onEditDraft(invoice)}>
                Edit draft
              </Button>
            )}
            {canRecordPayment && !hasOutstandingCredit && unpaidPaisa > 0 && (
              <Button
                size="sm"
                variant="secondary"
                icon={<CreditCardIcon size={16} />}
                onClick={openPayment}
                disabled={busy}
              >
                Record payment
              </Button>
            )}
            {hasOutstandingCredit && (
              <Button
                size="sm"
                variant="secondary"
                icon={<CreditCardIcon size={16} />}
                onClick={openCreditReturn}
                disabled={busy}
              >
                Credit return
              </Button>
            )}
            {canRecordPayment && unpaidPaisa > 0 && !hasOutstandingCredit && (
              <Button
                size="sm"
                variant="secondary"
                icon={<CheckCircleIcon size={16} />}
                onClick={handleMarkPaid}
                disabled={busy}
              >
                Mark fully paid
              </Button>
            )}
            {unpaidPaisa > 0 && ![INVOICE_STATUS.DRAFT, INVOICE_STATUS.CANCELLED, 'void'].includes(invoice.status) && (
              <Button
                size="sm"
                variant="secondary"
                icon={<RotateCcwIcon size={16} />}
                onClick={openReturn}
                disabled={busy}
              >
                Create stock return
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <Button
              size="sm"
              variant="ghost"
              icon={<DownloadIcon size={16} />}
              onClick={() => downloadInvoicePdf(invoice, customer, seller, `${invoice.number}.pdf`)}
            >
              Download PDF
            </Button>
            {canCancel && (
              <Button size="sm" variant="danger" onClick={openCancel} disabled={busy}>
                Cancel invoice
              </Button>
            )}
          </div>
        </div>

        {/* Open action form. Scrolls into view when a button is clicked. */}
        <div ref={panelRef} className="scroll-mt-4 print:hidden space-y-4">
          {/* Record payment */}
          {panel === 'payment' && (
            <form onSubmit={handleRecordPayment} className="space-y-3 rounded-xl border border-line p-4">
              <p className="text-sm font-semibold text-ink">Record payment</p>
              <p className="text-xs text-muted">
                Unpaid balance: {rs(unpaid)}. Cash and credit together cannot exceed this. Credit is part of the unpaid amount.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Paid amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={payment.amount}
                  onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))}
                />
                <Input
                  label="Credit (left on account)"
                  inputMode="decimal"
                  placeholder="0.00"
                  readOnly
                  value={fromPaisa(Math.max(toPaisa(unpaid) - toPaisa(payment.amount), 0)).toFixed(2)}
                />
                <Input
                  label="Credit due date"
                  type="date"
                  min={today()}
                  value={paymentCreditDue}
                  onChange={(event) => setPaymentCreditDue(event.target.value)}
                  hint="Required when remaining credit is above 0"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={busy}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>
                  Close
                </Button>
              </div>
            </form>
          )}

          {/* Credit return */}
          {panel === 'creditReturn' && (
            <form onSubmit={handleCreditReturn} className="print:hidden space-y-3 rounded-xl border border-line p-4">
              <p className="text-sm font-semibold text-ink">Credit return</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Credit given" value={creditOutstandingAmount.toFixed(2)} readOnly className="opacity-80" />
                <Input
                  label="Credit return"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={creditReturnInput}
                  onChange={(event) => setCreditReturnInput(event.target.value)}
                />
                <Input label="Remaining credit" value={fromPaisa(Math.max(creditOutstandingPaisa - toPaisa(creditReturnInput), 0)).toFixed(2)} readOnly className="opacity-80" />
              </div>
              <p className="text-xs text-muted">Credit return cannot be more than the credit given.</p>
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={busy}>Save</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>Close</Button>
              </div>
            </form>
          )}

          {/* Create return */}
          {panel === 'return' && canCreateReturn && (
            <form onSubmit={handleCreateReturn} className="space-y-4 rounded-xl border border-line p-4">
              <p className="text-sm font-semibold text-ink">Create stock return</p>
              <p className="text-xs text-muted">
                Stock return can only settle up to the outstanding amount of {rs(financials.unpaid)}. Paid amounts are not refunded through a return.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Return date"
                  type="date"
                  value={returnDraft.returnDate}
                  onChange={(event) => setReturnDraft((draft) => ({ ...draft, returnDate: event.target.value }))}
                />
                <Input
                  label="Reason"
                  value={returnDraft.reason}
                  onChange={(event) => setReturnDraft((draft) => ({ ...draft, reason: event.target.value }))}
                />
              </div>

              {returnableLines.length === 0 ? (
                <p className="text-sm text-muted">Every item on this invoice is already returned or reserved.</p>
              ) : (
                <div className="space-y-3">
                  {returnableLines.map((line) => {
                    const key = String(line.id);
                    const entry = returnDraft.lines[key] || { quantity: 0, disposition: 'saleable' };
                    const max = maxReturnable(line);
                    return (
                      <div key={key} className="grid items-end gap-3 sm:grid-cols-[1fr_110px_1.2fr]">
                        <p className="text-sm text-ink">
                          {line.name} <span className="text-muted">(max {max})</span>
                        </p>
                        <Input
                          label="Quantity"
                          inputMode="numeric"
                          value={String(entry.quantity)}
                          onChange={(event) => {
                            const quantity = Math.min(Math.max(parseInt(event.target.value, 10) || 0, 0), max);
                            setReturnLine(key, { quantity });
                          }}
                        />
                        <Select
                          label="Condition"
                          value={entry.disposition}
                          onChange={(value) => setReturnLine(key, { disposition: value })}
                        >
                          <option value="saleable">Saleable (restock on approval)</option>
                          <option value="unsaleable">Unsaleable (no restock)</option>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={busy} disabled={returnableLines.length === 0}>
                  Create stock return
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>
                  Close
                </Button>
              </div>
            </form>
          )}

          {/* Cancel */}
          {panel === 'cancel' && canCancel && (
            <form onSubmit={handleCancel} className="space-y-3 rounded-xl border border-danger-border p-4">
              <p className="text-sm font-semibold text-danger">Cancel invoice</p>
              <Input label="Reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
              <Input
                label={`Type ${invoice.number} to confirm`}
                value={cancelConfirm}
                onChange={(event) => setCancelConfirm(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="danger" loading={busy}>
                  Cancel invoice
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>
                  Keep invoice
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Returns list */}
        {(invoice.returns || []).length > 0 && (
          <section className="print:hidden space-y-2">
            <p className="text-xs font-semibold uppercase text-muted">Returns</p>
            <ul className="divide-y divide-line text-sm">
              {invoice.returns.map((record) => (
                <li key={record.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-medium text-ink">{record.returnNumber}</span>{' '}
                      <span className="text-muted">
                        {formatDate(record.returnDate)} · {record.status} · {rs(record.totalAmount)}
                      </span>
                    </div>
                    {record.status === 'pending' && toPaisa(record.totalAmount) > outstandingCapPaisa && (
                      <p className="mt-1 text-xs text-danger">
                        This return is more than the outstanding amount ({rs(financials.unpaid)}). It cannot be approved until it is reduced.
                      </p>
                    )}
                    {record.status === 'pending' && rejectingId !== record.id && (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy} onClick={() => handleDecideReturn(record, true)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setRejectingId(record.id);
                            setRejectReason('');
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                  {rejectingId === record.id && (
                    <div id={`reject-form-${record.id}`} className="mt-3 flex flex-wrap items-end gap-2">
                      <Input
                        label="Rejection reason"
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        className="min-w-[220px] flex-1"
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy}
                        onClick={() => handleDecideReturn(record, false)}
                      >
                        Confirm reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                        Keep
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Status history (Reports only) */}
        {showStatusHistory && (
  <section className="print:hidden space-y-2">
    <p className="text-xs font-semibold uppercase text-muted">Status history</p>
    {timelineError && <p className="text-sm text-danger">{timelineError}</p>}
    {!timeline && !timelineError && <p className="text-sm text-muted">Loading…</p>}
    {timeline && timelineRows.length === 0 && (
      <p className="text-sm text-muted">No history yet.</p>
    )}
    {timelineRows.length > 0 && (
      <ul className="divide-y divide-line text-sm">
        {timelineRows.map((row) => (
          <li key={row.id} className="py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">{row.label}</span>
              <span className="text-muted">{formatDateTime(row.at)}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted">
              by {row.userName}
              {row.amount !== null && row.amount !== undefined ? ` · ${rs(row.amount)}` : ''}
              {row.reason ? ` · ${row.reason}` : ''}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
)}
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-bold text-ink' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}