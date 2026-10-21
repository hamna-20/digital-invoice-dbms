/** Customer records, scoped per signed-in user. */

import { dataStorageKey } from '../config/constants';
import { get, set } from './storage';

const readRecord = (userId) => get(dataStorageKey(userId), {});

const writeRecord = (userId, record) => set(dataStorageKey(userId), record);

export async function listCustomers(userId) {
  return readRecord(userId).customers || [];
}

/** Creates or updates a customer; new records get a generated id. */
export async function saveCustomer(userId, customer) {
  const record = readRecord(userId);
  const customers = record.customers || [];
  const saved = { ...customer, id: customer.id || `c_${Date.now()}` };
  const index = customers.findIndex((item) => item.id === saved.id);
  if (index >= 0) customers[index] = saved;
  else customers.push(saved);
  writeRecord(userId, { ...record, customers });
  return saved;
}

export async function deleteCustomer(userId, customerId) {
  const record = readRecord(userId);
  const customers = (record.customers || []).filter((item) => item.id !== customerId);
  writeRecord(userId, { ...record, customers });
}
