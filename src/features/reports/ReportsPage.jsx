import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import Pill from '../../components/ui/Pill';
import useData from '../../hooks/useData';
import useToast from '../../hooks/useToast';
import { formatDate, monthShortLabel, ymd } from '../../lib/dates';
import { formatMoney, formatNumber } from '../../lib/format';
import { invoiceStatusMeta } from '../../lib/invoiceStatus';
import { getInvoice } from '../../services/invoiceService';
import {
  getCustomerReport,
  getDailySales,
  getInvoiceHistory,
  getMonthlySales,
  getProductReport,
  getTaxReport,
} from '../../services/reportService';
import InvoiceStatusPills from '../invoices/InvoiceStatusPills';
import InvoiceView from '../invoices/InvoiceView';
import ReportTable from './ReportTable';

const REPORTS = [
  { key: 'daily', label: 'Daily sales' },
  { key: 'monthly', label: 'Monthly sales' },
  { key: 'tax', label: 'Tax report' },
  { key: 'customer', label: 'Customer-wise' },
  { key: 'product', label: 'Product-wise' },
  { key: 'history', label: 'Invoice history' },
];

const PERIODS = [
  { key: 'all', label: 'All time' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'thisYear', label: 'This year' },
];

/** Titles and empty states for each report table. */
const REPORT_META = {
  daily: {
    tableTitle: 'Day by day',
    emptyMessage: 'No completed invoices in this period. Try “All time”.',
  },
  monthly: {
    tableTitle: 'Month by month',
    emptyMessage: 'No completed invoices in this period. Try “All time”.',
  },
  tax: {
    tableTitle: 'Tax by rate',
    emptyMessage: 'No taxed invoices in this period.',
  },
  customer: {
    tableTitle: 'By customer',
    emptyMessage: 'No completed invoices in this period.',
  },
  product: {
    tableTitle: 'By product',
    emptyMessage: 'No product sales in this period.',
  },
  history: {
    tableTitle: 'All invoices',
    emptyMessage: 'No invoices in this period.',
  },
};

/** Reports are read from the backend; totals are never calculated in the browser. */
const LOADERS = {
  daily: (params) => getDailySales(params),
  monthly: (params) => getMonthlySales(params),
  tax: (params) => getTaxReport(params),
  customer: (params) => getCustomerReport(params),
  product: (params) => getProductReport(params),
  history: (params) => getInvoiceHistory(params),
};

const moneyColumn = (key, label) => ({
  key,
  label,
  numeric: true,
  align: 'right',
  format: (value) => formatMoney(value),
});

const countColumn = (key, label) => ({
  key,
  label,
  numeric: true,
  align: 'right',
  format: (value) => formatNumber(value),
});

/** Count shown for context only. It is not added up in the totals row. */
const informationalCountColumn = (key, label) => ({
  key,
  label,
  align: 'right',
  format: (value) => formatNumber(value),
});

/** Money column that shows a dash for sections where the figure is N/A. */
const optionalMoneyColumn = (key, label) => ({
  key,
  label,
  numeric: true,
  align: 'right',
  format: (value) => (value === null || value === undefined ? '—' : formatMoney(value)),
});

function periodRange(period) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === 'thisMonth') {
    return {
      startDate: ymd(new Date(year, month, 1)),
      endDate: ymd(new Date(year, month + 1, 0)),
    };
  }
  if (period === 'lastMonth') {
    return {
      startDate: ymd(new Date(year, month - 1, 1)),
      endDate: ymd(new Date(year, month, 0)),
    };
  }
  if (period === 'thisYear') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }
  return {};
}

