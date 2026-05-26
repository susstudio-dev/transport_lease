import type { ServiceCategoryEnum, ServiceStatusEnum, ServiceUrgencyEnum } from '@/types/database';

export type ServiceRequest = {
  id: string;
  ticketNumber: string;
  contractId: string;
  vehicleId: string;
  corporateId: string;
  category: ServiceCategoryEnum;
  urgency: ServiceUrgencyEnum;
  description: string;
  photoPaths: string[];
  status: ServiceStatusEnum;
  assignedVendor: string | null;
  vendorEta: string | null;
  billableAmount: string | null;
  billableDescription: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  raisedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRequestWithRelations = ServiceRequest & {
  corporate: { id: string; legalName: string } | null;
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
  } | null;
};

export type ServiceRequestEvent = {
  id: string;
  serviceRequestId: string;
  eventType: string;
  fromStatus: ServiceStatusEnum | null;
  toStatus: ServiceStatusEnum | null;
  note: string | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
};

export type ListServiceRequestsParams = {
  page: number;
  pageSize: number;
  status?: ServiceStatusEnum | 'all';
  urgency?: ServiceUrgencyEnum | 'all';
  search: string;
  sortBy: 'created_at' | 'status' | 'urgency';
  sortDir: 'asc' | 'desc';
};

export type ListServiceRequestsResult = {
  rows: ServiceRequestWithRelations[];
  total: number;
};

export const CATEGORY_OPTIONS: readonly { value: ServiceCategoryEnum; label: string }[] = [
  { value: 'servicing', label: 'Servicing' },
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'accident', label: 'Accident' },
  { value: 'replacement', label: 'Replacement vehicle' },
  { value: 'other', label: 'Other' },
] as const;

export const URGENCY_OPTIONS: readonly { value: ServiceUrgencyEnum; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
