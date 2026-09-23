import { EmptyState } from '@/components/clerko/empty-state';
import { Field, NativeSelect } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { SellerJourney, sellerStepForStatus } from '@/components/clerko/seller-journey';
import { SellerPipelineTable } from '@/components/clerko/seller-pipeline-table';
import { StatusBadge } from '@/components/clerko/status-badge';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatBytes, formatDate, formatDateTime, formatPct, timeAgo, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type KycStatus, type PipelineRow, type Teaser } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CreditCard,
    ExternalLink,
    Eye,
    FileText,
    FolderLock,
    Loader2,
    MapPin,
    Pencil,
    Radio,
    Search,
    Send,
    ShieldAlert,
    Trash2,
    TrendingUp,
    Upload,
    Users,
    XCircle,
} from 'lucide-react';
import { type FormEventHandler, type ReactNode, useRef, useState } from 'react';

type ListingOptions = {
    sectors: Record<string, string>;
    employee_bands: Record<string, string>;
    locations: Record<string, string>;
    deal_preferences: Record<string, string>;
    document_categories: Record<string, string>;
};

type SellerListing = Teaser & {
    status: string;
    status_label: string;
    editable: boolean;
    company: { id: number; name: string | null; verification_status: string };
    submitted_at: string | null;
};

type Review = { decision: string; notes: string | null; created_at: string };

type ListingDocument = {
    id: number;
    title: string;
    category: string;
    visibility: 'pack' | 'staged';
    original_name: string;
    size: number;
    views: number;
};

type Props = {
    listing: SellerListing;
    subscription: { plan: string; ends_at: string } | null;
    reviews: Review[];
    documents: ListingDocument[];
    pipeline: PipelineRow[];
    options: ListingOptions;
    kycStatus: KycStatus;
};

type DocumentForm = {
    title: string;
    category: string;
    visibility: 'pack' | 'staged';
    file: File | null;
};

const decisions: Record<string, { label: string; tone: 'green' | 'purple' | 'red' }> = {
    approve: { label: 'Approved', tone: 'green' },
    revise: { label: 'Revision requested', tone: 'purple' },
    reject: { label: 'Rejected', tone: 'red' },
};

