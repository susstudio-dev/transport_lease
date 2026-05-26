import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useServiceRequestsList } from '@/features/service-requests/hooks';
import {
  CATEGORY_OPTIONS,
  type ListServiceRequestsParams,
  type ServiceRequestWithRelations,
} from '@/features/service-requests/types';
import { formatDateTime } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';
import type { ServiceCategoryEnum, ServiceStatusEnum, ServiceUrgencyEnum } from '@/types/database';

type SortKey = ListServiceRequestsParams['sortBy'];

const CATEGORY_LABEL: Record<ServiceCategoryEnum, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ServiceCategoryEnum, string>;

const URGENCY_VARIANT: Record<ServiceUrgencyEnum, 'muted' | 'warning' | 'destructive'> = {
  low: 'muted',
  medium: 'warning',
  high: 'destructive',
};

export function AdminServiceRequestsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ServiceStatusEnum | 'all'>('all');
  const [urgency, setUrgency] = useState<ServiceUrgencyEnum | 'all'>('all');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);

  const debouncedSearch = useDebounce(search, 300);
  const sortBy: SortKey = (sorting[0]?.id as SortKey) ?? 'created_at';
  const sortDir: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc';

  const params: ListServiceRequestsParams = {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim(),
    status,
    urgency,
    sortBy,
    sortDir,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useServiceRequestsList(params);

  const columns = useMemo<ColumnDef<ServiceRequestWithRelations>[]>(
    () => [
      {
        accessorKey: 'ticket_number',
        header: 'Ticket',
        cell: ({ row }) => (
          <div className="font-mono text-sm font-medium">{row.original.ticketNumber}</div>
        ),
      },
      {
        id: 'corporate',
        header: 'Corporate',
        cell: ({ row }) => (
          <div className="text-sm">{row.original.corporate?.legalName ?? '—'}</div>
        ),
      },
      {
        id: 'vehicle',
        header: 'Vehicle',
        cell: ({ row }) => {
          const v = row.original.vehicle;
          if (!v) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5">
              <div className="font-mono text-xs">{v.registrationNumber}</div>
              <div className="text-xs text-muted-foreground">
                {v.make} {v.model}
              </div>
            </div>
          );
        },
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => <div className="text-sm">{CATEGORY_LABEL[row.original.category]}</div>,
      },
      {
        accessorKey: 'urgency',
        header: 'Urgency',
        cell: ({ row }) => (
          <Badge variant={URGENCY_VARIANT[row.original.urgency]} className="capitalize">
            {row.original.urgency}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: true,
      },
      {
        accessorKey: 'created_at',
        header: 'Raised',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </div>
        ),
        enableSorting: true,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service requests"
        description="Tickets raised by corporates across your fleet."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ticket number or description…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            className="pl-9"
          />
        </div>
        <Select
          className="w-full sm:w-44"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ServiceStatusEnum | 'all');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </Select>
        <Select
          className="w-full sm:w-36"
          value={urgency}
          onChange={(e) => {
            setUrgency(e.target.value as ServiceUrgencyEnum | 'all');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All urgency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
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
        onRowClick={(row) => navigate(`/admin/service-requests/${row.id}`)}
        emptyTitle="No service requests"
        emptyDescription="Tickets raised by corporates will appear here."
      />
    </div>
  );
}
