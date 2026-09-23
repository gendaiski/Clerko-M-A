import { KybTick } from '@/components/clerko/admin-listing-table';
import { DecisionRadioGroup, DetailList, type DecisionOption } from '@/components/clerko/admin-ui';
import { DataTable } from '@/components/clerko/data-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { Field, Textarea } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatDate, formatDateTime, formatPct, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Check, type Teaser } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, FileText, History, PencilLine, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { type FormEventHandler, type ReactNode } from 'react';

type ListingDetail = Teaser & {
    company_overview: string | null;
    financial_summary: string | null;
    valuation_summary: string | null;
    valuation_methods: { method: string; value: number | string }[] | null;
    financial_history: { year: number; revenue: number | string; ebitda: number | string | null }[] | null;
    legal_findings: Check[] | null;
    court_debt_checks: Check[] | null;
    ebitda: number | null;
    valuation_low: number | null;
    valuation_high: number | null;
    status: string;
    status_label: string;
    submitted_at: string | null;
};

type Props = {
    listing: ListingDetail;
    company: { id: number; name: string | null; cr_number: string | null; verification_status: string };
    seller: { name: string; email: string; kyc_status: string; kyc_submission_id: number | null };
    documents: { id: number; title: string; category: string; visibility: string; original_name: string }[];
    reviews: { decision: string; notes: string | null; admin: string; created_at: string }[];
};

type ReviewForm = {
    decision: '' | 'approve' | 'revise' | 'reject';
    notes: string;
    featured: boolean;
};

const DECISIONS: DecisionOption[] = [
    {
        value: 'approve',
        label: 'Approve & publish',
        description: 'The teaser goes live and matching buyers are notified.',
        icon: CheckCircle2,
        tone: 'green',
    },
    {
        value: 'revise',
        label: 'Request revision',
        description: 'Send it back to the seller with notes on what to fix.',
        icon: PencilLine,
        tone: 'amber',
    },
    { value: 'reject', label: 'Reject', description: 'The listing will not be published.', icon: XCircle, tone: 'red' },
];

const REVIEW_LABELS: Record<string, { label: string; tone: 'green' | 'purple' | 'red' }> = {
    approve: { label: 'Approved', tone: 'green' },
    revise: { label: 'Revision requested', tone: 'purple' },
    reject: { label: 'Rejected', tone: 'red' },
};

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v));

function Prose({ text }: { text: string | null }) {
    if (!text) {
        return <p className="text-muted-foreground text-sm italic">Not provided.</p>;
    }
    return <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>;
}

function CheckList({ items }: { items: Check[] | null }) {
    if (!items || items.length === 0) {
        return <p className="text-muted-foreground text-sm italic">None recorded.</p>;
    }
    return (
        <ul className="grid gap-2">
            {items.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                    {c.status === 'ok' ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="OK" />
                    ) : (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Warning" />
                    )}
                    <span>{c.text}</span>
                </li>
            ))}
        </ul>
    );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="bg-muted rounded-xl p-3">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-0.5 font-bold">{value}</div>
        </div>
    );
}

