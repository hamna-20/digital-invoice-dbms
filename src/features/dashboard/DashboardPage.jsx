import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import { INVOICE_STATUS, LOW_STOCK_THRESHOLD, UNPAID_STATUSES } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatDate, today } from '../../lib/dates';
import { formatMoney, formatMoneyWithPrefix, formatNumber } from '../../lib/format';
import { invoiceTax, invoiceTotal } from '../../lib/invoiceMath';
import { newestFirst } from '../../lib/reports';
import InvoiceStatusPills from '../invoices/InvoiceStatusPills';
import InvoiceView from '../invoices/InvoiceView';
import LowStockCard from './LowStockCard';
import MonthlySalesChart from './MonthlySalesChart';

const REMINDER_STORAGE_KEY = 'ledgerly_dismissed_reminders';
const LOW_STOCK_STORAGE_KEY = 'ledgerly_low_stock_snooze_until';
const REMINDER_SNOOZE_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 7;

/**
 * Remaining balance for an unpaid invoice. The API's financial summary already
 * subtracts completed payments and applied credits; the local total is only a
 * fallback for records created before the financial tables existed.
 */
const outstandingOf = (invoice) =>
  invoice.financialSummary
    ? Number(invoice.financialSummary.outstanding) || 0
    : invoiceTotal(invoice);

/**
 * A reminder stays hidden for 24 hours after the user dismisses it. If the
 * invoice changes (new payment, new due date, different balance) the signature
 * no longer matches, so the reminder comes back immediately.
 */
const reminderSignature = (invoice) =>
  `${invoice.dueDate || ''}|${outstandingOf(invoice).toFixed(2)}`;

const reminderIsSnoozed = (entry, invoice, now) => {
  if (!entry || typeof entry !== 'object') return false; // old permanent dismissals expire
  if (entry.signature !== reminderSignature(invoice)) return false;
  return Number(entry.until) > now;
};

function readDismissedReminders() {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

/** Whole days from today to a YYYY-MM-DD date (positive = future). */
function daysUntil(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  if (!year || !month || !day) return 0;
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - startOfToday) / 86400000);
}

/** "Due today" / "Due in 3 days" / "Due 2 days ago". */
function dueLabel(invoice) {
  const days = daysUntil(invoice.dueDate);
  if (days === 0) return 'Due today';
  if (days > 0) return `Due in ${days} ${days === 1 ? 'day' : 'days'}`;
  const overdue = Math.abs(days);
  return `Due ${overdue} ${overdue === 1 ? 'day' : 'days'} ago`;
}

