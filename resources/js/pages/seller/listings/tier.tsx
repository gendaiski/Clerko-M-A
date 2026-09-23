import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SellerJourney } from '@/components/clerko/seller-journey';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader2, Search, ShieldCheck } from 'lucide-react';
import { type ReactNode, useState } from 'react';

type Tier = {
    name: string;
    monthly_price: number;
    features: string[];
};

type Props = {
    listing: { id: number; reference: string; headline: string };
    tiers: Record<string, Tier>;
};

const POPULAR = 'premium';

export default function TierSelect({ listing, tiers }: Props) {
    const keys = Object.keys(tiers);
    const [selected, setSelected] = useState<string>(keys.includes(POPULAR) ? POPULAR : (keys[0] ?? ''));
    const [processing, setProcessing] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Seller dashboard', href: route('seller.dashboard') },
        { title: listing.reference, href: route('seller.listings.show', listing.id) },
        { title: 'Choose tier', href: route('seller.listings.tier', listing.id) },
    ];

    const submit = () => {
        if (!selected) {
            return;
        }
        router.post(
            route('seller.listings.tier.store', listing.id),
            { tier: selected },
            { onStart: () => setProcessing(true), onFinish: () => setProcessing(false) },
        );
    };

    const chosen = tiers[selected];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Choose your tier" />
            <PageBody>
                <SellerJourney current={2} />

                <PageHeader
                    eyebrow={`Step 3 · Tier · ${listing.reference}`}
                    title="Choose your subscription tier"
                    description="Higher tiers unlock more visibility, valuation & documentation support, and closer involvement from our team."
                />

                <div role="radiogroup" aria-label="Subscription tier" className="grid gap-4 md:grid-cols-3">
                    {keys.map((key) => {
                        const tier = tiers[key];
                        const isSelected = selected === key;
                        const popular = key === POPULAR;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => setSelected(key)}
                                className={cn(
                                    'bg-card focus-visible:ring-ring shadow-brand relative flex flex-col rounded-2xl border-2 p-6 text-left transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                                    isSelected ? 'border-primary shadow-brand-lg -translate-y-0.5' : 'hover:border-primary/40 border-transparent',
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h2 className="text-brand-ink flex flex-wrap items-center gap-2 text-lg font-bold dark:text-white">
                                        {tier.name}
                                        {popular && <StatusBadge tone="indigo" label="Popular" />}
                                    </h2>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition',
                                            isSelected ? 'bg-brand-gradient border-transparent text-white' : 'border-muted-foreground/30',
                                        )}
                                    >
                                        {isSelected && <Check className="size-3.5" />}
                                    </span>
                                </div>
                                <div className="mt-4">
                                    <span className="text-brand-ink text-3xl font-extrabold tracking-tight dark:text-white">
                                        {formatBD(tier.monthly_price, { compact: false })}
                                    </span>
                                    <span className="text-muted-foreground text-sm"> / month</span>
                                </div>
                                <ul className="mt-5 space-y-2.5 text-sm">
                                    {tier.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2">
                                            <Check className="text-brand-green mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        );
                    })}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <InfoCard icon={CreditCard} title="Billed monthly via Tap">
                        Pay securely by card, BENEFIT or Apple Pay. You are redirected to Tap's hosted checkout and back.
                    </InfoCard>
                    <InfoCard icon={Search} title="Then admin review">
                        After payment your listing goes to our team for review. Nothing is public until it's approved.
                    </InfoCard>
                    <InfoCard icon={ShieldCheck} title="Identity required">
                        If you haven't verified your identity yet, we'll ask you to do so before checkout.
                    </InfoCard>
                </div>

                <div className="bg-card shadow-brand flex flex-col-reverse gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button asChild variant="outline">
                        <Link href={route('seller.listings.show', listing.id)}>
                            <ArrowLeft /> Back
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {chosen && (
                            <div className="text-muted-foreground text-sm" aria-live="polite">
                                <span className="text-foreground font-semibold">{chosen.name}</span> ·{' '}
                                {formatBD(chosen.monthly_price, { compact: false })} per month
                            </div>
                        )}
                        <Button onClick={submit} disabled={!selected || processing} className="bg-brand-gradient-green shadow-brand">
                            {processing && <Loader2 className="animate-spin" />}
                            Continue to payment <ArrowRight />
                        </Button>
                    </div>
                </div>
            </PageBody>
        </AppLayout>
    );
}

function InfoCard({ icon: Icon, title, children }: { icon: typeof CreditCard; title: string; children: ReactNode }) {
    return (
        <div className="bg-card flex gap-3 rounded-2xl border p-4">
            <div className="bg-brand-lavender text-primary flex size-9 shrink-0 items-center justify-center rounded-xl dark:bg-indigo-500/10">
                <Icon className="size-4" aria-hidden="true" />
            </div>
            <div>
                <div className="text-foreground text-sm font-semibold">{title}</div>
                <p className="text-muted-foreground mt-0.5 text-sm">{children}</p>
            </div>
        </div>
    );
}
