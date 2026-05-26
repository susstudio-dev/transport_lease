import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignServiceRequest,
  closeServiceRequest,
  createServiceRequest,
  getServiceRequest,
  listEligibleVehiclesForTicket,
  listServiceRequestEvents,
  listServiceRequests,
  resolveServiceRequest,
  setServiceRequestBillable,
} from './api';
import type { ListServiceRequestsParams } from './types';
import type { BillableInput, NewServiceRequestInput } from './schemas';

export const srKeys = {
  all: ['service-requests'] as const,
  list: (p: ListServiceRequestsParams) => ['service-requests', 'list', p] as const,
  detail: (id: string) => ['service-requests', 'detail', id] as const,
  events: (id: string) => ['service-requests', 'events', id] as const,
  eligibleVehicles: ['service-requests', 'eligible-vehicles'] as const,
};

export function useServiceRequestsList(p: ListServiceRequestsParams) {
  return useQuery({
    queryKey: srKeys.list(p),
    queryFn: () => listServiceRequests(p),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useServiceRequest(id: string | undefined) {
  return useQuery({
    queryKey: id ? srKeys.detail(id) : ['service-requests', 'detail', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return getServiceRequest(id);
    },
    enabled: !!id,
  });
}

export function useServiceRequestEvents(id: string | undefined) {
  return useQuery({
    queryKey: id ? srKeys.events(id) : ['service-requests', 'events', 'none'],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return listServiceRequestEvents(id);
    },
    enabled: !!id,
  });
}

export function useEligibleVehiclesForTicket() {
  return useQuery({
    queryKey: srKeys.eligibleVehicles,
    queryFn: listEligibleVehiclesForTicket,
    staleTime: 60_000,
  });
}

export function useCreateServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { input: NewServiceRequestInput; corporateId: string; files: File[] }) =>
      createServiceRequest({ ...args.input, corporateId: args.corporateId }, args.files),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: srKeys.all });
    },
  });
}

function buildTransitionMutation<T>(
  id: string,
  fn: (args: T) => Promise<void>,
  qc: ReturnType<typeof useQueryClient>,
) {
  return {
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: srKeys.all });
      void qc.invalidateQueries({ queryKey: srKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: srKeys.events(id) });
    },
  };
}

export function useAssignServiceRequest(id: string) {
  const qc = useQueryClient();
  return useMutation(
    buildTransitionMutation(
      id,
      ({ vendor, vendorEta }: { vendor: string; vendorEta: string | null }) =>
        assignServiceRequest(id, vendor, vendorEta),
      qc,
    ),
  );
}

export function useResolveServiceRequest(id: string) {
  const qc = useQueryClient();
  return useMutation(
    buildTransitionMutation(id, (note: string | null) => resolveServiceRequest(id, note), qc),
  );
}

export function useCloseServiceRequest(id: string) {
  const qc = useQueryClient();
  return useMutation(
    buildTransitionMutation(id, (note: string | null) => closeServiceRequest(id, note), qc),
  );
}

export function useSetServiceRequestBillable(id: string) {
  const qc = useQueryClient();
  return useMutation(
    buildTransitionMutation(id, (input: BillableInput) => setServiceRequestBillable(id, input), qc),
  );
}
