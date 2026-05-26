import type { CorporateStatusEnum, Json } from '@/types/database';

export type BillingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type Corporate = {
  id: string;
  legalName: string;
  displayName: string | null;
  gstin: string | null;
  pan: string | null;
  stateCode: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  billingAddress: BillingAddress;
  status: CorporateStatusEnum;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function decodeBillingAddress(value: Json | null | undefined): BillingAddress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const pick = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : undefined);
  return {
    line1: pick('line1'),
    line2: pick('line2'),
    city: pick('city'),
    state: pick('state'),
    pincode: pick('pincode'),
  };
}

export type CorporateKycDoc = {
  id: string;
  corporateId: string;
  docType: string;
  filePath: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
};

export type CorporateUser = {
  id: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
};

export type ListCorporatesParams = {
  page: number;
  pageSize: number;
  search: string;
  status?: CorporateStatusEnum | 'all';
  sortBy: 'legal_name' | 'created_at' | 'status';
  sortDir: 'asc' | 'desc';
};

export type ListCorporatesResult = {
  rows: Corporate[];
  total: number;
};