const kybLabels: Record<string, string> = {
    pending: 'KYB in review',
    verified: 'KYB verified',
    rejected: 'KYB rejected',
    unverified: 'KYB not started',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ListingShow({ listing, subscription, reviews, documents, pipeline, options, kycStatus }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Seller dashboard', href: route('seller.dashboard') },
        { title: listing.reference, href: route('seller.listings.show', listing.id) },
    ];

    const latestReview = reviews[0] ?? null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Listing ${listing.reference}`} />
            <PageBody>
                <SellerJourney current={sellerStepForStatus(listing.status)} />

                <PageHeader
                    eyebrow={
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono">{listing.reference}</span>
                            <StatusBadge status={listing.status} label={listing.status_label} />
                            {(subscription?.plan ?? listing.tier) && (
                                <StatusBadge tone="indigo" label={`${cap(subscription?.plan ?? listing.tier ?? '')} tier`} />
                            )}
                        </span>
                    }
                    title={listing.headline}
                    description={
                        subscription
                            ? `${cap(subscription.plan)} subscription active until ${formatDate(subscription.ends_at)}.`
                            : listing.submitted_at
                              ? `Submitted ${formatDateTime(listing.submitted_at)}.`
                              : undefined
                    }
                    actions={
                        listing.editable ? (
                            <Button asChild variant="outline">
                                <Link href={route('seller.listings.edit', listing.id)}>
                                    <Pencil /> Edit listing
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                {kycStatus !== 'verified' && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                            <div>
                                <div className="font-semibold">
                                    {kycStatus === 'pending'
                                        ? 'Identity verification in review'
                                        : kycStatus === 'rejected'
                                          ? 'Identity verification not approved'
                                          : 'Identity not verified yet'}
                                </div>
                                <p className="text-sm opacity-90">
                                    {kycStatus === 'pending'
                                        ? 'Your listing cannot go live until our compliance team has verified your identity.'
                                        : 'You need to verify your identity (KYC) before this listing can be submitted and go live.'}
                                </p>
                            </div>
                        </div>
                        {kycStatus !== 'pending' && (
                            <Button asChild size="sm" className="shrink-0">
                                <Link href={route('verification.show', { redirect: `/seller/listings/${listing.id}` })}>Verify identity</Link>
                            </Button>
                        )}
                    </div>
                )}

                <StatusPanel listing={listing} latestReview={latestReview} />

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="grid min-w-0 gap-6 lg:col-span-2">
                        <SectionCard
                            title="Teaser"
                            description="What every marketplace visitor sees. Anonymised."
                            actions={<StatusBadge tone="blue" label="Public" />}
                        >
                            <TeaserSummary listing={listing} />
                        </SectionCard>

                        <DocumentsManager listing={listing} documents={documents} categories={options.document_categories} />

                        <SectionCard title="Interest pipeline" description="Buyers who requested access to this listing." bodyClassName="p-2 sm:p-3">
                            <SellerPipelineTable
                                rows={pipeline}
                                showListing={false}
                                emptyDescription={
                                    listing.status === 'live'
                                        ? 'Your teaser is live. Buyers who request access will appear here, anonymised.'
                                        : 'Once your listing is live, buyers who request access will appear here, anonymised.'
                                }
                            />
                        </SectionCard>
                    </div>

                    <div className="grid content-start gap-6">
                        <SectionCard title="Company (KYB)">
                            <Link
                                href={route('seller.companies.show', listing.company.id)}
                                className="hover:bg-muted/50 -m-2 flex items-start gap-3 rounded-xl p-2 transition"
                            >
                                <div className="bg-brand-lavender text-primary flex size-10 shrink-0 items-center justify-center rounded-xl dark:bg-indigo-500/10">
                                    <Building2 className="size-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-foreground truncate font-semibold">
                                        {listing.company.name ?? `Company #${listing.company.id}`}
                                    </div>
                                    <div className="mt-1">
                                        <StatusBadge
                                            status={listing.company.verification_status}
                                            label={kybLabels[listing.company.verification_status] ?? listing.company.verification_status}
                                        />
                                    </div>
                                    <p className="text-muted-foreground mt-2 text-xs">Private. Only released to buyers after the NDA.</p>
                                </div>
                            </Link>
                        </SectionCard>

                        <SectionCard title="Performance">
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                                <Stat label="Teaser views" value={listing.views_count.toLocaleString('en-US')} />
                                <Stat label="Interested buyers" value={pipeline.length} />
                                <Stat label="Documents" value={documents.length} />
                                <Stat label="Published" value={listing.published_at ? formatDate(listing.published_at) : '—'} />
                            </dl>
                        </SectionCard>

                        <SectionCard title="Review history">
                            {reviews.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No reviews yet. After you submit, our team checks the listing for completeness and quality.
                                </p>
                            ) : (
                                <ol className="space-y-4">
                                    {reviews.map((r, i) => (
                                        <li key={i} className="border-l-2 pl-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusBadge
                                                    tone={decisions[r.decision]?.tone ?? 'slate'}
                                                    label={decisions[r.decision]?.label ?? titleCase(r.decision)}
                                                />
                                                <span className="text-muted-foreground text-xs" title={formatDateTime(r.created_at)}>
                                                    {timeAgo(r.created_at)}
                                                </span>
                                            </div>
                                            {r.notes && <p className="text-foreground mt-1.5 text-sm whitespace-pre-line">{r.notes}</p>}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </SectionCard>
                    </div>
                </div>
            </PageBody>
        </AppLayout>
    );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="bg-muted/60 rounded-xl p-3">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-brand-ink mt-0.5 font-bold dark:text-white">{value}</dd>
        </div>
    );
}

function Panel({
    tone,
    icon,
    title,
    children,
    actions,
}: {
    tone: 'amber' | 'purple' | 'green' | 'red' | 'indigo';
    icon: ReactNode;
    title: string;
    children: ReactNode;
    actions?: ReactNode;
}) {
    const tones = {
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        purple: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    };
    return (
        <section className="bg-card shadow-brand rounded-2xl border p-5 md:p-6" aria-label={title}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className={cn('flex size-14 shrink-0 items-center justify-center rounded-full', tones[tone])}>{icon}</div>
                <div className="flex-1 space-y-2">
                    <h2 className="text-brand-ink text-xl font-extrabold tracking-tight dark:text-white">{title}</h2>
                    <div className="text-muted-foreground space-y-3 text-sm">{children}</div>
                    {actions && <div className="flex flex-wrap gap-2 pt-2">{actions}</div>}
                </div>
            </div>
        </section>
    );
}

function StatusPanel({ listing, latestReview }: { listing: SellerListing; latestReview: Review | null }) {
    const [submitting, setSubmitting] = useState(false);

    switch (listing.status) {
        case 'draft':
        case 'awaiting_payment':
            return (
                <Panel
                    tone="indigo"
                    icon={<CreditCard className="size-6" aria-hidden="true" />}
                    title={listing.status === 'awaiting_payment' ? 'Complete your payment to submit' : 'Ready to submit? Choose your tier'}
                    actions={
                        <Button asChild className="bg-brand-gradient-green shadow-brand">
                            <Link href={route('seller.listings.tier', listing.id)}>
                                Choose tier & submit <ArrowRight />
                            </Link>
                        </Button>
                    }
                >
                    <p>
                        {listing.status === 'awaiting_payment'
                            ? 'Your tier payment has not been confirmed yet. Choose a tier again to restart checkout — the listing goes to admin review once payment is received.'
                            : 'Your listing is saved as a draft. Pick a subscription tier and pay monthly via Tap; the listing then goes to admin review. Nothing is public until it is approved.'}
                    </p>
                </Panel>
            );
        case 'pending_review':
            return (
                <Panel tone="amber" icon={<Search className="size-6" aria-hidden="true" />} title="Listing under admin review">
                    <p>
                        Our team is checking your listing for completeness and quality. We'll request any revisions in-platform — nothing goes live
                        until it's approved. We'll notify you as soon as there's a decision.
                    </p>
                    {listing.submitted_at && <p className="text-xs">Submitted {formatDateTime(listing.submitted_at)}</p>}
                </Panel>
            );
        case 'revision_requested':
            return (
                <Panel
                    tone="purple"
                    icon={<Pencil className="size-6" aria-hidden="true" />}
                    title="Revision requested"
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <Link href={route('seller.listings.edit', listing.id)}>
                                    <Pencil /> Edit listing
                                </Link>
                            </Button>
                            <Button
                                className="bg-brand-gradient-green shadow-brand"
                                disabled={submitting}
                                onClick={() =>
                                    router.post(
                                        route('seller.listings.submit', listing.id),
                                        {},
                                        { preserveScroll: true, onStart: () => setSubmitting(true), onFinish: () => setSubmitting(false) },
                                    )
                                }
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <Send />} Resubmit for review
                            </Button>
                        </>
                    }
                >
                    {latestReview?.notes && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100">
                            <div className="mb-1 text-xs font-bold tracking-wide uppercase">Notes from the Clerko review team</div>
                            <p className="text-sm whitespace-pre-line">{latestReview.notes}</p>
                        </div>
                    )}
                    <p>Update the listing or upload the requested documents, then resubmit. Your paid tier stays active.</p>
                </Panel>
            );
        case 'live':
            return (
                <Panel
                    tone="green"
                    icon={<Radio className="size-6" aria-hidden="true" />}
                    title="Your teaser is live"
                    actions={
                        <Button asChild variant="outline">
                            <Link href={route('marketplace.show', listing.reference)}>
                                <ExternalLink /> View public teaser
                            </Link>
                        </Button>
                    }
                >
                    <p>
                        Verified buyers can now discover your anonymised teaser, sign the NDA and unlock the Company Details Pack. Track them in the
                        pipeline below.
                    </p>
                </Panel>
            );
        case 'rejected':
            return (
                <Panel tone="red" icon={<XCircle className="size-6" aria-hidden="true" />} title="Listing not approved">
                    {latestReview?.notes ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
                            <div className="mb-1 text-xs font-bold tracking-wide uppercase">Reason</div>
                            <p className="text-sm whitespace-pre-line">{latestReview.notes}</p>
                        </div>
                    ) : null}
                    <p>If you have questions about this decision, please contact the Clerko compliance team.</p>
                </Panel>
            );
        case 'closed':
            return (
                <Panel tone="indigo" icon={<FolderLock className="size-6" aria-hidden="true" />} title="Listing closed">
                    <p>This listing is no longer visible on the marketplace.</p>
                </Panel>
            );
        default:
            return null;
    }
}

