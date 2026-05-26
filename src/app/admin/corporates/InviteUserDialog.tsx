import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Loader2 } from 'lucide-react';
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
import { createUserSchema, type CreateUserInput } from '@/features/corporates/schemas';
import { useCreateCorporateUser } from '@/features/corporates/hooks';

type Props = {
  corporateId: string;
  corporateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteUserDialog({ corporateId, corporateName, open, onOpenChange }: Props) {
  const create = useCreateCorporateUser(corporateId);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', fullName: '', phone: undefined },
  });

  function handleClose() {
    setResult(null);
    form.reset();
    create.reset();
    onOpenChange(false);
  }

  function onSubmit(values: CreateUserInput) {
    create.mutate(values, {
      onSuccess: (data) => {
        setResult({ email: values.email, tempPassword: data.tempPassword });
        toast.success('User created.');
      },
    });
  }

  async function copyPassword() {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempPassword);
    toast.success('Password copied.');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{result ? 'User created' : 'Invite user'}</DialogTitle>
          <DialogDescription>
            {result
              ? 'Share these credentials securely. The user will be required to change their password on first sign-in.'
              : `Create a corporate admin under ${corporateName}.`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="font-medium">{result.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Temporary password</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {result.tempPassword}
                </code>
                <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {create.isError && (
                <Alert variant="destructive">
                  <AlertDescription>{mapSupabaseError(create.error)}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Priya Sharma" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="priya@acme.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      This will be their sign-in email. We'll generate a temporary password.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+91 98765 43210"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create user
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
