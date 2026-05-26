import { format as fnsFormat } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const IST = 'Asia/Kolkata';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const inrNoSymbolFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatInr(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return inrFormatter.format(n);
}

export function formatInrPlain(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return inrNoSymbolFormatter.format(n);
}

export function formatDate(input: string | Date, pattern = 'dd MMM yyyy'): string {
  return formatInTimeZone(input, IST, pattern);
}

export function formatDateTime(input: string | Date, pattern = 'dd MMM yyyy, hh:mm a'): string {
  return formatInTimeZone(input, IST, pattern);
}

export function formatGstin(gstin: string): string {
  // GSTIN: 15 chars, group as 2-10-1-1-1 for readability
  if (gstin.length !== 15) return gstin;
  return `${gstin.slice(0, 2)} ${gstin.slice(2, 12)} ${gstin.slice(12, 13)} ${gstin.slice(13, 14)} ${gstin.slice(14, 15)}`;
}

export function todayInIST(): string {
  return fnsFormat(new Date(), 'yyyy-MM-dd');
}
