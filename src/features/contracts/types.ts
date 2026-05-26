import type { ContractStatusEnum, ResponsibilityEnum } from '@/types/database';

export type Contract = {
  id: string;
  contractNumber: string;
  corporateId: string;
  vehicleId: string;
  tenureMonths: number;
  startDate: string;
  endDate: string;
  monthlyRental: string; // numeric stored as string
  securityDeposit: string;
  kmCapPerMonth: number | null;
  fuelResponsibility: ResponsibilityEnum;
  insuranceResponsibility: ResponsibilityEnum;
  status: ContractStatusEnum;
  agreementFilePath: string | null;
  previousContractId: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractWithRelations = Contract & {
  corporate: { id: string; legalName: string; gstin: string | null; stateCode: string | null };
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
    variant: string | null;
    year: number;
  };
};

export type ContractEvent = {
  id: string;
  contractId: string;
  eventType: string;
  fromStatus: ContractStatusEnum | null;
  toStatus: ContractStatusEnum | null;
  note: string | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
};

export type ListContractsParams = {
  page: number;
  pageSize: number;
  search: string;
  status?: ContractStatusEnum | 'all';
  corporateId?: string | null;
  sortBy: 'contract_number' | 'start_date' | 'end_date' | 'status' | 'created_at';
  sortDir: 'asc' | 'desc';
};

export type ListContractsResult = {
  rows: ContractWithRelations[];
  total: number;
};
