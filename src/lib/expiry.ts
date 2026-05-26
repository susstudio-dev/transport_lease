import { differenceInCalendarDays, parseISO } from 'date-fns';

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'soon' | 'ok' | 'missing';

export type ExpiryInfo = {
  status: ExpiryStatus;
  daysUntil: number | null;
  label: string;
};

/** Threshold tiers come from the brief (30/15/7 days). */
export function expiryInfo(expiryDate: string | null | undefined): ExpiryInfo {
  if (!expiryDate) return { status: 'missing', daysUntil: null, label: 'Missing' };

  const target = parseISO(expiryDate);
  if (Number.isNaN(target.getTime())) {
    return { status: 'missing', daysUntil: null, label: 'Missing' };
  }
  const days = differenceInCalendarDays(target, new Date());

  if (days < 0)
    return { status: 'expired', daysUntil: days, label: `Expired ${Math.abs(days)}d ago` };
  if (days === 0) return { status: 'critical', daysUntil: 0, label: 'Expires today' };
  if (days <= 7) return { status: 'critical', daysUntil: days, label: `${days}d left` };
  if (days <= 15) return { status: 'warning', daysUntil: days, label: `${days}d left` };
  if (days <= 30) return { status: 'soon', daysUntil: days, label: `${days}d left` };
  return { status: 'ok', daysUntil: days, label: `${days}d left` };
}

/** Picks the worst status among a collection of expiry dates. */
export function worstExpiry(dates: (string | null | undefined)[]): ExpiryStatus {
  const order: ExpiryStatus[] = ['expired', 'critical', 'warning', 'soon', 'missing', 'ok'];
  let worst: ExpiryStatus = 'ok';
  for (const d of dates) {
    const s = expiryInfo(d).status;
    if (order.indexOf(s) < order.indexOf(worst)) worst = s;
  }
  return worst;
}
