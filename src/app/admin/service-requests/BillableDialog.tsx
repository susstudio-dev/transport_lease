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
import { mapSupabaseError } from '@/lib/errors';
import { billableSchema, type BillableInput } from '@/features/service-requests/schemas';
import { useSetServiceRequestBillable } from '@/features/service-requests/hooks';

type Props = {
  srId: string;
  ticketNumber: string;
  currentAmount?: string | null;
  currentDescription?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BillableDialog({
  srId,
  ticketNumber,
  currentAmount,
  currentDescription,
  open,
  onOpenChange,
}: Props) {
  const set = useSetServiceRequestBillable(srId);

  const form = useForm<BillableInput>({
    resolver: zodResolver(billableSchema),
    defaultValues: {
      amount: currentAmount !== null && currentAmount !== undefined ? Number(currentAmount) : 0,
      description: currentDescription ?? undefined,
    },
  });

  function onSubmit(values: BillableInput) {
    set.mutate(values, {
      onSuccess: () => {
        toast.success(`Billable updated for ${ticketNumber}.`);
        form.reset();
        set.reset();
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
          set.reset();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pass-through cost</DialogTitle>
          <DialogDescription>
            Stamps an amount that will appear on the next monthly invoice for this corporate.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {set.isError && (
              <Alert variant="destructive">
                <AlertDescription>{mapSupabaseError(set.error)}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>Set to 0 to clear.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="What this charge covers (parts, labour, etc.)"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={set.isPending}>
                {set.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
