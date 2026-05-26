import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/shared/KpiCard';
import { Car, FileSignature, IndianRupee, Wrench } from 'lucide-react';
import { formatInr } from '@/lib/format';

const monthlyRevenue = [
  { month: 'Dec', revenue: 312000 },
  { month: 'Jan', revenue: 338000 },
  { month: 'Feb', revenue: 356000 },
  { month: 'Mar', revenue: 372000 },
  { month: 'Apr', revenue: 398000 },
  { month: 'May', revenue: 426000 },
];

const fleetUtilization = [
  { month: 'Dec', leased: 14, available: 8 },
  { month: 'Jan', leased: 15, available: 7 },
  { month: 'Feb', leased: 16, available: 7 },
  { month: 'Mar', leased: 17, available: 6 },
  { month: 'Apr', leased: 17, available: 6 },
  { month: 'May', leased: 18, available: 5 },
];

const statusBreakdown = [
  { name: 'Leased', value: 18, color: 'hsl(221, 83%, 53%)' },
  { name: 'Available', value: 5, color: 'hsl(142, 71%, 45%)' },
  { name: 'In service', value: 1, color: 'hsl(38, 92%, 50%)' },
];

const topCorporates = [
  { name: 'Acme Logistics', vehicles: 6, monthly: 142000 },
  { name: 'BlueWave Transport', vehicles: 4, monthly: 96000 },
  { name: 'NorthStar Freight', vehicles: 3, monthly: 74000 },
  { name: 'Greenline Couriers', vehicles: 3, monthly: 68000 },
  { name: 'Apex Mobility', vehicles: 2, monthly: 46000 },
];

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Fleet, revenue, and operational insights across the last 6 months.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Avg monthly revenue"
          value={formatInr(367000)}
          icon={IndianRupee}
          hint="Trailing 6 months"
        />
        <KpiCard label="Fleet utilization" value="75%" icon={Car} hint="Leased / total" />
        <KpiCard
          label="Contracts signed YTD"
          value={9}
          icon={FileSignature}
          hint="Since Jan 2026"
        />
        <KpiCard
          label="Service requests closed"
          value={28}
          icon={Wrench}
          hint="Trailing 6 months"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly revenue</CardTitle>
            <CardDescription>Paid invoice totals by month.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(v: number) => formatInr(v)} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet utilization</CardTitle>
            <CardDescription>Leased vs. available vehicles by month.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleetUtilization}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="leased" fill="hsl(221, 83%, 53%)" stackId="a" />
                <Bar dataKey="available" fill="hsl(142, 71%, 45%)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle status breakdown</CardTitle>
            <CardDescription>Current fleet composition.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {statusBreakdown.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top corporates by revenue</CardTitle>
            <CardDescription>Monthly billing across active leases.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCorporates.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.vehicles} vehicles</div>
                  </div>
                  <div className="text-sm font-semibold">{formatInr(c.monthly)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
