import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCorporate,
  createCorporateUser,
  deleteKycDoc,
  getCorporate,
  listCorporateUsers,
  listCorporates,
  listKycDocs,
  setCorporateStatus,
  updateCorporate,
  uploadKycDoc,
} from './api';
import type { ListCorporatesParams } from './types';
import type { CorporateFormInput, CreateUserInput } from './schemas';

export const corporateKeys = {
  all: ['corporates'] as const,
  list: (p: ListCorporatesParams) => ['corporates', 'list', p] as const,
  detail: (id: string) => ['corporates', 'detail', id] as const,
  kyc: (id: string) => ['corporates', 'kyc', id] as const,
  users: (id: string) => ['corporates', 'users', id] as const,
};

export function useCorporatesList(p: ListCorporatesParams) {
  return useQuery({
    queryKey: corporateKeys.list(p),
    queryFn: () => listCorporates(p),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useCorporate(id: string | undefined) {
  return useQuery({
    queryKey: id ? corporateKeys.detail(id) : ['corporates', 'detail', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return getCorporate(id);
    },
    enabled: !!id,
  });
}

export function useCreateCorporate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CorporateFormInput) => createCorporate(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: corporateKeys.all });
    },
  });
}

export function useUpdateCorporate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CorporateFormInput) => updateCorporate(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: corporateKeys.all });
      void qc.invalidateQueries({ queryKey: corporateKeys.detail(id) });
    },
  });
}

export function useSetCorporateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status: 'active' | 'inactive' }) =>
      setCorporateStatus(args.id, args.status),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: corporateKeys.detail(vars.id) });
      void qc.invalidateQueries({ queryKey: corporateKeys.all });
    },
  });
}

export function useKycDocs(corporateId: string) {
  return useQuery({
    queryKey: corporateKeys.kyc(corporateId),
    queryFn: () => listKycDocs(corporateId),
    enabled: !!corporateId,
  });
}

export function useUploadKycDoc(corporateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { docType: string; file: File }) => uploadKycDoc({ corporateId, ...args }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: corporateKeys.kyc(corporateId) });
    },
  });
}

export function useDeleteKycDoc(corporateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteKycDoc,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: corporateKeys.kyc(corporateId) });
    },
  });
}

export function useCorporateUsers(corporateId: string) {
  return useQuery({
    queryKey: corporateKeys.users(corporateId),
    queryFn: () => listCorporateUsers(corporateId),
    enabled: !!corporateId,
  });
}

export function useCreateCorporateUser(corporateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createCorporateUser({ corporateId, input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: corporateKeys.users(corporateId) });
    },
  });
}
