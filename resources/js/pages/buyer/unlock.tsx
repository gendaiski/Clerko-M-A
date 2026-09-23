import { BuyerJourney } from '@/components/clerko/buyer-journey';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Teaser } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BadgeCheck, BellRing, Crown, Download, FileText, KeyRound, LoaderCircle, Lock, Scale, TrendingUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';

type Props = {
    engagement: { id: number };
    listing: Teaser;
    companyName: string;
    prices: {
        pack_unlock_price: number;
        premium_monthly_price: number;
        premium_monthly_unlocks: number;
    };
    premium: {
        unlocks_used: number;
        unlocks_included: number;
        ends_at: string;
    } | null;
};

type Action = 'pay' | 'premium' | 'subscribe';

export default function BuyerUnlock({ engagement, listing, companyName, prices, premium }: Props) {
    const [busy, setBusy] = useState<Action | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Buyer dashboard', href: route('buyer.dashboard') },
        { title: companyName, href: route('marketplace.show', listing.reference) },
        { title: 'Unlock', href: route('engagements.unlock', engagement.id) },
    ];

    const post = (action: Action, url: string) => {
        router.post(url, {}, { preserveScroll: true, onStart: () => setBusy(action), onFinish: () => setBusy(null) });
    };

    const remaining = premium ? Math.max(0, premium.unlocks_included - premium.unlocks_used) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Unlock — ${companyName}`} />
            <PageBody className="max-w-5xl">
                <BuyerJourney current={3} />

                <PageHeader
                    eyebrow="Step 4 · Unlock"
                    title="Unlock the Company Details Pack"
                    description="Pay a one-time access fee for this company, or use Buyer Premium to unlock several companies each month."
                />

                <div className="bg-card shadow-brand flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
                    <span className="bg-brand-gradient-green flex size-12 shrink-0 items-center justify-center rounded-2xl text-white">
                        <BadgeCheck className="size-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status="nda_signed" label="NDA signed · identity revealed" />
                            <span className="text-muted-foreground text-xs">Listing {listing.reference}</span>
                        </div>
                        <div className="text-brand-ink mt-1.5 text-xl font-extrabold tracking-tight dark:text-white">{companyName}</div>
                        <div className="text-muted-foreground truncate text-sm">
                            {listing.headline} · {listing.sector_label} · Asking {formatBD(listing.asking_price)}
                        </div>
                    </div>
                    <Button asChild variant="outline" className="shrink-0">
                        <a href={route('engagements.nda.pdf', engagement.id)} target="_blank" rel="noopener">
                            <Download /> Signed NDA (PDF)
                        </a>
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <OptionCard
                        tag="Per-company access"
                        price={formatBD(prices.pack_unlock_price, { compact: false })}
                        suffix="one-time"
                        description={`Unlock ${companyName}'s full Details Pack with a single payment.`}
                        features={[
                            { icon: TrendingUp, text: 'Valuation range and full financials' },
                            { icon: Scale, text: 'Legal and court / debt checks' },
                            { icon: FileText, text: 'Supporting documents (watermarked)' },
                        ]}
                        action={
                            <Button
                                size="lg"
                                className="bg-brand-gradient shadow-brand w-full"
                                disabled={busy !== null}
                                onClick={() => post('pay', route('engagements.unlock.pay', engagement.id))}
                            >
                                {busy === 'pay' ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
                                Pay {formatBD(prices.pack_unlock_price, { compact: false })} &amp; unlock
                            </Button>
                        }
                    />

                    <OptionCard
                        highlighted
                        tag={premium ? 'Your Premium plan' : 'Buyer Premium'}
                        price={premium ? `${remaining} left` : formatBD(prices.premium_monthly_price, { compact: false })}
                        suffix={premium ? `of ${premium.unlocks_included} this period` : 'per month'}
                        description={
                            premium
                                ? `Your plan is active until ${formatDate(premium.ends_at)}. Using an unlock is instant — no payment needed.`
                                : 'Unlock several companies each month at a lower cost per company.'
                        }
                        features={[
                            { icon: KeyRound, text: `Up to ${prices.premium_monthly_unlocks} Details Pack unlocks per month` },
                            { icon: Lock, text: 'Everything in per-company access' },
                            { icon: BadgeCheck, text: 'Use your unlocks on any live listing' },
                        ]}
                        action={
                            premium ? (
                                remaining > 0 ? (
                                    <Button
                                        size="lg"
                                        className="bg-brand-gradient shadow-brand w-full"
                                        disabled={busy !== null}
                                        onClick={() => post('premium', route('engagements.unlock.premium', engagement.id))}
                                    >
                                        {busy === 'premium' ? <LoaderCircle className="animate-spin" /> : <Crown />}
                                        Use 1 of your {remaining} remaining unlocks
                                    </Button>
                                ) : (
                                    <div className="space-y-2">
                                        <Button size="lg" variant="outline" className="w-full" disabled>
                                            All unlocks used this period
                                        </Button>
                                        <p className="text-muted-foreground text-center text-xs">
                                            Pay per company instead — your plan runs until {formatDate(premium.ends_at)}.
                                        </p>
                                    </div>
                                )
                            ) : (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-primary text-primary hover:text-primary w-full"
                                    disabled={busy !== null}
                                    onClick={() => post('subscribe', route('buyer.premium.subscribe'))}
                                >
                                    {busy === 'subscribe' ? <LoaderCircle className="animate-spin" /> : <Crown />}
                                    Activate Premium
                                </Button>
                            )
                        }
                    />
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>
                        When you unlock, the seller is notified that a qualified, NDA-bound buyer has accessed the pack. The access fee covers
                        information only — <strong className="font-semibold">escrow and deposit payments are handled later, at completion.</strong>
                    </p>
                </div>
            </PageBody>
        </AppLayout>
    );
}

function OptionCard({
    tag,
    price,
    suffix,
    description,
    features,
    action,
    highlighted = false,
}: {
    tag: string;
    price: string;
    suffix: string;
    description: string;
    features: { icon: typeof KeyRound; text: string }[];
    action: ReactNode;
    highlighted?: boolean;
}) {
    return (
        <section className={cn('bg-card shadow-brand flex flex-col rounded-3xl border p-6', highlighted && 'border-primary ring-primary/15 ring-4')}>
            <span
                className={cn(
                    'self-start rounded-full px-3 py-1 text-xs font-semibold',
                    highlighted ? 'bg-brand-gradient text-white' : 'bg-accent text-accent-foreground',
                )}
            >
                {tag}
            </span>
            <div className="mt-4 flex items-baseline gap-2">
                <span className="text-brand-ink text-4xl font-extrabold tracking-tight dark:text-white">{price}</span>
                <span className="text-muted-foreground text-sm">{suffix}</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">{description}</p>
            <ul className="mt-5 mb-6 space-y-3 text-sm">
                {features.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5">
                        <Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {text}
                    </li>
                ))}
            </ul>
            <div className="mt-auto">{action}</div>
        </section>
    );
}
