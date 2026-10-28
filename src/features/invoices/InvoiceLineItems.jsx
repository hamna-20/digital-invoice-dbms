import { formatMoney } from '../../lib/format';
import { lineTotal } from '../../lib/invoiceMath';
import Select from '../../components/ui/Select';

const GRID =
  'grid grid-cols-[2fr_80px_90px_110px_36px] gap-2.5 max-[600px]:grid-cols-[1fr_56px_80px_32px]';

const CELL_INPUT =
  'w-full rounded-input border border-input-border bg-card px-2.5 py-2 text-[13px] text-ink focus:border-input-focus focus:outline-none focus:ring-4 focus:ring-brand/15';

/**
 * Editable invoice lines.
 *
 * @param {object} props
 * @param {object} [props.lineErrors] - message per line index
 * @param {function} props.onProductChange - (index, productId)
 * @param {function} props.onQtyChange - (index, qty)
 * @param {function} props.onRemove - (index)
 */
export default function InvoiceLineItems({
  lines,
  products,
  lineErrors = {},
  onProductChange,
  onQtyChange,
  onRemove,
}) {
  return (
    <div>
      <div className={`${GRID} mb-2 text-xs text-muted`}>
        <span>Product</span>
        <span>Qty</span>
        <span className="max-[600px]:hidden">Tax</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {lines.map((line, index) => (
        <div key={index}>
          <div className={`${GRID} items-center`}>
            <Select
              value={line.productId}
              onChange={(value) => onProductChange(index, value)}
              aria-label={`Product for line ${index + 1}`}
              aria-invalid={lineErrors[index] ? true : undefined}
              className="w-full"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.stock} in stock)
                </option>
              ))}
            </Select>

            <input
              type="number"
              min="1"
              step="1"
              value={line.qty}
              onChange={(event) => onQtyChange(index, event.target.value)}
              aria-label={`Quantity for line ${index + 1}`}
              aria-invalid={lineErrors[index] ? true : undefined}
              className={`${CELL_INPUT} ${lineErrors[index] ? 'border-danger' : ''}`}
            />

            <span className="text-right text-[13px] text-muted max-[600px]:hidden">{Number(line.taxRate) || 0}%</span>
            <span className="text-right text-[13px] font-semibold">{formatMoney(lineTotal(line))}</span>

            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove line ${index + 1}`}
              className="flex h-7 w-7 items-center justify-center rounded-avatar bg-surface text-xs text-muted transition-colors hover:bg-line hover:text-ink"
            >
              ✕
            </button>
          </div>
          {lineErrors[index] && (
            <p className="mt-1.5 mb-2.5 text-[11px] leading-4 text-danger">{lineErrors[index]}</p>
          )}
          {!lineErrors[index] && <div className="mb-2.5" />}
        </div>
      ))}
    </div>
  );
}
