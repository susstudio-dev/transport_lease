import {
  Car,
  CheckCircle2,
  FileSignature,
  FileWarning,
  AlertOctagon,
  IndianRupee,
} from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatInr } from '@/lib/format';
import { useAdminKpis } from '../hooks';

export function KpiGrid() {
  const { data, isPending, isError, error, refetch } = useAdminKpis();

  if (isError) {
    return (
      <ErrorState title="Couldn't load dashboard" error={error} onRetry={() => void refetch()} />
    );
  }

  const loading = isPending;
  const k = data;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        label="Total fleet"
        value={k?.fleetTotal ?? 0}
        icon={Car}
        loading={loading}
        hint="Vehicles in master list"
      />
      <KpiCard
        label="Leased"
        value={k?.fleetLeased ?? 0}
        icon={FileSignature}
        loading={loading}
        hint="Currently with a corporate"
      />
      <KpiCard
        label="Available"
        value={k?.fleetAvailable ?? 0}
        icon={CheckCircle2}
        loading={loading}
        hint="Ready to lease"
      />
      <KpiCard
        label="Active contracts"
        value={k?.activeContracts ?? 0}
        icon={FileSignature}
        loading={loading}
      />
      <KpiCard
        label="Expiring in 30 days"
        value={k?.contractsExpiringSoon ?? 0}
        icon={FileWarning}
        loading={loading}
        hint="Plan renewals"
      />
      <KpiCard
        label="Overdue invoices"
        value={k?.overdueInvoicesCount ?? 0}
        icon={AlertOctagon}
        loading={loading}
      />
      <KpiCard
        label="Revenue this month"
        value={k ? formatInr(k.monthlyRevenueThisMonth) : null}
        icon={IndianRupee}
        loading={loading}
        delta={
          k && k.monthlyRevenueDeltaPct !== null
            ? { value: k.monthlyRevenueDeltaPct, label: 'vs last month' }
            : undefined
        }
      />
      <KpiCard
        label="Revenue last month"
        value={k ? formatInr(k.monthlyRevenueLastMonth) : null}
        icon={IndianRupee}
        loading={loading}
      />
    </div>
  );
}
