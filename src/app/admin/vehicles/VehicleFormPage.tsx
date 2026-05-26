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
import { Skeleton } from '@/components/ui/skeleton';
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
import { mapSupabaseError } from '@/lib/errors';
import { vehicleFormSchema, type VehicleFormInput } from '@/features/vehicles/schemas';
import { useCreateVehicle, useUpdateVehicle, useVehicle } from '@/features/vehicles/hooks';

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_VALUES: VehicleFormInput = {
  registrationNumber: '',
  make: '',
  model: '',
  variant: undefined,
  year: CURRENT_YEAR,
  color: undefined,
  fuelType: 'petrol',
  transmission: 'manual',
  chassisNo: '',
  engineNo: '',
  seatingCapacity: undefined,
  purchaseDate: undefined,
  purchasePrice: undefined,
  status: 'available',
  notes: undefined,
};

export function VehicleFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const detail = useVehicle(id);
  const create = useCreateVehicle();
  const update = useUpdateVehicle(id ?? '');

  const form = useForm<VehicleFormInput>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (isEdit && detail.data) {
      const v = detail.data;
      form.reset({
        registrationNumber: v.registrationNumber,
        make: v.make,
        model: v.model,
        variant: v.variant ?? undefined,
        year: v.year,
        color: v.color ?? undefined,
        fuelType: v.fuelType,
        transmission: v.transmission,
        chassisNo: v.chassisNo,
        engineNo: v.engineNo,
        seatingCapacity: v.seatingCapacity ?? undefined,
        purchaseDate: v.purchaseDate ?? undefined,
        purchasePrice: v.purchasePrice !== null ? Number(v.purchasePrice) : undefined,
        status: v.status,
        notes: v.notes ?? undefined,
      });
    }
  }, [detail.data, form, isEdit]);

  if (isEdit && detail.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit vehicle" />
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

  function onSubmit(values: VehicleFormInput) {
    if (isEdit) {
      update.mutate(values, {
        onSuccess: (v) => {
          toast.success('Vehicle updated.');
          navigate(`/admin/vehicles/${v.id}`);
        },
      });
    } else {
      create.mutate(values, {
        onSuccess: (v) => {
          toast.success('Vehicle added.');
          navigate(`/admin/vehicles/${v.id}`);
        },
      });
    }
  }

  const submitting = create.isPending || update.isPending;
  const submitError = create.error ?? update.error;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit vehicle' : 'New vehicle'}
        description={isEdit ? detail.data?.registrationNumber : 'Add a vehicle to the fleet.'}
        actions={
          <Button asChild variant="ghost">
            <Link to={isEdit ? `/admin/vehicles/${id}` : '/admin/vehicles'}>
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
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MH01AB1234"
                        maxLength={15}
                        {...field}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="available">Available</option>
                        <option value="leased">Leased</option>
                        <option value="under_service">Under service</option>
                        <option value="retired">Retired</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="Maruti Suzuki" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="Dzire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="variant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant</FormLabel>
                    <FormControl>
                      <Input placeholder="VXI" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1990}
                        max={CURRENT_YEAR + 1}
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
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="White" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seatingCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seating capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={50}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engine & drivetrain</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel type</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="cng">CNG</option>
                        <option value="electric">Electric</option>
                        <option value="hybrid">Hybrid</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transmission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transmission</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="manual">Manual</option>
                        <option value="automatic">Automatic</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chassisNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassis number</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="engineNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engine number</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase price (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                        }
                      />
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
                        placeholder="Internal notes about this vehicle…"
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
              <Link to={isEdit ? `/admin/vehicles/${id}` : '/admin/vehicles'}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add vehicle'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
