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
import { useCorporatesList } from '@/features/corporates/hooks';
import type { Corporate, ListCorporatesParams } from '@/features/corporates/types';
import { formatDate, formatGstin } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';

type SortKey = ListCorporatesParams['sortBy'];

export function CorporatesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);

  const debouncedSearch = useDebounce(search, 300);

  const sortBy: SortKey = (sorting[0]?.id as SortKey) ?? 'created_at';
  const sortDir: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc';

  const params: ListCorporatesParams = {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim(),
    status,
    sortBy,
    sortDir,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useCorporatesList(params);

  const columns = useMemo<ColumnDef<Corporate>[]>(
    () => [
      {
        accessorKey: 'legal_name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-medium">{row.original.legalName}</div>
            {row.original.displayName && (
              <div className="text-xs text-muted-foreground">{row.original.displayName}</div>
            )}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'gstin',
        header: 'GSTIN',
        cell: ({ row }) =>
          row.original.gstin ? (
            <span className="font-mono text-xs">{formatGstin(row.original.gstin)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: false,
      },
      {
        id: 'contact',
        header: 'Primary contact',
        cell: ({ row }) => {
          const c = row.original;
          if (!c.primaryContactName && !c.primaryContactEmail) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="space-y-0.5">
              {c.primaryContactName && <div>{c.primaryContactName}</div>}
              {c.primaryContactEmail && (
                <div className="text-xs text-muted-foreground">{c.primaryContactEmail}</div>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: true,
      },
      {
        accessorKey: 'created_at',
        header: 'Added',
        cell: ({ row }) => formatDate(row.original.createdAt),
        enableSorting: true,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corporates"
        description="Manage corporate clients and the users that belong to them."
        actions={
          <Button asChild>
            <Link to="/admin/corporates/new">
              <Plus className="h-4 w-4" />
              New corporate
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or GSTIN…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            className="pl-9"
          />
        </div>
        <Select
          className="w-full sm:w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as 'all' | 'active' | 'inactive');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
        onRowClick={(row) => navigate(`/admin/corporates/${row.id}`)}
        emptyTitle="No corporates yet"
        emptyDescription="Add your first corporate to begin onboarding."
        emptyAction={
          <Button asChild size="sm">
            <Link to="/admin/corporates/new">Create corporate</Link>
          </Button>
        }
      />
    </div>
  );
}
