import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { formatDate, formatInr } from '@/lib/format';
import { mapSupabaseError } from '@/lib/errors';
import { useDeleteVehicleDoc, useVehicle, useVehicleDocs } from '@/features/vehicles/hooks';
import { getVehicleDocSignedUrl } from '@/features/vehicles/api';
import { VEHICLE_DOC_TYPES, type VehicleDocument } from '@/features/vehicles/types';
import type { FuelTypeEnum, VehicleDocTypeEnum } from '@/types/database';
import { VehicleDocumentDialog } from './VehicleDocumentDialog';

const FUEL_LABEL: Record<FuelTypeEnum, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  electric: 'Electric',
  hybrid: 'Hybrid',
};

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [openDoc, setOpenDoc] = useState<{
    docType: VehicleDocTypeEnum;
    existing?: VehicleDocument;
  } | null>(null);

  const vehicle = useVehicle(id);
  const docs = useVehicleDocs(id ?? '');
  const del = useDeleteVehicleDoc(id ?? '');

  if (!id) return <Navigate to="/admin/vehicles" replace />;

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
  const docByType = new Map<VehicleDocTypeEnum, VehicleDocument>();
  for (const d of docs.data ?? []) docByType.set(d.docType, d);

  async function handleDownload(filePath: string) {
    try {
      const url = await getVehicleDocSignedUrl(filePath);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error(mapSupabaseError(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.registrationNumber}
        description={`${v.make} ${v.model}${v.variant ? ` ${v.variant}` : ''} • ${v.year}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/admin/vehicles">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/vehicles/${v.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Identity, engine, and purchase details.</CardDescription>
          </div>
          <StatusBadge status={v.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Detail label="Chassis no." value={v.chassisNo} mono />
            <Detail label="Engine no." value={v.engineNo} mono />
            <Detail label="Color" value={v.color} />
            <Detail label="Fuel" value={FUEL_LABEL[v.fuelType]} />
            <Detail label="Transmission" value={v.transmission} capitalize />
            <Detail label="Seating capacity" value={v.seatingCapacity?.toString() ?? null} />
            <Detail
              label="Purchase date"
              value={v.purchaseDate ? formatDate(v.purchaseDate) : null}
            />
            <Detail
              label="Purchase price"
              value={v.purchasePrice ? formatInr(v.purchasePrice) : null}
            />
            <Detail label="Added" value={formatDate(v.createdAt)} />
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
          <CardDescription>
            RC, insurance, PUC, and fitness. Badges turn amber at 30 days, red at 7 days.
          </CardDescription>
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {VEHICLE_DOC_TYPES.map((t) => {
                  const doc = docByType.get(t.value);
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
                        <ExpiryBadge
                          expiryDate={doc?.expiryDate ?? null}
                          fallbackLabel="Not filed"
                        />
                      </TableCell>
                      <TableCell>
                        {doc?.filePath ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDownload(doc.filePath!)}
                          >
                            <Download className="h-4 w-4" />
                            {doc.fileName ?? 'View'}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No file</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant={doc ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => setOpenDoc({ docType: t.value, existing: doc })}
                          >
                            {doc ? (
                              <>
                                <Pencil className="h-3.5 w-3.5" />
                                Update
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                Add
                              </>
                            )}
                          </Button>
                          {doc && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                del.mutate(doc, {
                                  onSuccess: () => toast.success(`${t.label} removed.`),
                                  onError: (e) => toast.error(mapSupabaseError(e)),
                                })
                              }
                              disabled={del.isPending}
                              aria-label={`Remove ${t.label}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {openDoc && (
        <VehicleDocumentDialog
          vehicleId={v.id}
          docType={openDoc.docType}
          existing={openDoc.existing}
          open={true}
          onOpenChange={(o) => {
            if (!o) setOpenDoc(null);
          }}
        />
      )}
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
