import { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { REGISTRATION_STATUS } from '../../config/constants';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { customerSchema, formatCnic, formatMobile, validate } from '../../lib/validators';

/**
 * Add / edit customer modal.
 *
 * @param {object} props
 * @param {object|null} props.customer - existing record, or null for a new one
 */
export default function CustomerForm({ customer, onClose }) {
  const { addCustomer, updateCustomer } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: customer ? customer.name : '',
    ntn: customer ? customer.ntn : '',
    registration: customer ? customer.registration : REGISTRATION_STATUS.REGISTERED,
    phone: customer ? customer.phone : '',
    address: customer ? customer.address : '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  /** CNIC and mobile keep their dashes while typing, so only digits are accepted. */
  const updateFormatted = (field, formatter) => (event) =>
    setForm((current) => ({ ...current, [field]: formatter(event.target.value) }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data, errors: nextErrors } = validate(customerSchema, form);
    setErrors(nextErrors);
    if (!data) return;

    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        ntn: data.ntn,
        registration: data.registration,
        phone: data.phone,
        address: data.address,
      };
      if (customer) await updateCustomer({ ...customer, ...payload });
      else await addCustomer(payload);
      toast('Customer saved');
      onClose();
    } catch (error) {
      toast(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? 'Edit customer' : 'Add customer'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" loading={submitting}>
            Save customer
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-3.5 max-[600px]:grid-cols-1">
          <Input
            className="col-span-2 max-[600px]:col-span-1"
            label="Customer name"
            required
            value={form.name}
            onChange={update('name')}
            error={errors.name}
          />
          <Input
            label="NTN / CNIC"
            required
            inputMode="numeric"
            maxLength={15}
            placeholder="35202-1234567-1"
            value={form.ntn}
            onChange={updateFormatted('ntn', formatCnic)}
            error={errors.ntn}
          />
          <Select label="Registration status" value={form.registration} onChange={(value) => setForm((current) => ({ ...current, registration: value }))}>
            <option value={REGISTRATION_STATUS.REGISTERED}>{REGISTRATION_STATUS.REGISTERED}</option>
            <option value={REGISTRATION_STATUS.UNREGISTERED}>{REGISTRATION_STATUS.UNREGISTERED}</option>
          </Select>
          <Input
            label="Contact number"
            required
            inputMode="numeric"
            maxLength={12}
            placeholder="0300-1234567"
            value={form.phone}
            onChange={updateFormatted('phone', formatMobile)}
            error={errors.phone}
          />
          <Textarea
            className="col-span-2 max-[600px]:col-span-1"
            label="Billing address"
            rows={2}
            required
            value={form.address}
            onChange={update('address')}
            error={errors.address}
          />
        </div>
      </form>
    </Modal>
  );
}
