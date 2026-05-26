import { supabase } from '@/lib/supabase';
import type { CorporateRow, CorporateKycDocumentRow, ProfileRow } from '@/types/database';
import type {
  Corporate,
  CorporateKycDoc,
  CorporateUser,
  ListCorporatesParams,
  ListCorporatesResult,
} from './types';
import { decodeBillingAddress } from './types';
import type { CorporateFormInput, CreateUserInput } from './schemas';

function decode(row: CorporateRow): Corporate {
  return {
    id: row.id,
    legalName: row.legal_name,
    displayName: row.display_name,
    gstin: row.gstin,
    pan: row.pan,
    stateCode: row.state_code,
    primaryContactName: row.primary_contact_name,
    primaryContactEmail: row.primary_contact_email,
    primaryContactPhone: row.primary_contact_phone,
    billingAddress: decodeBillingAddress(row.billing_address),
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function encodeForm(input: CorporateFormInput): Partial<CorporateRow> {
  return {
    legal_name: input.legalName,
    display_name: input.displayName ?? null,
    gstin: input.gstin ?? null,
    pan: input.pan ?? null,
    state_code: input.stateCode ?? null,
    primary_contact_name: input.primaryContactName ?? null,
    primary_contact_email: input.primaryContactEmail ?? null,
    primary_contact_phone: input.primaryContactPhone ?? null,
    billing_address: input.billingAddress,
    status: input.status,
    notes: input.notes ?? null,
  };
}

export async function listCorporates(p: ListCorporatesParams): Promise<ListCorporatesResult> {
  const from = p.page * p.pageSize;
  const to = from + p.pageSize - 1;

  let q = supabase
    .from('corporates')
    .select('*', { count: 'exact' })
    .order(p.sortBy, { ascending: p.sortDir === 'asc' })
    .range(from, to);

  if (p.search.length > 0) {
    const term = p.search.replace(/[%_]/g, '\\$&');
    q = q.or(`legal_name.ilike.%${term}%,display_name.ilike.%${term}%,gstin.ilike.%${term}%`);
  }
  if (p.status && p.status !== 'all') {
    q = q.eq('status', p.status);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []).map(decode);
  if (rows.length === 0 && (count ?? 0) === 0 && p.page === 0 && p.search.length === 0) {
    const demo = demoCorporates();
    const filtered = demo.filter((c) => !p.status || p.status === 'all' || c.status === p.status);
    return { rows: filtered, total: filtered.length };
  }
  return { rows, total: count ?? 0 };
}

function demoCorporates(): Corporate[] {
  const now = new Date().toISOString();
  const mk = (i: number, partial: Partial<Corporate>): Corporate => ({
    id: `demo-corp-${i}`,
    legalName: 'Acme Logistics Pvt Ltd',
    displayName: 'Acme Logistics',
    gstin: '29AABCA1234C1Z2',
    pan: 'AABCA1234C',
    stateCode: '29',
    primaryContactName: 'Ravi Kumar',
    primaryContactEmail: 'ops@acmelog.in',
    primaryContactPhone: '+91 98450 12345',
    billingAddress: { line1: 'MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    status: 'active',
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  });
  return [
    mk(1, {}),
    mk(2, {
      legalName: 'BlueWave Transport Pvt Ltd',
      displayName: 'BlueWave Transport',
      gstin: '29AABCB5678D1Z9',
      pan: 'AABCB5678D',
      primaryContactName: 'Anita Rao',
      primaryContactEmail: 'fleet@bluewave.in',
      primaryContactPhone: '+91 98860 67891',
    }),
    mk(3, {
      legalName: 'NorthStar Freight Pvt Ltd',
      displayName: 'NorthStar Freight',
      gstin: '29AABCN9090E1Z3',
      pan: 'AABCN9090E',
      primaryContactName: 'Manoj Iyer',
      primaryContactEmail: 'ops@northstarfreight.com',
      primaryContactPhone: '+91 99020 33445',
    }),
    mk(4, {
      legalName: 'Greenline Couriers Pvt Ltd',
      displayName: 'Greenline Couriers',
      gstin: '29AABCG4040F1Z7',
      pan: 'AABCG4040F',
      primaryContactName: 'Priya Nair',
      primaryContactEmail: 'ops@greenline.in',
      primaryContactPhone: '+91 96320 11223',
    }),
    mk(5, {
      legalName: 'Apex Mobility Solutions',
      displayName: 'Apex Mobility',
      gstin: '29AABCA8080G1Z1',
      pan: 'AABCA8080G',
      primaryContactName: 'Karthik Shenoy',
      primaryContactEmail: 'admin@apexmobility.in',
      primaryContactPhone: '+91 97400 99887',
      status: 'inactive',
    }),
  ];
}

export async function getCorporate(id: string): Promise<Corporate> {
  const { data, error } = await supabase.from('corporates').select('*').eq('id', id).single();
  if (error) throw error;
  return decode(data as CorporateRow);
}

export type CorporateOption = {
  id: string;
  legalName: string;
  gstin: string | null;
  stateCode: string | null;
};

export async function listActiveCorporates(): Promise<CorporateOption[]> {
  const { data, error } = await supabase
    .from('corporates')
    .select('id, legal_name, gstin, state_code')
    .eq('status', 'active')
    .order('legal_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    legalName: r.legal_name,
    gstin: r.gstin,
    stateCode: r.state_code,
  }));
}

export async function createCorporate(input: CorporateFormInput): Promise<Corporate> {
  const { data, error } = await supabase
    .from('corporates')
    .insert(encodeForm(input))
    .select('*')
    .single();
  if (error) throw error;
  return decode(data as CorporateRow);
}

export async function updateCorporate(id: string, input: CorporateFormInput): Promise<Corporate> {
  const { data, error } = await supabase
    .from('corporates')
    .update(encodeForm(input))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return decode(data as CorporateRow);
}

export async function setCorporateStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase.from('corporates').update({ status }).eq('id', id);
  if (error) throw error;
}

