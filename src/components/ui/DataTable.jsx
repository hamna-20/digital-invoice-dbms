import EmptyState from './EmptyState';

const HIDE_CLASSES = {
  560: 'max-[560px]:hidden',
  600: 'max-[600px]:hidden',
  820: 'max-[820px]:hidden',
  900: 'max-[900px]:hidden',
};

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const cellClasses = (column) =>
  `${ALIGN_CLASSES[column.align || 'left']} ${column.hideBelow ? HIDE_CLASSES[column.hideBelow] : ''}`;

/**
 * Generic table. Columns: { key, label, align, hideBelow, render }.
 * `footer` is a <tr> for report totals rows.
 */
export default function DataTable({ columns, rows, rowKey, onRowClick, emptyMessage = 'No data yet', footer = null }) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`whitespace-nowrap border-b border-line bg-surface px-4 py-3 text-xs font-medium text-muted ${cellClasses(
                  column
                )}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-surface ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-[13px] align-middle ${cellClasses(column)}`}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
