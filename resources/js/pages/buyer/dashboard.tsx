import { EmptyState } from '@/components/clerko/empty-state';
import { KpiCard } from '@/components/clerko/kpi-card';
import { ListingCard } from '@/components/clerko/listing-card';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type AuthedData, type BreadcrumbItem, type KycStatus, type Teaser } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Briefcase,
    Crown,
    FileSignature,
    Hourglass,
    KeyRound,
    MessagesSquare,
    Search,
    Settings2,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Target,
} from 'lucide-react';
import { useState } from 'react';

type EngagementRow = {
    id: number;
    stage: string;
    stage_label: string;
    listing: Teaser;
    company_name: string | null;
    nda_signed: boolean;
    pack_unlocked: boolean;
    deal_room_id: number | null;
    last_activity_at: string | null;
};

type Premium = {
    ends_at: string;
    unlocks_used: number;
    unlocks_included: number;
};

type Props = {
    engagements: EngagementRow[];
    matches: Teaser[];
    hasPreferences: boolean;
    premium: Premium | null;
    kycStatus: KycStatus;
};

export default function BuyerDashboard({ engagements, matches, hasPreferences, premium, kycStatus }: Props) {
    const { auth } = usePage<AuthedData>().props;
    const active = engagements.filter((e) => e.stage !== 'withdrawn');
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Buyer dashboard', href: route('buyer.dashboard') }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buyer dashboard" />
            <PageBody>
                <PageHeader
                    eyebrow="Buyer workspace"
                    title={`Welcome back, ${auth.user.name.split(' ')[0]}`}
                    description="Track the businesses you're evaluating and discover new matches."
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <Link href={route('buyer.preferences.edit')}>
                                    <Settings2 /> Preferences
                                </Link>
                            </Button>
                            <Button asChild className="bg-brand-gradient shadow-brand">
                                <Link href={route('marketplace.index')}>
                                    <Search /> Browse marketplace
                                </Link>
                            </Button>
                        </>
                    }
                />

                <KycBanner status={kycStatus} />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard label="Active acquisitions" value={active.length} icon={Briefcase} tone="indigo" />
                    <KpiCard label="NDAs signed" value={active.filter((e) => e.nda_signed).length} icon={FileSignature} tone="blue" />
                    <KpiCard label="Packs unlocked" value={active.filter((e) => e.pack_unlocked).length} icon={KeyRound} tone="purple" />
                    <KpiCard label="Deal rooms" value={active.filter((e) => e.deal_room_id !== null).length} icon={MessagesSquare} tone="green" />
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <SectionCard
                        title="My acquisitions"
                        description="Every company you've requested access to, with your next step."
                        bodyClassName="p-0"
                    >
                        {engagements.length === 0 ? (
                            <div className="p-5">
                                <EmptyState
                                    icon={Briefcase}
                                    title="No acquisitions yet"
                                    description="Find a business on the marketplace and request access to start the NDA process."
                                    action={
                                        <Button asChild className="bg-brand-gradient shadow-brand">
                                            <Link href={route('marketplace.index')}>Browse the marketplace</Link>
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {engagements.map((e) => (
                                    <EngagementItem key={e.id} engagement={e} />
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                    <PremiumCard premium={premium} />
                </div>

                <SectionCard
                    title="Matched to your preferences"
                    description={hasPreferences ? 'Live listings that fit your sectors, locations and deal size.' : undefined}
                    actions={
                        hasPreferences ? (
                            <Button asChild variant="ghost" size="sm">
                                <Link href={route('buyer.preferences.edit')}>Edit preferences</Link>
                            </Button>
                        ) : undefined
                    }
                >
                    {!hasPreferences ? (
                        <EmptyState
                            icon={Target}
                            title="Tell us what you're looking for"
                            description="Set your target sectors, locations and deal size and we'll match you with new listings and send alerts."
                            action={
                                <Button asChild className="bg-brand-gradient shadow-brand">
                                    <Link href={route('buyer.preferences.edit')}>Set preferences</Link>
                                </Button>
                            }
                        />
                    ) : matches.length === 0 ? (
                        <EmptyState
                            icon={Sparkles}
                            title="No new matches right now"
                            description="We'll alert you as soon as a matching business goes live. You can also broaden your preferences."
                            action={
                                <Button asChild variant="outline">
                                    <Link href={route('marketplace.index')}>Browse all listings</Link>
                                </Button>
                            }
                        />
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {matches.map((listing) => (
                                <ListingCard key={listing.id} listing={listing} />
                            ))}
                        </div>
                    )}
                </SectionCard>
            </PageBody>
        </AppLayout>
    );
}

function KycBanner({ status }: { status: KycStatus }) {
    if (status === 'verified') {
        return null;
    }

    const content = {
        pending: {
            icon: Hourglass,
            title: 'Identity verification in progress',
            text: 'Our compliance team is reviewing your documents. You can sign NDAs as soon as you are verified.',
            cta: 'View status',
            className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
        },
        rejected: {
            icon: ShieldAlert,
            title: 'Your identity verification needs attention',
            text: 'We could not verify your identity. Review the feedback and submit your documents again.',
            cta: 'Resubmit verification',
            className: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
        },
        unverified: {
            icon: ShieldCheck,
            title: 'Verify your identity to sign NDAs',
            text: 'Browsing is free. Before you can sign an NDA and see a company’s identity, we need to verify who you are (KYC).',
            cta: 'Verify my identity',
            className: 'border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100',
        },
    }[status];

    const Icon = content.icon;

    return (
        <div role="status" className={cn('flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center', content.className)}>
            <Icon className="size-6 shrink-0" aria-hidden="true" />
            <div className="flex-1">
                <div className="font-semibold">{content.title}</div>
                <p className="text-sm opacity-90">{content.text}</p>
            </div>
            <Button asChild variant="outline" className="shrink-0 bg-white/70 dark:bg-transparent">
                <Link href={route('verification.show', { redirect: route('buyer.dashboard', undefined, false) })}>{content.cta}</Link>
            </Button>
        </div>
    );
}

function nextStep(e: EngagementRow): { href: string; label: string } | null {
    if (e.stage === 'withdrawn') return null;
    if (!e.nda_signed) return { href: route('engagements.nda', e.id), label: 'Sign NDA' };
    if (!e.pack_unlocked) return { href: route('engagements.unlock', e.id), label: 'Unlock pack' };
    if (e.deal_room_id) return { href: route('deal-rooms.show', e.deal_room_id), label: 'Open deal room' };
    return { href: route('engagements.pack', e.id), label: 'View Details Pack' };
}

function EngagementItem({ engagement: e }: { engagement: EngagementRow }) {
    const next = nextStep(e);

    return (
        <li className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={e.stage} label={e.stage_label} />
                    <span className="text-muted-foreground text-xs">Ref. {e.listing.reference}</span>
                </div>
                {e.company_name ? (
                    <>
                        <div className="text-brand-ink mt-1.5 flex items-center gap-1.5 font-bold dark:text-white">
                            {e.company_name}
                            <BadgeCheck className="text-primary size-4" aria-label="Identity revealed under NDA" />
                        </div>
                        <div className="text-muted-foreground truncate text-sm">{e.listing.headline}</div>
                    </>
                ) : (
                    <Link
                        href={route('marketplace.show', e.listing.reference)}
                        className="text-brand-ink hover:text-primary mt-1.5 block font-bold dark:text-white"
                    >
                        {e.listing.headline}
                    </Link>
                )}
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>{e.listing.sector_label}</span>
                    <span>Asking {formatBD(e.listing.asking_price)}</span>
                    <span>Updated {timeAgo(e.last_activity_at)}</span>
                </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
                {e.deal_room_id && e.pack_unlocked && (
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('engagements.pack', e.id)}>Details Pack</Link>
                    </Button>
                )}
                {next ? (
                    <Button asChild size="sm" className="bg-brand-gradient shadow-brand">
                        <Link href={next.href}>
                            {next.label} <ArrowRight />
                        </Link>
                    </Button>
                ) : (
                    <span className="text-muted-foreground text-sm">Withdrawn</span>
                )}
            </div>
        </li>
    );
}

function PremiumCard({ premium }: { premium: Premium | null }) {
    const [subscribing, setSubscribing] = useState(false);

    if (premium) {
        const remaining = Math.max(0, premium.unlocks_included - premium.unlocks_used);
        const pct = premium.unlocks_included > 0 ? Math.min(100, (premium.unlocks_used / premium.unlocks_included) * 100) : 0;
        return (
            <div className="bg-card shadow-brand rounded-2xl border p-5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl text-white">
                            <Crown className="size-4" aria-hidden="true" />
                        </span>
                        <div className="text-brand-ink font-bold dark:text-white">Buyer Premium</div>
                    </div>
                    <StatusBadge tone="green" label="Active" />
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                    <span className="text-brand-ink text-3xl font-extrabold dark:text-white">{remaining}</span>
                    <span className="text-muted-foreground text-sm">
                        {premium.unlocks_used} of {premium.unlocks_included} used
                    </span>
                </div>
                <div className="text-muted-foreground text-sm">pack unlocks remaining</div>
                <div
                    className="bg-muted mt-3 h-2 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-label="Premium unlocks used"
                    aria-valuemin={0}
                    aria-valuemax={premium.unlocks_included}
                    aria-valuenow={premium.unlocks_used}
                >
                    <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-muted-foreground mt-4 text-xs">Active until {formatDate(premium.ends_at)}.</p>
            </div>
        );
    }

    return (
        <div className="bg-brand-gradient shadow-brand-lg relative overflow-hidden rounded-2xl p-5 text-white">
            <div aria-hidden="true" className="absolute -top-16 -right-16 size-44 rounded-full bg-white/10" />
            <div className="relative">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/20">
                    <Crown className="size-4" aria-hidden="true" />
                </span>
                <div className="mt-4 text-lg font-bold">Evaluating several targets?</div>
                <p className="mt-1 text-sm text-white/85">
                    Buyer Premium includes a monthly allowance of Company Details Pack unlocks, at a lower cost per company.
                </p>
                <Button
                    className="text-brand-ink mt-5 w-full bg-white hover:bg-white/90"
                    disabled={subscribing}
                    onClick={() =>
                        router.post(
                            route('buyer.premium.subscribe'),
                            {},
                            { onStart: () => setSubscribing(true), onFinish: () => setSubscribing(false) },
                        )
                    }
                >
                    {subscribing ? 'Redirecting to checkout…' : 'Activate Premium'}
                </Button>
                <Link href={route('pricing')} className="mt-3 block text-center text-sm text-white/85 underline-offset-4 hover:underline">
                    Compare plans
                </Link>
            </div>
        </div>
    );
}
