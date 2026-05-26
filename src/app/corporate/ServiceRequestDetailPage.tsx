import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useServiceRequest } from '@/features/service-requests/hooks';
import {
  ServiceRequestOverviewCard,
  ServiceRequestTimelineCard,
} from '@/app/service-requests/ServiceRequestDetailShared';

export function CorporateServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sr = useServiceRequest(id);

  if (!id) return <Navigate to="/corporate/service-requests" replace />;

  if (sr.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
  if (sr.isError || !sr.data) {
    return <ErrorState error={sr.error} onRetry={() => void sr.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={sr.data.ticketNumber}
        description={
          sr.data.vehicle
            ? `${sr.data.vehicle.registrationNumber} • ${sr.data.vehicle.make} ${sr.data.vehicle.model}`
            : undefined
        }
        actions={
          <Button asChild variant="ghost">
            <Link to="/corporate/service-requests">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ServiceRequestOverviewCard sr={sr.data} showCorporate={false} />
        </div>
        <ServiceRequestTimelineCard srId={sr.data.id} />
      </div>
    </div>
  );
}
