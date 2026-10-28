import { useMemo, useState } from 'react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Pill from '../../components/ui/Pill';
import SearchInput from '../../components/ui/SearchInput';
import { REGISTRATION_TONE, UNPAID_STATUSES } from '../../config/constants';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatMoney } from '../../lib/format';
import { invoiceTotal } from '../../lib/invoiceMath';
import CustomerForm from './CustomerForm';

export default function CustomersPage() {
  const { customers, invoices, deleteCustomer, loadError, loading, refresh } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [formCustomer, setFormCustomer] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const retryLoading = async () => {
    setRetrying(true);
    try {
      await refresh();
    } catch (error) {
      toast(error.message);
    } finally {
      setRetrying(false);
    }
  };

  const outstandingByCustomer = useMemo(() => {
    const totals = new Map();
    invoices
      .filter((invoice) => UNPAID_STATUSES.includes(invoice.status))
      .forEach((invoice) => {
        totals.set(invoice.customerId, (totals.get(invoice.customerId) || 0) + invoiceTotal(invoice));
      });
    return totals;
  }, [invoices]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.ntn, customer.phone, customer.address].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [customers, search]);

  const openNewCustomer = () => {
    setFormCustomer(null);
    setFormOpen(true);
  };

  const openEditCustomer = (customer) => {
    setFormCustomer(customer);
    setFormOpen(true);
  };

  const handleDeleteClick = (customer) => {
    const hasInvoices = invoices.some((invoice) => invoice.customerId === customer.id);
    if (hasInvoices) {
      toast("This customer has invoices and can't be deleted");
      return;
    }
    setDeleting(customer);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteCustomer(deleting.id);
      toast('Customer deleted');
      setDeleting(null);
    } catch (error) {
      toast(error.message);
    } finally {
      setDeletingBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: (customer) => <span className="text-[13px] font-semibold">{customer.name}</span>,
    },
    {
      key: 'ntn',
      label: 'NTN / CNIC',
      render: (customer) => <span className="text-[13px] tabular-nums">{customer.ntn}</span>,
    },
    {
      key: 'registration',
      label: 'Registration',
      render: (customer) => (
        <Pill variant={REGISTRATION_TONE[customer.registration] || 'indigo'}>{customer.registration}</Pill>
      ),
    },
    {
      key: 'phone',
      label: 'Contact',
      hideBelow: 820,
      render: (customer) => <span className="text-[13px] tabular-nums">{customer.phone}</span>,
    },
    {
      key: 'address',
      label: 'Address',
      hideBelow: 820,
      render: (customer) => <span className="text-[13px]">{customer.address}</span>,
    },
    {
      key: 'outstanding',
      label: 'Unpaid amount (PKR)',
      align: 'right',
      render: (customer) => formatMoney(outstandingByCustomer.get(customer.id) || 0),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (customer) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openEditCustomer(customer)}>
            Edit
          </Button>
          <Button variant="link-danger" size="sm" onClick={() => handleDeleteClick(customer)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Customers">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customers"
        />
        <Button onClick={openNewCustomer}>+ Add customer</Button>
      </PageHeader>

      {loadError && (
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 rounded-notice border border-danger-border bg-danger-hover-bg px-4 py-3 text-[13px] text-danger">
          <span>{loading ? 'Loading customers...' : `Could not load customers: ${loadError}`}</span>
          <Button variant="ghost" size="sm" loading={retrying} onClick={retryLoading}>
            Retry
          </Button>
        </div>
      )}

      <Card bodyClassName="p-0">
        <DataTable
          columns={columns}
          rows={filteredCustomers}
          rowKey={(customer) => customer.id}
          emptyMessage={loading ? 'Loading customers...' : 'No customers found'}
        />
      </Card>

      {formOpen && <CustomerForm customer={formCustomer} onClose={() => setFormOpen(false)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        message="This customer record will be removed."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deletingBusy}
      />
    </>
  );
}
