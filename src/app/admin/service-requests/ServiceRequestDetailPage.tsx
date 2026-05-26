import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, IndianRupee, Pencil, PlayCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/features/notifications/api';
import { useServiceRequest } from '@/features/service-requests/hooks';
import {
  ServiceRequestOverviewCard,
  ServiceRequestTimelineCard,
} from '@/app/service-requests/ServiceRequestDetailShared';
import { AssignVendorDialog } from './AssignVendorDialog';
import { StatusNoteDialog } from './StatusNoteDialog';
import { BillableDialog } from './BillableDialog';

type ContactInfo = { email: string | null; phone: string | null; corporateName: string };

async function fetchCorporateContact(corporateId: string): Promise<ContactInfo> {
  const { data, error } = await supabase
    .from('corporates')
    .select('legal_name, primary_contact_email, primary_contact_phone')
    .eq('id', corporateId)
    .single();
  if (error) throw error;
  return {
    email: data.primary_contact_email,
    phone: data.primary_contact_phone,
    corporateName: data.legal_name,
  };
}

export function AdminServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sr = useServiceRequest(id);

  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [billableOpen, setBillableOpen] = useState(false);

  const contact = useQuery({
    queryKey: ['corporate-contact', sr.data?.corporateId],
    queryFn: () => fetchCorporateContact(sr.data!.corporateId),
    enabled: !!sr.data?.corporateId,
  });

  if (!id) return <Navigate to="/admin/service-requests" replace />;

  if (sr.isPending) {
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
  if (sr.isError || !sr.data) {
    return <ErrorState error={sr.error} onRetry={() => void sr.refetch()} />;
  }

  const s = sr.data;
  const canAssign = s.status === 'open' || s.status === 'in_progress';
  const canResolve = s.status === 'in_progress';
  const canClose = s.status === 'resolved' || s.status === 'in_progress';

  async function notifyStatusUpdate(verb: string) {
    const info = contact.data;
    if (!info?.email) return;
    void sendNotification({
      channel: 'email',
      recipient: info.email,
      subject: `[${s.ticketNumber}] Service request ${verb}`,
      body:
        `Hi ${info.corporateName},\n\n` +
        `Your service request ${s.ticketNumber} has been ${verb}.\n` +
        (s.assignedVendor ? `Vendor: ${s.assignedVendor}\n` : '') +
        (s.vendorEta ? `ETA: ${s.vendorEta}\n` : '') +
        `\nView the ticket: ${window.location.origin}/corporate/service-requests/${s.id}\n`,
      relatedEntityType: 'service_requests',
      relatedEntityId: s.id,
      corporateId: s.corporateId,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.ticketNumber}
        description={s.corporate?.legalName}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/admin/service-requests">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            {canAssign && (
              <Button onClick={() => setAssignOpen(true)}>
                {s.assignedVendor ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    Update vendor
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Assign vendor
                  </>
                )}
              </Button>
            )}
            {canResolve && (
              <Button variant="outline" onClick={() => setResolveOpen(true)}>
                <CheckCircle2 className="h-4 w-4" />
                Mark resolved
              </Button>
            )}
            {canClose && (
              <Button variant="outline" onClick={() => setCloseOpen(true)}>
                <XCircle className="h-4 w-4" />
                Close ticket
              </Button>
            )}
            <Button variant="outline" onClick={() => setBillableOpen(true)}>
              <IndianRupee className="h-4 w-4" />
              {s.billableAmount && Number(s.billableAmount) > 0 ? 'Edit cost' : 'Add cost'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ServiceRequestOverviewCard sr={s} showCorporate />
        </div>
        <ServiceRequestTimelineCard srId={s.id} />
      </div>

      <AssignVendorDialog
        srId={s.id}
        ticketNumber={s.ticketNumber}
        currentVendor={s.assignedVendor}
        currentEta={s.vendorEta}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => void notifyStatusUpdate('assigned to a vendor')}
      />
      <StatusNoteDialog
        mode="resolve"
        srId={s.id}
        ticketNumber={s.ticketNumber}
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        onDone={() => void notifyStatusUpdate('resolved')}
      />
      <StatusNoteDialog
        mode="close"
        srId={s.id}
        ticketNumber={s.ticketNumber}
        open={closeOpen}
        onOpenChange={setCloseOpen}
        onDone={() => void notifyStatusUpdate('closed')}
      />
      <BillableDialog
        srId={s.id}
        ticketNumber={s.ticketNumber}
        currentAmount={s.billableAmount}
        currentDescription={s.billableDescription}
        open={billableOpen}
        onOpenChange={setBillableOpen}
      />
    </div>
  );
}