function buildReport(report, rows, actions = {}) {
  switch (report) {
    case 'monthly':
      return {
        rows,
        rowKey: (row) => row.month,
        showTotals: true,
        columns: [
          {
            key: 'month',
            label: 'Month',
            format: (value) =>
              typeof value === 'string' && value.length >= 7
                ? `${monthShortLabel(value)} ${value.slice(0, 4)}`
                : '—',
          },
          countColumn('invoiceCount', 'Invoices'),
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax'),
          moneyColumn('total', 'Total billed'),
        ],
      };
    case 'tax':
      return {
        rows,
        rowKey: (row) => `tax-${row.rate}`,
        showTotals: true,
        columns: [
          { key: 'rate', label: 'Tax rate', format: (value) => `${formatNumber(value)}%` },
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax charged'),
          moneyColumn('collected', 'Tax collected'),
        ],
      };
    case 'customer':
      return {
        rows,
        rowKey: (row) => row.customerId,
        showTotals: true,
        columns: [
          { key: 'name', label: 'Customer' },
          countColumn('invoiceCount', 'Invoices'),
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax'),
          moneyColumn('total', 'Total billed'),
          moneyColumn('paid', 'Paid'),
          moneyColumn('outstanding', 'Unpaid amount'),
        ],
      };
    case 'product':
      return {
        rows,
        rowKey: (row) => row.productId,
        showTotals: true,
        columns: [
          { key: 'name', label: 'Product' },
          countColumn('qty', 'Qty sold'),
          informationalCountColumn('invoiceCount', 'Invoices'),
          moneyColumn('revenue', 'Revenue (before tax)'),
          moneyColumn('tax', 'Tax'),
          moneyColumn('total', 'Total billed'),
        ],
      };
    case 'history':
      return {
        rows,
        rowKey: (row) => row.id,
        showTotals: false,
        columns: [
          {
            key: 'id',
            label: 'Invoice',
            format: (value) => <span className="font-semibold">{value}</span>,
          },
          {
            key: 'status',
            label: 'Status',
            format: (value, row) => {
              if (row.invoice) return <InvoiceStatusPills invoice={row.invoice} />;
              const statuses = row.statuses?.length ? row.statuses : [value];
              return (
                <span className="inline-flex flex-wrap gap-1">
                  {statuses.map((entry) => {
                    const meta = invoiceStatusMeta(entry);
                    return (
                      <Pill key={entry} variant={meta.tone}>
                        {meta.label}
                      </Pill>
                    );
                  })}
                </span>
              );
            },
          },
          { key: 'customerName', label: 'Customer' },
          { key: 'date', label: 'Date', format: (value) => formatDate(value) },
          {
            key: 'dueDate',
            label: 'Due',
            format: (value) => (value ? formatDate(value) : '—'),
          },
          moneyColumn('total', 'Invoice total'),
          optionalMoneyColumn('paid', 'Paid'),
          optionalMoneyColumn('returnCredit', 'Return credit'),
          optionalMoneyColumn('outstanding', 'Unpaid amount'),
          {
            key: 'view',
            label: '',
            align: 'right',
            format: (_, row) => (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  actions.openInvoice?.(row);
                }}
                className="text-xs font-medium text-indigo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo"
              >
                View
              </button>
            ),
          },
        ],
      };
    default:
      return {
        rows,
        rowKey: (row) => row.date,
        showTotals: true,
        columns: [
          { key: 'date', label: 'Date', format: (value) => formatDate(value) },
          countColumn('invoiceCount', 'Invoices'),
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax'),
          moneyColumn('total', 'Total billed'),
        ],
      };
  }
}

