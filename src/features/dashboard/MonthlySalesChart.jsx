import { useMemo } from 'react';
import Card from '../../components/ui/Card';
import { INVOICE_STATUS } from '../../config/constants';
import { lastMonthKeys, monthKey, monthShortLabel } from '../../lib/dates';
import { formatMoneyWithPrefix, formatThousands } from '../../lib/format';
import { invoiceTotal } from '../../lib/invoiceMath';

/** Six-month sales bar chart (last six calendar months, oldest first). */
export default function MonthlySalesChart({ invoices }) {
  const months = useMemo(() => {
    const keys = lastMonthKeys(6);
    const totals = new Map(keys.map((key) => [key, 0]));
    invoices
      .filter((invoice) => invoice.status !== INVOICE_STATUS.DRAFT)
      .forEach((invoice) => {
        const key = monthKey(invoice.date);
        if (totals.has(key)) totals.set(key, totals.get(key) + invoiceTotal(invoice));
      });
    return keys.map((key) => ({ key, label: monthShortLabel(key), amount: totals.get(key) }));
  }, [invoices]);

  const largest = Math.max(...months.map((month) => month.amount), 0);

  return (
    <Card title="Monthly sales">
      <div className="flex h-40 items-end gap-3">
        {months.map((month) => (
          <div
            key={month.key}
            title={`${month.label}: ${formatMoneyWithPrefix(month.amount)}`}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
            <span className="text-[11px] text-muted">{formatThousands(month.amount)}</span>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[44px] rounded-[10px_10px_4px_4px] bg-grad-bar transition-opacity group-hover:opacity-75"
                style={{ height: `${largest ? Math.max(3, (month.amount / largest) * 100) : 3}%` }}
              />
            </div>
            <span className="text-[11px] text-muted">{month.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
