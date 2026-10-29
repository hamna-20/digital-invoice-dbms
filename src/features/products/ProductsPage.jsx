import { useMemo, useState } from 'react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatMoney, formatNumber } from '../../lib/format';
import ProductForm from './ProductForm';

export default function ProductsPage() {
  const { products, deleteProduct } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [formProduct, setFormProduct] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.code.toLowerCase().includes(term)
    );
  }, [products, search]);

  const openNewProduct = () => {
    setFormProduct(null);
    setFormOpen(true);
  };

  const openEditProduct = (product) => {
    setFormProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteProduct(deleting.id);
      toast('Product deleted');
      setDeleting(null);
    } catch (error) {
      toast(error.message);
    } finally {
      setDeletingBusy(false);
    }
  };

  const STOCK_BADGE = {
    available: { label: 'Available', cls: 'bg-success-bg text-success' },
    out_of_stock: { label: 'Unavailable', cls: 'bg-danger/10 text-danger' },
    inactive: { label: 'Inactive', cls: 'bg-surface text-muted' },
  };

  const columns = [
    { key: 'name', label: 'Product', render: (product) => <span className="font-semibold">{product.name}</span> },
    { key: 'code', label: 'Code', render: (product) => product.code },
    { key: 'price', label: 'Price (PKR)', align: 'right', render: (product) => (Number(product.stock) <= 0 ? '—' : formatMoney(product.price)) },
    { key: 'taxRate', label: 'Tax', align: 'right', render: (product) => (Number(product.stock) <= 0 ? '—' : `${formatNumber(product.taxRate)}%`) },
    { key: 'stock', label: 'Stock', align: 'right', render: (product) => formatNumber(product.stock) },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const badge = STOCK_BADGE[row.stockStatus] || STOCK_BADGE.available;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-pill px-[11px] py-[3px] text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (product) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openEditProduct(product)}>
            Edit
          </Button>
          <Button variant="link-danger" size="sm" onClick={() => setDeleting(product)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Products">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or code"
        />
        <Button onClick={openNewProduct}>+ Add product</Button>
      </PageHeader>

      <Card bodyClassName="p-0">
        <DataTable
          columns={columns}
          rows={filteredProducts}
          rowKey={(product) => product.id}
          emptyMessage="No products found"
        />
      </Card>

      {formOpen && <ProductForm product={formProduct} onClose={() => setFormOpen(false)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        message="This product will be removed from your catalogue. Products used on invoices are protected and must be marked Unavailable instead."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deletingBusy}
      />
    </>
  );
}
