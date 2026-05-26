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
import { statusNoteSchema, type StatusNoteInput } from '@/features/service-requests/schemas';
import {
  useCloseServiceRequest,
  useResolveServiceRequest,
} from '@/features/service-requests/hooks';

type Mode = 'resolve' | 'close';

type Props = {
  mode: Mode;
  srId: string;
  ticketNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

const COPY: Record<Mode, { title: string; desc: string; cta: string }> = {
  resolve: {
    title: 'Mark as resolved',
    desc: 'Lets the corporate know the work is done. They can still re-open by raising a follow-up.',
    cta: 'Resolve',
  },
  close: {
    title: 'Close ticket',
    desc: 'Closes the ticket permanently. Used once the corporate is satisfied.',
    cta: 'Close ticket',
  },
};

export function StatusNoteDialog({ mode, srId, ticketNumber, open, onOpenChange, onDone }: Props) {
  const resolve = useResolveServiceRequest(srId);
  const close = useCloseServiceRequest(srId);
  const mutation = mode === 'resolve' ? resolve : close;

  const form = useForm<StatusNoteInput>({
    resolver: zodResolver(statusNoteSchema),
    defaultValues: { note: undefined },
  });

  function onSubmit(values: StatusNoteInput) {
    mutation.mutate(values.note ?? null, {
      onSuccess: () => {
        toast.success(`${ticketNumber} ${mode === 'resolve' ? 'resolved' : 'closed'}.`);
        form.reset();
        resolve.reset();
        close.reset();
        onDone?.();
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
          resolve.reset();
          close.reset();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COPY[mode].title}</DialogTitle>
          <DialogDescription>{COPY[mode].desc}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {mutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>{mapSupabaseError(mutation.error)}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="What was done? Any follow-up needed?"
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {COPY[mode].cta}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
