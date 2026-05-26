import { Badge, type BadgeProps } from '@/components/ui/badge';
import type {
  CorporateStatusEnum,
  VehicleStatusEnum,
  ContractStatusEnum,
  InvoiceStatusEnum,
  ServiceStatusEnum,
} from '@/types/database';

type AnyStatus =
  | CorporateStatusEnum
  | VehicleStatusEnum
  | ContractStatusEnum
  | InvoiceStatusEnum
  | ServiceStatusEnum;

type Variant = NonNullable<BadgeProps['variant']>;

const VARIANT_MAP: Partial<Record<AnyStatus, Variant>> = {
  // corporate
  active: 'success',
  inactive: 'muted',
  // vehicle
  available: 'success',
  leased: 'default',
  under_service: 'warning',
  retired: 'muted',
  // contract
  draft: 'muted',
  expiring_soon: 'warning',
  expired: 'muted',
  terminated: 'destructive',
  renewed: 'success',
  // invoice
  issued: 'default',
  paid: 'success',
  overdue: 'destructive',
  cancelled: 'muted',
  // service
  open: 'warning',
  in_progress: 'default',
  resolved: 'success',
  closed: 'muted',
};

const LABELS: Partial<Record<AnyStatus, string>> = {
  expiring_soon: 'Expiring soon',
  under_service: 'Under service',
  in_progress: 'In progress',
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const variant = VARIANT_MAP[status] ?? 'outline';
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={variant}>{label}</Badge>;
}
