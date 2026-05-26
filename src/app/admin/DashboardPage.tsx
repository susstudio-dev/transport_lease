import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiGrid } from '@/features/dashboard/components/KpiGrid';
import { ActivityFeed } from '@/features/dashboard/components/ActivityFeed';
import { useAuth } from '@/hooks/useAuth';

export function AdminDashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}.
        </p>
      </div>

      <KpiGrid />

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>The last 20 changes across the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  );
}
