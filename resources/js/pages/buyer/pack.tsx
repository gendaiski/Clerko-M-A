import { BuyerJourney } from '@/components/clerko/buyer-journey';
import { DataTable } from '@/components/clerko/data-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Tabs } from '@/components/clerko/tabs';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatBytes, formatDate, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Check, type Teaser } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CircleCheck, Download, ExternalLink, FileText, Fingerprint, LoaderCircle, TriangleAlert } from 'lucide-react';
import { type ReactNode, useState } from 'react';

type ValuationMethod = { method: string; value: number | string };
type HistoryRow = { year: number; revenue: number | string; ebitda: number | string | null };

type PackListing = Teaser & {
    ebitda: number | null;
    company_overview: string | null;
    financial_summary: string | null;
    valuation_low: number | null;
    valuation_high: number | null;
    valuation_summary: string | null;
    valuation_methods: ValuationMethod[];
    financial_history: HistoryRow[];
    legal_findings: Check[];
    court_debt_checks: Check[];
};

type Company = {
    name_en: string;
    name_ar: string | null;
    cr_number: string | null;
    legal_form: string | null;
    cr_status: string | null;
    registration_date: string | null;
    expiry_date: string | null;
    capital: number | null;
    address: string | null;
    /** Sijilat business activities: usually `{ isic4_code, activity }` objects, sometimes plain strings. */
    activities: unknown[];
    verified: boolean;
};

type PackDocument = {
    id: number;
    title: string;
    category: string;
    is_pdf: boolean;
    size: number;
};

type Props = {
    engagement: { id: number; stage: string; deal_room_id: number | null };
    viewer: string;
    listing: PackListing;
    company: Company;
    documents: PackDocument[];
};

type TabKey = 'overview' | 'valuation' | 'financials' | 'legal' | 'checks' | 'documents';

const num = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

function activityLabel(activity: unknown): string {
    if (typeof activity === 'string') return activity;
    if (activity && typeof activity === 'object') {
        const a = activity as Record<string, unknown>;
        const name = a.activity ?? a.name ?? a.description;
        const code = a.isic4_code ?? a.code;
        if (typeof name === 'string') return code ? `${name} (${String(code)})` : name;
        return Object.values(a)
            .filter((v) => typeof v === 'string' || typeof v === 'number')
            .join(' · ');
    }
    return String(activity ?? '');
}

