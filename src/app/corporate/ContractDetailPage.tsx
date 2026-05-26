import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import { mapSupabaseError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { LeaseAgreementPdf } from '@/lib/pdf/LeaseAgreementPdf';
import { downloadPdf } from '@/lib/pdf/download';
import { useContractWithRelations } from '@/features/contracts/hooks';
import { decodeBillingAddress } from '@/features/corporates/types';
import type { ResponsibilityEnum } from '@/types/database';

const RESP_LABEL: Record<ResponsibilityEnum, string> = {
  client: 'Your corporate',
  company: 'Fleet provider',
};

export function CorporateContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [downloading, setDownloading] = useState(false);
  const contract = useContractWithRelations(id);

  if (!id) return <Navigate to="/corporate/contracts" replace />;

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
        description={`${c.vehicle.registrationNumber} • ${c.vehicle.make} ${c.vehicle.model}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/corporate/contracts">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button onClick={handleDownloadPdf} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Lease PDF
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Contract terms</CardTitle>
            <CardDescription>Effective period, rental, and responsibilities.</CardDescription>
          </div>
          <StatusBadge status={c.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail
              label="Vehicle"
              value={`${c.vehicle.registrationNumber} — ${c.vehicle.make} ${c.vehicle.model}${c.vehicle.variant ? ` ${c.vehicle.variant}` : ''} (${c.vehicle.year})`}
              link={`/corporate/vehicles/${c.vehicle.id}`}
            />
            <Detail label="Tenure" value={`${c.tenureMonths} months`} />
            <Detail label="Start" value={formatDate(c.startDate)} />
            <Detail label="End" value={formatDate(c.endDate)} />
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
            <Detail label="Fuel" value={RESP_LABEL[c.fuelResponsibility]} />
            <Detail label="Insurance" value={RESP_LABEL[c.insuranceResponsibility]} />
          </div>
          {c.terminationReason && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Termination
                </p>
                <p className="whitespace-pre-line text-sm">{c.terminationReason}</p>
                {c.terminatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Terminated {formatDateTime(c.terminatedAt)}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  value,
  highlight = false,
  link,
}: {
  label: string;
  value: string | null;
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
          className={['text-sm', highlight ? 'text-base font-semibold' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {body}
        </p>
      )}
    </div>
  );
}
