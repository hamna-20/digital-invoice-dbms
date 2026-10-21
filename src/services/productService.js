/** Product catalogue, scoped per signed-in user. */

import { dataStorageKey } from '../config/constants';
import { get, set } from './storage';

const readRecord = (userId) => get(dataStorageKey(userId), {});

const writeRecord = (userId, record) => set(dataStorageKey(userId), record);

export async function listProducts(userId) {
  return readRecord(userId).products || [];
}

/** Creates or updates a product; new records get a generated id. */
export async function saveProduct(userId, product) {
  const record = readRecord(userId);
  const products = record.products || [];
  const saved = { ...product, id: product.id || `p_${Date.now()}` };
  const index = products.findIndex((item) => item.id === saved.id);
  if (index >= 0) products[index] = saved;
  else products.push(saved);
  writeRecord(userId, { ...record, products });
  return saved;
}

/** Past invoice lines keep their copied name, price and tax, so deleting is safe. */
export async function deleteProduct(userId, productId) {
  const record = readRecord(userId);
  const products = (record.products || []).filter((item) => item.id !== productId);
  writeRecord(userId, { ...record, products });
}