function ReadinessItem({ ok, title, children, action }: { ok: boolean; title: string; children?: ReactNode; action?: ReactNode }) {
    return (
        <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            {ok ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                    {title} <span className="sr-only">{ok ? '(passed)' : '(needs attention)'}</span>
                </div>
                {children && <div className="text-muted-foreground mt-0.5 text-xs">{children}</div>}
                {action && <div className="mt-1.5">{action}</div>}
            </div>
        </li>
    );
}

export default function AdminListingShow({ listing, company, seller, documents, reviews }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Listing moderation', href: route('admin.listings.index') },
        { title: listing.reference, href: route('admin.listings.show', listing.id) },
    ];

    const kycOk = seller.kyc_status === 'verified';
    const kybOk = company.verification_status === 'verified';
    const hasFinancials = (listing.financial_history?.length ?? 0) > 0;
    const hasOverview = Boolean(listing.company_overview);
    const canReview = listing.status === 'pending_review';

    const { data, setData, post, processing, errors } = useForm<ReviewForm>({ decision: '', notes: '', featured: listing.featured });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.listings.review', listing.id), { preserveScroll: true });
    };

    const submitLabel =
        data.decision === 'approve'
            ? 'Approve & publish'
            : data.decision === 'revise'
              ? 'Send revision request'
              : data.decision === 'reject'
                ? 'Reject listing'
                : 'Record decision';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Review ${listing.reference}`} />
            <PageBody>
                <PageHeader
                    eyebrow={<span className="font-mono">{listing.reference}</span>}
                    title={listing.headline || 'Untitled listing'}
                    description={
                        <>
                            {listing.sector_label} · {listing.location_label} · {listing.tier ? `${titleCase(listing.tier)} tier` : 'No tier'}
                            {listing.submitted_at && <> · submitted {formatDateTime(listing.submitted_at)}</>}
                        </>
                    }
                    actions={
                        <>
                            {listing.featured && <StatusBadge label="Featured" tone="purple" />}
                            <StatusBadge status={listing.status} label={listing.status_label} className="px-3 py-1 text-sm" />
                        </>
                    }
                />

                <div className="grid items-start gap-6 lg:grid-cols-3">
                    {/* Main column: what buyers will see */}
                    <div className="grid min-w-0 gap-6 lg:col-span-2">
                        <SectionCard
                            title="Anonymised teaser"
                            description="Public on the marketplace once approved. Check nothing identifies the company."
                        >
                            <div className="grid gap-5">
                                <Prose text={listing.teaser_summary} />
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <Metric label="Asking price" value={formatBD(listing.asking_price)} />
                                    <Metric label="Annual revenue" value={formatBD(listing.annual_revenue)} />
                                    <Metric label="Growth" value={formatPct(listing.growth_pct)} />
                                    <Metric label="Employees" value={listing.employees_label} />
                                    <Metric label="Established" value={listing.established_year ?? '—'} />
                                    <Metric label="Deal type" value={listing.deal_preference_label} />
                                    <Metric label="Location" value={listing.location_label} />
                                    <Metric label="Sector" value={listing.sector_label} />
                                </div>
                                {listing.highlights.length > 0 && (
                                    <div>
                                        <div className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">Highlights</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {listing.highlights.map((h) => (
                                                <StatusBadge key={h} label={h} tone="indigo" />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard title="Details pack" description="Released to buyers after NDA and unlock.">
                            <div className="grid gap-6">
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-1.5 text-sm font-semibold">Company overview</h3>
                                        <Prose text={listing.company_overview} />
                                    </div>
                                    <div>
                                        <h3 className="mb-1.5 text-sm font-semibold">Financial summary</h3>
                                        <Prose text={listing.financial_summary} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                    <Metric label="EBITDA" value={formatBD(listing.ebitda)} />
                                    <Metric
                                        label="Valuation range"
                                        value={
                                            listing.valuation_low !== null || listing.valuation_high !== null
                                                ? `${formatBD(listing.valuation_low)} – ${formatBD(listing.valuation_high)}`
                                                : '—'
                                        }
                                    />
                                    <Metric label="Asking price" value={formatBD(listing.asking_price)} />
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-1.5 text-sm font-semibold">Financial history</h3>
                                        {hasFinancials ? (
                                            <div className="overflow-x-auto rounded-xl border">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/60 text-muted-foreground text-xs uppercase">
                                                        <tr>
                                                            <th scope="col" className="px-3 py-2 text-left font-semibold">
                                                                Year
                                                            </th>
                                                            <th scope="col" className="px-3 py-2 text-right font-semibold">
                                                                Revenue
                                                            </th>
                                                            <th scope="col" className="px-3 py-2 text-right font-semibold">
                                                                EBITDA
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {listing.financial_history!.map((row) => (
                                                            <tr key={row.year} className="border-t">
                                                                <th scope="row" className="px-3 py-2 text-left font-medium">
                                                                    {row.year}
                                                                </th>
                                                                <td className="px-3 py-2 text-right tabular-nums">
                                                                    {formatBD(num(row.revenue), { compact: false })}
                                                                </td>
                                                                <td className="px-3 py-2 text-right tabular-nums">
                                                                    {formatBD(num(row.ebitda), { compact: false })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground text-sm italic">Not provided.</p>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="mb-1.5 text-sm font-semibold">Valuation</h3>
                                        <Prose text={listing.valuation_summary} />
                                        {listing.valuation_methods && listing.valuation_methods.length > 0 && (
                                            <ul className="mt-3 divide-y rounded-xl border text-sm">
                                                {listing.valuation_methods.map((m, i) => (
                                                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                                                        <span>{m.method}</span>
                                                        <span className="font-semibold tabular-nums">{formatBD(num(m.value))}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold">Legal findings</h3>
                                        <CheckList items={listing.legal_findings} />
                                    </div>
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold">Court &amp; debt checks</h3>
                                        <CheckList items={listing.court_debt_checks} />
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Documents" description={`${documents.length} uploaded by the seller`} bodyClassName="p-2 sm:p-3">
                            <DataTable
                                rows={documents}
                                rowKey={(d) => d.id}
                                empty={
                                    <EmptyState
                                        icon={FileText}
                                        title="No documents uploaded"
                                        description="The details pack has no supporting documents yet."
                                        className="m-3"
                                    />
                                }
                                columns={[
                                    {
                                        header: 'Document',
                                        cell: (d) => (
                                            <div className="flex items-start gap-2">
                                                <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                                <div className="min-w-0">
                                                    <a
                                                        href={route('admin.listings.documents.show', [listing.id, d.id])}
                                                        target="_blank"
                                                        rel="noopener"
                                                        className="text-primary font-medium hover:underline"
                                                    >
                                                        {d.title}
                                                    </a>
                                                    <div className="text-muted-foreground truncate text-xs">{d.original_name}</div>
                                                </div>
                                            </div>
                                        ),
                                    },
                                    { header: 'Category', cell: (d) => titleCase(d.category) },
                                    {
                                        header: 'Visibility',
                                        cell: (d) =>
                                            d.visibility === 'staged' ? (
                                                <StatusBadge label="Staged · deal room" tone="purple" />
                                            ) : (
                                                <StatusBadge label="In details pack" tone="indigo" />
                                            ),
                                    },
                                ]}
                            />
                        </SectionCard>

                        <SectionCard title="Review history">
                            {reviews.length === 0 ? (
                                <EmptyState icon={History} title="First review" description="No earlier decisions on this listing." />
                            ) : (
                                <ol className="relative grid gap-5 border-l pl-5">
                                    {reviews.map((r, i) => {
                                        const meta = REVIEW_LABELS[r.decision] ?? { label: titleCase(r.decision), tone: 'purple' as const };
                                        return (
                                            <li key={i} className="relative">
                                                <span
                                                    className="bg-primary ring-background absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4"
                                                    aria-hidden="true"
                                                />
                                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                                    <StatusBadge label={meta.label} tone={meta.tone} />
                                                    <span className="font-medium">{r.admin}</span>
                                                    <time dateTime={r.created_at} className="text-muted-foreground text-xs">
                                                        {formatDateTime(r.created_at)}
                                                    </time>
                                                </div>
                                                {r.notes && <p className="bg-muted mt-2 rounded-xl p-3 text-sm whitespace-pre-line">{r.notes}</p>}
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </SectionCard>
                    </div>

                    {/* Side column: readiness + decision */}
                    <div className="grid min-w-0 gap-6 lg:sticky lg:top-4">
                        <SectionCard title="Readiness checklist" description="Approval is blocked until both identity checks pass.">
                            <ul className="divide-y">
                                <ReadinessItem
                                    ok={kycOk}
                                    title="Seller identity (KYC) verified"
                                    action={
                                        seller.kyc_submission_id ? (
                                            <Link
                                                href={route('admin.kyc.show', seller.kyc_submission_id)}
                                                className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                                            >
                                                {kycOk ? 'View KYC submission' : 'Review KYC submission'}{' '}
                                                <ArrowRight className="size-3" aria-hidden="true" />
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-amber-700 dark:text-amber-400">
                                                Seller has not submitted ID documents yet.
                                            </span>
                                        )
                                    }
                                >
                                    {seller.name} · {seller.email} · <StatusBadge status={seller.kyc_status} className="align-middle" />
                                </ReadinessItem>
                                <ReadinessItem
                                    ok={kybOk}
                                    title="Company (KYB) verified"
                                    action={
                                        <Link
                                            href={route('admin.companies.show', company.id)}
                                            className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                                        >
                                            {kybOk ? 'View company profile' : 'Verify company'} <ArrowRight className="size-3" aria-hidden="true" />
                                        </Link>
                                    }
                                >
                                    {company.name ?? 'Unnamed company'} · CR <span className="font-mono">{company.cr_number ?? '—'}</span> ·{' '}
                                    <StatusBadge status={company.verification_status} className="align-middle" />
                                </ReadinessItem>
                                <ReadinessItem ok={hasOverview} title="Company overview written">
                                    {hasOverview ? 'Present in the details pack.' : 'Missing — consider requesting a revision.'}
                                </ReadinessItem>
                                <ReadinessItem ok={hasFinancials} title="Financial history provided">
                                    {hasFinancials ? `${listing.financial_history!.length} year(s) of figures.` : 'Missing financials.'}
                                </ReadinessItem>
                                <ReadinessItem ok={documents.length > 0} title="Supporting documents">
                                    {documents.length > 0 ? `${documents.length} document(s) uploaded.` : 'No documents uploaded.'}
                                </ReadinessItem>
                            </ul>
                        </SectionCard>

                        <SectionCard title="Decision" className={cn(canReview && 'ring-primary/20 ring-2')}>
                            {canReview ? (
                                <form onSubmit={submit} className="grid gap-4" noValidate>
                                    {errors.decision && (
                                        <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-500/10">
                                            <AlertTriangle className="size-4" />
                                            <AlertTitle>Cannot record this decision</AlertTitle>
                                            <AlertDescription>{errors.decision}</AlertDescription>
                                        </Alert>
                                    )}

                                    <DecisionRadioGroup
                                        name="decision"
                                        legend="Outcome"
                                        options={DECISIONS}
                                        value={data.decision}
                                        onChange={(v) => setData('decision', v as ReviewForm['decision'])}
                                        invalid={Boolean(errors.decision)}
                                    />

                                    {data.decision === 'approve' && (!kycOk || !kybOk) && (
                                        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                                            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                            Approval will be refused: {!kycOk && 'seller KYC'}
                                            {!kycOk && !kybOk && ' and '}
                                            {!kybOk && 'company KYB'} not yet verified.
                                        </p>
                                    )}

                                    {data.decision === 'approve' && (
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="featured"
                                                checked={data.featured}
                                                onCheckedChange={(v) => setData('featured', v === true)}
                                            />
                                            <div className="grid gap-0.5">
                                                <Label htmlFor="featured" className="inline-flex items-center gap-1.5">
                                                    <Sparkles className="size-3.5 text-violet-600" aria-hidden="true" /> Feature on marketplace
                                                </Label>
                                                <span className="text-muted-foreground text-xs">Shown in the featured strip on the marketplace.</span>
                                            </div>
                                        </div>
                                    )}

                                    <Field
                                        label={
                                            data.decision === 'approve' || data.decision === ''
                                                ? 'Notes to seller (optional)'
                                                : 'Notes to seller (required)'
                                        }
                                        htmlFor="notes"
                                        error={errors.notes}
                                        hint={
                                            data.decision === 'revise'
                                                ? 'Be specific: what to change and where.'
                                                : 'Sent to the seller with the decision.'
                                        }
                                    >
                                        <Textarea
                                            id="notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            required={data.decision === 'revise' || data.decision === 'reject'}
                                            maxLength={3000}
                                            rows={5}
                                            aria-invalid={Boolean(errors.notes) || undefined}
                                        />
                                    </Field>

                                    <Button
                                        type="submit"
                                        disabled={
                                            processing ||
                                            data.decision === '' ||
                                            ((data.decision === 'revise' || data.decision === 'reject') && data.notes.trim() === '')
                                        }
                                        variant={data.decision === 'reject' ? 'destructive' : 'default'}
                                        className={cn(
                                            data.decision === 'approve' && 'bg-brand-gradient-green',
                                            data.decision !== 'reject' && data.decision !== 'approve' && 'bg-brand-gradient shadow-brand',
                                        )}
                                    >
                                        {processing ? 'Saving…' : submitLabel}
                                    </Button>
                                </form>
                            ) : (
                                <div className="grid gap-2 text-sm">
                                    <p>
                                        This listing is <StatusBadge status={listing.status} label={listing.status_label} className="align-middle" />.
                                        Only listings under admin review can be decided.
                                    </p>
                                    {listing.published_at && <p className="text-muted-foreground">Published {formatDate(listing.published_at)}.</p>}
                                </div>
                            )}
                        </SectionCard>

                        <SectionCard title="Company">
                            <DetailList
                                items={[
                                    { term: 'Legal name', value: company.name ?? '—' },
                                    { term: 'CR number', value: <span className="font-mono">{company.cr_number ?? '—'}</span> },
                                    { term: 'KYB', value: <KybTick verified={kybOk} /> },
                                    { term: 'Views', value: listing.views_count.toLocaleString('en-US') },
                                ]}
                            />
                        </SectionCard>
                    </div>
                </div>
            </PageBody>
        </AppLayout>
    );
}
