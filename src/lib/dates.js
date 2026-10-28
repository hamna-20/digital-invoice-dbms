/** Date helpers working with plain YYYY-MM-DD strings. */

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (value) => String(value).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function ymd(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** YYYY-MM-DD for a date `count` days ago (used by the demo seed data). */
export function daysAgo(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return ymd(date);
}

export function today() {
  return ymd(new Date());
}

/** "2026-10-21" -> "21 Oct 2026". */
export function formatDate(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${Number(day)} ${MONTH_SHORT_NAMES[Number(month) - 1]} ${year}`;
}

/** ISO timestamp -> "21 Oct 2026, 4:35 PM". Used by status history. */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = `${date.getDate()} ${MONTH_SHORT_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  const time = date.toLocaleTimeString('en-PK', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day}, ${time}`;
}

/** "2026-10-21" -> "2026-10". */
export function monthKey(dateString) {
  return dateString.slice(0, 7);
}

/** "2026-10" -> "Oct". Returns an empty string for a missing/invalid key. */
export function monthShortLabel(key) {
  if (typeof key !== 'string' || key.length < 7) return '';
  return MONTH_SHORT_NAMES[Number(key.slice(5, 7)) - 1] || '';
}

/** The last `count` calendar month keys, oldest first (for the sales chart). */
export function lastMonthKeys(count) {
  const now = new Date();
  const keys = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    keys.push(`${date.getFullYear()}-${pad(date.getMonth() + 1)}`);
  }
  return keys;
}
