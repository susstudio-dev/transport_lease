import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useContractsList } from '@/features/contracts/hooks';
import type { ContractWithRelations, ListContractsParams } from '@/features/contracts/types';
import { formatDate, formatInr } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';
import type { ContractStatusEnum } from '@/types/database';

type SortKey = ListContractsParams['sortBy'];

export function CorporateContractsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ContractStatusEnum | 'all'>('all');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'start_date', desc: true }]);

  const debouncedSearch = useDebounce(search, 300);
  const sortBy: SortKey = (sorting[0]?.id as SortKey) ?? 'start_date';
  const sortDir: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc';

  // RLS already scopes to this corporate; no need for an explicit corporateId.
  const params: ListContractsParams = {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim(),
    status,
    sortBy,
    sortDir,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useContractsList(params);

  const columns = useMemo<ColumnDef<ContractWithRelations>[]>(
    () => [
      {
        accessorKey: 'contract_number',
        header: 'Contract',
        cell: ({ row }) => (
          <div className="font-mono text-sm font-medium">{row.original.contractNumber}</div>
        ),
        enableSorting: true,
      },
      {
        id: 'vehicle',
        header: 'Vehicle',
        cell: ({ row }) => {
          const v = row.original.vehicle;
          return (
            <div className="space-y-0.5">
              <div className="font-mono text-xs">{v.registrationNumber}</div>
              <div className="text-xs text-muted-foreground">
                {v.make} {v.model}
              </div>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'start_date',
        header: 'Period',
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{formatDate(row.original.startDate)}</div>
            <div className="text-xs text-muted-foreground">
              to {formatDate(row.original.endDate)}
            </div>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'monthly_rental',
        header: 'Rental / mo',
        cell: ({ row }) => (
          <div className="font-medium">{formatInr(row.original.monthlyRental)}</div>
        ),
        enableSorting: false,
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
      <PageHeader title="Contracts" description="All your lease contracts — active and past." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by contract number…"
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
            setStatus(e.target.value as ContractStatusEnum | 'all');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring soon</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
          <option value="renewed">Renewed</option>
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
        onRowClick={(row) => navigate(`/corporate/contracts/${row.id}`)}
        emptyTitle="No contracts yet"
        emptyDescription="When a contract is created for your corporate it will appear here."
        emptyAction={
          <Link to="/corporate" className="text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
