import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import DataTable from '../../components/ui/DataTable';
import Pill from '../../components/ui/Pill';
import SearchInput from '../../components/ui/SearchInput';
import { DownloadIcon, EditIcon, EyeIcon, TrashIcon } from '../../components/icons/Icons';
import { INVOICE_STATUS, INVOICE_STATUS_META } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatDate } from '../../lib/dates';
import { formatMoney } from '../../lib/format';
import { invoiceTax, invoiceTotal } from '../../lib/invoiceMath';
import { downloadInvoicePdf } from '../../lib/pdf';
import { newestFirst } from '../../lib/reports';
import InvoiceForm from './InvoiceForm';
import InvoiceView from './InvoiceView';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: INVOICE_STATUS.DRAFT, label: 'Draft' },
  { value: INVOICE_STATUS.PENDING, label: 'Pending' },
  { value: INVOICE_STATUS.OVERDUE, label: 'Overdue' },
  { value: INVOICE_STATUS.PAID, label: 'Paid' },
  { value: INVOICE_STATUS.CANCELLED, label: 'Cancelled' },
];

export default function InvoicesPage() {
  const { invoices, customers, products, deleteInvoice } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formInvoice, setFormInvoice] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    setStatusFilter('all');
    setSearch('');
  }, [user?.id]);

  const canCreateInvoice = customers.length > 0 && products.length > 0;
  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers]
  );

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return newestFirst(invoices).filter((invoice) => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
      if (!term) return true;
      const customerName = customerNames.get(invoice.customerId) || '';
      return invoice.number.toLowerCase().includes(term) || customerName.toLowerCase().includes(term);
    });
  }, [invoices, statusFilter, search, customerNames]);

  const statusCounts = useMemo(
    () => ({
      all: invoices.length,
      [INVOICE_STATUS.DRAFT]: invoices.filter((invoice) => invoice.status === INVOICE_STATUS.DRAFT).length,
      [INVOICE_STATUS.PENDING]: invoices.filter((invoice) => invoice.status === INVOICE_STATUS.PENDING).length,
      [INVOICE_STATUS.OVERDUE]: invoices.filter((invoice) => invoice.status === INVOICE_STATUS.OVERDUE).length,
      [INVOICE_STATUS.PAID]: invoices.filter((invoice) => invoice.status === INVOICE_STATUS.PAID).length,
      [INVOICE_STATUS.CANCELLED]: invoices.filter((invoice) => invoice.status === INVOICE_STATUS.CANCELLED).length,
    }),
    [invoices]
  );

  const openNewInvoice = () => {
    if (!canCreateInvoice) {
      toast('Add at least one customer and one product first');
      return;
    }
    setFormInvoice(null);
    setFormOpen(true);
  };

  const openEditInvoice = (invoice) => {
    setViewingId(null);
    setFormInvoice(invoice);
    setFormOpen(true);
  };

  // The navbar and dashboard open this modal through ?new=1 / ?edit=INV-....
  useEffect(() => {
    const wantsNew = searchParams.get('new') === '1';
    const editId = searchParams.get('edit');
    if (!wantsNew && !editId) return;

    if (wantsNew) {
      if (canCreateInvoice) {
        setFormInvoice(null);
        setFormOpen(true);
      } else {
        toast('Add at least one customer and one product first');
      }
    } else {
      const draft = invoices.find(
        (invoice) => invoice.id === editId && invoice.status === INVOICE_STATUS.DRAFT
      );
      if (draft) {
        setViewingId(null);
        setFormInvoice(draft);
        setFormOpen(true);
      }
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, invoices, canCreateInvoice, toast, setSearchParams]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteInvoice(deleting.id);
      toast('Invoice deleted');
      setDeleting(null);
    } catch (error) {
      toast(error.message);
    } finally {
      setDeletingBusy(false);
    }
  };

  const viewingInvoice = invoices.find((invoice) => invoice.id === viewingId);

  const columns = [
    { key: 'number', label: 'Invoice', render: (invoice) => <span className="font-semibold">{invoice.number}</span> },
    { key: 'date', label: 'Date', hideBelow: 820, render: (invoice) => formatDate(invoice.date) },
    {
      key: 'customer',
      label: 'Customer',
      render: (invoice) => customerNames.get(invoice.customerId) || 'Unknown customer',
    },
    {
      key: 'total',
      label: 'Total (PKR)',
      align: 'right',
      render: (invoice) => formatMoney(invoiceTotal(invoice)),
    },
    {
      key: 'tax',
      label: 'Tax',
      align: 'right',
      hideBelow: 820,
      render: (invoice) => formatMoney(invoiceTax(invoice)),
    },
    {
      key: 'status',
      label: 'Status',
      render: (invoice) => {
        const meta = INVOICE_STATUS_META[invoice.status] || { label: invoice.status, tone: 'neutral' };
        return <Pill variant={meta.tone}>{meta.label}</Pill>;
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (invoice) => {
        const customer = customers.find((item) => item.id === invoice.customerId) || null;
        return (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              title="View invoice"
              aria-label="View invoice"
              onClick={(event) => {
                event.stopPropagation();
                setViewingId(invoice.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-card text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <EyeIcon size={16} />
            </button>
            {invoice.status === INVOICE_STATUS.PAID && (
              <button
                type="button"
                title="Download PDF"
                aria-label="Download PDF"
                onClick={(event) => {
                  event.stopPropagation();
                  downloadInvoicePdf(invoice, customer, user, `${invoice.number}.pdf`);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-card text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <DownloadIcon size={16} />
              </button>
            )}
            {invoice.status === INVOICE_STATUS.DRAFT && (
              <button
                type="button"
                title="Edit invoice"
                aria-label="Edit invoice"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditInvoice(invoice);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-card text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <EditIcon size={16} />
              </button>
            )}
            {invoice.status === INVOICE_STATUS.DRAFT && (
              <button
                type="button"
                title="Delete draft"
                aria-label="Delete draft"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleting(invoice);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-danger-border bg-card text-danger transition-colors hover:bg-danger-hover-bg"
              >
                <TrashIcon size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Invoices">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search invoice or customer"
        />
        <Button onClick={openNewInvoice}>+ New invoice</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Chip
            key={filter.value}
            active={statusFilter === filter.value}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label} ({statusCounts[filter.value] || 0})
          </Chip>
        ))}
      </div>

      <Card bodyClassName="p-0">
        <DataTable
          columns={columns}
          rows={filteredInvoices}
          rowKey={(invoice) => invoice.id}
          emptyMessage="No invoices found"
        />
      </Card>

      {formOpen && <InvoiceForm invoice={formInvoice} onClose={() => setFormOpen(false)} />}

      {viewingInvoice && (
        <InvoiceView
          invoice={viewingInvoice}
          onClose={() => setViewingId(null)}
          onEditDraft={openEditInvoice}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        message="This draft invoice will be permanently deleted. Issued, paid and cancelled invoices are kept as financial records."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deletingBusy}
      />
    </>
  );
}
