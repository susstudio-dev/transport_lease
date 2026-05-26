import { addDays, addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { addMoney, subMoney, toDecimal } from '@/lib/money';
import type { AdminKpis, ActivityEvent, CorporateKpis } from './types';

const DATE_FMT = 'yyyy-MM-dd';

async function fetchFleetCounts(): Promise<
  Pick<AdminKpis, 'fleetTotal' | 'fleetLeased' | 'fleetAvailable'>
> {
  const [totalRes, leasedRes, availableRes] = await Promise.all([
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'leased'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'available'),
  ]);
  if (totalRes.error) throw totalRes.error;
  if (leasedRes.error) throw leasedRes.error;
  if (availableRes.error) throw availableRes.error;
  return {
    fleetTotal: totalRes.count ?? 0,
    fleetLeased: leasedRes.count ?? 0,
    fleetAvailable: availableRes.count ?? 0,
  };
}

async function fetchContractCounts(
  today: Date,
): Promise<Pick<AdminKpis, 'activeContracts' | 'contractsExpiringSoon'>> {
  const in30 = format(addDays(today, 30), DATE_FMT);
  const todayStr = format(today, DATE_FMT);
  const [activeRes, expiringRes] = await Promise.all([
    supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'expiring_soon']),
    supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'expiring_soon'])
      .gte('end_date', todayStr)
      .lte('end_date', in30),
  ]);
  if (activeRes.error) throw activeRes.error;
  if (expiringRes.error) throw expiringRes.error;
  return {
    activeContracts: activeRes.count ?? 0,
    contractsExpiringSoon: expiringRes.count ?? 0,
  };
}

async function fetchOverdueCount(): Promise<number> {
  const { count, error } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'overdue');
  if (error) throw error;
  return count ?? 0;
}

async function fetchMonthlyRevenue(monthStart: Date): Promise<number> {
  const start = format(startOfMonth(monthStart), DATE_FMT);
  const end = format(endOfMonth(monthStart), DATE_FMT);
  const { data, error } = await supabase
    .from('invoices')
    .select('total')
    .eq('status', 'paid')
    .gte('issue_date', start)
    .lte('issue_date', end);
  if (error) throw error;
  const sum = addMoney(...(data ?? []).map((r) => r.total ?? '0'));
  return Number(sum.toFixed(2));
}

export async function fetchAdminKpis(): Promise<AdminKpis> {
  const now = new Date();
  const lastMonth = addMonths(now, -1);

  const [fleet, contracts, overdue, revThis, revLast] = await Promise.all([
    fetchFleetCounts(),
    fetchContractCounts(now),
    fetchOverdueCount(),
    fetchMonthlyRevenue(now),
    fetchMonthlyRevenue(lastMonth),
  ]);

  let deltaPct: number | null = null;
  if (revLast > 0) {
    deltaPct = Number(
      toDecimal(revThis - revLast)
        .div(revLast)
        .times(100)
        .toFixed(2),
    );
  } else if (revThis > 0) {
    deltaPct = 100;
  }

  return {
    ...fleet,
    ...contracts,
    overdueInvoicesCount: overdue,
    monthlyRevenueThisMonth: revThis,
    monthlyRevenueLastMonth: revLast,
    monthlyRevenueDeltaPct: deltaPct,
  };
}

/**
 * Corporate-side KPIs. RLS auto-scopes every query to the calling
 * corporate_admin's corporate, so no explicit filter is needed.
 */
export async function fetchCorporateKpis(): Promise<CorporateKpis> {
  const today = format(new Date(), DATE_FMT);
  const in30 = format(addDays(new Date(), 30), DATE_FMT);

  const [activeRes, expiringRes, openInvRes, overdueRes, openSrRes, nextDueRes] = await Promise.all(
    [
      supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'expiring_soon']),
      supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'expiring_soon'])
        .gte('end_date', today)
        .lte('end_date', in30),
      supabase.from('invoices').select('total, amount_paid').in('status', ['issued', 'overdue']),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']),
      supabase
        .from('invoices')
        .select('id, invoice_number, due_date, total')
        .eq('status', 'issued')
        .order('due_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ],
  );

  if (activeRes.error) throw activeRes.error;
  if (expiringRes.error) throw expiringRes.error;
  if (openInvRes.error) throw openInvRes.error;
  if (overdueRes.error) throw overdueRes.error;
  if (openSrRes.error) throw openSrRes.error;
  if (nextDueRes.error) throw nextDueRes.error;

  const outstanding = (openInvRes.data ?? []).reduce(
    (acc, r) => acc.plus(subMoney(r.total ?? '0', r.amount_paid ?? '0')),
    toDecimal(0),
  );

  return {
    activeContracts: activeRes.count ?? 0,
    expiringContracts: expiringRes.count ?? 0,
    outstandingAmount: Number(outstanding.toFixed(2)),
    overdueInvoicesCount: overdueRes.count ?? 0,
    openServiceTickets: openSrRes.count ?? 0,
    nextDueInvoice: nextDueRes.data
      ? {
          id: nextDueRes.data.id,
          invoiceNumber: nextDueRes.data.invoice_number,
          dueDate: nextDueRes.data.due_date,
          total: nextDueRes.data.total,
        }
      : null,
  };
}

export async function fetchRecentActivity(limit = 20): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, created_at, action, entity_type, entity_id, actor_user_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_user_id).filter((id): id is string => !!id)),
  );

  let nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors, error: aErr } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', actorIds);
    if (aErr) throw aErr;
    nameById = new Map((actors ?? []).map((p) => [p.id, p.full_name]));
  }

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    actorUserId: r.actor_user_id,
    actorName: r.actor_user_id ? (nameById.get(r.actor_user_id) ?? null) : null,
  }));
}
