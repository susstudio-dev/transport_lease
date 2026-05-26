import type { AuditActionEnum } from '@/types/database';

export type AdminKpis = {
  fleetTotal: number;
  fleetLeased: number;
  fleetAvailable: number;
  activeContracts: number;
  contractsExpiringSoon: number;
  overdueInvoicesCount: number;
  monthlyRevenueThisMonth: number;
  monthlyRevenueLastMonth: number;
  monthlyRevenueDeltaPct: number | null;
};

export type CorporateKpis = {
  activeContracts: number;
  expiringContracts: number;
  outstandingAmount: number;
  overdueInvoicesCount: number;
  openServiceTickets: number;
  nextDueInvoice: {
    id: string;
    invoiceNumber: string;
    dueDate: string;
    total: string;
  } | null;
};

export type ActivityEvent = {
  id: string;
  createdAt: string;
  action: AuditActionEnum;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  actorName: string | null;
};
