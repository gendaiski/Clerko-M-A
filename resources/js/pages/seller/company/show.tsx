import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { SellerJourney } from '@/components/clerko/seller-journey';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatDate, titleCase } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, Building2, FileText, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

/** Extracted CR arrays: the extractor may return strings or objects with arbitrary keys. */
type ExtractedItem = string | number | Record<string, unknown>;

type Company = {
    id: number;
    extraction_status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual';
    extraction_error: string | null;
    cr_number: string | null;
    name_en: string | null;
    name_ar: string | null;
    legal_form: string | null;
    cr_status: string | null;
    address: string | null;
    activities: ExtractedItem[] | null;
    shareholders: ExtractedItem[] | null;
    signatories: ExtractedItem[] | null;
    seller_capacity: string;
    verification_notes: string | null;
    registration_date: string | null;
    expiry_date: string | null;
    capital: number | null;
    verification_status: 'pending' | 'verified' | 'rejected' | 'unverified';
    seller_capacity_label: string;
};

type Props = {
    company: Company;
    hasListing: boolean;
};

const POLL_MS = 4000;

export default function CompanyShow({ company, hasListing }: Props) {
    const inProgress = company.extraction_status === 'pending' || company.extraction_status === 'processing';
    // "manual": our team enters the profile from the PDF; the seller can carry on meanwhile.
    const profileReady = company.extraction_status === 'completed' || company.extraction_status === 'manual';

    useEffect(() => {
        if (!inProgress) {
            return;
        }
        const timer = window.setInterval(() => {
            router.reload({ only: ['company'] });
        }, POLL_MS);
        return () => window.clearInterval(timer);
    }, [inProgress]);

    const title = company.name_en ?? (inProgress ? 'Reading your CR profile' : `Company #${company.id}`);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Seller dashboard', href: route('seller.dashboard') },
        { title: company.name_en ?? 'Company', href: route('seller.companies.show', company.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={company.name_en ?? 'Company verification'} />
            <PageBody className="max-w-5xl">
                <SellerJourney current={profileReady ? 1 : 0} />

                <PageHeader
                    eyebrow="Business verification (KYB)"
                    title={title}
                    description={
                        company.name_ar ? (
                            <span dir="rtl" lang="ar">
                                {company.name_ar}
                            </span>
                        ) : undefined
                    }
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <a href={route('seller.companies.cr-pdf', company.id)} target="_blank" rel="noopener">
                                    <FileText /> View CR PDF
                                </a>
                            </Button>
                            {profileReady &&
                                (hasListing ? (
                                    <Button asChild variant="outline">
                                        <Link href={route('seller.dashboard')}>
                                            Go to dashboard <ArrowRight />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button asChild className="bg-brand-gradient-green shadow-brand">
                                        <Link href={route('seller.listings.create')}>
                                            Create listing <ArrowRight />
                                        </Link>
                                    </Button>
                                ))}
                        </>
                    }
                />

                {inProgress && <ExtractionProgress status={company.extraction_status === 'processing' ? 'processing' : 'pending'} />}
                {company.extraction_status === 'failed' && <ExtractionFailed company={company} />}
                {company.extraction_status === 'manual' && (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100">
                        <strong>Our compliance team is entering your company details from the CR profile.</strong> You don&apos;t need to do anything
                        — you can build your listing now, and we&apos;ll notify you once your company is verified.
                    </div>
                )}
                {profileReady && company.name_en && <ExtractedProfile company={company} hasListing={hasListing} />}
            </PageBody>
        </AppLayout>
    );
}

