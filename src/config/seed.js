/**
 * Demo data for the demo account only. New accounts start with empty lists.
 * Dates are relative to the moment the demo account is created.
 */

import { daysAgo } from '../lib/dates';
import { INVOICE_STATUS, FIRST_INVOICE_NUMBER } from './constants';

export const SEED_BUSINESS = {
  name: 'Khan Traders',
  ntn: '1234567-8',
  address: 'Lahore, Pakistan',
};

const seedProducts = [
  { id: 'p1', name: 'Cotton Fabric Roll', code: '100001', price: 4500, taxRate: 18, stock: 40 },
  { id: 'p2', name: 'Printed Lawn Suit', code: '100002', price: 3200, taxRate: 18, stock: 120 },
  { id: 'p3', name: 'Steel Hardware Set', code: '100003', price: 7800, taxRate: 18, stock: 25 },
  { id: 'p4', name: 'Packaged Rice 5kg', code: '100004', price: 1650, taxRate: 5, stock: 200 },
  { id: 'p5', name: 'Office Paper A4', code: '100005', price: 1250, taxRate: 17, stock: 8 },
  { id: 'p6', name: 'LED Bulb 12W', code: '100006', price: 420, taxRate: 18, stock: 300 },
];

const seedCustomers = [
  {
    id: 'c1',
    name: 'Noor Textiles',
    ntn: '1234567-8',
    registration: 'Registered',
    address: 'Shop 12, Gulberg III, Lahore',
    phone: '0300-1234567',
  },
  {
    id: 'c2',
    name: 'Bilal Hardware',
    ntn: '35202-1234567-1',
    registration: 'Unregistered',
    address: 'Brandreth Road, Lahore',
    phone: '0321-7654321',
  },
  {
    id: 'c3',
    name: 'Zara Foods',
    ntn: '7654321-2',
    registration: 'Registered',
    address: 'Johar Town, Lahore',
    phone: '0333-2223344',
  },
  {
    id: 'c4',
    name: 'Bright Stationers',
    ntn: '2345678-9',
    registration: 'Registered',
    address: 'Anarkali Bazaar, Lahore',
    phone: '0345-9988776',
  },
];

/** Copies the product name, price and tax rate onto an invoice line. */
function buildLine(productId, qty) {
  const product = seedProducts.find((item) => item.id === productId);
  return { productId, name: product.name, price: product.price, taxRate: product.taxRate, qty };
}

/** days ago, customer, [productId, qty] pairs, status */
const seedInvoiceSpecs = [
  { daysAgo: 34, customerId: 'c1', lines: [['p1', 5], ['p2', 10]], status: INVOICE_STATUS.PAID },
  { daysAgo: 27, customerId: 'c3', lines: [['p4', 20]], status: INVOICE_STATUS.PAID },
  { daysAgo: 19, customerId: 'c2', lines: [['p3', 2], ['p6', 30]], status: INVOICE_STATUS.PAID },
  { daysAgo: 9, customerId: 'c4', lines: [['p5', 12], ['p6', 20]], status: INVOICE_STATUS.PENDING },
  { daysAgo: 5, customerId: 'c1', lines: [['p2', 15]], status: INVOICE_STATUS.PENDING },
  { daysAgo: 2, customerId: 'c3', lines: [['p1', 3], ['p4', 10]], status: INVOICE_STATUS.PAID },
  { daysAgo: 0, customerId: 'c2', lines: [['p6', 50]], status: INVOICE_STATUS.DRAFT },
];

/** Complete data record for a freshly created demo account. */
export function createSeedData() {
  const invoices = seedInvoiceSpecs.map((spec, index) => ({
    id: `INV-${FIRST_INVOICE_NUMBER + index}`,
    customerId: spec.customerId,
    date: daysAgo(spec.daysAgo),
    status: spec.status,
    lines: spec.lines.map(([productId, qty]) => buildLine(productId, qty)),
  }));

  return {
    products: seedProducts,
    customers: seedCustomers,
    invoices,
    nextInvoiceNumber: FIRST_INVOICE_NUMBER + seedInvoiceSpecs.length,
  };
}
