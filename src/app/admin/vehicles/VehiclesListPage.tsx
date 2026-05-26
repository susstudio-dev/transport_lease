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
import { useVehiclesList } from '@/features/vehicles/hooks';
import type { ListVehiclesParams, Vehicle } from '@/features/vehicles/types';
import { formatDate } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';
import type { FuelTypeEnum, VehicleStatusEnum } from '@/types/database';

type SortKey = ListVehiclesParams['sortBy'];

const FUEL_LABEL: Record<FuelTypeEnum, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  electric: 'Electric',
  hybrid: 'Hybrid',
};

export function VehiclesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VehicleStatusEnum | 'all'>('all');
  const [fuelType, setFuelType] = useState<FuelTypeEnum | 'all'>('all');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);

  const debouncedSearch = useDebounce(search, 300);

  const sortBy: SortKey = (sorting[0]?.id as SortKey) ?? 'created_at';
  const sortDir: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc';

  const params: ListVehiclesParams = {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim(),
    status,
    fuelType,
    sortBy,
    sortDir,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useVehiclesList(params);

  const columns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        accessorKey: 'registration_number',
        header: 'Registration',
        cell: ({ row }) => (
          <div className="font-mono font-medium">{row.original.registrationNumber}</div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'make',
        header: 'Vehicle',
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div className="space-y-0.5">
              <div>
                {v.make} {v.model}
              </div>
              <div className="text-xs text-muted-foreground">
                {v.variant ? `${v.variant} • ` : ''}
                {v.year}
              </div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'fuel',
        header: 'Fuel / Trans',
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{FUEL_LABEL[row.original.fuelType]}</div>
            <div className="text-xs capitalize text-muted-foreground">
              {row.original.transmission}
            </div>
          </div>
        ),
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
        title="Vehicles"
        description="Your fleet master. Track registrations, statutory documents, and operational status."
        actions={
          <Button asChild>
            <Link to="/admin/vehicles/new">
              <Plus className="h-4 w-4" />
              New vehicle
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by registration, make, model, or chassis…"
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
            setStatus(e.target.value as VehicleStatusEnum | 'all');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="leased">Leased</option>
          <option value="under_service">Under service</option>
          <option value="retired">Retired</option>
        </Select>
        <Select
          className="w-full sm:w-32"
          value={fuelType}
          onChange={(e) => {
            setFuelType(e.target.value as FuelTypeEnum | 'all');
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <option value="all">All fuels</option>
          <option value="petrol">Petrol</option>
          <option value="diesel">Diesel</option>
          <option value="cng">CNG</option>
          <option value="electric">Electric</option>
          <option value="hybrid">Hybrid</option>
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
        onRowClick={(row) => navigate(`/admin/vehicles/${row.id}`)}
        emptyTitle="No vehicles yet"
        emptyDescription="Add your first vehicle to start building the fleet."
        emptyAction={
          <Button asChild size="sm">
            <Link to="/admin/vehicles/new">Add vehicle</Link>
          </Button>
        }
      />
    </div>
  );
}
