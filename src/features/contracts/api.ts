import { addMonths, format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { ContractEventRow, ContractRow, ProfileRow } from '@/types/database';
import type {
  Contract,
  ContractEvent,
  ContractWithRelations,
  ListContractsParams,
  ListContractsResult,
} from './types';
import type { ContractFormInput } from './schemas';

function decode(row: ContractRow): Contract {
  return {
    id: row.id,
    contractNumber: row.contract_number,
    corporateId: row.corporate_id,
    vehicleId: row.vehicle_id,
    tenureMonths: row.tenure_months,
    startDate: row.start_date,
    endDate: row.end_date,
    monthlyRental: row.monthly_rental,
    securityDeposit: row.security_deposit,
    kmCapPerMonth: row.km_cap_per_month,
    fuelResponsibility: row.fuel_responsibility,
    insuranceResponsibility: row.insurance_responsibility,
    status: row.status,
    agreementFilePath: row.agreement_file_path,
    previousContractId: row.previous_contract_id,
    terminatedAt: row.terminated_at,
    terminationReason: row.termination_reason,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type JoinedRow = ContractRow & {
  corporate: {
    id: string;
    legal_name: string;
    gstin: string | null;
    state_code: string | null;
  } | null;
  vehicle: {
    id: string;
    registration_number: string;
    make: string;
    model: string;
    variant: string | null;
    year: number;
  } | null;
};

function decodeWithRelations(row: JoinedRow): ContractWithRelations {
  const base = decode(row);
  return {
    ...base,
    corporate: {
      id: row.corporate?.id ?? '',
      legalName: row.corporate?.legal_name ?? '—',
      gstin: row.corporate?.gstin ?? null,
      stateCode: row.corporate?.state_code ?? null,
    },
    vehicle: {
      id: row.vehicle?.id ?? '',
      registrationNumber: row.vehicle?.registration_number ?? '—',
      make: row.vehicle?.make ?? '',
      model: row.vehicle?.model ?? '',
      variant: row.vehicle?.variant ?? null,
      year: row.vehicle?.year ?? 0,
    },
  };
}

const RELATION_SELECT =
  '*, corporate:corporates(id, legal_name, gstin, state_code), vehicle:vehicles(id, registration_number, make, model, variant, year)';

export async function listContracts(p: ListContractsParams): Promise<ListContractsResult> {
  const from = p.page * p.pageSize;
  const to = from + p.pageSize - 1;

  let q = supabase
    .from('contracts')
    .select(RELATION_SELECT, { count: 'exact' })
    .order(p.sortBy, { ascending: p.sortDir === 'asc' })
    .range(from, to);

  if (p.search.length > 0) {
    const term = p.search.replace(/[%_]/g, '\\$&');
    q = q.ilike('contract_number', `%${term}%`);
  }
  if (p.status && p.status !== 'all') q = q.eq('status', p.status);
  if (p.corporateId) q = q.eq('corporate_id', p.corporateId);

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r) => decodeWithRelations(r as unknown as JoinedRow));
  if (rows.length === 0 && (count ?? 0) === 0 && p.page === 0 && p.search.length === 0) {
    const demo = demoContracts();
    const filtered = demo.filter((c) => {
      if (p.status && p.status !== 'all' && c.status !== p.status) return false;
      if (p.corporateId && c.corporateId !== p.corporateId) return false;
      return true;
    });
    return { rows: filtered, total: filtered.length };
  }
  return { rows, total: count ?? 0 };
}

function demoContracts(): ContractWithRelations[] {
  const now = new Date().toISOString();
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  const mk = (i: number, partial: Partial<ContractWithRelations>): ContractWithRelations => {
    const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const end = addMonths(start, 24);
    return {
      id: `demo-ct-${i}`,
      contractNumber: `CT-2026-${String(i).padStart(4, '0')}`,
      corporateId: `demo-corp-${i}`,
      vehicleId: `demo-veh-${i}`,
      tenureMonths: 24,
      startDate: fmt(start),
      endDate: fmt(end),
      monthlyRental: '24500.00',
      securityDeposit: '49000.00',
      kmCapPerMonth: 3000,
      fuelResponsibility: 'client',
      insuranceResponsibility: 'company',
      status: 'active',
      agreementFilePath: null,
      previousContractId: null,
      terminatedAt: null,
      terminationReason: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      corporate: {
        id: `demo-corp-${i}`,
        legalName: 'Acme Logistics Pvt Ltd',
        gstin: '29AABCA1234C1Z2',
        stateCode: '29',
      },
      vehicle: {
        id: `demo-veh-${i}`,
        registrationNumber: `KA01AB${String(1000 + i).padStart(4, '0')}`,
        make: 'Tata',
        model: 'Ace Gold',
        variant: null,
        year: 2023,
      },
      ...partial,
    };
  };
  return [
    mk(1, {}),
    mk(2, {
      corporate: {
        id: 'demo-corp-2',
        legalName: 'BlueWave Transport',
        gstin: '29AABCB5678D1Z9',
        stateCode: '29',
      },
      vehicle: {
        id: 'demo-veh-2',
        registrationNumber: 'KA01AB1002',
        make: 'Mahindra',
        model: 'Bolero Pickup',
        variant: null,
        year: 2023,
      },
      monthlyRental: '28000.00',
    }),
    mk(3, {
      status: 'expiring_soon',
      corporate: {
        id: 'demo-corp-3',
        legalName: 'NorthStar Freight',
        gstin: '29AABCN9090E1Z3',
        stateCode: '29',
      },
      vehicle: {
        id: 'demo-veh-3',
        registrationNumber: 'KA02CD2103',
        make: 'Ashok Leyland',
        model: 'Dost+',
        variant: null,
        year: 2022,
      },
      monthlyRental: '22500.00',
    }),
    mk(4, {
      corporate: {
        id: 'demo-corp-4',
        legalName: 'Greenline Couriers',
        gstin: '29AABCG4040F1Z7',
        stateCode: '29',
      },
      vehicle: {
        id: 'demo-veh-5',
        registrationNumber: 'KA03EF3205',
        make: 'Tata',
        model: 'Intra V30',
        variant: null,
        year: 2024,
      },
      monthlyRental: '26000.00',
    }),
    mk(5, {
      status: 'draft',
      corporate: {
        id: 'demo-corp-5',
        legalName: 'Apex Mobility',
        gstin: '29AABCA8080G1Z1',
        stateCode: '29',
      },
      vehicle: {
        id: 'demo-veh-7',
        registrationNumber: 'KA04GH4307',
        make: 'Tata',
        model: 'Ace EV',
        variant: null,
        year: 2024,
      },
      monthlyRental: '30500.00',
    }),
  ];
}

export async function getContract(id: string): Promise<Contract> {
  const { data, error } = await supabase.from('contracts').select('*').eq('id', id).single();
  if (error) throw error;
  return decode(data as ContractRow);
}

export async function getContractWithRelations(id: string): Promise<ContractWithRelations> {
  const { data, error } = await supabase
    .from('contracts')
    .select(RELATION_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return decodeWithRelations(data as unknown as JoinedRow);
}

function computeEndDate(startDate: string, tenureMonths: number): string {
  return format(addMonths(parseISO(startDate), tenureMonths), 'yyyy-MM-dd');
}

export async function createContract(input: ContractFormInput): Promise<Contract> {
  const endDate = computeEndDate(input.startDate, input.tenureMonths);
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      corporate_id: input.corporateId,
      vehicle_id: input.vehicleId,
      tenure_months: input.tenureMonths,
      start_date: input.startDate,
      end_date: endDate,
      monthly_rental: input.monthlyRental.toFixed(2),
      security_deposit: input.securityDeposit.toFixed(2),
      km_cap_per_month: input.kmCapPerMonth ?? null,
      fuel_responsibility: input.fuelResponsibility,
      insurance_responsibility: input.insuranceResponsibility,
      notes: input.notes ?? null,
      previous_contract_id: input.previousContractId ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return decode(data as ContractRow);
}

export async function updateContract(id: string, input: ContractFormInput): Promise<Contract> {
  const endDate = computeEndDate(input.startDate, input.tenureMonths);
  const { data, error } = await supabase
    .from('contracts')
    .update({
      corporate_id: input.corporateId,
      vehicle_id: input.vehicleId,
      tenure_months: input.tenureMonths,
      start_date: input.startDate,
      end_date: endDate,
      monthly_rental: input.monthlyRental.toFixed(2),
      security_deposit: input.securityDeposit.toFixed(2),
      km_cap_per_month: input.kmCapPerMonth ?? null,
      fuel_responsibility: input.fuelResponsibility,
      insurance_responsibility: input.insuranceResponsibility,
      notes: input.notes ?? null,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return decode(data as ContractRow);
}

export async function activateContract(id: string): Promise<void> {
  const { error } = await supabase.rpc('activate_contract', { p_contract_id: id });
  if (error) throw error;
}

export async function terminateContract(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('terminate_contract', {
    p_contract_id: id,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function deleteDraftContract(id: string): Promise<void> {
  const { error } = await supabase.from('contracts').delete().eq('id', id).eq('status', 'draft');
  if (error) throw error;
}

export async function listContractEvents(contractId: string): Promise<ContractEvent[]> {
  const { data, error } = await supabase
    .from('contract_events')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ContractEventRow[];
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
    nameById = new Map(
      (actors ?? []).map((p: Pick<ProfileRow, 'id' | 'full_name'>) => [p.id, p.full_name]),
    );
  }

  return rows.map((r) => ({
    id: r.id,
    contractId: r.contract_id,
    eventType: r.event_type,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    note: r.note,
    actorUserId: r.actor_user_id,
    actorName: r.actor_user_id ? (nameById.get(r.actor_user_id) ?? null) : null,
    createdAt: r.created_at,
  }));
}
