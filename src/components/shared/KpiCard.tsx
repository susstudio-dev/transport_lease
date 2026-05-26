import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string | number | null;
  hint?: string;
  icon?: LucideIcon;
  delta?: { value: number; label: string };
  loading?: boolean;
  error?: boolean;
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  loading = false,
  error = false,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : error ? (
          <div className="text-2xl font-semibold text-muted-foreground">—</div>
        ) : (
          <div className="text-2xl font-semibold tracking-tight">{value ?? '—'}</div>
        )}
        {delta && !loading && !error && (
          <p
            className={cn(
              'mt-1 flex items-center text-xs',
              delta.value >= 0 ? 'text-emerald-600' : 'text-destructive',
            )}
          >
            {delta.value >= 0 ? (
              <ArrowUpRight className="mr-1 h-3 w-3" aria-hidden />
            ) : (
              <ArrowDownRight className="mr-1 h-3 w-3" aria-hidden />
            )}
            <span>
              {Math.abs(delta.value).toFixed(1)}% {delta.label}
            </span>
          </p>
        )}
        {hint && !delta && !loading && !error && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
