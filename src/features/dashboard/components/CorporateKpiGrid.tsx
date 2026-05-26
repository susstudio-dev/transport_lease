import { Link } from 'react-router-dom';
import { CalendarClock, FileSignature, FileWarning, IndianRupee, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/shared/KpiCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatDate, formatInr } from '@/lib/format';
import { expiryInfo } from '@/lib/expiry';
import { useCorporateKpis } from '../hooks';

export function CorporateKpiGrid() {
  const { data, isPending, isError, error, refetch } = useCorporateKpis();

  if (isError) {
    return (
      <ErrorState title="Couldn't load dashboard" error={error} onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
        <KpiCard
          label="Active contracts"
          value={data?.activeContracts ?? 0}
          icon={FileSignature}
          loading={isPending}
        />
        <KpiCard
          label="Expiring in 30 days"
          value={data?.expiringContracts ?? 0}
          icon={CalendarClock}
          loading={isPending}
          hint="Plan renewals"
        />
        <KpiCard
          label="Outstanding"
          value={data ? formatInr(data.outstandingAmount) : null}
          icon={IndianRupee}
          loading={isPending}
          hint="Issued + overdue invoices"
        />
        <KpiCard
          label="Overdue invoices"
          value={data?.overdueInvoicesCount ?? 0}
          icon={FileWarning}
          loading={isPending}
        />
        <KpiCard
          label="Open service tickets"
          value={data?.openServiceTickets ?? 0}
          icon={Wrench}
          loading={isPending}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next invoice due</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : data?.nextDueInvoice ? (
            <NextDueInvoice
              invoiceNumber={data.nextDueInvoice.invoiceNumber}
              dueDate={data.nextDueInvoice.dueDate}
              total={data.nextDueInvoice.total}
              id={data.nextDueInvoice.id}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No invoices due.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NextDueInvoice({
  id,
  invoiceNumber,
  dueDate,
  total,
}: {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  total: string;
}) {
  const info = expiryInfo(dueDate);
  const tone =
    info.status === 'expired' || info.status === 'critical'
      ? 'text-destructive'
      : info.status === 'warning' || info.status === 'soon'
        ? 'text-amber-700'
        : 'text-muted-foreground';

  return (
    <div className="space-y-3">
      <div>
        <div className="text-2xl font-semibold tracking-tight">{formatInr(total)}</div>
        <div className="font-mono text-xs text-muted-foreground">{invoiceNumber}</div>
      </div>
      <div className={`text-sm ${tone}`}>
        Due {formatDate(dueDate)} ({info.label.toLowerCase()})
      </div>
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link to={`/corporate/invoices`}>View invoices</Link>
      </Button>
      {/* The `id` is reserved for M10 deep-link to a payment page. */}
      <span className="hidden">{id}</span>
    </div>
  );
}