export default function ReportsPage() {
  const { invoices } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [report, setReport] = useState('daily');
  const [period, setPeriod] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const [fetchedInvoice, setFetchedInvoice] = useState(null);

  const range = useMemo(() => periodRange(period), [period]);
  const meta = REPORT_META[report];

  /**
   * Clear the previous report's rows before switching. Otherwise React renders
   * the new report's columns against the old rows, which can pass a value of
   * the wrong shape to a column formatter.
   */
  function selectReport(nextReport) {
    if (nextReport === report) return;
    setRows([]);
    setError('');
    setLoading(true);
    setReport(nextReport);
  }

  function selectPeriod(nextPeriod) {
    if (nextPeriod === period) return;
    setRows([]);
    setError('');
    setLoading(true);
    setPeriod(nextPeriod);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRows([]);

    LOADERS[report](range)
      .then((result) => {
        if (active) setRows(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load this report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [report, range]);

  /**
   * The report endpoint returns document totals only. Attach the loaded invoice
   * (payments, return credit, return/credit tags) so history rows show the same
   * figures and pills as the invoice list without another request per row.
   */
  const historyRows = useMemo(() => {
    if (report !== 'history') return rows;
    const byNumber = new Map(invoices.map((invoice) => [invoice.number, invoice]));
    return rows.map((row) => {
      const invoice = byNumber.get(row.number) || byNumber.get(row.id);
      if (!invoice) return row;
      return {
        ...row,
        invoice,
        statuses: invoice.statuses?.length ? invoice.statuses : row.statuses,
        paid: invoice.financialSummary?.amountPaid ?? null,
        returnCredit: invoice.financialSummary?.returnCreditApplied ?? null,
        outstanding: invoice.financialSummary?.outstanding ?? null,
      };
    });
  }, [report, rows, invoices]);

  const openHistoryInvoice = useCallback(
    async (row) => {
      const local = invoices.find(
        (invoice) =>
          (row.invoiceId !== undefined && String(invoice.id) === String(row.invoiceId)) ||
          invoice.number === row.number ||
          invoice.number === row.id
      );
      if (local) {
        setFetchedInvoice(null);
        setViewingId(local.id);
        return;
      }
      if (row.invoiceId === undefined || row.invoiceId === null) {
        toast('This invoice is no longer available.');
        return;
      }
      try {
        const fetched = await getInvoice(row.invoiceId);
        setFetchedInvoice(fetched);
        setViewingId(fetched.id);
      } catch (openError) {
        toast(openError.message || 'Unable to open this invoice.');
      }
    },
    [invoices, toast]
  );

  // Resolve the open invoice from the refreshed list, so a payment or return
  // saved inside the modal is reflected immediately instead of showing the
  // snapshot that was loaded when the row was first clicked.
  const viewingInvoice = useMemo(() => {
    if (viewingId === null) return null;
    return invoices.find((invoice) => invoice.id === viewingId) || fetchedInvoice;
  }, [viewingId, invoices, fetchedInvoice]);

  const config = useMemo(
    () => buildReport(report, historyRows, { openInvoice: openHistoryInvoice }),
    [report, historyRows, openHistoryInvoice]
  );

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="See what you billed, what you collected, and what is still unpaid."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {REPORTS.map((item) => (
          <Chip key={item.key} active={report === item.key} onClick={() => selectReport(item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted">Period</span>
        {PERIODS.map((item) => (
          <Chip key={item.key} active={period === item.key} onClick={() => selectPeriod(item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>

      <Card
        title={meta.tableTitle}
        actions={
          <span className="text-xs text-muted">
            {loading ? 'Loading…' : `${formatNumber(config.rows.length)} rows · PKR`}
          </span>
        }
        bodyClassName="p-0"
      >
        {error ? (
          <p className="px-5 py-4 text-[13px] text-danger">{error}</p>
        ) : loading ? (
          <p className="px-5 py-4 text-[13px] text-muted">Loading report…</p>
        ) : (
          <ReportTable
            columns={config.columns}
            rows={config.rows}
            rowKey={config.rowKey}
            showTotals={config.showTotals}
            onRowClick={report === 'history' ? openHistoryInvoice : undefined}
            emptyMessage={meta.emptyMessage}
          />
        )}
      </Card>

      {viewingInvoice && (
        <InvoiceView
          invoice={viewingInvoice}
          showStatusHistory
          onClose={() => {
            setViewingId(null);
            setFetchedInvoice(null);
          }}
          onEditDraft={(invoice) => {
            setViewingId(null);
            setFetchedInvoice(null);
            navigate(`/invoices?edit=${invoice.id}`);
          }}
        />
      )}
    </>
  );
}
