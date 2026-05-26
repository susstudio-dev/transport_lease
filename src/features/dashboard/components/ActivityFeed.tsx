import { formatDistanceToNow } from 'date-fns';
import { Activity, Building2, Car, FileSignature, FileText, IndianRupee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useRecentActivity } from '../hooks';
import type { ActivityEvent } from '../types';

const ENTITY_META: Record<string, { label: string; icon: typeof Activity }> = {
  corporates: { label: 'corporate', icon: Building2 },
  vehicles: { label: 'vehicle', icon: Car },
  contracts: { label: 'contract', icon: FileSignature },
  invoices: { label: 'invoice', icon: FileText },
  payments: { label: 'payment', icon: IndianRupee },
};

const ACTION_VERB = {
  insert: 'created',
  update: 'updated',
  delete: 'deleted',
} as const;

function describe(ev: ActivityEvent): { actor: string; verb: string; entity: string } {
  const meta = ENTITY_META[ev.entityType];
  return {
    actor: ev.actorName ?? 'A system process',
    verb: ACTION_VERB[ev.action],
    entity: meta?.label ?? ev.entityType,
  };
}

function entityIcon(entityType: string) {
  return ENTITY_META[entityType]?.icon ?? Activity;
}

export function ActivityFeed() {
  const { data, isPending, isError, error, refetch } = useRecentActivity(20);

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Actions on corporates, vehicles, contracts, invoices, and payments will appear here."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {data.map((ev) => {
        const { actor, verb, entity } = describe(ev);
        const Icon = entityIcon(ev.entityType);
        return (
          <li key={ev.id} className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="flex-1 text-sm">
              <p>
                <span className="font-medium">{actor}</span>{' '}
                <span className="text-muted-foreground">{verb} a</span>{' '}
                <span className="font-medium">{entity}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
