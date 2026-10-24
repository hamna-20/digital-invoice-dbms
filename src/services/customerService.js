/** Customer records are stored by the authenticated backend API. */

import { REGISTRATION_STATUS } from '../config/constants';
import { requestApi } from './apiClient';

function toAppCustomer(customer) {
  if (!customer || customer.id === undefined || !customer.name) {
    throw new Error('The backend returned an invalid customer record.');
  }
  return {
    id: String(customer.id),
    name: customer.name,
    ntn: customer.taxNumber || '',
    registration: customer.registration || REGISTRATION_STATUS.REGISTERED,
    phone: customer.phone || '',
    address: customer.address || '',
  };
}

function toApiCustomer(customer) {
  return {
    name: customer.name,
    taxNumber: customer.ntn || null,
    registration: customer.registration || REGISTRATION_STATUS.REGISTERED,
    phone: customer.phone || null,
    address: customer.address || null,
  };
}

export async function listCustomers() {
  const customers = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await requestApi(`/customers?page=${page}&limit=100`);
    if (!Array.isArray(result.customers)) {
      throw new Error('The backend returned an invalid customer list.');
    }
    customers.push(...result.customers.map(toAppCustomer));
    totalPages = Number(result.pagination?.totalPages);
    if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
      throw new Error('The backend returned invalid customer pagination data.');
    }
    page += 1;
  }

  return customers;
}

/** Creates or updates a customer in the authenticated user's account. */
export async function saveCustomer(customer) {
  const isUpdate = Boolean(customer.id);
  const path = isUpdate ? `/customers/${encodeURIComponent(customer.id)}` : '/customers';
  const result = await requestApi(path, {
    method: isUpdate ? 'PUT' : 'POST',
    body: toApiCustomer(customer),
  });
  return toAppCustomer(result.customer);
}

export async function deleteCustomer(customerId) {
  await requestApi(`/customers/${encodeURIComponent(customerId)}`, { method: 'DELETE' });
}