function ExtractionProgress({ status }: { status: 'pending' | 'processing' }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => window.clearInterval(t);
    }, []);

    const steps = [
        { label: 'CR profile uploaded', done: true },
        { label: 'Reading the document', done: status === 'processing', active: status === 'pending' },
        { label: 'Extracting company details', done: false, active: status === 'processing' },
        { label: 'Compliance review', done: false },
    ];

    return (
        <SectionCard>
            <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
                <div className="bg-brand-lavender text-primary flex size-16 items-center justify-center rounded-full dark:bg-indigo-500/10">
                    <Loader2 className="size-8 animate-spin" aria-hidden="true" />
                </div>
                <h2 className="text-brand-ink mt-4 text-xl font-bold dark:text-white">We're reading your CR profile</h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                    This usually takes under a minute. You can stay on this page — it updates automatically — or come back later from your dashboard.
                </p>
                <ol className="mt-6 grid w-full max-w-sm gap-2 text-left text-sm">
                    {steps.map((s) => (
                        <li key={s.label} className="flex items-center gap-3">
                            <span
                                className={
                                    s.done
                                        ? 'bg-brand-green flex size-5 items-center justify-center rounded-full text-white'
                                        : s.active
                                          ? 'border-primary flex size-5 items-center justify-center rounded-full border-2'
                                          : 'bg-muted flex size-5 rounded-full'
                                }
                                aria-hidden="true"
                            >
                                {s.done ? '✓' : s.active ? <span className="bg-primary size-2 animate-pulse rounded-full" /> : null}
                            </span>
                            <span className={s.done || s.active ? 'text-foreground font-medium' : 'text-muted-foreground'}>{s.label}</span>
                        </li>
                    ))}
                </ol>
                {elapsed > 90 && (
                    <p className="text-muted-foreground mt-6 text-xs">Taking longer than usual. We'll notify you as soon as it's ready.</p>
                )}
            </div>
        </SectionCard>
    );
}

function ExtractionFailed({ company }: { company: Company }) {
    const [retrying, setRetrying] = useState(false);

    return (
        <SectionCard>
            <div className="flex flex-col items-center py-6 text-center" role="alert">
                <div className="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10">
                    <XCircle className="size-8" aria-hidden="true" />
                </div>
                <h2 className="text-brand-ink mt-4 text-xl font-bold dark:text-white">We couldn't read this CR profile</h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                    {company.extraction_error ?? 'Something went wrong while reading the document.'} Please make sure it is the CR profile PDF saved
                    from Sijilat.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                        disabled={retrying}
                        onClick={() =>
                            router.post(
                                route('seller.companies.retry', company.id),
                                {},
                                { preserveScroll: true, onFinish: () => setRetrying(false), onStart: () => setRetrying(true) },
                            )
                        }
                    >
                        {retrying ? <Loader2 className="animate-spin" /> : <RotateCcw />} Try again
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={route('seller.companies.create')}>Upload a different PDF</Link>
                    </Button>
                </div>
            </div>
        </SectionCard>
    );
}

function ExtractedProfile({ company, hasListing }: { company: Company; hasListing: boolean }) {
    const kyb = company.verification_status;

    return (
        <>
            <KybPanel status={kyb} notes={company.verification_notes} />

            <SectionCard
                title="Company profile"
                description="Extracted from your CR profile. Our compliance team checks it against Sijilat."
                actions={<StatusBadge status="completed" label="Extracted" />}
            >
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="CR number" value={company.cr_number} mono />
                    <Detail label="Name (English)" value={company.name_en} />
                    <Detail
                        label="Name (Arabic)"
                        value={
                            company.name_ar ? (
                                <span dir="rtl" lang="ar">
                                    {company.name_ar}
                                </span>
                            ) : null
                        }
                    />
                    <Detail label="Legal form" value={company.legal_form} />
                    <Detail
                        label="CR status"
                        value={
                            company.cr_status ? (
                                <StatusBadge tone={/active/i.test(company.cr_status) ? 'green' : 'slate'} label={company.cr_status} />
                            ) : null
                        }
                    />
                    <Detail label="Capital" value={company.capital !== null ? formatBD(company.capital, { compact: false }) : null} />
                    <Detail label="Registration date" value={company.registration_date ? formatDate(company.registration_date) : null} />
                    <Detail label="Expiry date" value={company.expiry_date ? formatDate(company.expiry_date) : null} />
                    <Detail label="Your capacity" value={company.seller_capacity_label} />
                    <Detail label="Address" value={company.address} className="sm:col-span-2 lg:col-span-3" />
                </dl>
            </SectionCard>

            <SectionCard title="Commercial activities">
                {company.activities && company.activities.length > 0 ? (
                    <ItemList items={company.activities} />
                ) : (
                    <p className="text-muted-foreground text-sm">No activities were found on the CR profile.</p>
                )}
            </SectionCard>

            <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="Shareholders" bodyClassName="p-0">
                    <GenericTable items={company.shareholders} emptyTitle="No shareholders extracted" />
                </SectionCard>
                <SectionCard title="Authorised signatories" bodyClassName="p-0">
                    <GenericTable items={company.signatories} emptyTitle="No signatories extracted" />
                </SectionCard>
            </div>

            {!hasListing && (
                <div className="bg-brand-gradient shadow-brand-lg flex flex-col gap-4 rounded-2xl p-6 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-lg font-bold">Next: build your anonymised listing</div>
                        <p className="text-sm text-white/80">You can start now — compliance review of your company runs in parallel.</p>
                    </div>
                    <Button asChild variant="secondary" className="shrink-0">
                        <Link href={route('seller.listings.create')}>
                            Create listing <ArrowRight />
                        </Link>
                    </Button>
                </div>
            )}
        </>
    );
}

