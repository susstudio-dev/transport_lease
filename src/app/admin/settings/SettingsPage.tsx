import { useState } from 'react';
import { toast } from 'sonner';
import { Building2, Bell, ShieldCheck, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';

export function SettingsPage() {
  const { profile, user } = useAuth();

  const [org, setOrg] = useState({
    name: 'FleetLease Operations',
    gstin: '29ABCDE1234F1Z5',
    address: '4th Floor, MG Road, Bengaluru, KA 560001',
    supportEmail: 'support@fleetlease.in',
  });

  const [billing, setBilling] = useState({
    invoicePrefix: 'INV-2026-',
    paymentTermsDays: 15,
    lateFeePct: 1.5,
  });

  const [notifications, setNotifications] = useState({
    invoiceIssued: true,
    invoiceOverdue: true,
    contractExpiring: true,
    serviceRequestUpdates: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization, billing defaults, and notifications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Organization</CardTitle>
          </div>
          <CardDescription>Shown on invoices, contracts, and PDF exports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name">
              <Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            </Field>
            <Field label="GSTIN">
              <Input
                value={org.gstin}
                onChange={(e) => setOrg({ ...org, gstin: e.target.value })}
              />
            </Field>
            <Field label="Support email">
              <Input
                type="email"
                value={org.supportEmail}
                onChange={(e) => setOrg({ ...org, supportEmail: e.target.value })}
              />
            </Field>
            <Field label="Registered address">
              <Input
                value={org.address}
                onChange={(e) => setOrg({ ...org, address: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast.success('Organization settings saved')}>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Billing defaults</CardTitle>
          </div>
          <CardDescription>Applied to new invoices unless overridden.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Invoice number prefix">
              <Input
                value={billing.invoicePrefix}
                onChange={(e) => setBilling({ ...billing, invoicePrefix: e.target.value })}
              />
            </Field>
            <Field label="Payment terms (days)">
              <Input
                type="number"
                value={billing.paymentTermsDays}
                onChange={(e) =>
                  setBilling({ ...billing, paymentTermsDays: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Late fee (% per month)">
              <Input
                type="number"
                step="0.1"
                value={billing.lateFeePct}
                onChange={(e) => setBilling({ ...billing, lateFeePct: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast.success('Billing defaults saved')}>Save changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Email alerts sent to corporate admins.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Invoice issued"
            description="When a new invoice is generated."
            checked={notifications.invoiceIssued}
            onChange={(v) => setNotifications({ ...notifications, invoiceIssued: v })}
          />
          <Separator />
          <ToggleRow
            label="Invoice overdue"
            description="When an invoice crosses its due date."
            checked={notifications.invoiceOverdue}
            onChange={(v) => setNotifications({ ...notifications, invoiceOverdue: v })}
          />
          <Separator />
          <ToggleRow
            label="Contract expiring"
            description="30 days before a lease contract ends."
            checked={notifications.contractExpiring}
            onChange={(v) => setNotifications({ ...notifications, contractExpiring: v })}
          />
          <Separator />
          <ToggleRow
            label="Service request updates"
            description="Status changes on open tickets."
            checked={notifications.serviceRequestUpdates}
            onChange={(v) => setNotifications({ ...notifications, serviceRequestUpdates: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>Your sign-in identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Name" value={profile?.fullName ?? '—'} />
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Role" value={profile?.role ?? '—'} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
