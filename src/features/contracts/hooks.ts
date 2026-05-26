import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateContract,
  createContract,
  deleteDraftContract,
  getContract,
  getContractWithRelations,
  listContractEvents,
  listContracts,
  terminateContract,
  updateContract,
} from './api';
import type { ListContractsParams } from './types';
import type { ContractFormInput } from './schemas';
import { vehicleKeys } from '@/features/vehicles/hooks';

export const contractKeys = {
  all: ['contracts'] as const,
  list: (p: ListContractsParams) => ['contracts', 'list', p] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  events: (id: string) => ['contracts', 'events', id] as const,
};

export function useContractsList(p: ListContractsParams) {
  return useQuery({
    queryKey: contractKeys.list(p),
    queryFn: () => listContracts(p),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: id ? contractKeys.detail(id) : ['contracts', 'detail', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return getContract(id);
    },
    enabled: !!id,
  });
}

export function useContractWithRelations(id: string | undefined) {
  return useQuery({
    queryKey: id ? ['contracts', 'detail-full', id] : ['contracts', 'detail-full', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return getContractWithRelations(id);
    },
    enabled: !!id,
  });
}

export function useContractEvents(contractId: string | undefined) {
  return useQuery({
    queryKey: contractId ? contractKeys.events(contractId) : ['contracts', 'events', 'none'],
    queryFn: () => {
      if (!contractId) throw new Error('Missing contractId');
      return listContractEvents(contractId);
    },
    enabled: !!contractId,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContractFormInput) => createContract(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

export function useUpdateContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContractFormInput) => updateContract(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: contractKeys.all });
      void qc.invalidateQueries({ queryKey: contractKeys.detail(id) });
    },
  });
}

export function useActivateContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => activateContract(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: contractKeys.all });
      void qc.invalidateQueries({ queryKey: contractKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: contractKeys.events(id) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useTerminateContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => terminateContract(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: contractKeys.all });
      void qc.invalidateQueries({ queryKey: contractKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: contractKeys.events(id) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useDeleteDraftContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDraftContract(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}
