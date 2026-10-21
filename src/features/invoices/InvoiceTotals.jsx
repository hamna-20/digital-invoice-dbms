import { formatMoney } from '../../lib/format';

/** Right-aligned subtotal / tax / total-due panel. */
export default function InvoiceTotals({ subtotal, tax, total }) {
  return (
    <div className="ml-auto mt-3.5 w-full max-w-[290px] rounded-totals bg-surface p-[14px_16px] text-[13px]">
      <div className="flex items-center justify-between py-0.5">
        <span className="text-muted">Subtotal</span>
        <span>{formatMoney(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between py-0.5">
        <span className="text-muted">Tax</span>
        <span>{formatMoney(tax)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-line pt-2 text-[17px] font-semibold">
        <span>Total due</span>
        <span>{formatMoney(total)}</span>
      </div>
    </div>
  );
}
