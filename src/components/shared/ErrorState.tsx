import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mapSupabaseError } from '@/lib/errors';

type Props = {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "We couldn't load this section",
  error,
  onRetry,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
      <h3 className="text-sm font-medium">{title}</h3>
      {error !== undefined && (
        <p className="max-w-md text-sm text-muted-foreground">{mapSupabaseError(error)}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
