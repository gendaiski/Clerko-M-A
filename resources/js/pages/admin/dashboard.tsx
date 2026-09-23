import { RevenueChart, StageChart, type RevenueMonth, type StageDatum } from '@/components/clerko/admin-charts';
import { AdminListingTable, type AdminListingRow } from '@/components/clerko/admin-listing-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { KpiCard } from '@/components/clerko/kpi-card';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    CalendarClock,
    CheckCircle2,
    FileSearch,
    Handshake,
    IdCard,
    Landmark,
    Receipt,
    ShieldAlert,
    Store,
    type LucideIcon,
} from 'lucide-react';

type Props = {
    kpis: {
        agreed_deal_value: number;
        live_listings: number;
        pending_reviews: number;
        verified_users: number;
        revenue_ytd: number;
        open_deal_rooms: number;
    };
    queues: {
        listings: number;
        companies: number;
        kyc: number;
        compliance: number;
        cr_expiring: number;
    };
    revenueByMonth: RevenueMonth[];
    /** stage => count. Laravel serialises an empty collection as []. */
    stages: Record<string, number | string> | [];
    recentListings: AdminListingRow[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Admin', href: '/admin' }];

const STAGES: { key: string; label: string; muted?: boolean }[] = [
    { key: 'nda_requested', label: 'NDA requested' },
    { key: 'nda_signed', label: 'NDA signed' },
    { key: 'pack_unlocked', label: 'Pack unlocked' },
    { key: 'deal_room', label: 'Deal room' },
    { key: 'offer', label: 'Offer' },
    { key: 'headline_terms', label: 'Headline terms' },
    { key: 'withdrawn', label: 'Withdrawn', muted: true },
];

const n = (v: number) => v.toLocaleString('en-US');

export default function AdminDashboard({ kpis, queues, revenueByMonth, stages, recentListings }: Props) {
    const stageMap: Record<string, number | string> = Array.isArray(stages) ? {} : stages;
    const stageData: StageDatum[] = STAGES.map((s) => ({ ...s, count: Number(stageMap[s.key] ?? 0) }));
    const activeDeals = stageData.filter((s) => s.key !== 'withdrawn').reduce((sum, s) => sum + s.count, 0);

    const workQueues: { label: string; count: number; href: string; icon: LucideIcon; hint: string; urgent?: boolean }[] = [
        {
            label: 'Listings to review',
            count: queues.listings,
            href: route('admin.listings.index'),
            icon: FileSearch,
            hint: 'Teasers awaiting moderation',
        },
        {
            label: 'Companies to verify',
            count: queues.companies,
            href: route('admin.companies.index'),
            icon: Building2,
            hint: 'CR extracted, KYB pending',
        },
        { label: 'KYC to review', count: queues.kyc, href: route('admin.kyc.index'), icon: IdCard, hint: 'Identity submissions' },
        {
            label: 'Compliance flags',
            count: queues.compliance,
            href: route('admin.compliance.index'),
            icon: ShieldAlert,
            hint: 'Open deal-room flags',
            urgent: true,
        },
        {
            label: 'CRs expiring ≤ 30 days',
            count: queues.cr_expiring,
            href: route('admin.companies.index', { status: 'verified' }),
            icon: CalendarClock,
            hint: 'Verified companies to re-check',
        },
    ];
    const totalOpen = workQueues.reduce((s, q) => s + q.count, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin console" />
            <PageBody>
                <PageHeader
                    eyebrow="Admin console"
                    title="Platform overview"
                    description="Bahrain · live marketplace health, verification queues and compliance."
                    actions={
                        <Button asChild variant="outline">
                            <Link href={route('admin.audit.index')}>Audit trail</Link>
                        </Button>
                    }
                />

                <section aria-labelledby="kpi-heading">
                    <h2 id="kpi-heading" className="sr-only">
                        Key figures
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <KpiCard
                            label="Agreed deal value"
                            value={formatBD(kpis.agreed_deal_value)}
                            icon={Landmark}
                            tone="indigo"
                            hint="Headline terms acknowledged by both sides"
                        />
                        <KpiCard label="Live listings" value={n(kpis.live_listings)} icon={Store} tone="blue" hint="Visible on the marketplace" />
                        <KpiCard
                            label="Pending reviews"
                            value={n(kpis.pending_reviews)}
                            icon={FileSearch}
                            tone="amber"
                            hint="Listings under admin review"
                        />
                        <KpiCard label="Verified users" value={n(kpis.verified_users)} icon={BadgeCheck} tone="green" hint="KYC verified" />
                        <KpiCard label="Revenue YTD" value={formatBD(kpis.revenue_ytd)} icon={Receipt} tone="purple" hint="Paid since 1 January" />
                        <KpiCard label="Open deal rooms" value={n(kpis.open_deal_rooms)} icon={Handshake} tone="indigo" hint="Not yet closed" />
                    </div>
                </section>

                <section aria-labelledby="queues-heading" className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                        <h2 id="queues-heading" className="text-brand-ink text-lg font-bold dark:text-white">
                            Work queues
                        </h2>
                        <span className="text-muted-foreground text-sm">
                            {totalOpen === 0 ? 'All clear' : `${n(totalOpen)} items need attention`}
                        </span>
                    </div>
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {workQueues.map((q) => {
                            const Icon = q.icon;
                            const pending = q.count > 0;
                            return (
                                <li key={q.label}>
                                    <Link
                                        href={q.href}
                                        className={cn(
                                            'group bg-card focus-visible:ring-ring shadow-brand hover:shadow-brand-lg flex h-full flex-col gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none',
                                            pending && q.urgent && 'border-red-200 dark:border-red-500/30',
                                            pending && !q.urgent && 'border-amber-200 dark:border-amber-500/30',
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={cn(
                                                    'flex size-9 items-center justify-center rounded-xl',
                                                    !pending && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
                                                    pending && q.urgent && 'bg-red-50 text-red-600 dark:bg-red-500/10',
                                                    pending && !q.urgent && 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
                                                )}
                                            >
                                                {pending ? (
                                                    <Icon className="size-5" aria-hidden="true" />
                                                ) : (
                                                    <CheckCircle2 className="size-5" aria-hidden="true" />
                                                )}
                                            </span>
                                            <span className="text-brand-ink text-2xl font-extrabold tabular-nums dark:text-white">{n(q.count)}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold">{q.label}</div>
                                            <div className="text-muted-foreground text-xs">{pending ? q.hint : 'Nothing waiting'}</div>
                                        </div>
                                        <span className="text-primary inline-flex items-center gap-1 text-xs font-semibold">
                                            Open queue <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <div className="grid gap-6 lg:grid-cols-5">
                    <SectionCard
                        title="Revenue by month"
                        description="Paid, last 6 months · subscriptions vs pack unlocks (BD)"
                        className="min-w-0 lg:col-span-3"
                    >
                        <RevenueChart data={revenueByMonth} />
                    </SectionCard>
                    <SectionCard
                        title="Deals by stage"
                        description={`${n(activeDeals)} active engagements across the funnel`}
                        className="min-w-0 lg:col-span-2"
                        actions={
                            <Link href={route('admin.deals.index')} className="text-primary text-sm font-medium hover:underline">
                                Deal rooms
                            </Link>
                        }
                    >
                        <StageChart data={stageData} />
                    </SectionCard>
                </div>

                <SectionCard
                    title="Listings awaiting review"
                    description="Oldest submissions first"
                    bodyClassName="p-2 sm:p-3"
                    actions={
                        <Button asChild variant="ghost" size="sm">
                            <Link href={route('admin.listings.index')}>
                                View all <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                        </Button>
                    }
                >
                    <AdminListingTable
                        rows={recentListings}
                        empty={
                            <EmptyState
                                icon={CheckCircle2}
                                title="Moderation queue is clear"
                                description="New submissions will appear here for review."
                                className="m-3"
                            />
                        }
                    />
                </SectionCard>
            </PageBody>
        </AppLayout>
    );
}
