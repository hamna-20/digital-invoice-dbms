/** App-wide constants: API URL, storage keys, navigation and status values. */

export const APP_NAME = 'Ledgerly';

export const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export const STORAGE_KEYS = {
  SESSION: 'ledgerly_session',
  THEME: 'ledgerly_theme',
  DATA_PREFIX: 'ledgerly_data_',
};

/** Data records are scoped per user, e.g. ledgerly_data_u_1698123456. */
export const dataStorageKey = (userId) => `${STORAGE_KEYS.DATA_PREFIX}${userId}`;

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

/** Display label and pill tone for each invoice status. */
export const INVOICE_STATUS_META = {
  draft: { label: 'Draft', tone: 'indigo' },
  pending: { label: 'Pending', tone: 'warning' },
  overdue: { label: 'Overdue', tone: 'danger' },
  paid: { label: 'Paid', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

/** Statuses that still owe money and therefore count as outstanding. */
export const UNPAID_STATUSES = [INVOICE_STATUS.PENDING, INVOICE_STATUS.OVERDUE];

export const REGISTRATION_STATUS = {
  REGISTERED: 'Registered',
  UNREGISTERED: 'Unregistered',
};

/** Pill tone for the two customer registration states. */
export const REGISTRATION_TONE = {
  Registered: 'success',
  Unregistered: 'indigo',
};

export const FIRST_INVOICE_NUMBER = 1001;

/** Products at or below this stock level are flagged as low. */
export const LOW_STOCK_THRESHOLD = 10;

export const THEME_OPTIONS = ['light', 'dark', 'system'];

/** Keys match the icon lookup in NavTabs. */
export const NAV_ITEMS = [
  { key: 'home', path: '/', label: 'Home' },
  { key: 'invoices', path: '/invoices', label: 'Invoices' },
  { key: 'customers', path: '/customers', label: 'Customers' },
  { key: 'products', path: '/products', label: 'Products' },
  { key: 'reports', path: '/reports', label: 'Reports' },
];
