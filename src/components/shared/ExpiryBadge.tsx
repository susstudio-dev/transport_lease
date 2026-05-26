import { Badge, type BadgeProps } from '@/components/ui/badge';
import { expiryInfo, type ExpiryStatus } from '@/lib/expiry';

type VariantMap = Record<ExpiryStatus, NonNullable<BadgeProps['variant']>>;

const VARIANTS: VariantMap = {
  expired: 'destructive',
  critical: 'destructive',
  warning: 'warning',
  soon: 'warning',
  ok: 'success',
  missing: 'muted',
};

type Props = {
  expiryDate?: string | null;
  fallbackLabel?: string;
};

export function ExpiryBadge({ expiryDate, fallbackLabel }: Props) {
  const info = expiryInfo(expiryDate);
  const variant = VARIANTS[info.status];
  const label = info.status === 'missing' && fallbackLabel ? fallbackLabel : info.label;
  return <Badge variant={variant}>{label}</Badge>;
}
