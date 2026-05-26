import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';
import { supabase } from '@/lib/supabase';
import { formatDate, formatInr } from '@/lib/format';
import { subMoney, toDecimal } from '@/lib/money';
import type { InvoiceRow, InvoiceStatusEnum } from '@/types/database';

type Row = {
  id: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  total: string;
  amountPaid: string;
  balance: string;
  status: InvoiceStatusEnum;
};

type ListResult = { rows: Row[]; total: number };

async function fetchInvoices(opts: {
  page: number;
  pageSize: number;
  status: InvoiceStatusEnum | 'all';
  sortBy: 'issue_date' | 'due_date' | 'total' | 'status';
  sortDir: 'asc' | 'desc';
}): Promise<ListResult> {
  const from = opts.page * opts.pageSize;
  const to = from + opts.pageSize - 1;

  let q = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .order(opts.sortBy, { ascending: opts.sortDir === 'asc' })
    .range(from, to);
  if (opts.status !== 'all') q = q.eq('status', opts.status);

  const { data, error, count } = await q;
  if (error) throw error;

  const rows = ((data ?? []) as InvoiceRow[]).map((r) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    billingPeriodStart: r.billing_period_start,
    billingPeriodEnd: r.billing_period_end,
    issueDate: r.issue_date,
    dueDate: r.due_date,
    total: r.total,
    amountPaid: r.amount_paid,
    balance: subMoney(r.total, r.amount_paid).toFixed(2),
    status: r.status,
  }));
  return { rows, total: count ?? 0 };
}

export function CorporateInvoicesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<InvoiceStatusEnum | 'all'>('all');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'issue_date', desc: true }]);

  const sortBy = (sorting[0]?.id as 'issue_date' | 'due_date' | 'total' | 'status') ?? 'issue_date';
  const sortDir: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc';

  const params = {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    status,
    sortBy,
    sortDir,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['corporate', 'invoices', params],
    queryFn: () => fetchInvoices(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'invoice_number',
        header: 'Invoice',
        cell: ({ row }) => (
          <div className="font-mono text-sm font-medium">{row.original.invoiceNumber}</div>
        ),
        enableSorting: false,
      },
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => (
          <div className="text-sm">
            {formatDate(row.original.billingPeriodStart)} –{' '}
            {formatDate(row.original.billingPeriodEnd)}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'total',
        header: 'Amount',
        cell: ({ row }) => <div className="font-medium">{formatInr(row.original.total)}</div>,
        enableSorting: true,
      },
      {
        id: 'balance',
        header: 'Balance',
        cell: ({ row }) => {
          const bal = toDecimal(row.original.balance);
          if (bal.isZero()) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return <div className="font-medium text-destructive">{formatInr(bal.toFixed(2))}</div>;
        },
        enableSorting: false,
      },
      {
        accessorKey: 'due_date',
        header: 'Due',
        cell: ({ row }) => {
          const open = row.original.status === 'issued' || row.original.status === 'overdue';
          return (
            <div className="space-y-0.5">
              <div className="text-sm">{formatDate(row.original.dueDate)}</div>
              {open && <ExpiryBadge expiryDate={row.original.dueDate} />}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: true,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Your billing history. Online payments unlock once invoices are issued."
      />

      <div className="flex items-center">
        <Select
          className="w-48"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as InvoiceStatusEnum | 'all');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All statuses</option>
          <option value="issued">Issued</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        totalCount={data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        loading={isPending || (isFetching && !data)}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        onRowClick={(row) => navigate(`/corporate/invoices/${row.id}`)}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices will appear here once your fleet provider issues them."
      />
    </div>
  );
}
