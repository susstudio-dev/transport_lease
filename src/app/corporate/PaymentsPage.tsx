import { useQuery } from '@tanstack/react-query';
import { IndianRupee } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { formatDateTime, formatInr } from '@/lib/format';
import type { PaymentMethodEnum, PaymentRow } from '@/types/database';

const METHOD_LABEL: Record<PaymentMethodEnum, string> = {
  razorpay: 'Razorpay',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  cash: 'Cash',
};

async function fetchPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, method, reference_number, paid_at, invoice_id')
    .order('paid_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Pick<
    PaymentRow,
    'id' | 'amount' | 'method' | 'reference_number' | 'paid_at' | 'invoice_id'
  >[];
}

export function CorporatePaymentsPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['corporate', 'payments'],
    queryFn: fetchPayments,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Your payment history. Online checkout becomes available in the next release."
      />
      <Card>
        <CardContent className="pt-6">
          {isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              title="No payments yet"
              description="Once you settle an invoice the payment record will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid at</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{formatDateTime(p.paid_at)}</TableCell>
                    <TableCell className="font-medium">{formatInr(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{METHOD_LABEL[p.method]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.reference_number ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
