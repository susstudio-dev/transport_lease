import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, addMonths, format, parseISO } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { mapSupabaseError } from '@/lib/errors';
import { formatInr } from '@/lib/format';
import { contractFormSchema, type ContractFormInput } from '@/features/contracts/schemas';
import { useContract, useCreateContract, useUpdateContract } from '@/features/contracts/hooks';
import { listActiveCorporates } from '@/features/corporates/api';
import { listAvailableVehicles, getVehicle } from '@/features/vehicles/api';
import { getContract } from '@/features/contracts/api';

const DATE_FMT = 'yyyy-MM-dd';
const TODAY = format(new Date(), DATE_FMT);

const DEFAULT_VALUES: ContractFormInput = {
  corporateId: '',
  vehicleId: '',
  tenureMonths: 12,
  startDate: TODAY,
  monthlyRental: 0,
  securityDeposit: 0,
  kmCapPerMonth: undefined,
  fuelResponsibility: 'client',
  insuranceResponsibility: 'company',
  notes: undefined,
  previousContractId: undefined,
};

export function ContractFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const renewFromId = searchParams.get('renewFrom');
  const isEdit = !!id;
  const isRenewal = !isEdit && !!renewFromId;
  const navigate = useNavigate();

  const detail = useContract(id);
  const create = useCreateContract();
  const update = useUpdateContract(id ?? '');

  // For renewals, fetch the source contract and its vehicle so we can pre-fill.
  const renewSource = useQuery({
    queryKey: ['contracts', 'renew-source', renewFromId],
    queryFn: async () => {
      if (!renewFromId) return null;
      const src = await getContract(renewFromId);
      const veh = await getVehicle(src.vehicleId);
      return { src, veh };
    },
    enabled: !!renewFromId,
  });

  const corporates = useQuery({
    queryKey: ['corporates', 'active'],
    queryFn: listActiveCorporates,
  });
  const availableVehicles = useQuery({
    queryKey: ['vehicles', 'available'],
    queryFn: listAvailableVehicles,
  });

  const form = useForm<ContractFormInput>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Populate form when editing a draft.
  useEffect(() => {
    if (isEdit && detail.data) {
      const c = detail.data;
      form.reset({
        corporateId: c.corporateId,
        vehicleId: c.vehicleId,
        tenureMonths: c.tenureMonths,
        startDate: c.startDate,
        monthlyRental: Number(c.monthlyRental),
        securityDeposit: Number(c.securityDeposit),
        kmCapPerMonth: c.kmCapPerMonth ?? undefined,
        fuelResponsibility: c.fuelResponsibility,
        insuranceResponsibility: c.insuranceResponsibility,
        notes: c.notes ?? undefined,
        previousContractId: c.previousContractId ?? undefined,
      });
    }
  }, [detail.data, form, isEdit]);

  // Populate form for a renewal.
  useEffect(() => {
    if (isRenewal && renewSource.data) {
      const { src } = renewSource.data;
      const renewalStart = format(addDays(parseISO(src.endDate), 1), DATE_FMT);
      form.reset({
        corporateId: src.corporateId,
        vehicleId: src.vehicleId,
        tenureMonths: src.tenureMonths,
        startDate: renewalStart,
        monthlyRental: Number(src.monthlyRental),
        securityDeposit: Number(src.securityDeposit),
        kmCapPerMonth: src.kmCapPerMonth ?? undefined,
        fuelResponsibility: src.fuelResponsibility,
        insuranceResponsibility: src.insuranceResponsibility,
        notes: undefined,
        previousContractId: src.id,
      });
    }
  }, [renewSource.data, form, isRenewal]);

  // Drafts only — anything else is read-only.
  if (isEdit && detail.data && detail.data.status !== 'draft') {
    return <Navigate to={`/admin/contracts/${detail.data.id}`} replace />;
  }

  if (isEdit && detail.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit contract" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (isEdit && detail.isError) {
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;
  }
  if (isRenewal && renewSource.isError) {
    return <ErrorState error={renewSource.error} onRetry={() => void renewSource.refetch()} />;
  }

  const startDate = form.watch('startDate');
  const tenureMonths = form.watch('tenureMonths');
  const monthlyRental = form.watch('monthlyRental');
  let computedEndDate: string | null = null;
  try {
    if (startDate && tenureMonths > 0) {
      computedEndDate = format(addMonths(parseISO(startDate), tenureMonths), DATE_FMT);
    }
  } catch {
    computedEndDate = null;
  }

  // For renewals, allow keeping the vehicle currently being renewed even if not
  // strictly "available" — activation handles the handoff.
  const renewalVehicle = isRenewal && renewSource.data ? renewSource.data.veh : null;
  const vehicleOptions = (() => {
    const opts = availableVehicles.data ?? [];
    if (renewalVehicle && !opts.some((v) => v.id === renewalVehicle.id)) {
      return [
        {
          id: renewalVehicle.id,
          registrationNumber: renewalVehicle.registrationNumber,
          make: renewalVehicle.make,
          model: renewalVehicle.model,
          year: renewalVehicle.year,
        },
        ...opts,
      ];
    }
    return opts;
  })();

  function onSubmit(values: ContractFormInput) {
    if (isEdit) {
      update.mutate(values, {
        onSuccess: (c) => {
          toast.success('Contract saved.');
          navigate(`/admin/contracts/${c.id}`);
        },
      });
    } else {
      create.mutate(values, {
        onSuccess: (c) => {
          toast.success(isRenewal ? 'Renewal draft created.' : 'Draft contract created.');
          navigate(`/admin/contracts/${c.id}`);
        },
      });
    }
  }

  const submitting = create.isPending || update.isPending;
  const submitError = create.error ?? update.error;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit contract' : isRenewal ? 'Renew contract' : 'New contract'}
        description={
          isEdit
            ? detail.data?.contractNumber
            : isRenewal
              ? `Pre-filled from ${renewSource.data?.src.contractNumber ?? ''}`
              : 'Create a draft. Activate it once details are confirmed.'
        }
        actions={
          <Button asChild variant="ghost">
            <Link
              to={
                isEdit
                  ? `/admin/contracts/${id}`
                  : isRenewal && renewFromId
                    ? `/admin/contracts/${renewFromId}`
                    : '/admin/contracts'
              }
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </Button>
        }
      />

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{mapSupabaseError(submitError)}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="corporateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corporate</FormLabel>
                    <FormControl>
                      <Select {...field} disabled={corporates.isPending}>
                        <option value="">Select corporate…</option>
                        {corporates.data?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.legalName}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <FormControl>
                      <Select {...field} disabled={availableVehicles.isPending}>
                        <option value="">Select vehicle…</option>
                        {vehicleOptions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.registrationNumber} — {v.make} {v.model} ({v.year})
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormDescription>Only currently-available vehicles are shown.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Term</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tenureMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenure (months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>
                      {computedEndDate ? `Ends ${computedEndDate}` : 'End date is computed.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commercials</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="monthlyRental"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly rental (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>
                      Lifetime value:{' '}
                      {monthlyRental && tenureMonths
                        ? formatInr(monthlyRental * tenureMonths)
                        : '—'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="securityDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security deposit (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kmCapPerMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometre cap / month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormDescription>Optional. Leave blank for unlimited.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuelResponsibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel responsibility</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="client">Lessee (corporate)</option>
                        <option value="company">Lessor (you)</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insuranceResponsibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance responsibility</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="company">Lessor (you)</option>
                        <option value="client">Lessee (corporate)</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Internal notes about this contract…"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link
                to={
                  isEdit
                    ? `/admin/contracts/${id}`
                    : isRenewal && renewFromId
                      ? `/admin/contracts/${renewFromId}`
                      : '/admin/contracts'
                }
              >
                Cancel
              </Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save draft' : 'Create draft'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
