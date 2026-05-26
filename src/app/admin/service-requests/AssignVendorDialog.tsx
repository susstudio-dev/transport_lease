import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { mapSupabaseError } from '@/lib/errors';
import { assignVendorSchema, type AssignVendorInput } from '@/features/service-requests/schemas';
import { useAssignServiceRequest } from '@/features/service-requests/hooks';

type Props = {
  srId: string;
  ticketNumber: string;
  currentVendor?: string | null;
  currentEta?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
};

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssignVendorDialog({
  srId,
  ticketNumber,
  currentVendor,
  currentEta,
  open,
  onOpenChange,
  onAssigned,
}: Props) {
  const assign = useAssignServiceRequest(srId);

  const form = useForm<AssignVendorInput>({
    resolver: zodResolver(assignVendorSchema),
    defaultValues: {
      vendor: currentVendor ?? '',
      vendorEta: toLocalInputValue(currentEta),
    },
  });

  function onSubmit(values: AssignVendorInput) {
    const eta = values.vendorEta ? new Date(values.vendorEta).toISOString() : null;
    assign.mutate(
      { vendor: values.vendor, vendorEta: eta },
      {
        onSuccess: () => {
          toast.success(`${ticketNumber} assigned.`);
          form.reset();
          assign.reset();
          onAssigned?.();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          form.reset();
          assign.reset();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentVendor ? 'Update vendor' : 'Assign vendor'}</DialogTitle>
          <DialogDescription>
            Moves {ticketNumber} into <strong>in progress</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {assign.isError && (
              <Alert variant="destructive">
                <AlertDescription>{mapSupabaseError(assign.error)}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Service Centre, Andheri" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vendorEta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ETA</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Optional. Shared with the corporate.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assign.isPending}>
                {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
