import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import { DownloadIcon, EditIcon, EyeIcon, TrashIcon } from '../../components/icons/Icons';
import { INVOICE_STATUS } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatDate, today } from '../../lib/dates';
import { formatMoney } from '../../lib/format';
import { INVOICE_FILTERS, invoiceHasStatus } from '../../lib/invoiceStatus';
import { invoiceTax, invoiceTotal } from '../../lib/invoiceMath';
import { downloadInvoicePdf, downloadInvoicesPdf } from '../../lib/pdf';
import { newestFirst } from '../../lib/reports';
import { sellerDetails } from '../../lib/seller';
import InvoiceForm from './InvoiceForm';
import InvoiceStatusPills from './InvoiceStatusPills';
import InvoiceView from './InvoiceView';

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-card text-muted transition-colors hover:bg-surface hover:text-ink';

export default function InvoicesPage() {
  const { invoices, customers, products, userProfile, deleteInvoice } = useData();
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

  // Dashboard reminders can deep-link straight to the matching filter.
  useEffect(() => {
    const status = searchParams.get('status');
    if (!status || !INVOICE_FILTERS.some((filter) => filter.value === status)) return;
    setStatusFilter(status);
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const canCreateInvoice = customers.length > 0 && products.length > 0;
  const seller = sellerDetails(user, userProfile || {});
  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers]
  );

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return newestFirst(invoices).filter((invoice) => {
      // One invoice can match several chips (e.g. partially paid + return +
      // credit); "All" still lists it once.
      if (statusFilter !== 'all' && !invoiceHasStatus(invoice, statusFilter)) return false;
      if (!term) return true;
      const customerName = customerNames.get(invoice.customerId) || '';
      return invoice.number.toLowerCase().includes(term) || customerName.toLowerCase().includes(term);
    });
  }, [invoices, statusFilter, search, customerNames]);

  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        INVOICE_FILTERS.map((filter) => [
          filter.value,
          filter.value === 'all'
            ? invoices.length
            : invoices.filter((invoice) => invoiceHasStatus(invoice, filter.value)).length,
        ])
      ),
    [invoices]
  );

  /**
   * Export exactly what the user is looking at. The status chip and the search
   * box are already applied to `filteredInvoices`.
   */
  const downloadVisibleInvoices = () => {
    if (filteredInvoices.length === 0) return;
    const label = INVOICE_FILTERS.find((filter) => filter.value === statusFilter)?.label || 'All';
    downloadInvoicesPdf(
      filteredInvoices,
      (invoice) => customers.find((customer) => customer.id === invoice.customerId) || null,
      seller,
      `invoices-${label.toLowerCase().replaceAll(' ', '-')}-${today()}.pdf`
    );
  };

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

  // The navbar, dashboard and reminders open this modal through
  // ?new=1 / ?edit=INV-... / ?view=INV-....
  useEffect(() => {
    const wantsNew = searchParams.get('new') === '1';
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    if (!wantsNew && !editId && !viewId) return;

    if (wantsNew) {
      if (canCreateInvoice) {
        setFormInvoice(null);
        setFormOpen(true);
      } else {
        toast('Add at least one customer and one product first');
      }
    } else if (editId) {
      const draft = invoices.find(
        (invoice) => invoice.id === editId && invoice.status === INVOICE_STATUS.DRAFT
      );
      if (draft) {
        setViewingId(null);
        setFormInvoice(draft);
        setFormOpen(true);
      }
    } else {
      const target = invoices.find((invoice) => invoice.id === viewId || invoice.number === viewId);
      if (target) setViewingId(target.id);
      else toast('This invoice is not available.');
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
    {
      key: 'number',
      label: 'Invoice',
      render: (invoice) => <span className="font-semibold">{invoice.number}</span>,
    },
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
      render: (invoice) => (
        <div className="text-right">
          <div>{formatMoney(invoiceTotal(invoice))}</div>
          {Number(invoice.netTotal ?? invoiceTotal(invoice)) !== Number(invoice.grandTotal ?? invoiceTotal(invoice)) && (
            <div className="text-xs text-muted">Net {formatMoney(invoice.netTotal ?? invoiceTotal(invoice))}</div>
          )}
        </div>
      ),
    },
    {
      key: 'paid',
      label: 'Paid',
      align: 'right',
      hideBelow: 1000,
      render: (invoice) => formatMoney(invoice.financialSummary?.amountPaid || 0),
    },
    {
      key: 'returnCredit',
      label: 'Return credit',
      align: 'right',
      hideBelow: 1100,
      render: (invoice) => formatMoney(invoice.financialSummary?.returnCredit || 0),
    },
    {
      key: 'balance',
      label: 'Unpaid amount',
      align: 'right',
      hideBelow: 1000,
      render: (invoice) => formatMoney(invoice.financialSummary?.unpaid ?? invoiceTotal(invoice)),
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
      render: (invoice) => <InvoiceStatusPills invoice={invoice} />,
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
              className={ICON_BUTTON}
            >
              <EyeIcon size={16} />
            </button>
            <button
              type="button"
              title="Download PDF"
              aria-label="Download PDF"
              onClick={(event) => {
                event.stopPropagation();
                downloadInvoicePdf(invoice, customer, seller, `${invoice.number}.pdf`);
              }}
              className={ICON_BUTTON}
            >
              <DownloadIcon size={16} />
            </button>
            {invoice.status === INVOICE_STATUS.DRAFT && (
              <button
                type="button"
                title="Edit invoice"
                aria-label="Edit invoice"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditInvoice(invoice);
                }}
                className={ICON_BUTTON}
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
        <Button
          variant="ghost"
          onClick={downloadVisibleInvoices}
          disabled={filteredInvoices.length === 0}
          title="Download the invoices shown by the current filter and search"
        >
          <DownloadIcon size={16} /> Download ({filteredInvoices.length})
        </Button>
        <Button onClick={openNewInvoice}>+ New invoice</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {INVOICE_FILTERS.map((filter) => (
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
          onRowClick={(invoice) => setViewingId(invoice.id)}
          emptyMessage="No invoices found"
        />
      </Card>

      {formOpen && (
        <InvoiceForm
          invoice={formInvoice}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => setViewingId(saved.id)}
        />
      )}

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