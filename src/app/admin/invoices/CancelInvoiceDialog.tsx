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
import { mapSupabaseError } from '@/lib/errors';
import { cancelInvoiceSchema, type CancelInvoiceInput } from '@/features/invoices/schemas';
import { useCancelInvoice } from '@/features/invoices/hooks';

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelInvoiceDialog({ invoiceId, invoiceNumber, open, onOpenChange }: Props) {
  const cancel = useCancelInvoice(invoiceId);
  const form = useForm<CancelInvoiceInput>({
    resolver: zodResolver(cancelInvoiceSchema),
    defaultValues: { reason: '' },
  });

  function onSubmit(values: CancelInvoiceInput) {
    cancel.mutate(values.reason, {
      onSuccess: () => {
        toast.success(`Invoice ${invoiceNumber} cancelled.`);
        form.reset();
        cancel.reset();
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          form.reset();
          cancel.reset();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel invoice</DialogTitle>
          <DialogDescription>
            Cancelling {invoiceNumber} marks it as void. This cannot be undone — issue a fresh
            invoice if the figures need to change.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {cancel.isError && (
              <Alert variant="destructive">
                <AlertDescription>{mapSupabaseError(cancel.error)}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Why is this invoice being cancelled?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Keep invoice
              </Button>
              <Button type="submit" variant="destructive" disabled={cancel.isPending}>
                {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel invoice
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
