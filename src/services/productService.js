/** Product catalogue backed by the authenticated backend API. */

import { requestApi } from './apiClient';

function toAppProduct(product) {
  if (!product || product.id === undefined || !product.name) {
    throw new Error('The backend returned an invalid product record.');
  }

  return {
    id: String(product.id),
    name: product.name,
    code: product.code || '',
    price: Number(product.price) || 0,
    taxRate: Number(product.taxRate) || 0,
    stock: Number(product.stockQuantity) || 0,
    status: product.isActive === false ? 'Inactive' : 'Active',
    stockStatus: product.stockStatus || (product.isActive === false ? 'inactive' : Number(product.stockQuantity) > 0 ? 'available' : 'out_of_stock'),
    description: product.description || '',
    unit: product.unit || '',
  };
}

function toApiProduct(product) {
  return {
    name: product.name,
    code: product.code,
    price: Number(product.price),
    taxRate: Number(product.taxRate),
    stockQuantity: Number(product.stock),
    isActive: product.status !== 'Inactive',
  };
}

export async function listProducts() {
  const products = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await requestApi(`/products?page=${page}&limit=100`);
    if (!Array.isArray(result.products)) {
      throw new Error('The backend returned an invalid product list.');
    }
    products.push(...result.products.map(toAppProduct));
    totalPages = Number(result.pagination?.totalPages);
    if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
      throw new Error('The backend returned invalid product pagination data.');
    }
    page += 1;
  }

  return products;
}

/** Creates or updates a product in the authenticated user's catalogue. */
export async function saveProduct(userId, product) {
  const isUpdate = Boolean(product.id);
  const path = isUpdate ? `/products/${encodeURIComponent(product.id)}` : '/products';
  const result = await requestApi(path, {
    method: isUpdate ? 'PUT' : 'POST',
    body: toApiProduct(product),
  });
  return toAppProduct(result.product);
}

/** Products used by invoices cannot be deleted; the API responds with 409. */
export async function deleteProduct(userId, productId) {
  await requestApi(`/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}
