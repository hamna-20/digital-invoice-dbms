import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import Pill from '../../components/ui/Pill';
import { INVOICE_STATUS_META } from '../../config/constants';
import { formatDate, monthShortLabel } from '../../lib/dates';
import { formatMoney, formatNumber } from '../../lib/format';
import {
  getCustomerReport,
  getDailySales,
  getInvoiceHistory,
  getMonthlySales,
  getProductReport,
  getTaxReport,
} from '../../services/reportService';
import ReportTable from './ReportTable';

const REPORTS = [
  { key: 'daily', label: 'Daily sales' },
  { key: 'monthly', label: 'Monthly sales' },
  { key: 'tax', label: 'Tax report' },
  { key: 'customer', label: 'Customer-wise' },
  { key: 'product', label: 'Product-wise' },
  { key: 'history', label: 'Invoice history' },
];

const NOTE_ISSUED = 'Based on issued and paid invoices. Amounts in PKR.';
const NOTE_HISTORY = 'All invoices, including drafts.';

/** Reports are read from the backend; totals are never calculated in the browser. */
const LOADERS = {
  daily: () => getDailySales(),
  monthly: () => getMonthlySales(),
  tax: () => getTaxReport(),
  customer: () => getCustomerReport(),
  product: () => getProductReport(),
  history: () => getInvoiceHistory(),
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

function buildReport(report, rows) {
  switch (report) {
    case 'monthly':
      return {
        rows,
        rowKey: (row) => row.month,
        showTotals: true,
        note: NOTE_ISSUED,
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
          moneyColumn('total', 'Total'),
        ],
      };
    case 'tax':
      return {
        rows,
        rowKey: (row) => `tax-${row.rate}`,
        showTotals: true,
        note: NOTE_ISSUED,
        columns: [
          { key: 'rate', label: 'Tax rate', format: (value) => `${formatNumber(value)}%` },
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax'),
        ],
      };
    case 'customer':
      return {
        rows,
        rowKey: (row) => row.customerId,
        showTotals: true,
        note: NOTE_ISSUED,
        columns: [
          { key: 'name', label: 'Customer' },
          countColumn('invoiceCount', 'Invoices'),
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax'),
          moneyColumn('total', 'Total'),
        ],
      };
    case 'product':
      return {
        rows,
        rowKey: (row) => row.productId,
        showTotals: true,
        note: NOTE_ISSUED,
        columns: [
          { key: 'name', label: 'Product' },
          countColumn('qty', 'Qty sold'),
          moneyColumn('revenue', 'Revenue (taxable)'),
          moneyColumn('tax', 'Tax'),
        ],
      };
    case 'history':
      return {
        rows,
        rowKey: (row) => row.id,
        showTotals: false,
        note: NOTE_HISTORY,
        columns: [
          { key: 'id', label: 'Invoice', format: (value) => <span className="font-semibold">{value}</span> },
          { key: 'date', label: 'Date', format: (value) => formatDate(value) },
          { key: 'customerName', label: 'Customer' },
          {
            key: 'status',
            label: 'Status',
            format: (value) => {
              const meta = INVOICE_STATUS_META[value] || { label: value, tone: 'neutral' };
              return <Pill variant={meta.tone}>{meta.label}</Pill>;
            },
          },
          moneyColumn('total', 'Total'),
        ],
      };
    default:
      return {
        rows,
        rowKey: (row) => row.date,
        showTotals: true,
        note: NOTE_ISSUED,
        columns: [
          { key: 'date', label: 'Date', format: (value) => formatDate(value) },
          countColumn('invoiceCount', 'Invoices'),
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax'),
          moneyColumn('total', 'Total'),
        ],
      };
  }
}

export default function ReportsPage() {
  const [report, setReport] = useState('daily');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRows([]);

    LOADERS[report]()
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
  }, [report]);

  const config = useMemo(() => buildReport(report, rows), [report, rows]);

  return (
    <>
      <PageHeader title="Reports" />

      <div className="mb-4 flex flex-wrap gap-2">
        {REPORTS.map((item) => (
          <Chip key={item.key} active={report === item.key} onClick={() => selectReport(item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>

      <Card bodyClassName="p-0">
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
          />
        )}
        <p className="mt-2.5 px-5 pb-[18px] text-xs text-muted">{config.note}</p>
      </Card>
    </>
  );
}
