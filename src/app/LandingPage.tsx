import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Truck,
  ShieldCheck,
  Wallet,
  Wrench,
  FileText,
  BarChart3,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { defaultLandingFor } from '@/lib/permissions';

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'authenticated' && profile && !profile.mustChangePassword) {
    return <Navigate to={defaultLandingFor(profile.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">FleetLease</span>
          </div>
          <nav className="flex items-center gap-3">
            <a
              href="#features"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              How it works
            </a>
            <Button asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              End-to-end transport lease management
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Lease, manage, and scale your transport fleet — without the paperwork.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              FleetLease is a modern transport leasing platform that brings vehicles, contracts,
              service requests, and invoices into one place. Whether you're a corporate fleet admin
              running a hundred cars or a leasing operator managing thousands, every lease decision
              becomes faster and more transparent.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/login">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">Explore features</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> No long-term lock-in
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Role-based access
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Real-time tracking
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Active leases</div>
                  <div className="text-3xl font-semibold">18</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Truck className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-xs text-muted-foreground">Monthly billing</div>
                  <div className="mt-1 text-xl font-semibold">₹4.26L</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-xs text-muted-foreground">Open service requests</div>
                  <div className="mt-1 text-xl font-semibold">2</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-xs text-muted-foreground">Vehicles in fleet</div>
                  <div className="mt-1 text-xl font-semibold">24</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-xs text-muted-foreground">On-time payments</div>
                  <div className="mt-1 text-xl font-semibold">96%</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to run a leasing operation
            </h2>
            <p className="mt-3 text-muted-foreground">
              Purpose-built for the people who manage fleets day-to-day.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Truck className="h-5 w-5" />,
              title: 'Vehicle inventory',
              description:
                'Track every vehicle by VIN, model, registration, and lifecycle status — from procurement to off-lease.',
            },
            {
              icon: <FileText className="h-5 w-5" />,
              title: 'Lease contracts',
              description:
                'Generate, sign, and renew lease contracts with auto-calculated payment schedules and PDF exports.',
            },
            {
              icon: <Wrench className="h-5 w-5" />,
              title: 'Service requests',
              description:
                'Corporates raise maintenance and breakdown tickets; admins triage and resolve without leaving the dashboard.',
            },
            {
              icon: <Wallet className="h-5 w-5" />,
              title: 'Invoicing & payments',
              description:
                'Automated monthly invoices, payment tracking, and reconciliation for finance teams.',
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: 'Live dashboards',
              description:
                'Role-specific views for admins, corporate clients, and finance — the right numbers, no clutter.',
            },
            {
              icon: <ShieldCheck className="h-5 w-5" />,
              title: 'Secure by default',
              description:
                'Row-level security, role-based access, and audited authentication on every action.',
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight">How leasing works on FleetLease</h2>
              <p className="mt-3 text-muted-foreground">
                From onboarding a corporate to off-lease, every step is tracked.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                n: '1',
                icon: <Users className="h-5 w-5" />,
                title: 'Onboard the corporate',
                description:
                  'Admin creates a corporate account and assigns a corporate admin user.',
              },
              {
                n: '2',
                icon: <Truck className="h-5 w-5" />,
                title: 'Assign vehicles',
                description:
                  'Vehicles from the inventory are linked to the corporate under a lease contract.',
              },
              {
                n: '3',
                icon: <FileText className="h-5 w-5" />,
                title: 'Operate the lease',
                description:
                  'The corporate runs the fleet, raises service requests, and pays monthly invoices.',
              },
              {
                n: '4',
                icon: <Clock className="h-5 w-5" />,
                title: 'Renew or off-lease',
                description:
                  'At term-end, renew the contract, swap vehicles, or close it out — fully auditable.',
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <Step {...s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight">Ready to run your fleet smarter?</h2>
            <p className="mt-3 text-muted-foreground">
              Sign in to access your dashboard, or reach out to set up a new corporate account.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/login">
                  Sign in <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} FleetLease. All rights reserved.</div>
          <div>Transport lease management, simplified.</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="h-full rounded-xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  description,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {n}
        </div>
        <div className="text-primary">{icon}</div>
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
