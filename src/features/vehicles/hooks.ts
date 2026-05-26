import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VehicleDocTypeEnum } from '@/types/database';
import {
  createVehicle,
  deleteVehicleDoc,
  getVehicle,
  listVehicleDocs,
  listVehicles,
  setVehicleStatus,
  updateVehicle,
  upsertVehicleDoc,
} from './api';
import type { ListVehiclesParams, VehicleDocument } from './types';
import type { VehicleDocumentInput, VehicleFormInput } from './schemas';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: (p: ListVehiclesParams) => ['vehicles', 'list', p] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
  docs: (id: string) => ['vehicles', 'docs', id] as const,
};

export function useVehiclesList(p: ListVehiclesParams) {
  return useQuery({
    queryKey: vehicleKeys.list(p),
    queryFn: () => listVehicles(p),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: id ? vehicleKeys.detail(id) : ['vehicles', 'detail', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return getVehicle(id);
    },
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleFormInput) => createVehicle(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useUpdateVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleFormInput) => updateVehicle(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(id) });
    },
  });
}

export function useSetVehicleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      status: 'available' | 'leased' | 'under_service' | 'retired';
    }) => setVehicleStatus(args.id, args.status),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.id) });
    },
  });
}

export function useVehicleDocs(vehicleId: string) {
  return useQuery({
    queryKey: vehicleKeys.docs(vehicleId),
    queryFn: () => listVehicleDocs(vehicleId),
    enabled: !!vehicleId,
  });
}

export function useUpsertVehicleDoc(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      docType: VehicleDocTypeEnum;
      input: VehicleDocumentInput;
      file?: File;
      existingFilePath?: string | null;
    }) => upsertVehicleDoc({ vehicleId, ...args }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.docs(vehicleId) });
    },
  });
}

export function useDeleteVehicleDoc(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: VehicleDocument) => deleteVehicleDoc(doc),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.docs(vehicleId) });
    },
  });
}