export default function BuyerPack({ engagement, viewer, listing, company, documents }: Props) {
    const [tab, setTab] = useState<TabKey>('overview');
    const [opening, setOpening] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Buyer dashboard', href: route('buyer.dashboard') },
        { title: company.name_en, href: route('engagements.pack', engagement.id) },
        { title: 'Details Pack', href: route('engagements.pack', engagement.id) },
    ];

    const warnings = (checks: Check[]) => checks.filter((c) => c.status === 'warning').length;

    const tabs: { key: TabKey; label: string; count?: number }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'valuation', label: 'Valuation' },
        { key: 'financials', label: 'Financials' },
        { key: 'legal', label: 'Legal', count: warnings(listing.legal_findings) },
        { key: 'checks', label: 'Court / Debt checks', count: warnings(listing.court_debt_checks) },
        { key: 'documents', label: 'Documents', count: documents.length },
    ];

    const openDealRoom = () => {
        router.post(route('engagements.deal-room', engagement.id), {}, { onStart: () => setOpening(true), onFinish: () => setOpening(false) });
    };

    const dealRoomCta = engagement.deal_room_id ? (
        <Button asChild className="bg-brand-gradient shadow-brand">
            <Link href={route('deal-rooms.show', engagement.deal_room_id)}>
                Proceed to Deal Room <ArrowRight />
            </Link>
        </Button>
    ) : (
        <Button className="bg-brand-gradient shadow-brand" onClick={openDealRoom} disabled={opening}>
            {opening && <LoaderCircle className="animate-spin" />}
            Proceed to Deal Room <ArrowRight />
        </Button>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Details Pack — ${company.name_en}`} />
            <PageBody>
                <BuyerJourney current={4} />

                <PageHeader
                    eyebrow={`Step 5 · Company Details Pack · Listing ${listing.reference}`}
                    title={company.name_en}
                    description="Identity revealed under NDA. Everything below is watermarked to your account and every view is logged."
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <a href={route('engagements.nda.pdf', engagement.id)} target="_blank" rel="noopener">
                                    <FileText /> Signed NDA
                                </a>
                            </Button>
                            {dealRoomCta}
                        </>
                    }
                />

                <div
                    role="note"
                    className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100"
                >
                    <Fingerprint className="size-5 shrink-0" aria-hidden="true" />
                    <span>
                        Watermarked to {viewer} · access logged · NDA-bound — <span className="font-semibold">do not distribute</span>
                    </span>
                </div>

                <section className="bg-card shadow-brand rounded-2xl border">
                    <div className="overflow-x-auto border-b p-3">
                        <Tabs tabs={tabs} value={tab} onChange={(key) => setTab(key as TabKey)} />
                    </div>
                    <div role="tabpanel" aria-label={tabs.find((t) => t.key === tab)?.label} className="p-5 md:p-6">
                        {tab === 'overview' && <OverviewTab listing={listing} company={company} />}
                        {tab === 'valuation' && <ValuationTab listing={listing} />}
                        {tab === 'financials' && <FinancialsTab listing={listing} />}
                        {tab === 'legal' && (
                            <ChecksTab
                                title="Legal summary"
                                checks={listing.legal_findings}
                                empty="No legal findings have been recorded for this company."
                            />
                        )}
                        {tab === 'checks' && (
                            <ChecksTab
                                title="Court & debt checks"
                                checks={listing.court_debt_checks}
                                empty="No court or debt checks have been recorded yet."
                            />
                        )}
                        {tab === 'documents' && <DocumentsTab engagementId={engagement.id} documents={documents} />}
                    </div>
                    <div className="flex flex-col-reverse gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
                        <Button asChild variant="outline">
                            <Link href={route('buyer.dashboard')}>
                                <ArrowLeft /> My acquisitions
                            </Link>
                        </Button>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <span className="text-muted-foreground text-sm">Ready to ask questions or make an offer?</span>
                            {dealRoomCta}
                        </div>
                    </div>
                </section>
            </PageBody>
        </AppLayout>
    );
}

function Heading({ children }: { children: ReactNode }) {
    return <h2 className="text-brand-ink text-lg font-bold dark:text-white">{children}</h2>;
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'green' }) {
    return (
        <div className="bg-muted rounded-2xl p-4">
            <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
            <dd
                className={cn(
                    'text-brand-ink mt-1 text-xl font-extrabold tracking-tight dark:text-white',
                    tone === 'green' && 'text-emerald-600 dark:text-emerald-400',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr] sm:gap-4">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="text-sm font-medium">{children}</dd>
        </div>
    );
}

function OverviewTab({ listing, company }: { listing: PackListing; company: Company }) {
    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <Heading>{company.name_en}</Heading>
                    {company.verified && <StatusBadge tone="green" label="✓ CR verified" />}
                    {company.cr_status && <StatusBadge tone="slate" label={company.cr_status} />}
                </div>
                {company.name_ar && (
                    <div lang="ar" dir="rtl" className="text-muted-foreground mt-1 text-right text-base sm:text-left">
                        {company.name_ar}
                    </div>
                )}
                <p className="text-muted-foreground mt-3 leading-relaxed whitespace-pre-line">{listing.company_overview || listing.teaser_summary}</p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Asking price" value={formatBD(listing.asking_price)} />
                <Stat label="Revenue" value={formatBD(listing.annual_revenue)} />
                <Stat label="EBITDA" value={formatBD(listing.ebitda)} />
                <Stat
                    label="Growth (YoY)"
                    value={formatPct(listing.growth_pct)}
                    tone={listing.growth_pct !== null && listing.growth_pct > 0 ? 'green' : undefined}
                />
                <Stat label="Employees" value={listing.employees_band} />
            </dl>

            <div>
                <Heading>Company identity</Heading>
                <dl className="mt-2 divide-y">
                    <Row label="Commercial Registration">{company.cr_number ?? '—'}</Row>
                    <Row label="Legal form">{company.legal_form ?? '—'}</Row>
                    <Row label="Registered">{formatDate(company.registration_date)}</Row>
                    <Row label="CR expiry">{formatDate(company.expiry_date)}</Row>
                    <Row label="Issued capital">{formatBD(company.capital, { compact: false })}</Row>
                    <Row label="Address">{company.address ?? '—'}</Row>
                    <Row label="Sector · location">
                        {listing.sector_label} · {listing.location_label}
                    </Row>
                    <Row label="Established">{listing.established_year ?? '—'}</Row>
                    <Row label="Deal type">{listing.deal_preference_label}</Row>
                    {company.activities.length > 0 && (
                        <Row label="Business activities">
                            <ul className="flex flex-wrap gap-1.5">
                                {company.activities.map((a, i) => (
                                    <li key={i}>
                                        <StatusBadge tone="indigo" label={activityLabel(a)} className="whitespace-normal" />
                                    </li>
                                ))}
                            </ul>
                        </Row>
                    )}
                </dl>
            </div>

            {listing.highlights.length > 0 && (
                <div>
                    <Heading>Highlights</Heading>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {listing.highlights.map((h) => (
                            <li key={h} className="flex items-start gap-2 text-sm">
                                <CircleCheck className="text-brand-green mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                {h}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function ValuationTab({ listing }: { listing: PackListing }) {
    const hasRange = listing.valuation_low !== null || listing.valuation_high !== null;

    return (
        <div className="space-y-6">
            <Heading>Valuation summary</Heading>
            <dl className="grid gap-3 sm:grid-cols-2">
                <div className="bg-brand-gradient shadow-brand rounded-2xl p-5 text-white">
                    <dt className="text-xs font-medium text-white/80">Indicative valuation range</dt>
                    <dd className="mt-1 text-2xl font-extrabold tracking-tight">
                        {hasRange ? `${formatBD(listing.valuation_low)} – ${formatBD(listing.valuation_high)}` : 'Not provided'}
                    </dd>
                </div>
                <Stat label="Asking price" value={formatBD(listing.asking_price)} />
            </dl>
            {listing.valuation_summary && <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{listing.valuation_summary}</p>}
            <div>
                <h3 className="text-sm font-semibold">Valuation methods</h3>
                {listing.valuation_methods.length > 0 ? (
                    <dl className="mt-2 divide-y rounded-2xl border">
                        {listing.valuation_methods.map((m) => (
                            <div key={m.method} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                <dt className="text-muted-foreground">{m.method}</dt>
                                <dd className="font-bold">{formatBD(num(m.value))}</dd>
                            </div>
                        ))}
                    </dl>
                ) : (
                    <p className="text-muted-foreground mt-2 text-sm">No valuation methods have been provided.</p>
                )}
            </div>
        </div>
    );
}

function FinancialsTab({ listing }: { listing: PackListing }) {
    const rows = [...listing.financial_history].sort((a, b) => Number(a.year) - Number(b.year));
    const withGrowth = rows.map((row, i) => {
        const revenue = num(row.revenue);
        const ebitda = num(row.ebitda);
        const prev = i > 0 ? num(rows[i - 1].revenue) : null;
        return {
            year: row.year,
            revenue,
            ebitda,
            margin: revenue && ebitda !== null ? (ebitda / revenue) * 100 : null,
            growth: prev && revenue !== null ? ((revenue - prev) / prev) * 100 : null,
        };
    });

    return (
        <div className="space-y-6">
            <Heading>Financial summary</Heading>
            <DataTable
                rows={withGrowth}
                rowKey={(r) => r.year}
                empty={
                    <EmptyState
                        icon={FileText}
                        title="No financial history provided"
                        description="Ask the seller for historical figures in the deal room."
                    />
                }
                columns={[
                    { header: 'Year', cell: (r) => <span className="font-semibold">{r.year}</span> },
                    { header: 'Revenue', cell: (r) => formatBD(r.revenue), className: 'text-right' },
                    { header: 'EBITDA', cell: (r) => formatBD(r.ebitda), className: 'text-right' },
                    { header: 'EBITDA margin', cell: (r) => formatPct(r.margin, false), className: 'text-right' },
                    {
                        header: 'Revenue growth',
                        cell: (r) => (
                            <span className={cn(r.growth !== null && r.growth > 0 && 'text-emerald-600 dark:text-emerald-400')}>
                                {formatPct(r.growth)}
                            </span>
                        ),
                        className: 'text-right',
                    },
                ]}
            />
            {listing.financial_summary && (
                <div>
                    <h3 className="text-sm font-semibold">Commentary</h3>
                    <p className="text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{listing.financial_summary}</p>
                </div>
            )}
        </div>
    );
}

function ChecksTab({ title, checks, empty }: { title: string; checks: Check[]; empty: string }) {
    return (
        <div className="space-y-4">
            <Heading>{title}</Heading>
            {checks.length === 0 ? (
                <p className="text-muted-foreground text-sm">{empty}</p>
            ) : (
                <ul className="space-y-2.5">
                    {checks.map((check, i) => (
                        <li
                            key={i}
                            className={cn(
                                'flex items-start gap-3 rounded-xl border p-3.5 text-sm',
                                check.status === 'warning'
                                    ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                                    : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10',
                            )}
                        >
                            {check.status === 'warning' ? (
                                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Needs attention" />
                            ) : (
                                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="No issue" />
                            )}
                            <span>{check.text}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function DocumentsTab({ engagementId, documents }: { engagementId: number; documents: PackDocument[] }) {
    return (
        <div className="space-y-4">
            <Heading>Supporting documents</Heading>
            <p className="text-muted-foreground text-sm">
                PDFs are stamped with a watermark identifying your account when opened. Every view and download is logged.
            </p>
            {documents.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No documents yet"
                    description="The seller hasn't shared supporting documents in this pack. You can request them in the deal room."
                />
            ) : (
                <ul className="divide-y rounded-2xl border">
                    {documents.map((doc) => {
                        const href = route('engagements.pack.document', { engagement: engagementId, document: doc.id });
                        return (
                            <li key={doc.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                                    <FileText className="size-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-semibold">{doc.title}</div>
                                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                                        <span>{doc.category}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{formatBytes(doc.size)}</span>
                                        {doc.is_pdf && <StatusBadge tone="indigo" label="Watermarked" />}
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <a href={href} target="_blank" rel="noopener">
                                            <ExternalLink /> Open<span className="sr-only"> {doc.title} in a new tab</span>
                                        </a>
                                    </Button>
                                    {doc.is_pdf && (
                                        <Button asChild variant="ghost" size="sm">
                                            <a
                                                href={route('engagements.pack.document', { engagement: engagementId, document: doc.id, download: 1 })}
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                <Download /> Download<span className="sr-only"> {doc.title}</span>
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
