import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { mapSupabaseError } from '@/lib/errors';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateServiceRequest,
  useEligibleVehiclesForTicket,
} from '@/features/service-requests/hooks';
import {
  newServiceRequestSchema,
  type NewServiceRequestInput,
} from '@/features/service-requests/schemas';
import { CATEGORY_OPTIONS, URGENCY_OPTIONS } from '@/features/service-requests/types';

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

export function CorporateNewServiceRequestPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const create = useCreateServiceRequest();
  const eligible = useEligibleVehiclesForTicket();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<NewServiceRequestInput>({
    resolver: zodResolver(newServiceRequestSchema),
    defaultValues: {
      contractId: '',
      vehicleId: '',
      category: 'servicing',
      urgency: 'medium',
      description: '',
    },
  });

  if (!profile || profile.role !== 'corporate_admin' || !profile.corporateId) {
    return <Navigate to="/corporate" replace />;
  }
  const corporateId = profile.corporateId;

  function onPickVehicle(contractId: string) {
    const match = eligible.data?.find((e) => e.contractId === contractId);
    form.setValue('contractId', contractId);
    form.setValue('vehicleId', match?.vehicleId ?? '');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const list = Array.from(e.target.files ?? []);
    if (list.length === 0) return;
    if (files.length + list.length > MAX_FILES) {
      setFileError(`You can attach up to ${MAX_FILES} photos.`);
      e.target.value = '';
      return;
    }
    const oversized = list.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setFileError(`"${oversized.name}" is over ${MAX_BYTES / 1024 / 1024} MB.`);
      e.target.value = '';
      return;
    }
    setFiles((prev) => [...prev, ...list]);
    e.target.value = '';
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(values: NewServiceRequestInput) {
    create.mutate(
      { input: values, corporateId, files },
      {
        onSuccess: (sr) => {
          toast.success(`Ticket ${sr.ticketNumber} raised.`);
          navigate(`/corporate/service-requests/${sr.id}`);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raise a service request"
        description="Tell us what's wrong and we'll route it to a vendor."
        actions={
          <Button asChild variant="ghost">
            <Link to="/corporate/service-requests">
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </Button>
        }
      />

      {create.isError && (
        <Alert variant="destructive">
          <AlertDescription>{mapSupabaseError(create.error)}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Vehicle &amp; category</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Vehicle</FormLabel>
                    <FormControl>
                      {eligible.isError ? (
                        <ErrorState
                          error={eligible.error}
                          onRetry={() => void eligible.refetch()}
                        />
                      ) : eligible.isPending ? (
                        <Skeleton className="h-10 w-full" />
                      ) : eligible.data.length === 0 ? (
                        <EmptyState
                          title="No active leases"
                          description="You can only raise tickets against vehicles currently leased to your corporate."
                        />
                      ) : (
                        <Select {...field} onChange={(e) => onPickVehicle(e.target.value)}>
                          <option value="">Select a vehicle…</option>
                          {eligible.data.map((e) => (
                            <option key={e.contractId} value={e.contractId}>
                              {e.registrationNumber} — {e.make} {e.model}
                            </option>
                          ))}
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
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
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {URGENCY_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormDescription>
                      High urgency tickets are flagged for faster vendor assignment.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Describe the issue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="What happened? When did it start? Any noises, dashboard warnings, or visible damage?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Photos (optional)</FormLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length >= MAX_FILES}
                >
                  <Paperclip className="h-4 w-4" />
                  Add photos
                </Button>
                <FormDescription>
                  Up to {MAX_FILES} images, {MAX_BYTES / 1024 / 1024} MB each.
                </FormDescription>
                {fileError && <p className="text-sm text-destructive">{fileError}</p>}
                {files.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{f.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(i)}
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/corporate/service-requests">Cancel</Link>
            </Button>
            <Button type="submit" disabled={create.isPending || (eligible.data?.length ?? 0) === 0}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Raise ticket
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
