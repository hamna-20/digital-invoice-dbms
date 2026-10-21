import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Pill from '../../components/ui/Pill';
import StatCard from '../../components/ui/StatCard';
import { INVOICE_STATUS, INVOICE_STATUS_META, LOW_STOCK_THRESHOLD } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatDate } from '../../lib/dates';
import { formatMoney, formatMoneyWithPrefix, formatNumber } from '../../lib/format';
import { invoiceTax, invoiceTotal } from '../../lib/invoiceMath';
import { newestFirst } from '../../lib/reports';
import InvoiceView from '../invoices/InvoiceView';
import LowStockCard from './LowStockCard';
import MonthlySalesChart from './MonthlySalesChart';

export default function DashboardPage() {
  const { products, customers, invoices, userProfile, updateUserProfile } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewingId, setViewingId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    businessName: '',
    ntn: '',
    defaultTaxRate: '18',
    invoicePrefix: 'INV-',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [dismissedLowStock, setDismissedLowStock] = useState(
    () => sessionStorage.getItem('ledgerly_low_stock_dismissed') === '1'
  );

  const profile = userProfile || {
    businessName: user?.business || '',
    ntn: user?.businessNtn || '',
    defaultTaxRate: user?.defaultTaxRate ?? 18,
    invoicePrefix: user?.invoicePrefix || 'INV-',
  };

  const lowStock = useMemo(
    () => products.filter((product) => Number(product.stock) <= LOW_STOCK_THRESHOLD),
    [products]
  );

  const openSettings = () => {
    setSettingsForm({
      businessName: profile.businessName || '',
      ntn: profile.ntn || '',
      defaultTaxRate: String(profile.defaultTaxRate ?? 18),
      invoicePrefix: profile.invoicePrefix || 'INV-',
    });
    setSettingsOpen(true);
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      await updateUserProfile({
        businessName: settingsForm.businessName.trim(),
        ntn: settingsForm.ntn.trim(),
        defaultTaxRate: Number(settingsForm.defaultTaxRate) || 0,
        invoicePrefix: settingsForm.invoicePrefix.trim() || 'INV-',
      });
      toast('Settings saved');
      setSettingsOpen(false);
    } catch (error) {
      toast(error.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const dismissLowStock = () => {
    sessionStorage.setItem('ledgerly_low_stock_dismissed', '1');
    setDismissedLowStock(true);
  };

  const stats = useMemo(() => {
    const issued = invoices.filter((invoice) => invoice.status !== INVOICE_STATUS.DRAFT);
    const pending = invoices.filter((invoice) => invoice.status === INVOICE_STATUS.PENDING);
    return {
      sales: issued.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
      tax: issued.reduce((sum, invoice) => sum + invoiceTax(invoice), 0),
      pendingTotal: pending.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
      pendingCount: pending.length,
    };
  }, [invoices]);

  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers]
  );
  const recentInvoices = useMemo(() => newestFirst(invoices).slice(0, 5), [invoices]);
  const viewingInvoice = invoices.find((invoice) => invoice.id === viewingId);

  const columns = [
    { key: 'id', label: 'Invoice', render: (invoice) => <span className="font-semibold">{invoice.id}</span> },
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
      key: 'status',
      label: 'Status',
      render: (invoice) => {
        const meta = INVOICE_STATUS_META[invoice.status];
        return <Pill variant={meta.tone}>{meta.label}</Pill>;
      },
    },
  ];

  return (
    <>
      <PageHeader title="Good day" subtitle="Here's how your business is doing today.">
        <Button onClick={() => navigate('/invoices?new=1')}>+ New invoice</Button>
      </PageHeader>

      {lowStock.length > 0 && !dismissedLowStock && (
        <div className="relative mb-[18px] rounded-notice border border-warning-border bg-grad-notice px-4 py-3 pr-10 text-[13px] text-warning">
          {lowStock.length} {lowStock.length === 1 ? 'product is' : 'products are'} running low.{' '}
          <Link to="/products" className="font-semibold hover:underline">
            View products
          </Link>
          <button
            type="button"
            aria-label="Dismiss low stock notice"
            onClick={dismissLowStock}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-avatar text-warning transition-colors hover:bg-warning-bg hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <StatCard label="Total sales" value={formatMoneyWithPrefix(stats.sales)} gradient="bg-grad-stat-sales" />
        <StatCard label="Tax collected" value={formatMoneyWithPrefix(stats.tax)} gradient="bg-grad-stat-tax" />
        <StatCard
          label="Pending payment"
          value={formatMoneyWithPrefix(stats.pendingTotal)}
          subLine={`${stats.pendingCount} awaiting payment`}
          gradient="bg-grad-stat-pending"
        />
        <StatCard
          label="Customers"
          value={formatNumber(customers.length)}
          subLine={`${products.length} products`}
          gradient="bg-grad-stat-customers"
        />
      </div>

      <Card
        title="Business settings"
        actions={
          <Button variant="ghost" size="sm" onClick={openSettings}>
            Manage settings
          </Button>
        }
        className="mb-[18px]"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <div>
            <p className="text-xs text-muted">Business name</p>
            <p className="mt-1 text-[13px] font-semibold">{profile.businessName || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted">NTN</p>
            <p className="mt-1 text-[13px] font-semibold">{profile.ntn || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Default tax rate</p>
            <p className="mt-1 text-[13px] font-semibold">{profile.defaultTaxRate ?? 18}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Invoice number prefix</p>
            <p className="mt-1 text-[13px] font-semibold">{profile.invoicePrefix || 'INV-'}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-[2fr_1fr] gap-[18px] max-[820px]:grid-cols-1">
        <MonthlySalesChart invoices={invoices} />
        <LowStockCard products={products} />
      </div>

      <Card
        title="Recent invoices"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
            View all
          </Button>
        }
        bodyClassName="p-0"
      >
        <DataTable
          columns={columns}
          rows={recentInvoices}
          rowKey={(invoice) => invoice.id}
          onRowClick={(invoice) => setViewingId(invoice.id)}
          emptyMessage="No invoices yet"
        />
      </Card>

      {viewingInvoice && (
        <InvoiceView
          invoice={viewingInvoice}
          onClose={() => setViewingId(null)}
          onEditDraft={(invoice) => {
            setViewingId(null);
            navigate(`/invoices?edit=${invoice.id}`);
          }}
        />
      )}

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Business settings"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="settings-form" loading={settingsSaving}>
              Save
            </Button>
          </>
        }
      >
        <form id="settings-form" onSubmit={saveSettings} className="grid gap-3.5">
          <Input
            label="Business name"
            value={settingsForm.businessName}
            onChange={(event) => setSettingsForm((current) => ({ ...current, businessName: event.target.value }))}
          />
          <Input
            label="NTN"
            value={settingsForm.ntn}
            onChange={(event) => setSettingsForm((current) => ({ ...current, ntn: event.target.value }))}
          />
          <Input
            label="Default tax rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={settingsForm.defaultTaxRate}
            onChange={(event) => setSettingsForm((current) => ({ ...current, defaultTaxRate: event.target.value }))}
          />
          <Input
            label="Invoice number prefix"
            value={settingsForm.invoicePrefix}
            onChange={(event) => setSettingsForm((current) => ({ ...current, invoicePrefix: event.target.value }))}
          />
        </form>
      </Modal>
    </>
  );
}
