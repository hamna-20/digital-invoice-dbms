import { useMemo } from 'react';
import Card from '../../components/ui/Card';
import Pill from '../../components/ui/Pill';
import { LOW_STOCK_THRESHOLD } from '../../config/constants';

/** Products at or below the low-stock threshold. */
export default function LowStockCard({ products }) {
  const lowStock = useMemo(
    () => products.filter((product) => Number(product.stock) <= LOW_STOCK_THRESHOLD),
    [products]
  );

  return (
    <Card title="Low stock" bodyClassName="p-0">
      {lowStock.length === 0 ? (
        <p className="px-5 py-[18px] text-[13px] text-muted">All products are well stocked.</p>
      ) : (
        <div className="no-scrollbar max-h-[240px] overflow-y-auto overscroll-contain">
          {lowStock.map((product, index) => (
            <div
              key={product.id}
              className={`flex items-center justify-between gap-3 px-5 py-2.5 ${
                index < lowStock.length - 1 ? 'border-b border-line-soft' : ''
              }`}
            >
              <span className="truncate text-[13px]">{product.name}</span>
              {Number(product.stock) === 0 ? (
                <Pill variant="danger">Out of stock</Pill>
              ) : (
                <Pill variant="warning">{Number(product.stock) === 1 ? '1 left' : `${product.stock} left`}</Pill>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
