import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { mapSupabaseError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { InvoicePdf } from '@/lib/pdf/InvoicePdf';
import { downloadPdf } from '@/lib/pdf/download';
import { useInvoice, useInvoiceLineItems } from '@/features/invoices/hooks';
import { decodeBillingAddress } from '@/features/corporates/types';
import {
  InvoiceHeaderCard,
  InvoiceLineItemsCard,
  InvoiceTotalsCard,
} from '@/app/invoices/InvoiceDetailShared';

export function CorporateInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const invoice = useInvoice(id);
  const lines = useInvoiceLineItems(id);
  const [downloading, setDownloading] = useState(false);

  if (!id) return <Navigate to="/corporate/invoices" replace />;

  if (invoice.isPending) {
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
  if (invoice.isError || !invoice.data) {
    return <ErrorState error={invoice.error} onRetry={() => void invoice.refetch()} />;
  }

  const inv = invoice.data;

  async function handleDownloadPdf() {
    if (!lines.data) return;
    setDownloading(true);
    try {
      const [corpRes, settingsRes] = await Promise.all([
        supabase
          .from('corporates')
          .select('legal_name, gstin, billing_address')
          .eq('id', inv.corporateId)
          .single(),
        supabase.from('app_settings').select('*').eq('id', true).single(),
      ]);
      if (corpRes.error) throw corpRes.error;
      if (settingsRes.error) throw settingsRes.error;

      await downloadPdf(
        `invoice-${inv.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`,
        <InvoicePdf
          invoice={inv}
          lineItems={lines.data}
          corporate={{
            legalName: corpRes.data.legal_name,
            gstin: corpRes.data.gstin,
            billingAddress: decodeBillingAddress(corpRes.data.billing_address),
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
        title={inv.invoiceNumber}
        description={`${inv.contract?.contractNumber ?? ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/corporate/invoices">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              onClick={() => void handleDownloadPdf()}
              disabled={downloading || lines.isPending}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Invoice PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InvoiceHeaderCard invoice={inv} />
          <InvoiceLineItemsCard invoiceId={inv.id} />
        </div>
        <InvoiceTotalsCard invoice={inv} />
      </div>
    </div>
  );
}
