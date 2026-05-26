import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelInvoice,
  createInvoiceDraft,
  deleteDraftInvoice,
  getInvoice,
  issueInvoice,
  listInvoiceLineItems,
  listInvoiceableContracts,
  listInvoices,
  updateInvoiceDraft,
} from './api';
import type { InvoiceFormInput } from './schemas';
import type { ListInvoicesParams } from './types';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (p: ListInvoicesParams) => ['invoices', 'list', p] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
  lineItems: (id: string) => ['invoices', 'line-items', id] as const,
  invoiceableContracts: ['invoices', 'invoiceable-contracts'] as const,
};

export function useInvoicesList(p: ListInvoicesParams) {
  return useQuery({
    queryKey: invoiceKeys.list(p),
    queryFn: () => listInvoices(p),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: id ? invoiceKeys.detail(id) : ['invoices', 'detail', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return getInvoice(id);
    },
    enabled: !!id,
  });
}

export function useInvoiceLineItems(id: string | undefined) {
  return useQuery({
    queryKey: id ? invoiceKeys.lineItems(id) : ['invoices', 'line-items', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return listInvoiceLineItems(id);
    },
    enabled: !!id,
  });
}

export function useInvoiceableContracts() {
  return useQuery({
    queryKey: invoiceKeys.invoiceableContracts,
    queryFn: listInvoiceableContracts,
    staleTime: 60_000,
  });
}

export function useCreateInvoiceDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { input: InvoiceFormInput; corporateId: string }) =>
      createInvoiceDraft({ ...args.input, corporateId: args.corporateId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}

export function useUpdateInvoiceDraft(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceFormInput) => updateInvoiceDraft(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: invoiceKeys.lineItems(id) });
    },
  });
}

export function useIssueInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => issueInvoice(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

export function useCancelInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => cancelInvoice(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

export function useDeleteDraftInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDraftInvoice(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}
