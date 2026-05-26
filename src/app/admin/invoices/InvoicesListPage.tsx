import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';
import { useInvoicesList } from '@/features/invoices/hooks';
import type { InvoiceWithRelations, ListInvoicesParams } from '@/features/invoices/types';
import { formatDate, formatInr } from '@/lib/format';
import { subMoney, toDecimal } from '@/lib/money';
import { useDebounce } from '@/hooks/useDebounce';
import type { InvoiceStatusEnum } from '@/types/database';

type SortKey = ListInvoicesParams['sortBy'];

export function AdminInvoicesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatusEnum | 'all'>('all');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'issue_date', desc: true }]);

  const debouncedSearch = useDebounce(search, 300);
  const sortBy: SortKey = (sorting[0]?.id as SortKey) ?? 'issue_date';
  const sortDir: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc';

  const params: ListInvoicesParams = {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim(),
    status,
    sortBy,
    sortDir,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useInvoicesList(params);

  const columns = useMemo<ColumnDef<InvoiceWithRelations>[]>(
    () => [
      {
        accessorKey: 'invoice_number',
        header: 'Invoice',
        cell: ({ row }) => (
          <div className="font-mono text-sm font-medium">{row.original.invoiceNumber}</div>
        ),
        enableSorting: true,
      },
      {
        id: 'corporate',
        header: 'Corporate',
        cell: ({ row }) => (
          <div className="text-sm">{row.original.corporate?.legalName ?? '—'}</div>
        ),
      },
      {
        accessorKey: 'issue_date',
        header: 'Issued',
        cell: ({ row }) => <div className="text-sm">{formatDate(row.original.issueDate)}</div>,
        enableSorting: true,
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
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => <div className="font-medium">{formatInr(row.original.total)}</div>,
        enableSorting: true,
      },
      {
        id: 'balance',
        header: 'Balance',
        cell: ({ row }) => {
          const bal = toDecimal(subMoney(row.original.total, row.original.amountPaid));
          if (bal.isZero()) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="text-sm font-medium text-destructive">{formatInr(bal.toFixed(2))}</div>
          );
        },
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
        description="GST-compliant invoices for your corporate clients."
        actions={
          <Button asChild>
            <Link to="/admin/invoices/new">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            className="pl-9"
          />
        </div>
        <Select
          className="w-full sm:w-48"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as InvoiceStatusEnum | 'all');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
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
        onRowClick={(row) => navigate(`/admin/invoices/${row.id}`)}
        emptyTitle="No invoices yet"
        emptyDescription="Create your first invoice from a contract."
        emptyAction={
          <Button asChild size="sm">
            <Link to="/admin/invoices/new">Create invoice</Link>
          </Button>
        }
      />
    </div>
  );
}
