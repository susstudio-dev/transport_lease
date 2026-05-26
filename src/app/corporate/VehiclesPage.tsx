import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Car } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { supabase } from '@/lib/supabase';
import { formatDate, formatInr } from '@/lib/format';
import type { ContractStatusEnum, FuelTypeEnum, TransmissionTypeEnum } from '@/types/database';

type Row = {
  contractId: string;
  contractNumber: string;
  contractStatus: ContractStatusEnum;
  startDate: string;
  endDate: string;
  monthlyRental: string;
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
    variant: string | null;
    year: number;
    fuelType: FuelTypeEnum;
    transmission: TransmissionTypeEnum;
    color: string | null;
  };
};

async function fetchMyVehicles(): Promise<Row[]> {
  // RLS auto-scopes to corporate_admin's corporate.
  const { data, error } = await supabase
    .from('contracts')
    .select(
      'id, contract_number, status, start_date, end_date, monthly_rental, vehicle:vehicles(id, registration_number, make, model, variant, year, fuel_type, transmission, color)',
    )
    .in('status', ['active', 'expiring_soon'])
    .order('start_date', { ascending: false });

  if (error) throw error;

  type JoinedRow = {
    id: string;
    contract_number: string;
    status: ContractStatusEnum;
    start_date: string;
    end_date: string;
    monthly_rental: string;
    vehicle: {
      id: string;
      registration_number: string;
      make: string;
      model: string;
      variant: string | null;
      year: number;
      fuel_type: FuelTypeEnum;
      transmission: TransmissionTypeEnum;
      color: string | null;
    } | null;
  };

  return ((data ?? []) as unknown as JoinedRow[])
    .filter(
      (r): r is JoinedRow & { vehicle: NonNullable<JoinedRow['vehicle']> } => r.vehicle !== null,
    )
    .map((r) => ({
      contractId: r.id,
      contractNumber: r.contract_number,
      contractStatus: r.status,
      startDate: r.start_date,
      endDate: r.end_date,
      monthlyRental: r.monthly_rental,
      vehicle: {
        id: r.vehicle.id,
        registrationNumber: r.vehicle.registration_number,
        make: r.vehicle.make,
        model: r.vehicle.model,
        variant: r.vehicle.variant,
        year: r.vehicle.year,
        fuelType: r.vehicle.fuel_type,
        transmission: r.vehicle.transmission,
        color: r.vehicle.color,
      },
    }));
}

export function CorporateVehiclesPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['corporate', 'my-vehicles'],
    queryFn: fetchMyVehicles,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My vehicles" description="Vehicles currently leased to your corporate." />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          description="When a vehicle is leased to your corporate it'll appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((row) => (
            <Link
              key={row.contractId}
              to={`/corporate/vehicles/${row.vehicle.id}`}
              className="block transition-colors hover:opacity-90"
            >
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        {row.vehicle.registrationNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {row.vehicle.make} {row.vehicle.model}
                        {row.vehicle.variant ? ` ${row.vehicle.variant}` : ''} • {row.vehicle.year}
                      </div>
                    </div>
                    <StatusBadge status={row.contractStatus} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="muted" className="capitalize">
                      {row.vehicle.fuelType}
                    </Badge>
                    <Badge variant="muted" className="capitalize">
                      {row.vehicle.transmission}
                    </Badge>
                    {row.vehicle.color && <Badge variant="muted">{row.vehicle.color}</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Lease</div>
                      <div>
                        {formatDate(row.startDate)} – {formatDate(row.endDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Monthly</div>
                      <div className="font-medium">{formatInr(row.monthlyRental)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
