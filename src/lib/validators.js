/** Zod schemas shared by every form and by the storage services. */

import { z } from 'zod';

const EMAIL_MESSAGE = 'Enter a valid email address';
const PASSWORD_MESSAGE = 'Use 8+ characters with a letter and a number';
const CNIC_MESSAGE = 'Enter a valid CNIC (format: 35202-1234567-1)';
const MOBILE_MESSAGE = 'Enter a valid mobile number (format: 0300-1234567)';

/** Digits only, so the formatters can rebuild the dashes as the user types. */
const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

/** 3520212345671 -> "35202-1234567-1" (partial input is formatted as far as it goes). */
export function formatCnic(value) {
  const digits = digitsOnly(value).slice(0, 13);
  const parts = [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12)];
  return parts.filter(Boolean).join('-');
}

/** 03001234567 -> "0300-1234567". */
export function formatMobile(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** Official Pakistani CNIC: 5 digits - 7 digits - 1 digit. */
export function isValidCnic(value) {
  return /^\d{5}-\d{7}-\d$/.test(String(value ?? '').trim());
}

/** Pakistani mobile number: 03XX-XXXXXXX. */
export function isValidMobile(value) {
  return /^03\d{2}-\d{7}$/.test(String(value ?? '').trim());
}

const text = (message) => z.string().trim().min(1, message);

const emailField = z.string().trim().min(1, EMAIL_MESSAGE).email(EMAIL_MESSAGE);

const passwordField = z
  .string()
  .min(8, PASSWORD_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_MESSAGE)
  .regex(/\d/, PASSWORD_MESSAGE);

const numeric = (message) =>
  z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return typeof value === 'number' ? value : Number(value);
  }, z.number({ required_error: message, invalid_type_error: message }));

const PRICE_MESSAGE = 'Enter a price of 0 or more';
const TAX_MESSAGE = 'Enter a tax rate between 0 and 100';
const STOCK_MESSAGE = 'Enter a stock quantity of 0 or more';
const STOCK_WHOLE_MESSAGE = 'Enter a whole stock quantity of 0 or more';

/** Coerces then ranges, so one message covers empty, non-numeric and out-of-range input. */
const numberInRange = (min, max, message) =>
  numeric(message).pipe(z.number().min(min, message).max(max, message));

export const emailSchema = z.object({ email: emailField });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const loginFormSchema = loginSchema.extend({
  remember: z.boolean().optional().default(false),
});

export const newAccountSchema = z.object({
  name: text('Enter your full name'),
  email: emailField,
  password: passwordField,
});

export const signupSchema = newAccountSchema
  .extend({
    confirm: z.string(),
    terms: z.boolean().refine(Boolean, 'Please accept the Terms and Privacy Policy'),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export const customerSchema = z.object({
  id: z.string().optional(),
  name: text('Customer name is required'),
  ntn: z
    .string()
    .trim()
    .min(1, 'NTN / CNIC is required')
    .refine(isValidCnic, CNIC_MESSAGE),
  registration: z.string().min(1, 'Choose a registration status'),
  phone: z
    .string()
    .trim()
    .min(1, 'Contact number is required')
    .refine(isValidMobile, MOBILE_MESSAGE),
  address: text('Billing address is required'),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: text('Product name is required'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Product code must be exactly 6 digits'),
  price: numberInRange(0, Number.MAX_SAFE_INTEGER, PRICE_MESSAGE),
  taxRate: numberInRange(0, 100, TAX_MESSAGE),
  stock: numeric(STOCK_MESSAGE).pipe(z.number().int(STOCK_WHOLE_MESSAGE).min(0, STOCK_MESSAGE)),
});

export const invoiceLineSchema = z.object({
  productId: z.string().min(1, 'Select a product for every line'),
  name: z.string().min(1, 'Product name is missing'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  taxRate: z.coerce.number().min(0, 'Tax cannot be negative').max(100, 'Tax cannot exceed 100%'),
  qty: z.coerce
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
});

export const invoiceSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, 'Select a customer'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an invoice date'),
  lines: z.array(invoiceLineSchema).min(1, 'Add at least one product with a quantity'),
});

/** Safe validation for forms: first message per field plus parsed data. */
export function validate(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };

  const errors = {};
  result.error.issues.forEach((issue) => {
    const key = issue.path.length > 0 ? issue.path[0] : 'form';
    if (!errors[key]) errors[key] = issue.message;
  });
  return { data: null, errors };
}

/** Boundary validation for services: returns parsed data or throws the first message. */
export function parseOrThrow(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return result.data;
  throw new Error(result.error.issues[0]?.message || 'Please check the form');
}
