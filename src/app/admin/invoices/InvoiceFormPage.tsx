import { useEffect, useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import {
  invoiceFormSchema,
  type InvoiceFormInput,
  type LineItemInput,
} from '@/features/invoices/schemas';
import {
  useCreateInvoiceDraft,
  useInvoice,
  useInvoiceLineItems,
  useInvoiceableContracts,
  useUpdateInvoiceDraft,
} from '@/features/invoices/hooks';
import { GstPreview } from '@/features/invoices/components/GstPreview';
import type { AppSettingsRow } from '@/types/database';

const DATE_FMT = 'yyyy-MM-dd';
const TODAY = format(new Date(), DATE_FMT);

function defaultBillingPeriod() {
  const now = new Date();
  return {
    start: format(startOfMonth(now), DATE_FMT),
    end: format(endOfMonth(now), DATE_FMT),
  };
}

async function fetchAppSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', true).single();
  if (error) throw error;
  return data as AppSettingsRow;
}

export function InvoiceFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const detail = useInvoice(id);
  const existingLines = useInvoiceLineItems(id);
  const contracts = useInvoiceableContracts();
  const settings = useQuery({ queryKey: ['app-settings'], queryFn: fetchAppSettings });
  const create = useCreateInvoiceDraft();
  const update = useUpdateInvoiceDraft(id ?? '');

  const form = useForm<InvoiceFormInput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      contractId: '',
      billingPeriodStart: defaultBillingPeriod().start,
      billingPeriodEnd: defaultBillingPeriod().end,
      dueDate: format(addDays(new Date(), 7), DATE_FMT),
      notes: undefined,
      lineItems: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  // When the user picks a contract, pre-load the monthly rental as line item.
  const watchedContractId = form.watch('contractId');
  const pickedContract = useMemo(() => {
    if (!contracts.data || !watchedContractId) return null;
    return contracts.data.find((c) => c.id === watchedContractId) ?? null;
  }, [contracts.data, watchedContractId]);

  const isInterState = useMemo(() => {
    if (!settings.data || !pickedContract) return false;
    return (
      !!settings.data.state_code &&
      !!pickedContract.corporate.stateCode &&
      settings.data.state_code !== pickedContract.corporate.stateCode
    );
  }, [settings.data, pickedContract]);

  // Initial monthly-rental seed on contract change (only if no lines yet).
  useEffect(() => {
    if (!isEdit && pickedContract && fields.length === 0 && settings.data) {
      append({
        description: `Monthly rental — ${format(new Date(form.getValues('billingPeriodStart')), 'MMM yyyy')}`,
        hsnCode: settings.data.default_hsn_code,
        quantity: 1,
        unitPrice: Number(pickedContract.monthlyRental),
        gstRate: Number(settings.data.default_gst_rate),
      });
    }
  }, [pickedContract, isEdit, fields.length, append, settings.data, form]);

  // Load existing invoice into the form (edit mode).
  useEffect(() => {
    if (isEdit && detail.data && existingLines.data) {
      if (detail.data.status !== 'draft') return; // redirect handled below
      form.reset({
        contractId: detail.data.contractId,
        billingPeriodStart: detail.data.billingPeriodStart,
        billingPeriodEnd: detail.data.billingPeriodEnd,
        dueDate: detail.data.dueDate,
        notes: detail.data.notes ?? undefined,
        lineItems: existingLines.data.map((l) => ({
          description: l.description,
          hsnCode: l.hsnCode,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          gstRate: Number(l.gstRate),
        })),
      });
    }
  }, [detail.data, existingLines.data, isEdit, form]);

  if (isEdit && detail.data && detail.data.status !== 'draft') {
    return <Navigate to={`/admin/invoices/${detail.data.id}`} replace />;
  }

  if (isEdit && (detail.isPending || existingLines.isPending)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit invoice" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
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
  if (contracts.isError) {
    return <ErrorState error={contracts.error} onRetry={() => void contracts.refetch()} />;
  }
  if (settings.isError) {
    return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;
  }

  function onSubmit(values: InvoiceFormInput) {
    if (!pickedContract) {
      toast.error('Pick a contract first.');
      return;
    }
    if (isEdit) {
      update.mutate(values, {
        onSuccess: (inv) => {
          toast.success('Draft saved.');
          navigate(`/admin/invoices/${inv.id}`);
        },
      });
    } else {
      create.mutate(
        { input: values, corporateId: pickedContract.corporate.id },
        {
          onSuccess: (inv) => {
            toast.success(`Draft ${inv.invoiceNumber} created.`);
            navigate(`/admin/invoices/${inv.id}`);
          },
        },
      );
    }
  }

  const submitting = create.isPending || update.isPending;
  const submitError = create.error ?? update.error;
  const watchedLines = form.watch('lineItems');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit invoice' : 'New invoice'}
        description={
          isEdit
            ? `Editing draft ${detail.data?.invoiceNumber ?? ''}`
            : 'Create a draft, then issue when ready.'
        }
        actions={
          <Button asChild variant="ghost">
            <Link to={isEdit && id ? `/admin/invoices/${id}` : '/admin/invoices'}>
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
              <CardTitle>Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lease contract</FormLabel>
                    <FormControl>
                      <Select {...field} disabled={contracts.isPending || isEdit}>
                        <option value="">Select contract…</option>
                        {contracts.data?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.contractNumber} — {c.corporate.legalName} •{' '}
                            {c.vehicle.registrationNumber}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {pickedContract
                        ? `Lessee: ${pickedContract.corporate.legalName}${
                            pickedContract.corporate.stateCode
                              ? ` (state ${pickedContract.corporate.stateCode})`
                              : ''
                          }`
                        : 'Choose the lease to bill against.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Period &amp; due date</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="billingPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period end</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" min={TODAY} {...field} />
                    </FormControl>
                    <FormDescription>
                      Default is {settings.data?.payment_terms_days ?? 7} days from today.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: '',
                    hsnCode: settings.data?.default_hsn_code ?? '9966',
                    quantity: 1,
                    unitPrice: 0,
                    gstRate: Number(settings.data?.default_gst_rate ?? 18),
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Pick a contract above and a monthly-rental line will be added automatically.
                </p>
              )}
              {fields.map((f, idx) => (
                <div
                  key={f.id}
                  className="grid grid-cols-12 items-start gap-2 rounded-md border bg-card p-3"
                >
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.description`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-4">
                        <FormLabel className="text-xs">Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.hsnCode`}
                    render={({ field }) => (
                      <FormItem className="col-span-6 sm:col-span-2">
                        <FormLabel className="text-xs">HSN/SAC</FormLabel>
                        <FormControl>
                          <Input maxLength={8} className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.quantity`}
                    render={({ field }) => (
                      <FormItem className="col-span-3 sm:col-span-1">
                        <FormLabel className="text-xs">Qty</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.01}
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
                    name={`lineItems.${idx}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="col-span-3 sm:col-span-2">
                        <FormLabel className="text-xs">Unit (₹)</FormLabel>
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
                    name={`lineItems.${idx}.gstRate`}
                    render={({ field }) => (
                      <FormItem className="col-span-4 sm:col-span-2">
                        <FormLabel className="text-xs">GST %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={28}
                            step="0.5"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="col-span-2 flex h-full items-end justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove line"
                      onClick={() => remove(idx)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {form.formState.errors.lineItems?.root?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lineItems.root.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Anything to print on the invoice (PO reference, payment instructions, etc.)"
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

          <GstPreview lines={watchedLines as LineItemInput[]} isInterState={isInterState} />

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to={isEdit && id ? `/admin/invoices/${id}` : '/admin/invoices'}>Cancel</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => replace([])}
              disabled={fields.length === 0}
            >
              Clear lines
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
