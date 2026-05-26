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
  return {
    rows: (data ?? []).map((r) => decodeWithRelations(r as unknown as JoinedRow)),
    total: count ?? 0,
  };
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