function TeaserSummary({ listing }: { listing: SellerListing }) {
    return (
        <div className="grid gap-5">
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">{listing.teaser_summary}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Asking price" value={formatBD(listing.asking_price)} />
                <Stat label="Revenue" value={formatBD(listing.annual_revenue)} />
                <Stat
                    label="Growth"
                    value={
                        <span
                            className={cn(
                                'inline-flex items-center gap-1',
                                listing.growth_pct !== null && listing.growth_pct > 0 && 'text-emerald-600',
                            )}
                        >
                            {listing.growth_pct !== null && <TrendingUp className="size-3.5" aria-hidden="true" />}
                            {formatPct(listing.growth_pct)}
                        </span>
                    }
                />
                <Stat label="Deal" value={listing.deal_preference_label} />
            </dl>
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="font-semibold tracking-wide uppercase">{listing.sector_label}</span>
                <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden="true" /> {listing.employees_label}
                </span>
                <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" /> {listing.location_label}
                </span>
                {listing.established_year && <span>Est. {listing.established_year}</span>}
            </div>
            {listing.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {listing.highlights.map((h) => (
                        <StatusBadge key={h} label={h} tone="indigo" />
                    ))}
                </div>
            )}
        </div>
    );
}

function DocumentsManager({
    listing,
    documents,
    categories,
}: {
    listing: SellerListing;
    documents: ListingDocument[];
    categories: Record<string, string>;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [deleting, setDeleting] = useState<number | null>(null);
    const { data, setData, post, processing, errors, reset, progress } = useForm<DocumentForm>({
        title: '',
        category: '',
        visibility: 'pack',
        file: null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('seller.listings.documents.store', listing.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                if (fileRef.current) {
                    fileRef.current.value = '';
                }
            },
        });
    };

    const destroy = (doc: ListingDocument) => {
        if (!window.confirm(`Delete “${doc.title}”? This cannot be undone.`)) {
            return;
        }
        router.delete(route('seller.listings.documents.destroy', [listing.id, doc.id]), {
            preserveScroll: true,
            onStart: () => setDeleting(doc.id),
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <SectionCard title="Documents" description="Supporting documents for buyers. Every view is logged and watermarked to the buyer.">
            <div className="grid gap-6">
                {documents.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="No documents yet"
                        description="Upload financials, corporate records and contracts. Choose whether each is part of the Details Pack or staged for a Deal Room."
                    />
                ) : (
                    <ul className="divide-y rounded-xl border">
                        {documents.map((doc) => (
                            <li key={doc.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                                        <FileText className="size-5" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <div className="text-foreground truncate font-semibold">{doc.title}</div>
                                        <div className="text-muted-foreground truncate text-xs">
                                            {categories[doc.category] ?? titleCase(doc.category)} · {doc.original_name} · {formatBytes(doc.size)}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {doc.visibility === 'pack' ? (
                                                <StatusBadge tone="indigo" label="Details Pack" />
                                            ) : (
                                                <StatusBadge tone="purple" label="Staged — released per deal room" />
                                            )}
                                            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                                <Eye className="size-3.5" aria-hidden="true" /> {doc.views} {doc.views === 1 ? 'view' : 'views'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <a href={route('seller.listings.documents.show', [listing.id, doc.id])} target="_blank" rel="noopener">
                                            <ExternalLink /> View
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                                        onClick={() => destroy(doc)}
                                        disabled={deleting === doc.id || doc.views > 0}
                                        title={doc.views > 0 ? 'Documents that buyers have accessed cannot be deleted' : undefined}
                                        aria-label={`Delete ${doc.title}`}
                                    >
                                        {deleting === doc.id ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <form onSubmit={submit} noValidate className="bg-muted/40 grid gap-4 rounded-xl border p-4">
                    <div className="text-brand-ink flex items-center gap-2 font-bold dark:text-white">
                        <Upload className="size-4" aria-hidden="true" /> Upload a document
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Title" htmlFor="doc-title" error={errors.title}>
                            <Input
                                id="doc-title"
                                value={data.title}
                                maxLength={150}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder="e.g. Audited financials 2024"
                                required
                            />
                        </Field>
                        <Field label="Category" htmlFor="doc-category" error={errors.category}>
                            <NativeSelect
                                id="doc-category"
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                options={categories}
                                placeholder="Select category"
                                required
                            />
                        </Field>
                    </div>
                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-sm font-medium">Who can see it</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <VisibilityOption
                                value="pack"
                                checked={data.visibility === 'pack'}
                                onChange={() => setData('visibility', 'pack')}
                                title="Details Pack"
                                description="Released automatically to every buyer who signs the NDA and unlocks the pack."
                            />
                            <VisibilityOption
                                value="staged"
                                checked={data.visibility === 'staged'}
                                onChange={() => setData('visibility', 'staged')}
                                title="Staged"
                                description="Kept back. You release it to a specific buyer inside their Deal Room."
                            />
                        </div>
                        <InputError message={errors.visibility} />
                    </fieldset>
                    <Field label="File" htmlFor="doc-file" error={errors.file} hint="PDF, Excel, CSV, Word, PowerPoint or images, up to 20 MB.">
                        <Input
                            id="doc-file"
                            ref={fileRef}
                            type="file"
                            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.jpg,.jpeg,.png"
                            onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                            required
                        />
                    </Field>
                    {progress && (
                        <div
                            className="bg-muted h-2 overflow-hidden rounded-full"
                            role="progressbar"
                            aria-valuenow={progress.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div className="bg-brand-gradient h-full transition-all" style={{ width: `${progress.percentage ?? 0}%` }} />
                        </div>
                    )}
                    <div>
                        <Button type="submit" disabled={processing}>
                            {processing ? <Loader2 className="animate-spin" /> : <Upload />} Upload document
                        </Button>
                    </div>
                </form>
                {listing.status !== 'live' && (
                    <p className="text-muted-foreground flex items-start gap-2 text-xs">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> Buyers can only access documents once the listing is
                        live and they have signed the NDA.
                    </p>
                )}
            </div>
        </SectionCard>
    );
}

function VisibilityOption({
    value,
    checked,
    onChange,
    title,
    description,
}: {
    value: string;
    checked: boolean;
    onChange: () => void;
    title: string;
    description: string;
}) {
    return (
        <label
            className={cn(
                'focus-within:ring-ring flex cursor-pointer gap-3 rounded-xl border p-3 transition focus-within:ring-2',
                checked ? 'border-primary bg-brand-lavender dark:bg-indigo-500/10' : 'bg-background hover:bg-muted/50',
            )}
        >
            <input type="radio" name="visibility" value={value} checked={checked} onChange={onChange} className="accent-primary mt-1" />
            <span>
                <span className="text-foreground block text-sm font-semibold">{title}</span>
                <span className="text-muted-foreground block text-xs">{description}</span>
            </span>
        </label>
    );
}
