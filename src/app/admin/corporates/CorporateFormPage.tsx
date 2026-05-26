import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { mapSupabaseError } from '@/lib/errors';
import { corporateFormSchema, type CorporateFormInput } from '@/features/corporates/schemas';
import { useCorporate, useCreateCorporate, useUpdateCorporate } from '@/features/corporates/hooks';

const DEFAULT_VALUES: CorporateFormInput = {
  legalName: '',
  displayName: undefined,
  gstin: undefined,
  pan: undefined,
  stateCode: undefined,
  primaryContactName: undefined,
  primaryContactEmail: undefined,
  primaryContactPhone: undefined,
  billingAddress: {
    line1: undefined,
    line2: undefined,
    city: undefined,
    state: undefined,
    pincode: undefined,
  },
  status: 'active',
  notes: undefined,
};

export function CorporateFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const detail = useCorporate(id);
  const create = useCreateCorporate();
  const update = useUpdateCorporate(id ?? '');

  const form = useForm<CorporateFormInput>({
    resolver: zodResolver(corporateFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (isEdit && detail.data) {
      const c = detail.data;
      form.reset({
        legalName: c.legalName,
        displayName: c.displayName ?? undefined,
        gstin: c.gstin ?? undefined,
        pan: c.pan ?? undefined,
        stateCode: c.stateCode ?? undefined,
        primaryContactName: c.primaryContactName ?? undefined,
        primaryContactEmail: c.primaryContactEmail ?? undefined,
        primaryContactPhone: c.primaryContactPhone ?? undefined,
        billingAddress: c.billingAddress,
        status: c.status,
        notes: c.notes ?? undefined,
      });
    }
  }, [detail.data, form, isEdit]);

  if (isEdit && detail.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit corporate" />
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

  function onSubmit(values: CorporateFormInput) {
    if (isEdit) {
      update.mutate(values, {
        onSuccess: (c) => {
          toast.success('Corporate updated.');
          navigate(`/admin/corporates/${c.id}`);
        },
      });
    } else {
      create.mutate(values, {
        onSuccess: (c) => {
          toast.success('Corporate created.');
          navigate(`/admin/corporates/${c.id}`);
        },
      });
    }
  }

  const submitting = create.isPending || update.isPending;
  const submitError = create.error ?? update.error;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit corporate' : 'New corporate'}
        description={isEdit ? detail.data?.legalName : 'Onboard a new corporate client.'}
        actions={
          <Button asChild variant="ghost">
            <Link to={isEdit ? `/admin/corporates/${id}` : '/admin/corporates'}>
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
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Legal name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Logistics Pvt Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Logistics" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="29ABCDE1234F1Z2"
                        maxLength={15}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State code (GST)</FormLabel>
                    <FormControl>
                      <Input placeholder="29" maxLength={2} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primary contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryContactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="billingAddress.line1"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address line 1</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress.line2"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address line 2</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress.pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN code</FormLabel>
                    <FormControl>
                      <Input maxLength={6} {...field} value={field.value ?? ''} />
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
                        placeholder="Internal notes about this corporate…"
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
              <Link to={isEdit ? `/admin/corporates/${id}` : '/admin/corporates'}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create corporate'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
