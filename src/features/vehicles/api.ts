import { supabase } from '@/lib/supabase';
import type { VehicleDocTypeEnum, VehicleDocumentRow, VehicleRow } from '@/types/database';
import type { ListVehiclesParams, ListVehiclesResult, Vehicle, VehicleDocument } from './types';
import type { VehicleDocumentInput, VehicleFormInput } from './schemas';

function decode(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    make: row.make,
    model: row.model,
    variant: row.variant,
    year: row.year,
    color: row.color,
    fuelType: row.fuel_type,
    transmission: row.transmission,
    chassisNo: row.chassis_no,
    engineNo: row.engine_no,
    seatingCapacity: row.seating_capacity,
    purchaseDate: row.purchase_date,
    purchasePrice: row.purchase_price,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function decodeDoc(row: VehicleDocumentRow): VehicleDocument {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    docType: row.doc_type,
    documentNumber: row.document_number,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    filePath: row.file_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at,
  };
}

function encodeForm(input: VehicleFormInput): Partial<VehicleRow> {
  return {
    registration_number: input.registrationNumber,
    make: input.make,
    model: input.model,
    variant: input.variant ?? null,
    year: input.year,
    color: input.color ?? null,
    fuel_type: input.fuelType,
    transmission: input.transmission,
    chassis_no: input.chassisNo,
    engine_no: input.engineNo,
    seating_capacity: input.seatingCapacity ?? null,
    purchase_date: input.purchaseDate ?? null,
    purchase_price: input.purchasePrice !== undefined ? input.purchasePrice.toFixed(2) : null,
    status: input.status,
    notes: input.notes ?? null,
  };
}

export async function listVehicles(p: ListVehiclesParams): Promise<ListVehiclesResult> {
  const from = p.page * p.pageSize;
  const to = from + p.pageSize - 1;

  let q = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .order(p.sortBy, { ascending: p.sortDir === 'asc' })
    .range(from, to);

  if (p.search.length > 0) {
    const term = p.search.replace(/[%_]/g, '\\$&');
    q = q.or(
      `registration_number.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%,chassis_no.ilike.%${term}%`,
    );
  }
  if (p.status && p.status !== 'all') q = q.eq('status', p.status);
  if (p.fuelType && p.fuelType !== 'all') q = q.eq('fuel_type', p.fuelType);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []).map(decode), total: count ?? 0 };
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
  if (error) throw error;
  return decode(data as VehicleRow);
}

export type VehicleOption = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
};

export async function listAvailableVehicles(): Promise<VehicleOption[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, registration_number, make, model, year')
    .eq('status', 'available')
    .order('registration_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    registrationNumber: r.registration_number,
    make: r.make,
    model: r.model,
    year: r.year,
  }));
}

export async function createVehicle(input: VehicleFormInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(encodeForm(input))
    .select('*')
    .single();
  if (error) throw error;
  return decode(data as VehicleRow);
}

export async function updateVehicle(id: string, input: VehicleFormInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(encodeForm(input))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return decode(data as VehicleRow);
}

export async function setVehicleStatus(
  id: string,
  status: 'available' | 'leased' | 'under_service' | 'retired',
): Promise<void> {
  const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
  if (error) throw error;
}

// ----- Vehicle documents ---------------------------------------------------
const DOC_BUCKET = 'vehicle-documents';

export async function listVehicleDocs(vehicleId: string): Promise<VehicleDocument[]> {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId);
  if (error) throw error;
  return (data ?? []).map((r) => decodeDoc(r as VehicleDocumentRow));
}

export async function getVehicleDocSignedUrl(filePath: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function upsertVehicleDoc(args: {
  vehicleId: string;
  docType: VehicleDocTypeEnum;
  input: VehicleDocumentInput;
  file?: File;
  existingFilePath?: string | null;
}): Promise<VehicleDocument> {
  let newFilePath: string | null | undefined;

  if (args.file) {
    const safeName = args.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${args.vehicleId}/${args.docType}-${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, args.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: args.file.type || undefined,
    });
    if (upErr) throw upErr;
    newFilePath = path;
  }

  const payload: Partial<VehicleDocumentRow> = {
    vehicle_id: args.vehicleId,
    doc_type: args.docType,
    document_number: args.input.documentNumber ?? null,
    issue_date: args.input.issueDate ?? null,
    expiry_date: args.input.expiryDate,
    ...(newFilePath !== undefined
      ? {
          file_path: newFilePath,
          file_name: args.file?.name ?? null,
          mime_type: args.file?.type ?? null,
          size_bytes: args.file?.size ?? null,
          uploaded_at: new Date().toISOString(),
        }
      : {}),
  };

  const { data, error } = await supabase
    .from('vehicle_documents')
    .upsert(payload, { onConflict: 'vehicle_id,doc_type' })
    .select('*')
    .single();

  if (error) {
    // If we just uploaded a file but row insert failed, clean it up.
    if (newFilePath) await supabase.storage.from(DOC_BUCKET).remove([newFilePath]);
    throw error;
  }

  // If we replaced the file, remove the old object now that the row is updated.
  if (newFilePath && args.existingFilePath && args.existingFilePath !== newFilePath) {
    await supabase.storage.from(DOC_BUCKET).remove([args.existingFilePath]);
  }

  return decodeDoc(data as VehicleDocumentRow);
}

export async function deleteVehicleDoc(doc: VehicleDocument): Promise<void> {
  const { error } = await supabase.from('vehicle_documents').delete().eq('id', doc.id);
  if (error) throw error;
  if (doc.filePath) {
    await supabase.storage.from(DOC_BUCKET).remove([doc.filePath]);
  }
}
