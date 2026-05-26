import Decimal from 'decimal.js-light';

/**
 * Money policy:
 *   - DB: numeric(12,2) (stored as string when returned by supabase-js).
 *   - Client arithmetic: Decimal (this module). Never use raw `number` for money math.
 *   - Display: see `lib/format.ts` formatInr().
 *
 * Always convert at the boundary: API/DB -> Decimal -> compute -> string back to DB.
 */
export type MoneyInput = string | number | Decimal;

export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

export function toMoneyString(value: MoneyInput): string {
  return toDecimal(value).toFixed(2);
}

export function addMoney(...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0));
}

export function subMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function mulMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export type GstSplit = {
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
};

/**
 * Compute GST split given a taxable value, GST rate (e.g. 18), and whether the
 * supply is inter-state (IGST) or intra-state (CGST+SGST).
 */
export function computeGstSplit(
  taxableValue: MoneyInput,
  gstRatePct: number,
  interState: boolean,
): GstSplit {
  const taxable = toDecimal(taxableValue);
  const taxAmount = taxable.times(gstRatePct).div(100);

  if (interState) {
    return {
      taxableValue: taxable.toFixed(2),
      cgst: '0.00',
      sgst: '0.00',
      igst: taxAmount.toFixed(2),
      total: taxable.plus(taxAmount).toFixed(2),
    };
  }
  const half = taxAmount.div(2);
  return {
    taxableValue: taxable.toFixed(2),
    cgst: half.toFixed(2),
    sgst: half.toFixed(2),
    igst: '0.00',
    total: taxable.plus(taxAmount).toFixed(2),
  };
}
