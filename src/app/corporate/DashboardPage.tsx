import { Link } from 'react-router-dom';
import { Car, FileSignature, FileText, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { CorporateKpiGrid } from '@/features/dashboard/components/CorporateKpiGrid';

const QUICK_LINKS = [
  {
    to: '/corporate/vehicles',
    label: 'My vehicles',
    icon: Car,
    blurb: 'Browse the cars currently in your fleet.',
  },
  {
    to: '/corporate/contracts',
    label: 'Contracts',
    icon: FileSignature,
    blurb: 'Active and past leases.',
  },
  {
    to: '/corporate/invoices',
    label: 'Invoices',
    icon: FileText,
    blurb: 'Billing history and outstanding dues.',
  },
  {
    to: '/corporate/service-requests',
    label: 'Service requests',
    icon: Wrench,
    blurb: 'Raise and track tickets.',
  },
] as const;

export function CorporateDashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.fullName?.split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
      />

      <CorporateKpiGrid />

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>Common things you'll want to do.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map((q) => (
              <Button
                key={q.to}
                asChild
                variant="outline"
                className="h-auto items-start justify-start gap-3 p-4 text-left"
              >
                <Link to={q.to}>
                  <q.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{q.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">{q.blurb}</span>
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
