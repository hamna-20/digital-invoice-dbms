import { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { today } from '../../lib/dates';
import { invoiceSubtotal, invoiceTax, invoiceTotal } from '../../lib/invoiceMath';
import { downloadInvoicePdf } from '../../lib/pdf';
import { invoiceSchema, validate } from '../../lib/validators';
import InvoiceLineItems from './InvoiceLineItems';
import InvoiceTotals from './InvoiceTotals';

const emptyLine = () => ({ productId: '', name: '', price: 0, taxRate: 0, qty: 1 });

/**
 * Create / edit draft invoice modal.
 *
 * @param {object} props
 * @param {object|null} props.invoice - draft being edited, or null for a new invoice
 */
export default function InvoiceForm({ invoice, onClose }) {
  const { customers, products, saveInvoice, issueInvoice } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState(invoice?.customerId || (customers[0] ? customers[0].id : ''));
  const [date, setDate] = useState(invoice?.date || today());
  const [lines, setLines] = useState(() =>
    invoice ? invoice.lines.map((line) => ({ ...line })) : [emptyLine()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});

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
      if (mode === 'draft') {
        await saveInvoice(data);
        toast('Draft saved');
      } else {
        const saved = await issueInvoice(data);
        toast(`${saved.id} issued`);
      }
      onClose();
    } catch (error) {
      toast(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = invoiceSubtotal({ lines });
  const tax = invoiceTax({ lines });
  const total = invoiceTotal({ lines });

  const handleGeneratePdf = () => {
    const { data } = validate(invoiceSchema, {
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
      const { lines: linesMessage, ...rest } = validate(invoiceSchema, {
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
      }).errors;
      setErrors(rest);
      setLineErrors(
        lines
          .map((line, index) => [index, line.productId && Number(line.qty) > 0 ? null : 'Add a quantity'])
          .reduce((map, [index, message]) => (message ? { ...map, [index]: message } : map), {})
      );
      toast(linesMessage || rest.form || 'Check the highlighted fields');
      return;
    }

    const customer = customers.find((item) => item.id === data.customerId) || null;
    const previewInvoice = { id: data.id || 'INVOICE-PREVIEW', date: data.date, status: 'draft', lines: data.lines };
    downloadInvoicePdf(previewInvoice, customer, user, `${data.id || 'invoice'}.pdf`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={invoice ? `Edit ${invoice.id}` : 'New invoice'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="ghost" disabled={submitting} onClick={() => persist('draft')}>
            Save draft
          </Button>
          <Button variant="ghost" disabled={submitting} onClick={handleGeneratePdf}>
            Generate PDF
          </Button>
          <Button loading={submitting} onClick={() => persist('issue')}>
            Issue invoice
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3.5 max-[600px]:grid-cols-1">
        <Select
          label="Customer"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
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
      </div>

      <div className="mt-[18px]">
        <InvoiceLineItems
          lines={lines}
          products={products}
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
