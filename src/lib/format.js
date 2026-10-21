/** Money and number formatting for the en-PK locale. */

const moneyFormatter = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat('en-PK');

/** Plain amount, e.g. 1250000 -> "1,250,000". Used inside table cells. */
export function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

/** Amount with the currency prefix, e.g. "PKR 1,250,000". Used on cards and totals. */
export function formatMoneyWithPrefix(value) {
  return `PKR ${formatMoney(value)}`;
}

export function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

/** Chart label in thousands: 125000 -> "125k", 0 -> "" (empty when zero). */
export function formatThousands(value) {
  const amount = Number(value) || 0;
  if (amount === 0) return '';
  if (Math.abs(amount) >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(Math.round(amount));
}
