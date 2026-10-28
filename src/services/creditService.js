/**
 * Customer credit balance, ledger, grant, application and reversal API client.
 * The backend derives the balance from immutable signed ledger entries, so the
 * UI never adds ledger rows itself.
 */
import { requestApi } from './apiClient';

function toAppLedgerEntry(entry) {
  return {
    ...entry,
    id: String(entry.id),
    amount: Number(entry.amount) || 0,
    signedAmount: Number(entry.signedAmount) || 0,
  };
}

/** Customer credit balance and ledger. */
export async function getCustomerCredit(customerId) {
  const data = await requestApi(`/customers/${encodeURIComponent(customerId)}/credit`);
  const availableBalance = Number(data.available ?? data.availableBalance) || 0;
  return {
    availableBalance,
    available: availableBalance,
    totalAdded: Number(data.totalAdded) || 0,
    totalApplied: Number(data.totalApplied) || 0,
    ledger: (data.ledger || []).map(toAppLedgerEntry),
  };
}

/** Adds an audited credit entry to a customer's available balance. */
export async function grantCustomerCredit(customerId, { amount, reason }) {
  const cleanReason = String(reason ?? '').trim();
  if (!cleanReason) {
    throw new Error('Enter a reason for the customer credit');
  }
  return requestApi(`/customers/${encodeURIComponent(customerId)}/credit`, {
    method: 'POST',
    body: { amount: Number(amount), reason: cleanReason },
  });
}

/** Applies available customer credit to one of that customer's open invoices. */
export async function applyCustomerCredit(customerId, { invoiceId, amount }) {
  return requestApi(`/customers/${encodeURIComponent(customerId)}/credit/applications`, {
    method: 'POST',
    body: { invoiceId: Number(invoiceId), amount: Number(amount) },
  });
}

/** Reverses one ledger entry by posting a correcting row. The original stays. */
export async function reverseCreditEntry(entryId, { reason }) {
  const cleanReason = String(reason ?? '').trim();
  if (!cleanReason) {
    throw new Error('Enter a reason for reversing this credit entry');
  }
  return requestApi(`/credit-entries/${encodeURIComponent(entryId)}/reverse`, {
    method: 'POST',
    body: { reason: cleanReason },
  });
}