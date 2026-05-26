import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FileUpload } from '@/components/shared/FileUpload';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatDateTime, formatGstin } from '@/lib/format';
import { mapSupabaseError } from '@/lib/errors';
import {
  useCorporate,
  useCorporateUsers,
  useDeleteKycDoc,
  useKycDocs,
  useSetCorporateStatus,
  useUploadKycDoc,
} from '@/features/corporates/hooks';
import { getKycSignedUrl } from '@/features/corporates/api';
import { InviteUserDialog } from './InviteUserDialog';

const KYC_DOC_TYPES = [
  { value: 'gst_certificate', label: 'GST certificate' },
  { value: 'pan_card', label: 'PAN card' },
  { value: 'incorporation', label: 'Certificate of incorporation' },
  { value: 'address_proof', label: 'Address proof' },
  { value: 'other', label: 'Other' },
] as const;

export function CorporateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [kycDocType, setKycDocType] = useState<string>(KYC_DOC_TYPES[0].value);

  const detail = useCorporate(id);
  const setStatus = useSetCorporateStatus();
  const users = useCorporateUsers(id ?? '');
  const kyc = useKycDocs(id ?? '');
  const upload = useUploadKycDoc(id ?? '');
  const del = useDeleteKycDoc(id ?? '');

  if (!id) return <Navigate to="/admin/corporates" replace />;

  if (detail.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;
  }

  const c = detail.data;
  const newStatus: 'active' | 'inactive' = c.status === 'active' ? 'inactive' : 'active';

  function toggleStatus() {
    setStatus.mutate(
      { id: c.id, status: newStatus },
      {
        onSuccess: () => toast.success(`Marked ${newStatus}.`),
        onError: (e) => toast.error(mapSupabaseError(e)),
      },
    );
  }

  async function handleDownload(filePath: string) {
    try {
      const url = await getKycSignedUrl(filePath);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error(mapSupabaseError(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.legalName}
        description={c.displayName ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/admin/corporates">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" onClick={toggleStatus} disabled={setStatus.isPending}>
              {setStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Mark {newStatus}
            </Button>
            <Button asChild>
              <Link to={`/admin/corporates/${c.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ----- Overview ----- */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Identity and contact information.</CardDescription>
            </div>
            <StatusBadge status={c.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="GSTIN" value={c.gstin ? formatGstin(c.gstin) : null} mono />
              <Detail label="PAN" value={c.pan} mono />
              <Detail label="State code" value={c.stateCode} />
              <Detail label="Added" value={formatDate(c.createdAt)} />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Contact name" value={c.primaryContactName} />
              <Detail label="Contact email" value={c.primaryContactEmail} />
              <Detail label="Contact phone" value={c.primaryContactPhone} />
            </div>
            {(c.billingAddress.line1 || c.billingAddress.city) && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Billing address
                  </p>
                  <p className="text-sm">
                    {[
                      c.billingAddress.line1,
                      c.billingAddress.line2,
                      c.billingAddress.city,
                      c.billingAddress.state,
                      c.billingAddress.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </>
            )}
            {c.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="whitespace-pre-line text-sm">{c.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ----- Users ----- */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Corporate admins under this account.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          </CardHeader>
          <CardContent>
            {users.isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : users.isError ? (
              <ErrorState error={users.error} onRetry={() => void users.refetch()} />
            ) : users.data.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="No users yet"
                description="Invite the first user to give them access."
                action={
                  <Button size="sm" onClick={() => setInviteOpen(true)}>
                    Invite user
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {users.data.map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.fullName}</p>
                      {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {u.mustChangePassword && (
                        <Badge variant="warning">First sign-in pending</Badge>
                      )}
                      {!u.isActive && <Badge variant="muted">Inactive</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ----- KYC documents ----- */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>KYC documents</CardTitle>
            <CardDescription>PDF or image, up to 10 MB each.</CardDescription>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Document type</label>
              <Select
                className="w-48"
                value={kycDocType}
                onChange={(e) => setKycDocType(e.target.value)}
                disabled={upload.isPending}
              >
                {KYC_DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <FileUpload
              label="Upload"
              accept="application/pdf,image/*"
              onSelect={(file) =>
                upload.mutateAsync({ docType: kycDocType, file }).then(() => {
                  toast.success('Document uploaded.');
                })
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {kyc.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : kyc.isError ? (
            <ErrorState error={kyc.error} onRetry={() => void kyc.refetch()} />
          ) : kyc.data.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No documents yet"
              description="Upload the corporate's KYC documents above."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kyc.data.map((doc) => {
                  const label =
                    KYC_DOC_TYPES.find((t) => t.value === doc.docType)?.label ?? doc.docType;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>
                        <span className="text-sm">{doc.fileName ?? '—'}</span>
                        {doc.sizeBytes !== null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {(doc.sizeBytes / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(doc.uploadedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDownload(doc.filePath)}
                            aria-label="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              del.mutate(doc, {
                                onSuccess: () => toast.success('Document removed.'),
                                onError: (e) => toast.error(mapSupabaseError(e)),
                              })
                            }
                            disabled={del.isPending}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog
        corporateId={c.id}
        corporateName={c.legalName}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono text-sm' : 'text-sm'}>{value ?? '—'}</p>
    </div>
  );
}
