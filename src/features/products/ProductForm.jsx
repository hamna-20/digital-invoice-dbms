import { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { productSchema, validate } from '../../lib/validators';

/**
 * Add / edit product modal.
 *
 * @param {object} props
 * @param {object|null} props.product - existing record, or null for a new one
 */
export default function ProductForm({ product, onClose }) {
  const { products, addProduct, updateProduct } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: product ? product.name : '',
    code: product ? product.code : '',
    price: product ? String(product.price) : '',
    taxRate: product ? String(product.taxRate) : '',
    stock: product ? String(product.stock) : '',
    status: product?.status || 'Active',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data, errors: nextErrors } = validate(productSchema, form);
    setErrors(nextErrors);
    if (!data) return;

    const codeTaken = products.some(
      (item) => item.code.toLowerCase() === data.code.toLowerCase() && (!product || item.id !== product.id)
    );
    if (codeTaken) {
      toast('That product code already exists');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        code: data.code,
        price: data.price,
        taxRate: data.taxRate,
        stock: data.stock,
        status: form.status,
      };
      if (product) await updateProduct({ ...product, ...payload });
      else await addProduct(payload);
      toast('Product saved');
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
      title={product ? 'Edit product' : 'Add product'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={submitting}>
            Save product
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-3.5 max-[600px]:grid-cols-1">
          <Input
            className="col-span-2 max-[600px]:col-span-1"
            label="Product name"
            required
            value={form.name}
            onChange={update('name')}
            error={errors.name}
          />
          <Input label="Product code" required value={form.code} onChange={update('code')} error={errors.code} />
          <Input
            label="Price (PKR)"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.price}
            onChange={update('price')}
            error={errors.price}
          />
          <Input
            label="Tax rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            value={form.taxRate}
            onChange={update('taxRate')}
            error={errors.taxRate}
          />
          <Input
            label="Stock quantity"
            type="number"
            min="0"
            step="1"
            required
            value={form.stock}
            onChange={update('stock')}
            error={errors.stock}
          />
          <Select label="Status" value={form.status} onChange={update('status')}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}
