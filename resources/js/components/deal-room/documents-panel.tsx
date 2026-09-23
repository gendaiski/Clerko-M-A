import { Field, NativeSelect } from '@/components/clerko/field';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/format';
import { router, useForm } from '@inertiajs/react';
import { Download, Eye, FileText, Lock, Send } from 'lucide-react';
import { type FormEvent } from 'react';
import { type Party, type RoomDocument } from './types';

interface Props {
    roomId: number;
    documents: { pack: RoomDocument[]; released: RoomDocument[]; staged: RoomDocument[] };
    categories: Record<string, string>;
    viewer: Party | null;
    canAct: boolean;
}

export function DocumentsPanel({ roomId, documents, categories, viewer, canAct }: Props) {
    const isSeller = viewer === 'seller';

    return (
        <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
                Every document opened here is watermarked to the viewer and logged. The seller decides when staged documents are released to this
                buyer.
            </p>

            <DocumentGroup
                title="Released in this deal room"
                documents={documents.released}
                roomId={roomId}
                empty="No documents released in this deal room yet."
            />

            {isSeller && (
                <DocumentGroup
                    title="Staged — not yet released to this buyer"
                    documents={documents.staged}
                    roomId={roomId}
                    empty="No staged documents. Documents marked “staged” on your listing appear here for release."
                    renderAction={
                        canAct
                            ? (doc) => (
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                          router.post(route('deal-rooms.documents.release', [roomId, doc.id]), {}, { preserveScroll: true })
                                      }
                                  >
                                      <Send /> Release
                                  </Button>
                              )
                            : undefined
                    }
                />
            )}

            <DocumentGroup
                title="Company Details Pack"
                documents={documents.pack}
                roomId={roomId}
                empty="The Details Pack has no supporting documents."
            />

            {isSeller && canAct && <UploadForm roomId={roomId} categories={categories} />}
        </div>
    );
}

function DocumentGroup({
    title,
    documents,
    roomId,
    empty,
    renderAction,
}: {
    title: string;
    documents: RoomDocument[];
    roomId: number;
    empty: string;
    renderAction?: (doc: RoomDocument) => React.ReactNode;
}) {
    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold">{title}</h3>
            {documents.length === 0 ? (
                <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-sm">{empty}</p>
            ) : (
                <ul className="divide-y rounded-2xl border">
                    {documents.map((doc) => (
                        <li key={`${doc.source}-${doc.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <FileText className="text-primary size-5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{doc.title}</div>
                                <div className="text-muted-foreground text-xs">
                                    {doc.category}
                                    {doc.released_at && ` · released ${formatDate(doc.released_at)}`}
                                </div>
                            </div>
                            {doc.source === 'staged' ? (
                                <StatusBadge label="Staged" tone="amber" />
                            ) : (
                                <StatusBadge
                                    label={doc.source === 'released' ? 'Released' : 'Details Pack'}
                                    tone={doc.source === 'released' ? 'green' : 'indigo'}
                                />
                            )}
                            <div className="flex gap-1">
                                <Button asChild size="sm" variant="ghost">
                                    <a href={route('deal-rooms.documents.show', [roomId, doc.id])} target="_blank" rel="noopener">
                                        <Eye /> View
                                    </a>
                                </Button>
                                {doc.is_pdf && (
                                    <Button asChild size="sm" variant="ghost">
                                        <a
                                            href={route('deal-rooms.documents.show', { dealRoom: roomId, document: doc.id, download: 1 })}
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            <Download /> <span className="sr-only sm:not-sr-only">Download</span>
                                        </a>
                                    </Button>
                                )}
                                {renderAction?.(doc)}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

type UploadForm = { title: string; category: string; file: File | null };

function UploadForm({ roomId, categories }: { roomId: number; categories: Record<string, string> }) {
    const form = useForm<UploadForm>({ title: '', category: 'financials', file: null });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('deal-rooms.documents.upload', roomId), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={submit} className="bg-muted/40 space-y-3 rounded-2xl border p-4">
            <div className="flex items-center gap-2 font-semibold">
                <Lock className="text-primary size-4" /> Upload and release a document to this buyer only
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Title" htmlFor="doc-title" error={form.errors.title}>
                    <Input id="doc-title" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} required maxLength={150} />
                </Field>
                <Field label="Category" htmlFor="doc-category" error={form.errors.category}>
                    <NativeSelect
                        id="doc-category"
                        options={categories}
                        value={form.data.category}
                        onChange={(e) => form.setData('category', e.target.value)}
                    />
                </Field>
                <Field label="File" htmlFor="doc-file" error={form.errors.file}>
                    <Input id="doc-file" type="file" onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)} required />
                </Field>
            </div>
            <Button type="submit" disabled={form.processing || !form.data.file} className="bg-brand-gradient shadow-brand">
                Upload &amp; release
            </Button>
        </form>
    );
}
