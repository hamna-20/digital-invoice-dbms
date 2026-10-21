import DataTable from '../../components/ui/DataTable';
import { formatMoney } from '../../lib/format';

/**
 * Report table with an optional bold totals row.
 *
 * @param {object} props
 * @param {Array} props.columns - { key, label, align, numeric, format }
 * @param {boolean} [props.showTotals] - false for invoice history
 */
export default function ReportTable({ columns, rows, rowKey, showTotals = true }) {
  const totals = columns.map((column) =>
    column.numeric ? rows.reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0) : null
  );

  const tableColumns = columns.map((column) => ({
    key: column.key,
    label: column.label,
    align: column.align,
    render: (row) => (column.format ? column.format(row[column.key], row) : row[column.key]),
  }));

  const footer =
    showTotals && rows.length > 0 ? (
      <tr className="font-semibold">
        {columns.map((column, index) => (
          <td
            key={column.key}
            className={`border-t border-line px-4 py-[13px] ${
              column.align === 'right' ? 'text-right' : ''
            }`}
          >
            {index === 0 ? 'Total' : totals[index] === null ? '' : formatMoney(totals[index])}
          </td>
        ))}
      </tr>
    ) : null;

  return (
    <DataTable
      columns={tableColumns}
      rows={rows}
      rowKey={rowKey}
      emptyMessage="No data yet"
      footer={footer}
    />
  );
}
