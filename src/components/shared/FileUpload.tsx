import { useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
  label?: string;
  onSelect: (file: File) => void | Promise<void>;
  className?: string;
};

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Thin wrapper over <input type="file">. Validates client-side size + MIME;
 * the storage bucket should also enforce limits.
 */
export function FileUpload({
  accept = 'image/*,application/pdf',
  maxBytes = DEFAULT_MAX_BYTES,
  disabled = false,
  label = 'Upload file',
  onSelect,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxBytes) {
      setError(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
      e.target.value = '';
      return;
    }

    setBusy(true);
    try {
      await onSelect(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled || busy}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
