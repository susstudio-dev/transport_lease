import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/format';
import { useVehicle, useVehicleDocs } from '@/features/vehicles/hooks';
import { VEHICLE_DOC_TYPES } from '@/features/vehicles/types';
import type { FuelTypeEnum } from '@/types/database';

const FUEL_LABEL: Record<FuelTypeEnum, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  electric: 'Electric',
  hybrid: 'Hybrid',
};

export function CorporateVehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vehicle = useVehicle(id);
  const docs = useVehicleDocs(id ?? '');

  if (!id) return <Navigate to="/corporate/vehicles" replace />;

  if (vehicle.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (vehicle.isError || !vehicle.data) {
    return <ErrorState error={vehicle.error} onRetry={() => void vehicle.refetch()} />;
  }

  const v = vehicle.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.registrationNumber}
        description={`${v.make} ${v.model}${v.variant ? ` ${v.variant}` : ''} • ${v.year}`}
        actions={
          <Button asChild variant="ghost">
            <Link to="/corporate/vehicles">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Vehicle details</CardTitle>
            <CardDescription>Reference information for this vehicle.</CardDescription>
          </div>
          <StatusBadge status={v.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Detail label="Fuel" value={FUEL_LABEL[v.fuelType]} />
            <Detail label="Transmission" value={v.transmission} capitalize />
            <Detail label="Color" value={v.color} />
            <Detail label="Seating capacity" value={v.seatingCapacity?.toString() ?? null} />
            <Detail label="Chassis no." value={v.chassisNo} mono />
            <Detail label="Engine no." value={v.engineNo} mono />
          </div>
          {v.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="whitespace-pre-line text-sm">{v.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statutory documents</CardTitle>
          <CardDescription>RC, insurance, PUC, and fitness expiry tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          {docs.isError ? (
            <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
          ) : docs.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : docs.data.length === 0 ? (
            <EmptyState
              title="No documents on file"
              description="Your fleet manager hasn't uploaded statutory documents for this vehicle yet."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {VEHICLE_DOC_TYPES.map((t) => {
                  const doc = docs.data.find((d) => d.docType === t.value);
                  return (
                    <TableRow key={t.value}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {doc?.documentNumber ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc?.issueDate ? formatDate(doc.issueDate) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc?.expiryDate ? formatDate(doc.expiryDate) : '—'}
                      </TableCell>
                      <TableCell>
                        <ExpiryBadge expiryDate={doc?.expiryDate} fallbackLabel="Not filed" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
  capitalize = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={[mono ? 'font-mono text-sm' : 'text-sm', capitalize ? 'capitalize' : '']
          .filter(Boolean)
          .join(' ')}
      >
        {value ?? '—'}
      </p>
    </div>
  );
}
