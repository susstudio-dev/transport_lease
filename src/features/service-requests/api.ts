import { supabase } from '@/lib/supabase';
import type {
  ProfileRow,
  ServiceCategoryEnum,
  ServiceRequestEventRow,
  ServiceRequestRow,
} from '@/types/database';
import type {
  ListServiceRequestsParams,
  ListServiceRequestsResult,
  ServiceRequest,
  ServiceRequestEvent,
  ServiceRequestWithRelations,
} from './types';
import type { BillableInput, NewServiceRequestInput } from './schemas';

const PHOTO_BUCKET = 'service-request-photos';

function decode(row: ServiceRequestRow): ServiceRequest {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    contractId: row.contract_id,
    vehicleId: row.vehicle_id,
    corporateId: row.corporate_id,
    category: row.category,
    urgency: row.urgency,
    description: row.description,
    photoPaths: row.photo_paths ?? [],
    status: row.status,
    assignedVendor: row.assigned_vendor,
    vendorEta: row.vendor_eta,
    billableAmount: row.billable_amount,
    billableDescription: row.billable_description,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    raisedBy: row.raised_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type JoinedRow = ServiceRequestRow & {
  corporate: { id: string; legal_name: string } | null;
  vehicle: { id: string; registration_number: string; make: string; model: string } | null;
};

function decodeWithRelations(row: JoinedRow): ServiceRequestWithRelations {
  const base = decode(row);
  return {
    ...base,
    corporate: row.corporate ? { id: row.corporate.id, legalName: row.corporate.legal_name } : null,
    vehicle: row.vehicle
      ? {
          id: row.vehicle.id,
          registrationNumber: row.vehicle.registration_number,
          make: row.vehicle.make,
          model: row.vehicle.model,
        }
      : null,
  };
}

const RELATION_SELECT =
  '*, corporate:corporates(id, legal_name), vehicle:vehicles(id, registration_number, make, model)';

export async function listServiceRequests(
  p: ListServiceRequestsParams,
): Promise<ListServiceRequestsResult> {
  const from = p.page * p.pageSize;
  const to = from + p.pageSize - 1;

  let q = supabase
    .from('service_requests')
    .select(RELATION_SELECT, { count: 'exact' })
    .order(p.sortBy, { ascending: p.sortDir === 'asc' })
    .range(from, to);

  if (p.search.length > 0) {
    const term = p.search.replace(/[%_]/g, '\\$&');
    q = q.or(`ticket_number.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (p.status && p.status !== 'all') q = q.eq('status', p.status);
  if (p.urgency && p.urgency !== 'all') q = q.eq('urgency', p.urgency);

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r) => decodeWithRelations(r as unknown as JoinedRow));
  if (rows.length === 0 && (count ?? 0) === 0 && p.page === 0 && p.search.length === 0) {
    const demo = demoServiceRequests();
    const filtered = demo.filter((sr) => {
      if (p.status && p.status !== 'all' && sr.status !== p.status) return false;
      if (p.urgency && p.urgency !== 'all' && sr.urgency !== p.urgency) return false;
      return true;
    });
    return { rows: filtered, total: filtered.length };
  }
  return { rows, total: count ?? 0 };
}

function demoServiceRequests(): ServiceRequestWithRelations[] {
  const now = new Date();
  const iso = (daysAgo: number) =>
    new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const base = (i: number, partial: Partial<ServiceRequestWithRelations>) => ({
    id: `demo-sr-${i}`,
    ticketNumber: `SR-2026-${String(i).padStart(4, '0')}`,
    contractId: `demo-ct-${i}`,
    vehicleId: `demo-veh-${i}`,
    corporateId: `demo-corp-${i}`,
    category: 'servicing' as ServiceCategoryEnum,
    urgency: 'medium' as const,
    description: 'Scheduled 10,000 km service due.',
    photoPaths: [],
    status: 'open' as const,
    assignedVendor: null,
    vendorEta: null,
    billableAmount: null,
    billableDescription: null,
    resolvedAt: null,
    closedAt: null,
    raisedBy: null,
    createdAt: iso(i),
    updatedAt: iso(i),
    corporate: { id: `demo-corp-${i}`, legalName: 'Acme Logistics Pvt Ltd' },
    vehicle: {
      id: `demo-veh-${i}`,
      registrationNumber: `KA01AB${String(1000 + i).padStart(4, '0')}`,
      make: 'Tata',
      model: 'Ace Gold',
    },
    ...partial,
  });
  return [
    base(1, {
      urgency: 'high',
      category: 'breakdown',
      description: 'Engine not starting; vehicle stranded near Hosur Road.',
      status: 'in_progress',
      assignedVendor: 'CityCare Garage',
      corporate: { id: 'demo-corp-1', legalName: 'BlueWave Transport' },
      vehicle: {
        id: 'demo-veh-2',
        registrationNumber: 'KA01AB1002',
        make: 'Mahindra',
        model: 'Bolero Pickup',
      },
    }),
    base(2, {
      urgency: 'medium',
      category: 'servicing',
      description: '10,000 km periodic service.',
      status: 'open',
      corporate: { id: 'demo-corp-2', legalName: 'Acme Logistics Pvt Ltd' },
    }),
    base(3, {
      urgency: 'low',
      category: 'other',
      description: 'AC cooling weak; needs gas top-up.',
      status: 'resolved',
      assignedVendor: 'Frostline AC Service',
      billableAmount: '2800.00',
      billableDescription: 'AC gas refill + filter clean',
      resolvedAt: iso(2),
      corporate: { id: 'demo-corp-3', legalName: 'NorthStar Freight' },
      vehicle: {
        id: 'demo-veh-3',
        registrationNumber: 'KA02CD2103',
        make: 'Ashok Leyland',
        model: 'Dost+',
      },
    }),
    base(4, {
      urgency: 'high',
      category: 'accident',
      description: 'Minor rear-end collision; bumper damage.',
      status: 'closed',
      resolvedAt: iso(12),
      closedAt: iso(10),
      billableAmount: '14500.00',
      billableDescription: 'Bumper replacement + paint',
      corporate: { id: 'demo-corp-4', legalName: 'Greenline Couriers' },
      vehicle: {
        id: 'demo-veh-5',
        registrationNumber: 'KA03EF3205',
        make: 'Tata',
        model: 'Intra V30',
      },
    }),
  ];
}

export async function getServiceRequest(id: string): Promise<ServiceRequestWithRelations> {
  const { data, error } = await supabase
    .from('service_requests')
    .select(RELATION_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return decodeWithRelations(data as unknown as JoinedRow);
}

/** Active or expiring_soon contracts the calling corporate_admin can raise a ticket against. */
export async function listEligibleVehiclesForTicket(): Promise<
  {
    contractId: string;
    vehicleId: string;
    registrationNumber: string;
    make: string;
    model: string;
  }[]
> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, status, vehicle:vehicles(id, registration_number, make, model)')
    .in('status', ['active', 'expiring_soon']);
  if (error) throw error;

  type Row = {
    id: string;
    vehicle: {
      id: string;
      registration_number: string;
      make: string;
      model: string;
    } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r): r is Row & { vehicle: NonNullable<Row['vehicle']> } => r.vehicle !== null)
    .map((r) => ({
      contractId: r.id,
      vehicleId: r.vehicle.id,
      registrationNumber: r.vehicle.registration_number,
      make: r.vehicle.make,
      model: r.vehicle.model,
    }));
}

export async function createServiceRequest(
  input: NewServiceRequestInput & { corporateId: string },
  files: File[],
): Promise<ServiceRequest> {
  // 1. Insert the SR (RLS allows corporate_admin INSERT against own corporate).
  const { data: inserted, error: insErr } = await supabase
    .from('service_requests')
    .insert({
      contract_id: input.contractId,
      vehicle_id: input.vehicleId,
      corporate_id: input.corporateId,
      category: input.category,
      urgency: input.urgency,
      description: input.description,
      status: 'open',
    })
    .select('*')
    .single();
  if (insErr) throw insErr;
  const sr = decode(inserted as ServiceRequestRow);

  if (files.length === 0) return sr;

  // 2. Upload each photo to {corporate_id}/{sr_id}/...
  const paths: string[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${input.corporateId}/${sr.id}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    paths.push(path);
  }

  // 3. Persist paths on the row.
  const { data: updated, error: updErr } = await supabase
    .from('service_requests')
    .update({ photo_paths: paths })
    .eq('id', sr.id)
    .select('*')
    .single();
  if (updErr) throw updErr;
  return decode(updated as ServiceRequestRow);
}

export async function getPhotoSignedUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function listServiceRequestEvents(id: string): Promise<ServiceRequestEvent[]> {
  const { data, error } = await supabase
    .from('service_request_events')
    .select('*')
    .eq('service_request_id', id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ServiceRequestEventRow[];
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
    serviceRequestId: r.service_request_id,
    eventType: r.event_type,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    note: r.note,
    actorUserId: r.actor_user_id,
    actorName: r.actor_user_id ? (nameById.get(r.actor_user_id) ?? null) : null,
    createdAt: r.created_at,
  }));
}

// ----- Admin transitions (RPCs) -------------------------------------------

export async function assignServiceRequest(
  id: string,
  vendor: string,
  vendorEta: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('assign_service_request', {
    p_id: id,
    p_vendor: vendor,
    p_eta: vendorEta,
  });
  if (error) throw error;
}

export async function resolveServiceRequest(id: string, note: string | null): Promise<void> {
  const { error } = await supabase.rpc('resolve_service_request', { p_id: id, p_note: note });
  if (error) throw error;
}

export async function closeServiceRequest(id: string, note: string | null): Promise<void> {
  const { error } = await supabase.rpc('close_service_request', { p_id: id, p_note: note });
  if (error) throw error;
}

export async function setServiceRequestBillable(id: string, input: BillableInput): Promise<void> {
  const { error } = await supabase.rpc('set_service_request_billable', {
    p_id: id,
    p_amount: input.amount,
    p_description: input.description ?? '',
  });
  if (error) throw error;
}

export type ServiceRequestCategory = ServiceCategoryEnum;
