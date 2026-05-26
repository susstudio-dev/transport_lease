import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatDate, formatInr, formatGstin } from '@/lib/format';
import { formatInrInWords } from '@/lib/numberToWords';
import { subMoney, toDecimal } from '@/lib/money';
import { useInvoiceLineItems } from '@/features/invoices/hooks';
import type { InvoiceWithRelations } from '@/features/invoices/types';

export function InvoiceHeaderCard({ invoice }: { invoice: InvoiceWithRelations }) {
  const balance = subMoney(invoice.total, invoice.amountPaid);
  const showBalance = !toDecimal(balance).isZero();
  const open = invoice.status === 'issued' || invoice.status === 'overdue';
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Issued {formatDate(invoice.issueDate)} • Due {formatDate(invoice.dueDate)}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={invoice.isInterState ? 'default' : 'secondary'}>
            {invoice.isInterState ? 'Inter-state' : 'Intra-state'}
          </Badge>
          {open && <ExpiryBadge expiryDate={invoice.dueDate} />}
          <StatusBadge status={invoice.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Bill to" value={invoice.corporate?.legalName ?? '—'} />
          <Detail
            label="Recipient GSTIN"
            value={invoice.corporate?.gstin ? formatGstin(invoice.corporate.gstin) : null}
            mono
          />
          <Detail label="Contract" value={invoice.contract?.contractNumber ?? '—'} mono />
          <Detail label="Place of supply" value={invoice.placeOfSupplyStateCode ?? null} mono />
          <Detail
            label="Billing period"
            value={`${formatDate(invoice.billingPeriodStart)} — ${formatDate(invoice.billingPeriodEnd)}`}
          />
          <Detail label="Total" value={formatInr(invoice.total)} highlight />
        </div>
        {showBalance && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Outstanding balance</span>
              <span className="font-semibold text-destructive">
                {formatInr(balance.toFixed(2))}
              </span>
            </div>
          </>
        )}
        {invoice.cancellationReason && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cancellation reason
              </p>
              <p className="whitespace-pre-line text-sm">{invoice.cancellationReason}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function InvoiceLineItemsCard({ invoiceId }: { invoiceId: string }) {
  const lines = useInvoiceLineItems(invoiceId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Line items</CardTitle>
        <CardDescription>Charges and their GST treatment.</CardDescription>
      </CardHeader>
      <CardContent>
        {lines.isError ? (
          <ErrorState error={lines.error} onRetry={() => void lines.refetch()} />
        ) : lines.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">GST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.data.map((l, idx) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="font-mono text-xs">{l.hsnCode}</TableCell>
                  <TableCell className="text-right">{Number(l.quantity)}</TableCell>
                  <TableCell className="text-right">{formatInr(l.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatInr(l.taxableValue)}</TableCell>
                  <TableCell className="text-right">{Number(l.gstRate)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function InvoiceTotalsCard({ invoice }: { invoice: InvoiceWithRelations }) {
  const inter = invoice.isInterState;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Subtotal (taxable)" value={formatInr(invoice.subtotal)} />
        {inter ? (
          <Row label="IGST" value={formatInr(invoice.igst)} />
        ) : (
          <>
            <Row label="CGST" value={formatInr(invoice.cgst)} />
            <Row label="SGST" value={formatInr(invoice.sgst)} />
          </>
        )}
        <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatInr(invoice.total)}</span>
        </div>
        <Separator className="my-3" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">In words</p>
        <p className="text-sm">{formatInrInWords(invoice.total)}</p>
      </CardContent>
    </Card>
  );
}

function Detail({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={[
          mono ? 'font-mono text-sm' : 'text-sm',
          highlight ? 'text-base font-semibold' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value ?? '—'}
      </p>
    </div>
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
