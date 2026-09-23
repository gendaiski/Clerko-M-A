import { EmptyState } from '@/components/clerko/empty-state';
import { KpiCard } from '@/components/clerko/kpi-card';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { SellerJourney, sellerStepForStatus } from '@/components/clerko/seller-journey';
import { SellerPipelineTable } from '@/components/clerko/seller-pipeline-table';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD } from '@/lib/format';
import { type BreadcrumbItem, type KycStatus, type PipelineRow } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Building2, Eye, FileSignature, FileText, Handshake, Loader2, Plus, ShieldAlert, Unlock } from 'lucide-react';

type CompanyRow = {
    id: number;
    name: string | null;
    extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
    verification_status: string;
};

type ListingRow = {
    id: number;
    reference: string;
    headline: string;
    status: string;
    status_label: string;
    tier: string | null;
    views_count: number;
    asking_price: number;
};

type Props = {
    companies: CompanyRow[];
    listings: ListingRow[];
    kpis: {
        views: number;
        nda_requests: number;
        ndas_signed: number;
        packs_unlocked: number;
        offers: number;
    };
    pipeline: PipelineRow[];
    kycStatus: KycStatus;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Seller dashboard', href: '/seller' }];

const extractionLabels: Record<CompanyRow['extraction_status'], string> = {
    pending: 'Queued for reading',
    processing: 'Reading CR profile',
    completed: 'Profile extracted',
    failed: 'Extraction failed',
};

const kybLabels: Record<string, string> = {
    pending: 'KYB in review',
    verified: 'KYB verified',
    rejected: 'KYB rejected',
    unverified: 'KYB not started',
};

export default function SellerDashboard({ companies, listings, kpis, pipeline, kycStatus }: Props) {
    const liveListing = listings.find((l) => l.status === 'live');
    const journeyStep = listings.length > 0 ? Math.max(...listings.map((l) => sellerStepForStatus(l.status))) : companies.length > 0 ? 1 : 0;

    const description = liveListing
        ? 'Your anonymised teaser is live. Track buyer interest as it arrives.'
        : listings.length > 0
          ? 'Finish your listing and submit it for review to start receiving buyer interest.'
          : 'List your business confidentially and follow every buyer from NDA to Deal Room.';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Seller dashboard" />
            <PageBody>
                <PageHeader
                    eyebrow="Scenario 1 · Sell a business"
                    title="Seller dashboard"
                    description={description}
                    actions={
                        <>
                            {liveListing && (
                                <StatusBadge
                                    tone="green"
                                    label={`● Teaser live${liveListing.tier ? ` · ${liveListing.tier.charAt(0).toUpperCase()}${liveListing.tier.slice(1)} tier` : ''}`}
                                />
                            )}
                            {companies.length > 0 && (
                                <Button asChild className="bg-brand-gradient shadow-brand">
                                    <Link href={route('seller.listings.create')}>
                                        <Plus /> New listing
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />

                <SellerJourney current={journeyStep} />

                {kycStatus !== 'verified' && <KycBanner status={kycStatus} />}

                {companies.length === 0 ? (
                    <SectionCard>
                        <EmptyState
                            icon={Building2}
                            title="Start by verifying your company"
                            description="Upload your company's CR profile from Sijilat. We read it automatically and our compliance team verifies it — then you can build your anonymised listing."
                            action={
                                <Button asChild className="bg-brand-gradient-green shadow-brand">
                                    <Link href={route('seller.companies.create')}>
                                        Upload CR profile <ArrowRight />
                                    </Link>
                                </Button>
                            }
                        />
                    </SectionCard>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                            <KpiCard label="Teaser views" value={kpis.views.toLocaleString('en-US')} icon={Eye} tone="blue" />
                            <KpiCard label="NDA requests" value={kpis.nda_requests} icon={FileText} tone="purple" />
                            <KpiCard label="NDAs signed" value={kpis.ndas_signed} icon={FileSignature} tone="indigo" />
                            <KpiCard label="Packs unlocked" value={kpis.packs_unlocked} icon={Unlock} tone="green" />
                            <KpiCard label="Offers" value={kpis.offers} icon={Handshake} tone="amber" className="col-span-2 lg:col-span-1" />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            <SectionCard
                                title="Your listings"
                                description="Anonymised teasers and their review status."
                                className="lg:col-span-2"
                                bodyClassName="p-0"
                            >
                                {listings.length === 0 ? (
                                    <div className="p-5">
                                        <EmptyState
                                            icon={FileText}
                                            title="No listing yet"
                                            description="Build your anonymised teaser and Company Details Pack. Buyers only see who you are after signing an NDA."
                                            action={
                                                <Button asChild className="bg-brand-gradient-green shadow-brand">
                                                    <Link href={route('seller.listings.create')}>
                                                        Create listing <ArrowRight />
                                                    </Link>
                                                </Button>
                                            }
                                        />
                                    </div>
                                ) : (
                                    <ul className="divide-y">
                                        {listings.map((listing) => (
                                            <li key={listing.id}>
                                                <Link
                                                    href={route('seller.listings.show', listing.id)}
                                                    className="hover:bg-muted/50 flex flex-col gap-3 px-5 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-muted-foreground font-mono text-xs font-semibold">
                                                                {listing.reference}
                                                            </span>
                                                            <StatusBadge status={listing.status} label={listing.status_label} />
                                                            {listing.tier && (
                                                                <StatusBadge
                                                                    tone="indigo"
                                                                    label={`${listing.tier.charAt(0).toUpperCase()}${listing.tier.slice(1)}`}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="text-foreground truncate font-semibold">{listing.headline}</div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-5 text-sm">
                                                        <div className="text-right">
                                                            <div className="text-brand-ink font-bold dark:text-white">
                                                                {formatBD(listing.asking_price)}
                                                            </div>
                                                            <div className="text-muted-foreground text-xs">Asking price</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-brand-ink inline-flex items-center gap-1 font-bold dark:text-white">
                                                                <Eye className="size-3.5" aria-hidden="true" /> {listing.views_count}
                                                            </div>
                                                            <div className="text-muted-foreground text-xs">Views</div>
                                                        </div>
                                                        <ArrowRight className="text-muted-foreground size-4" aria-hidden="true" />
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </SectionCard>

                            <SectionCard
                                title="Companies"
                                description="Business verification (KYB)."
                                actions={
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('seller.companies.create')}>
                                            <Plus /> Add
                                        </Link>
                                    </Button>
                                }
                                bodyClassName="p-0"
                            >
                                <ul className="divide-y">
                                    {companies.map((company) => {
                                        const reading = company.extraction_status === 'pending' || company.extraction_status === 'processing';
                                        return (
                                            <li key={company.id}>
                                                <Link
                                                    href={route('seller.companies.show', company.id)}
                                                    className="hover:bg-muted/50 flex items-start gap-3 px-5 py-4 transition"
                                                >
                                                    <div className="bg-brand-lavender text-primary flex size-9 shrink-0 items-center justify-center rounded-xl dark:bg-indigo-500/10">
                                                        {reading ? (
                                                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                                        ) : (
                                                            <Building2 className="size-4" aria-hidden="true" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div className="text-foreground truncate font-semibold">
                                                            {company.name ?? `Company #${company.id}`}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <StatusBadge
                                                                status={company.extraction_status}
                                                                label={extractionLabels[company.extraction_status]}
                                                            />
                                                            <StatusBadge
                                                                status={company.verification_status}
                                                                label={kybLabels[company.verification_status] ?? company.verification_status}
                                                            />
                                                        </div>
                                                    </div>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </SectionCard>
                        </div>

                        <SectionCard
                            title="Interest pipeline"
                            description="Buyers stay anonymous to you until they choose to reveal themselves in a Deal Room."
                            bodyClassName="p-2 sm:p-3"
                        >
                            <SellerPipelineTable rows={pipeline} />
                        </SectionCard>
                    </>
                )}
            </PageBody>
        </AppLayout>
    );
}

function KycBanner({ status }: { status: KycStatus }) {
    const copy: Record<KycStatus, { title: string; body: string; cta: string | null }> = {
        unverified: {
            title: 'Verify your identity to publish a listing',
            body: 'We confirm who you are (KYC) before any listing goes live. It takes about two minutes: a government ID and a selfie.',
            cta: 'Verify identity',
        },
        pending: {
            title: 'Your identity verification is in review',
            body: 'Our compliance team usually verifies within one business day. You can keep building your listing meanwhile.',
            cta: null,
        },
        rejected: {
            title: 'We could not verify your identity',
            body: 'Please review the compliance team’s notes and submit your documents again.',
            cta: 'Review and resubmit',
        },
        verified: { title: '', body: '', cta: null },
    };
    const c = copy[status];

    return (
        <div
            role="status"
            className={
                status === 'rejected'
                    ? 'flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center sm:justify-between dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100'
                    : 'flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
            }
        >
            <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                    <div className="font-semibold">{c.title}</div>
                    <p className="text-sm opacity-90">{c.body}</p>
                </div>
            </div>
            {c.cta && (
                <Button asChild size="sm" className="shrink-0">
                    <Link href={route('verification.show', { redirect: '/seller' })}>{c.cta}</Link>
                </Button>
            )}
        </div>
    );
}
