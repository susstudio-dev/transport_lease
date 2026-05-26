import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Pencil,
  PlayCircle,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatDateTime, formatGstin, formatInr } from '@/lib/format';
import { mapSupabaseError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { LeaseAgreementPdf } from '@/lib/pdf/LeaseAgreementPdf';
import { downloadPdf } from '@/lib/pdf/download';
import {
  useActivateContract,
  useContractEvents,
  useContractWithRelations,
  useDeleteDraftContract,
} from '@/features/contracts/hooks';
import type { ContractEvent } from '@/features/contracts/types';
import { decodeBillingAddress } from '@/features/corporates/types';
import { TerminateContractDialog } from './TerminateContractDialog';
import type { ResponsibilityEnum } from '@/types/database';

const RESP_LABEL: Record<ResponsibilityEnum, string> = {
  client: 'Lessee (corporate)',
  company: 'Lessor (you)',
};

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const contract = useContractWithRelations(id);
  const events = useContractEvents(id);
  const activate = useActivateContract(id ?? '');
  const del = useDeleteDraftContract();

  if (!id) return <Navigate to="/admin/contracts" replace />;

  if (contract.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (contract.isError || !contract.data) {
    return <ErrorState error={contract.error} onRetry={() => void contract.refetch()} />;
  }

  const c = contract.data;
  const isDraft = c.status === 'draft';
  const isActive = c.status === 'active' || c.status === 'expiring_soon';
  const isTerminal = c.status === 'terminated' || c.status === 'expired' || c.status === 'renewed';

  const daysToEnd = differenceInCalendarDays(parseISO(c.endDate), new Date());

  function handleActivate() {
    activate.mutate(undefined, {
      onSuccess: () => toast.success('Contract activated. Vehicle marked as leased.'),
      onError: (e) => toast.error(mapSupabaseError(e)),
    });
  }

  function handleDelete() {
    if (!confirm('Delete this draft contract? This cannot be undone.')) return;
    del.mutate(c.id, {
      onSuccess: () => {
        toast.success('Draft deleted.');
        navigate('/admin/contracts');
      },
      onError: (e) => toast.error(mapSupabaseError(e)),
    });
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const [corpRes, vehRes, settingsRes] = await Promise.all([
        supabase
          .from('corporates')
          .select('legal_name, gstin, billing_address')
          .eq('id', c.corporateId)
          .single(),
        supabase
          .from('vehicles')
          .select('registration_number, make, model, variant, year, chassis_no, engine_no')
          .eq('id', c.vehicleId)
          .single(),
        supabase.from('app_settings').select('*').eq('id', true).single(),
      ]);
      if (corpRes.error) throw corpRes.error;
      if (vehRes.error) throw vehRes.error;
      if (settingsRes.error) throw settingsRes.error;

      await downloadPdf(
        `lease-${c.contractNumber.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`,
        <LeaseAgreementPdf
          contract={c}
          corporate={{
            legalName: corpRes.data.legal_name,
            gstin: corpRes.data.gstin,
            billingAddress: decodeBillingAddress(corpRes.data.billing_address),
          }}
          vehicle={{
            registrationNumber: vehRes.data.registration_number,
            make: vehRes.data.make,
            model: vehRes.data.model,
            variant: vehRes.data.variant,
            year: vehRes.data.year,
            chassisNo: vehRes.data.chassis_no,
            engineNo: vehRes.data.engine_no,
          }}
          company={settingsRes.data}
        />,
      );
    } catch (e) {
      toast.error(mapSupabaseError(e));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.contractNumber}
        description={`${c.corporate.legalName} • ${c.vehicle.registrationNumber}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/admin/contracts">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Lease PDF
            </Button>
            {isDraft && (
              <>
                <Button asChild variant="outline">
                  <Link to={`/admin/contracts/${c.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button variant="outline" onClick={handleDelete} disabled={del.isPending}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button onClick={handleActivate} disabled={activate.isPending}>
                  {activate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Activate
                </Button>
              </>
            )}
            {isActive && (
              <>
                <Button asChild variant="outline">
                  <Link to={`/admin/contracts/new?renewFrom=${c.id}`}>
                    <RefreshCw className="h-4 w-4" />
                    Renew
                  </Link>
                </Button>
                <Button variant="destructive" onClick={() => setTerminateOpen(true)}>
                  <XCircle className="h-4 w-4" />
                  Terminate
                </Button>
              </>
            )}
            {isTerminal && (
              <Button asChild variant="outline">
                <Link to={`/admin/contracts/new?renewFrom=${c.id}`}>
                  <RefreshCw className="h-4 w-4" />
                  Create new from this
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Term, commercials, and responsibilities.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isActive && daysToEnd >= 0 && daysToEnd <= 30 && (
                <Badge variant="warning">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {daysToEnd}d to end
                </Badge>
              )}
              <StatusBadge status={c.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="Corporate"
                value={c.corporate.legalName}
                link={`/admin/corporates/${c.corporate.id}`}
              />
              <Detail
                label="Vehicle"
                value={`${c.vehicle.registrationNumber} — ${c.vehicle.make} ${c.vehicle.model}${c.vehicle.variant ? ` ${c.vehicle.variant}` : ''} (${c.vehicle.year})`}
                link={`/admin/vehicles/${c.vehicle.id}`}
              />
              <Detail
                label="Corporate GSTIN"
                value={c.corporate.gstin ? formatGstin(c.corporate.gstin) : null}
                mono
              />
              <Detail label="Tenure" value={`${c.tenureMonths} months`} />
              <Detail label="Start date" value={formatDate(c.startDate)} />
              <Detail label="End date" value={formatDate(c.endDate)} />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Monthly rental" value={formatInr(c.monthlyRental)} highlight />
              <Detail label="Security deposit" value={formatInr(c.securityDeposit)} />
              <Detail
                label="Kilometre cap"
                value={
                  c.kmCapPerMonth !== null
                    ? `${c.kmCapPerMonth.toLocaleString('en-IN')} km / mo`
                    : 'Unlimited'
                }
              />
              <Detail
                label="Lifetime value"
                value={formatInr(Number(c.monthlyRental) * c.tenureMonths)}
              />
              <Detail label="Fuel responsibility" value={RESP_LABEL[c.fuelResponsibility]} />
              <Detail
                label="Insurance responsibility"
                value={RESP_LABEL[c.insuranceResponsibility]}
              />
            </div>
            {(c.notes || c.terminationReason) && <Separator />}
            {c.notes && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="whitespace-pre-line text-sm">{c.notes}</p>
              </div>
            )}
            {c.terminationReason && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Termination reason
                </p>
                <p className="whitespace-pre-line text-sm">{c.terminationReason}</p>
                {c.terminatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Terminated {formatDateTime(c.terminatedAt)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Status changes for this contract.</CardDescription>
          </CardHeader>
          <CardContent>
            <EventList query={events} />
          </CardContent>
        </Card>
      </div>

      {c.previousContractId && <RelatedContractsCard previousId={c.previousContractId} />}

      <TerminateContractDialog
        contractId={c.id}
        contractNumber={c.contractNumber}
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
  highlight = false,
  link,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  highlight?: boolean;
  link?: string;
}) {
  const body = value ?? '—';
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {link && value ? (
        <Link to={link} className="text-sm text-primary hover:underline">
          {body}
        </Link>
      ) : (
        <p
          className={[
            mono ? 'font-mono text-sm' : 'text-sm',
            highlight ? 'text-base font-semibold' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {body}
        </p>
      )}
    </div>
  );
}

function EventList({ query }: { query: ReturnType<typeof useContractEvents> }) {
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No events yet"
        description="Events appear here when the contract is activated, renewed, or terminated."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {query.data.map((ev: ContractEvent) => (
        <li key={ev.id} className="flex items-start gap-3 text-sm">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div className="flex-1 space-y-0.5">
            <p>
              <span className="font-medium capitalize">{ev.eventType.replace('_', ' ')}</span>
              {ev.fromStatus && ev.toStatus && (
                <span className="ml-1 text-muted-foreground">
                  {ev.fromStatus} → {ev.toStatus}
                </span>
              )}
            </p>
            {ev.note && <p className="text-xs text-muted-foreground">{ev.note}</p>}
            <p className="text-xs text-muted-foreground">
              {formatDateTime(ev.createdAt)}
              {ev.actorName ? ` • ${ev.actorName}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RelatedContractsCard({ previousId }: { previousId: string }) {
  const prev = useQuery({
    queryKey: ['contracts', 'prev-summary', previousId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, start_date, end_date, status')
        .eq('id', previousId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renewed from</CardTitle>
        <CardDescription>The contract this one replaced.</CardDescription>
      </CardHeader>
      <CardContent>
        {prev.isPending ? (
          <Skeleton className="h-6 w-64" />
        ) : prev.isError ? (
          <ErrorState error={prev.error} onRetry={() => void prev.refetch()} />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <Link
                to={`/admin/contracts/${prev.data.id}`}
                className="font-mono text-sm font-medium text-primary hover:underline"
              >
                {prev.data.contract_number}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDate(prev.data.start_date)} — {formatDate(prev.data.end_date)}
              </p>
            </div>
            <StatusBadge status={prev.data.status} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
