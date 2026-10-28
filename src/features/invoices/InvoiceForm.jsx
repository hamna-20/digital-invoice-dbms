import { useMemo, useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { today } from '../../lib/dates';
import { invoiceSubtotal, invoiceTax, invoiceTotal } from '../../lib/invoiceMath';
import { invoiceSchema, validate } from '../../lib/validators';
import InvoiceLineItems from './InvoiceLineItems';
import InvoiceTotals from './InvoiceTotals';

const emptyLine = () => ({ productId: '', name: '', price: 0, taxRate: 0, qty: 1 });

/**
 * Create / edit draft invoice modal.
 *
 * @param {object} props
 * @param {object|null} props.invoice - draft being edited, or null for a new invoice
 * @param {function} [props.onSaved] - receives the saved invoice so the caller can open it
 */
export default function InvoiceForm({ invoice, onClose, onSaved }) {
  const { customers, products, saveInvoice, issueInvoice } = useData();
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState(invoice?.customerId || (customers[0] ? customers[0].id : ''));
  const [date, setDate] = useState(invoice?.date || today());
  const [dueDate, setDueDate] = useState(invoice?.dueDate || '');
  const [lines, setLines] = useState(() =>
    invoice
      ? invoice.lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          price: line.price,
          taxRate: line.taxRate,
          qty: line.qty,
        }))
      : [emptyLine()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});

  // Only active products can be picked. A product already on the invoice stays
  // visible even if it was deactivated later, so the line can still be edited.
  const selectableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.status === 'Active' || lines.some((line) => line.productId === product.id)
      ),
    [products, lines]
  );

  const updateLine = (index, patch) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    setLineErrors((current) => {
      if (!current[index]) return current;
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const handleProductChange = (index, productId) => {
    const product = products.find((item) => item.id === productId);
    updateLine(index, {
      productId,
      name: product ? product.name : '',
      price: product ? product.price : 0,
      taxRate: product ? product.taxRate : 0,
    });
  };

  const handleQtyChange = (index, qty) => updateLine(index, { qty });

  const handleRemove = (index) =>
    setLines((current) =>
      current.length === 1 ? [emptyLine()] : current.filter((line, i) => i !== index)
    );

  const handleAddLine = () => setLines((current) => [...current, emptyLine()]);

  const persist = async (mode) => {
    const { data, errors: nextErrors } = validate(invoiceSchema, {
      id: invoice ? invoice.id : undefined,
      customerId,
      date,
      lines: lines
        .filter((line) => line.productId && Number(line.qty) > 0)
        .map((line) => ({
          productId: line.productId,
          name: line.name,
          price: Number(line.price) || 0,
          taxRate: Number(line.taxRate) || 0,
          qty: Number(line.qty) || 0,
        })),
    });

    if (!data) {
      const { lines: linesMessage, ...rest } = nextErrors;
      setErrors(rest);
      setLineErrors(
        lines
          .map((line, index) => [index, line.productId && Number(line.qty) > 0 ? null : 'Add a quantity'])
          .reduce((map, [index, message]) => (message ? { ...map, [index]: message } : map), {})
      );
      toast(linesMessage || nextErrors.form || 'Check the highlighted fields');
      return;
    }

    setErrors({});
    setLineErrors({});
    setSubmitting(true);
    try {
      const payload = { ...data, dueDate: dueDate || null };
      const saved =
        mode === 'draft'
          ? await saveInvoice(payload)
          : await issueInvoice(payload);
      toast(mode === 'draft' ? 'Draft saved' : `${saved.number} issued`);
      onClose();
      onSaved?.(saved);
    } catch (error) {
      toast(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = invoiceSubtotal({ lines });
  const tax = invoiceTax({ lines });
  const total = invoiceTotal({ lines });

  return (
    <Modal
      open
      onClose={onClose}
      title={invoice ? `Edit ${invoice.number}` : 'New invoice'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="ghost" disabled={submitting} onClick={() => persist('draft')}>
            Save draft
          </Button>
          <Button loading={submitting} onClick={() => persist('issue')}>
            Issue invoice
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3.5 max-[600px]:grid-cols-1">
        <Select
          label="Customer"
          value={customerId}
          onChange={setCustomerId}
          error={errors.customerId}
        >
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </Select>
        <Input
          label="Invoice date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={errors.date}
        />
        <Input
          label="Due date (optional)"
          type="date"
          value={dueDate}
          min={date}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <div className="mt-[18px]">
        <InvoiceLineItems
          lines={lines}
          products={selectableProducts}
          lineErrors={lineErrors}
          onProductChange={handleProductChange}
          onQtyChange={handleQtyChange}
          onRemove={handleRemove}
        />
        <Button variant="ghost" size="sm" onClick={handleAddLine}>
          + Add item
        </Button>
      </div>

      <InvoiceTotals subtotal={subtotal} tax={tax} total={total} />
    </Modal>
  );
}