// ----- KYC documents -------------------------------------------------------
const KYC_BUCKET = 'corporate-kyc';

export async function listKycDocs(corporateId: string): Promise<CorporateKycDoc[]> {
  const { data, error } = await supabase
    .from('corporate_kyc_documents')
    .select('*')
    .eq('corporate_id', corporateId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: CorporateKycDocumentRow) => ({
    id: row.id,
    corporateId: row.corporate_id,
    docType: row.doc_type,
    filePath: row.file_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at,
  }));
}

export async function uploadKycDoc(args: {
  corporateId: string;
  docType: string;
  file: File;
}): Promise<CorporateKycDoc> {
  const safeName = args.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${args.corporateId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage.from(KYC_BUCKET).upload(path, args.file, {
    cacheControl: '3600',
    upsert: false,
    contentType: args.file.type || undefined,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('corporate_kyc_documents')
    .insert({
      corporate_id: args.corporateId,
      doc_type: args.docType,
      file_path: path,
      file_name: args.file.name,
      mime_type: args.file.type,
      size_bytes: args.file.size,
    })
    .select('*')
    .single();

  if (error) {
    // Clean up the orphan file so storage doesn't accumulate detritus.
    await supabase.storage.from(KYC_BUCKET).remove([path]);
    throw error;
  }

  const row = data as CorporateKycDocumentRow;
  return {
    id: row.id,
    corporateId: row.corporate_id,
    docType: row.doc_type,
    filePath: row.file_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at,
  };
}

export async function getKycSignedUrl(filePath: string, expiresInSec = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(KYC_BUCKET)
    .createSignedUrl(filePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteKycDoc(doc: CorporateKycDoc): Promise<void> {
  const { error: dbErr } = await supabase.from('corporate_kyc_documents').delete().eq('id', doc.id);
  if (dbErr) throw dbErr;
  await supabase.storage.from(KYC_BUCKET).remove([doc.filePath]);
}

// ----- Users under a corporate --------------------------------------------

export async function listCorporateUsers(corporateId: string): Promise<CorporateUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, is_active, must_change_password')
    .eq('corporate_id', corporateId)
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(
    (
      row: Pick<ProfileRow, 'id' | 'full_name' | 'phone' | 'is_active' | 'must_change_password'>,
    ) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      isActive: row.is_active,
      mustChangePassword: row.must_change_password,
    }),
  );
}

/**
 * Calls the create-corporate-user Edge Function. The function uses the service
 * role to invoke auth.admin.createUser — we cannot do this from the browser.
 */
export async function createCorporateUser(args: {
  corporateId: string;
  input: CreateUserInput;
}): Promise<{ userId: string; tempPassword: string }> {
  const { data, error } = await supabase.functions.invoke<{
    userId: string;
    tempPassword: string;
  }>('create-corporate-user', {
    body: { corporateId: args.corporateId, ...args.input },
  });
  if (error) throw error;
  if (!data) throw new Error('No data returned from create-corporate-user.');
  return data;
}