const REMINDER_TONE = {
  danger: {
    bg: 'border-danger-border bg-danger-hover-bg text-danger',
  },
  warning: {
    bg: 'border-warning-border bg-warning-bg text-warning',
  },
};

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
    strn: '',
    defaultTaxRate: '18',
    invoicePrefix: 'INV-',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [dismissedReminders, setDismissedReminders] = useState(readDismissedReminders);
  const [now, setNow] = useState(() => Date.now());
  const [lowStockSnoozeUntil, setLowStockSnoozeUntil] = useState(() => {
    try {
      return Number(localStorage.getItem(LOW_STOCK_STORAGE_KEY)) || 0;
    } catch (error) {
      return 0;
    }
  });

  // Re-check every minute so a reminder comes back on its own after 24 hours
  // even when the dashboard stays open.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const profile = userProfile || {
    businessName: user?.business || '',
    ntn: user?.businessNtn || '',
    strn: user?.strn || '',
    defaultTaxRate: user?.defaultTaxRate ?? 18,
    invoicePrefix: user?.invoicePrefix || 'INV-',
  };

  const lowStock = useMemo(
    () => products.filter((product) => Number(product.stock) <= LOW_STOCK_THRESHOLD),
    [products]
  );
  const overdueInvoices = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status === INVOICE_STATUS.OVERDUE)
        .sort((first, second) => String(first.dueDate || '').localeCompare(String(second.dueDate || ''))),
    [invoices]
  );

  // Anything unpaid that falls due in the next week (overdue has its own list).
  const todayValue = today();
  const dueSoonInvoices = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + DUE_SOON_DAYS);
    const limitValue = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(
      limit.getDate()
    ).padStart(2, '0')}`;
    return invoices
      .filter(
        (invoice) =>
          UNPAID_STATUSES.includes(invoice.status) &&
          invoice.status !== INVOICE_STATUS.OVERDUE &&
          invoice.dueDate &&
          invoice.dueDate >= todayValue &&
          invoice.dueDate <= limitValue
      )
      .sort((first, second) => String(first.dueDate).localeCompare(String(second.dueDate)));
  }, [invoices, todayValue]);

  const visibleOverdue = overdueInvoices.filter(
    (invoice) => !reminderIsSnoozed(dismissedReminders[invoice.id], invoice, now)
  );
  const visibleDueSoon = dueSoonInvoices.filter(
    (invoice) => !reminderIsSnoozed(dismissedReminders[invoice.id], invoice, now)
  );
  const showLowStock = lowStock.length > 0 && lowStockSnoozeUntil <= now;
  const overdueTotal = visibleOverdue.reduce(
    (sum, invoice) => sum + outstandingOf(invoice),
    0
  );
  const dueSoonTotal = visibleDueSoon.reduce(
    (sum, invoice) => sum + outstandingOf(invoice),
    0
  );

  const dismissReminders = (list) => {
    setDismissedReminders((current) => {
      const until = Date.now() + REMINDER_SNOOZE_MS;
      const next = { ...current };
      for (const invoice of list) {
        next[invoice.id] = { signature: reminderSignature(invoice), until };
      }
      try {
        localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        // Private-mode storage can reject writes; the reminder still hides for
        // this session because the in-memory state was updated.
      }
      return next;
    });
  };

  const openInvoice = (invoice) => {
    navigate(`/invoices?view=${encodeURIComponent(invoice.id)}`);
  };

  const openSettings = () => {
    setSettingsForm({
      businessName: profile.businessName || '',
      ntn: profile.ntn || '',
      strn: profile.strn || '',
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
        strn: settingsForm.strn.trim(),
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
    const until = Date.now() + REMINDER_SNOOZE_MS;
    try {
      localStorage.setItem(LOW_STOCK_STORAGE_KEY, String(until));
      sessionStorage.removeItem('ledgerly_low_stock_dismissed');
    } catch (error) {
      // The in-memory state still hides it for this session.
    }
    setLowStockSnoozeUntil(until);
  };

  const stats = useMemo(() => {
    const issued = invoices.filter(
      (invoice) =>
        invoice.status !== INVOICE_STATUS.DRAFT && invoice.status !== INVOICE_STATUS.CANCELLED
    );
    const pending = invoices.filter((invoice) => UNPAID_STATUSES.includes(invoice.status));
    return {
      sales: issued.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
      tax: issued.reduce((sum, invoice) => sum + invoiceTax(invoice), 0),
      pendingTotal: pending.reduce((sum, invoice) => sum + outstandingOf(invoice), 0),
      pendingCount: pending.length,
    };
  }, [invoices]);

  const totals = useMemo(() => {
    const issued = invoices.filter(
      (invoice) =>
        invoice.status !== INVOICE_STATUS.DRAFT && invoice.status !== INVOICE_STATUS.CANCELLED
    );
    const collected = issued.reduce(
      (sum, invoice) => sum + Number(invoice.financialSummary?.amountPaid || 0),
      0
    );
    const billedNet = issued.reduce(
      (sum, invoice) => sum + Number(invoice.netTotal ?? invoiceTotal(invoice)),
      0
    );
    const outstanding = issued.reduce(
      (sum, invoice) => sum + Number(invoice.financialSummary?.unpaid ?? outstandingOf(invoice)),
      0
    );
    return { collected, billedNet, outstanding };
  }, [invoices]);

  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers]
  );
  const recentInvoices = useMemo(() => newestFirst(invoices).slice(0, 5), [invoices]);
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
      key: 'status',
      label: 'Status',
      render: (invoice) => <InvoiceStatusPills invoice={invoice} />,
    },
  ];

  return (
    <>
      <PageHeader title="Good day" subtitle="Here's how your business is doing today.">
        <Button onClick={() => navigate('/invoices?new=1')}>+ New invoice</Button>
      </PageHeader>

      {visibleOverdue.length > 0 && (
        <div
          className={`relative mb-[18px] rounded-notice border px-4 py-3 pr-10 text-[13px] ${REMINDER_TONE.danger.bg}`}
        >
          <span className="font-semibold">
            {visibleOverdue.length === 1
              ? '1 payment overdue.'
              : `${visibleOverdue.length} payments overdue.`}
          </span>{' '}
          {visibleOverdue[0] && (
            <button
              type="button"
              onClick={() => openInvoice(visibleOverdue[0])}
              className="font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              {visibleOverdue.length === 1 ? 'Open' : 'Oldest'}{' '}
              {visibleOverdue[0].number} · {formatMoney(outstandingOf(visibleOverdue[0]))}
              <span aria-hidden="true"> →</span>
            </button>
          )}{' '}
          {visibleOverdue.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate('/invoices?status=overdue')}
                className="font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                View all overdue
              </button>{' '}
            </>
          )}
          <span className="text-[11px] text-muted">
            {' '}· {formatMoney(overdueTotal)} total ·
          </span>
          <button
            type="button"
            aria-label="Dismiss overdue reminders for 24 hours"
            title="Hide for 24 hours"
            onClick={() => dismissReminders(visibleOverdue)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-avatar text-danger transition-colors hover:bg-card hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      {visibleDueSoon.length > 0 && (
        <div
          className={`relative mb-[18px] rounded-notice border px-4 py-3 pr-10 text-[13px] ${REMINDER_TONE.warning.bg}`}
        >
          <span className="font-semibold">
            {visibleDueSoon.length === 1
              ? '1 payment due soon.'
              : `${visibleDueSoon.length} payments due soon.`}
          </span>{' '}
          {visibleDueSoon[0] && (
            <button
              type="button"
              onClick={() => openInvoice(visibleDueSoon[0])}
              className="font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              Next {visibleDueSoon[0].number} · {dueLabel(visibleDueSoon[0])} ·{' '}
              {formatMoney(outstandingOf(visibleDueSoon[0]))}
              <span aria-hidden="true"> →</span>
            </button>
          )}{' '}
          {visibleDueSoon.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                View invoices
              </button>{' '}
            </>
          )}
          <span className="text-[11px] text-muted">
            {' '}· {formatMoney(dueSoonTotal)} total 
          </span>
          <button
            type="button"
            aria-label="Dismiss due soon reminders for 24 hours"
            title="Hide for 24 hours"
            onClick={() => dismissReminders(visibleDueSoon)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-avatar text-warning transition-colors hover:bg-card hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      {showLowStock && (
        <div className="relative mb-[18px] rounded-notice border border-warning-border bg-grad-notice px-4 py-3 pr-10 text-[13px] text-warning dark:bg-grad-notice-dark">
          {lowStock.length} {lowStock.length === 1 ? 'product is' : 'products are'} running low.{' '}
          <Link to="/products" className="font-semibold hover:underline">
            View products
          </Link>
          <span className="text-[11px] text-muted"> </span>
          <button
            type="button"
            aria-label="Dismiss low stock reminder for 24 hours"
            title="Hide for 24 hours"
            onClick={dismissLowStock}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-avatar text-warning transition-colors hover:bg-warning-bg hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <StatCard
          label="Total collected"
          value={formatMoney(totals.collected || 0)}
          subLine={
            <>
              <div>Billed (net of returns): {formatMoney(totals.billedNet || 0)}</div>
              <div>Outstanding: {formatMoney(totals.outstanding || 0)}</div>
            </>
          }
          gradient="bg-grad-stat-sales dark:bg-grad-stat-sales-dark"
        />
        <StatCard
          label="Tax charged"
          value={formatMoneyWithPrefix(stats.tax)}
          subLine="On those invoices · not cash collected"
          gradient="bg-grad-stat-tax dark:bg-grad-stat-tax-dark"
        />
        <StatCard
          label="Unpaid amount"
          value={formatMoneyWithPrefix(stats.pendingTotal)}
          subLine={`${stats.pendingCount} unpaid invoice${
            stats.pendingCount === 1 ? '' : 's'
          }${overdueInvoices.length > 0 ? ` · ${overdueInvoices.length} overdue` : ''}`}
          gradient="bg-grad-stat-pending dark:bg-grad-stat-pending-dark"
          darkText
        />
        <StatCard
          label="Customers"
          value={formatNumber(customers.length)}
          subLine={`${products.length} products`}
          gradient="bg-grad-stat-customers dark:bg-grad-stat-customers-dark"
          darkText
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
            <p className="text-xs text-muted">STRN</p>
            <p className="mt-1 text-[13px] font-semibold">{profile.strn || '-'}</p>
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
            label="STRN"
            value={settingsForm.strn}
            onChange={(event) => setSettingsForm((current) => ({ ...current, strn: event.target.value }))}
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
