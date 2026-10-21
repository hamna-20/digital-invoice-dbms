import { useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import Pill from '../../components/ui/Pill';
import { INVOICE_STATUS_META } from '../../config/constants';
import useData from '../../hooks/useData';
import { formatDate, monthShortLabel } from '../../lib/dates';
import { formatMoney, formatNumber } from '../../lib/format';
import {
  customerWise,
  dailySales,
  invoiceHistory,
  monthlySales,
  productWise,
  taxReport,
} from '../../lib/reports';
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

function buildReport(report, invoices, customers) {
  switch (report) {
    case 'monthly':
      return {
        rows: monthlySales(invoices),
        rowKey: (row) => row.month,
        showTotals: true,
        note: NOTE_ISSUED,
        columns: [
          { key: 'month', label: 'Month', format: (value) => `${monthShortLabel(value)} ${value.slice(0, 4)}` },
          countColumn('invoiceCount', 'Invoices'),
          moneyColumn('taxable', 'Taxable'),
          moneyColumn('tax', 'Tax'),
          moneyColumn('total', 'Total'),
        ],
      };
    case 'tax':
      return {
        rows: taxReport(invoices),
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
        rows: customerWise(invoices, customers),
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
        rows: productWise(invoices),
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
        rows: invoiceHistory(invoices, customers),
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
              const meta = INVOICE_STATUS_META[value];
              return <Pill variant={meta.tone}>{meta.label}</Pill>;
            },
          },
          moneyColumn('total', 'Total'),
        ],
      };
    default:
      return {
        rows: dailySales(invoices),
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
  const { invoices, customers } = useData();
  const [report, setReport] = useState('daily');
  const config = useMemo(
    () => buildReport(report, invoices, customers),
    [report, invoices, customers]
  );

  return (
    <>
      <PageHeader title="Reports" />

      <div className="mb-4 flex flex-wrap gap-2">
        {REPORTS.map((item) => (
          <Chip key={item.key} active={report === item.key} onClick={() => setReport(item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>

      <Card bodyClassName="p-0">
        <ReportTable
          columns={config.columns}
          rows={config.rows}
          rowKey={config.rowKey}
          showTotals={config.showTotals}
        />
        <p className="mt-2.5 px-5 pb-[18px] text-xs text-muted">{config.note}</p>
      </Card>
    </>
  );
}
