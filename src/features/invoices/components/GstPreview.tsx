import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatInr } from '@/lib/format';
import { addMoney, mulMoney, toDecimal } from '@/lib/money';
import type { LineItemInput } from '../schemas';

type Props = {
  lines: LineItemInput[];
  isInterState: boolean;
};

export function GstPreview({ lines, isInterState }: Props) {
  let subtotal = toDecimal(0);
  let tax = toDecimal(0);

  for (const l of lines) {
    if (
      !Number.isFinite(l.quantity) ||
      !Number.isFinite(l.unitPrice) ||
      !Number.isFinite(l.gstRate)
    ) {
      continue;
    }
    const taxable = mulMoney(l.quantity, l.unitPrice);
    subtotal = subtotal.plus(taxable);
    tax = tax.plus(taxable.times(l.gstRate).div(100));
  }

  const cgst = isInterState ? toDecimal(0) : tax.div(2);
  const sgst = isInterState ? toDecimal(0) : tax.div(2);
  const igst = isInterState ? tax : toDecimal(0);
  const total = addMoney(subtotal, cgst, sgst, igst);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>GST &amp; totals</CardTitle>
        </div>
        <Badge variant={isInterState ? 'default' : 'secondary'}>
          {isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Subtotal (taxable)" value={formatInr(subtotal.toFixed(2))} />
        {isInterState ? (
          <Row label="IGST" value={formatInr(igst.toFixed(2))} />
        ) : (
          <>
            <Row label="CGST" value={formatInr(cgst.toFixed(2))} />
            <Row label="SGST" value={formatInr(sgst.toFixed(2))} />
          </>
        )}
        <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
          <span>Total payable</span>
          <span>{formatInr(total.toFixed(2))}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
