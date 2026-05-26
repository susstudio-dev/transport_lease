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
import { terminateSchema, type TerminateInput } from '@/features/contracts/schemas';
import { useTerminateContract } from '@/features/contracts/hooks';

type Props = {
  contractId: string;
  contractNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TerminateContractDialog({ contractId, contractNumber, open, onOpenChange }: Props) {
  const terminate = useTerminateContract(contractId);

  const form = useForm<TerminateInput>({
    resolver: zodResolver(terminateSchema),
    defaultValues: { reason: '' },
  });

  function onSubmit(values: TerminateInput) {
    terminate.mutate(values.reason, {
      onSuccess: () => {
        toast.success(`Contract ${contractNumber} terminated.`);
        form.reset();
        terminate.reset();
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
          terminate.reset();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terminate contract</DialogTitle>
          <DialogDescription>
            Terminating {contractNumber} will end the lease immediately and mark the vehicle as
            available. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {terminate.isError && (
              <Alert variant="destructive">
                <AlertDescription>{mapSupabaseError(terminate.error)}</AlertDescription>
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
                      placeholder="Brief description of why this contract is being terminated…"
                      {...field}
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
              <Button type="submit" variant="destructive" disabled={terminate.isPending}>
                {terminate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Terminate
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
