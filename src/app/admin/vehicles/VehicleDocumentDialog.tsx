import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Paperclip } from 'lucide-react';
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
import { vehicleDocumentSchema, type VehicleDocumentInput } from '@/features/vehicles/schemas';
import { useUpsertVehicleDoc } from '@/features/vehicles/hooks';
import { VEHICLE_DOC_TYPES, type VehicleDocument } from '@/features/vehicles/types';
import type { VehicleDocTypeEnum } from '@/types/database';

type Props = {
  vehicleId: string;
  docType: VehicleDocTypeEnum;
  existing?: VehicleDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function VehicleDocumentDialog({ vehicleId, docType, existing, open, onOpenChange }: Props) {
  const upsert = useUpsertVehicleDoc(vehicleId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [fileError, setFileError] = useState<string | null>(null);

  const docLabel = VEHICLE_DOC_TYPES.find((t) => t.value === docType)?.label ?? docType;

  const form = useForm<VehicleDocumentInput>({
    resolver: zodResolver(vehicleDocumentSchema),
    defaultValues: {
      documentNumber: existing?.documentNumber ?? undefined,
      issueDate: existing?.issueDate ?? undefined,
      expiryDate: existing?.expiryDate ?? '',
    },
  });

  // Reset form when the dialog reopens for a different doc.
  useEffect(() => {
    if (open) {
      form.reset({
        documentNumber: existing?.documentNumber ?? undefined,
        issueDate: existing?.issueDate ?? undefined,
        expiryDate: existing?.expiryDate ?? '',
      });
      setFile(undefined);
      setFileError(null);
      upsert.reset();
    }
  }, [open, existing, form, upsert]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0];
    if (!f) {
      setFile(undefined);
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError(`File is too large (max ${MAX_BYTES / 1024 / 1024} MB).`);
      e.target.value = '';
      return;
    }
    setFile(f);
  }

  function onSubmit(values: VehicleDocumentInput) {
    upsert.mutate(
      {
        docType,
        input: values,
        file,
        existingFilePath: existing?.filePath,
      },
      {
        onSuccess: () => {
          toast.success(`${docLabel} saved.`);
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? `Update ${docLabel}` : `Add ${docLabel}`}</DialogTitle>
          <DialogDescription>
            Track expiry and (optionally) attach a scanned copy.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {upsert.isError && (
              <Alert variant="destructive">
                <AlertDescription>{mapSupabaseError(upsert.error)}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. policy or certificate number"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>{existing?.filePath ? 'Replace file' : 'Attach file'}</FormLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  {file ? 'Change file' : 'Choose file'}
                </Button>
                {file ? (
                  <span className="truncate text-sm text-muted-foreground">{file.name}</span>
                ) : existing?.fileName ? (
                  <span className="truncate text-sm text-muted-foreground">
                    Current: {existing.fileName}
                  </span>
                ) : null}
              </div>
              <FormDescription>PDF or image, up to 10 MB.</FormDescription>
              {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
