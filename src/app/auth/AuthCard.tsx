import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Reusable centred card for auth pages. */
export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition hover:text-foreground sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <img src="/logo.svg" alt="" className="mx-auto h-10 w-10" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-center text-sm">{footer}</div>}
      </div>
    </div>
  );
}
