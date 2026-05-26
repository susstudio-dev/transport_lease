import { useState } from 'react';
import { Download, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime, formatInr } from '@/lib/format';
import { mapSupabaseError } from '@/lib/errors';
import { useServiceRequestEvents } from '@/features/service-requests/hooks';
import { getPhotoSignedUrl } from '@/features/service-requests/api';
import {
  CATEGORY_OPTIONS,
  type ServiceRequestEvent,
  type ServiceRequestWithRelations,
} from '@/features/service-requests/types';
import type { ServiceCategoryEnum, ServiceUrgencyEnum } from '@/types/database';

const CATEGORY_LABEL: Record<ServiceCategoryEnum, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ServiceCategoryEnum, string>;

const URGENCY_VARIANT: Record<ServiceUrgencyEnum, 'muted' | 'warning' | 'destructive'> = {
  low: 'muted',
  medium: 'warning',
  high: 'destructive',
};

export function ServiceRequestOverviewCard({
  sr,
  showCorporate,
}: {
  sr: ServiceRequestWithRelations;
  showCorporate: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Vehicle, category, and current state.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={URGENCY_VARIANT[sr.urgency]} className="capitalize">
            {sr.urgency}
          </Badge>
          <StatusBadge status={sr.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {showCorporate && <Detail label="Corporate" value={sr.corporate?.legalName ?? '—'} />}
          <Detail
            label="Vehicle"
            value={
              sr.vehicle
                ? `${sr.vehicle.registrationNumber} — ${sr.vehicle.make} ${sr.vehicle.model}`
                : '—'
            }
          />
          <Detail label="Category" value={CATEGORY_LABEL[sr.category]} />
          <Detail label="Raised" value={formatDateTime(sr.createdAt)} />
          {sr.assignedVendor && <Detail label="Vendor" value={sr.assignedVendor} />}
          {sr.vendorEta && <Detail label="Vendor ETA" value={formatDateTime(sr.vendorEta)} />}
          {sr.resolvedAt && <Detail label="Resolved" value={formatDateTime(sr.resolvedAt)} />}
          {sr.closedAt && <Detail label="Closed" value={formatDateTime(sr.closedAt)} />}
        </div>

        <Separator />

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </p>
          <p className="whitespace-pre-line text-sm">{sr.description}</p>
        </div>

        {sr.billableAmount !== null && Number(sr.billableAmount) > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pass-through cost
              </p>
              <p className="text-sm font-semibold">{formatInr(sr.billableAmount)}</p>
              {sr.billableDescription && (
                <p className="text-xs text-muted-foreground">{sr.billableDescription}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This amount will appear on the next monthly invoice.
              </p>
            </div>
          </>
        )}

        {sr.photoPaths.length > 0 && (
          <>
            <Separator />
            <PhotosList paths={sr.photoPaths} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function PhotosList({ paths }: { paths: string[] }) {
  async function openPhoto(path: string) {
    try {
      const url = await getPhotoSignedUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error(mapSupabaseError(e));
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Photos</p>
      <ul className="space-y-1">
        {paths.map((p) => {
          const name = p.split('/').pop() ?? p;
          return (
            <li key={p}>
              <Button type="button" variant="ghost" size="sm" onClick={() => void openPhoto(p)}>
                <ImageIcon className="h-4 w-4" />
                {name}
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ServiceRequestTimelineCard({ srId }: { srId: string }) {
  const events = useServiceRequestEvents(srId);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>Status changes and notes from the team.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.isError ? (
          <ErrorState error={events.error} onRetry={() => void events.refetch()} />
        ) : events.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : events.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No events yet"
            description="Updates from your fleet provider will appear here."
          />
        ) : (
          <>
            <ul className="space-y-3">
              {(expanded ? events.data : events.data.slice(0, 5)).map((ev: ServiceRequestEvent) => (
                <li key={ev.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1 space-y-0.5">
                    <p>
                      <span className="font-medium capitalize">
                        {ev.eventType.replace('_', ' ')}
                      </span>
                      {ev.fromStatus && ev.toStatus && ev.fromStatus !== ev.toStatus && (
                        <span className="ml-1 text-muted-foreground">
                          {ev.fromStatus.replace('_', ' ')} → {ev.toStatus.replace('_', ' ')}
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
            {events.data.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less' : `Show ${events.data.length - 5} more events`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