function KybPanel({ status, notes }: { status: Company['verification_status']; notes: string | null }) {
    if (status === 'verified') {
        return (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                    <div className="font-semibold">Business verified</div>
                    <p className="text-sm opacity-90">Our compliance team has verified this company. Your listings will show a “Verified” badge.</p>
                </div>
            </div>
        );
    }
    if (status === 'rejected') {
        return (
            <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
            >
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                    <div className="font-semibold">Business verification was not approved</div>
                    {notes && <p className="mt-1 text-sm whitespace-pre-line">{notes}</p>}
                    <p className="mt-1 text-sm opacity-90">Upload an updated CR profile or contact the Clerko compliance team.</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <Building2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                    Compliance review in progress <StatusBadge status="pending" label="KYB pending" />
                </div>
                <p className="text-sm opacity-90">We're checking the details below against Sijilat. You'll be notified when it's done.</p>
            </div>
        </div>
    );
}

function Detail({ label, value, mono, className }: { label: string; value: ReactNode; mono?: boolean; className?: string }) {
    return (
        <div className={className}>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</dt>
            <dd className={`text-foreground mt-1 font-medium ${mono ? 'font-mono' : ''}`}>
                {value ?? <span className="text-muted-foreground">—</span>}
            </dd>
        </div>
    );
}

function renderValue(value: unknown): ReactNode {
    if (value === null || value === undefined || value === '') {
        return <span className="text-muted-foreground">—</span>;
    }
    if (typeof value === 'object') {
        return Array.isArray(value) ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ') : JSON.stringify(value);
    }
    return String(value);
}

function isRecord(item: unknown): item is Record<string, unknown> {
    return typeof item === 'object' && item !== null && !Array.isArray(item);
}

function ItemList({ items }: { items: ExtractedItem[] }) {
    if (items.some(isRecord)) {
        return <GenericTable items={items} emptyTitle="No activities" />;
    }
    return (
        <ul className="flex flex-wrap gap-2">
            {items.map((item, i) => (
                <li key={i} className="bg-muted rounded-full px-3 py-1 text-sm">
                    {String(item)}
                </li>
            ))}
        </ul>
    );
}

/** Renders extractor rows generically: object keys become column headers. */
function GenericTable({ items, emptyTitle }: { items: ExtractedItem[] | null; emptyTitle: string }) {
    if (!items || items.length === 0) {
        return (
            <div className="p-5">
                <EmptyState title={emptyTitle} description="Not present on the CR profile, or it could not be read." />
            </div>
        );
    }

    const records = items.map((item) => (isRecord(item) ? item : { value: item }));
    const keys = Array.from(new Set(records.flatMap((r) => Object.keys(r))));

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                        {keys.map((k) => (
                            <th key={k} scope="col" className="px-4 py-2.5 font-semibold">
                                {k === 'value' && keys.length === 1 ? 'Name' : titleCase(k)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {records.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                            {keys.map((k) => (
                                <td key={k} className="px-4 py-3 align-top">
                                    {renderValue(r[k])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
