import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { formatBD } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Building2, Check, Crown, Gem, Info, KeyRound, LayoutGrid, Rocket, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type SellerTier = {
    name: string;
    monthly_price: number;
    features: string[];
};

type Props = {
    sellerTiers: Record<string, SellerTier>;
    buyer: {
        pack_unlock_price: number;
        premium_monthly_price: number;
        premium_monthly_unlocks: number;
    };
};

type Side = 'seller' | 'buyer';

const tierMeta: Record<string, { icon: LucideIcon; tagline: string; description: string }> = {
    standard: { icon: LayoutGrid, tagline: 'Perfect start', description: 'For owners taking their first confidential step into a sale.' },
    premium: { icon: Rocket, tagline: 'Best value', description: 'For established businesses that want priority exposure and support.' },
    enterprise: { icon: Gem, tagline: 'White glove', description: 'For high-value transactions that need a dedicated advisor.' },
};

export default function Pricing({ sellerTiers, buyer }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [side, setSide] = useState<Side>('seller');
    const [subscribing, setSubscribing] = useState(false);

    const sellHref = auth.user ? route('seller.companies.create') : route('register');

    const subscribe = () => {
        router.post(route('buyer.premium.subscribe'), {}, { onStart: () => setSubscribing(true), onFinish: () => setSubscribing(false) });
    };

    return (
        <PublicLayout title="Pricing">
            <section className="relative overflow-hidden">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]"
                />
                <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-6 text-center md:px-8">
                    <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                        <span className="text-brand-gradient">Choose your success plan</span>
                    </h1>
                    <p className="text-muted-foreground mt-4 text-lg">
                        Transparent pricing in Bahraini Dinar. Sellers pay a monthly listing plan; buyers browse free and pay only to unlock the
                        companies they want to pursue.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pt-4 pb-8 md:px-8">
                <div
                    role="group"
                    aria-label="Show plans for"
                    className="bg-card shadow-brand mx-auto grid max-w-md grid-cols-2 gap-1 rounded-2xl border p-1.5"
                >
                    <ToggleButton
                        active={side === 'seller'}
                        onClick={() => setSide('seller')}
                        icon={Building2}
                        label="Business sellers"
                        tone="green"
                    />
                    <ToggleButton active={side === 'buyer'} onClick={() => setSide('buyer')} icon={Target} label="Business buyers" tone="brand" />
                </div>

                <div className="mx-auto mt-10 mb-10 max-w-2xl text-center">
                    <h2 className="text-brand-ink text-2xl font-extrabold tracking-tight md:text-3xl dark:text-white">
                        {side === 'seller' ? 'Business listing plans' : 'Buyer access plans'}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        {side === 'seller'
                            ? 'Showcase your business confidentially. Every listing is reviewed before it goes live, so you connect with serious, verified buyers.'
                            : 'Find and acquire the right business. Registration and teaser browsing are free — verification and payment happen only when you request a specific company.'}
                    </p>
                </div>

                {side === 'seller' ? (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {Object.entries(sellerTiers).map(([key, tier]) => {
                            const meta = tierMeta[key] ?? { icon: LayoutGrid, tagline: '', description: '' };
                            const popular = key === 'premium';
                            return (
                                <PlanCard
                                    key={key}
                                    icon={meta.icon}
                                    name={tier.name}
                                    tagline={meta.tagline}
                                    description={meta.description}
                                    price={formatBD(tier.monthly_price, { compact: false })}
                                    period="per month"
                                    features={tier.features}
                                    highlighted={popular}
                                    badge={popular ? 'Recommended' : undefined}
                                    cta={
                                        <Button
                                            asChild
                                            size="lg"
                                            variant={popular ? 'default' : 'outline'}
                                            className={cn('w-full', popular && 'bg-brand-gradient shadow-brand')}
                                        >
                                            <Link href={sellHref}>{auth.user ? `Start with ${tier.name}` : 'Get started'}</Link>
                                        </Button>
                                    }
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-3">
                        <PlanCard
                            icon={Sparkles}
                            name="Free registration"
                            tagline="Explore"
                            description="Everything you need to discover opportunities."
                            price="BD 0"
                            period="always free"
                            features={[
                                'Browse all anonymised teasers',
                                'Set sector, location and deal-size preferences',
                                'Email alerts for matching listings',
                                'Request access to any listing',
                            ]}
                            cta={
                                <Button asChild size="lg" variant="outline" className="w-full">
                                    <Link href={auth.user ? route('buyer.preferences.edit') : route('register')}>
                                        {auth.user ? 'Set your preferences' : 'Register free'}
                                    </Link>
                                </Button>
                            }
                        />
                        <PlanCard
                            icon={KeyRound}
                            name="Per-company access"
                            tagline="Pay as you go"
                            description="Unlock one company's full Company Details Pack after signing its NDA."
                            price={formatBD(buyer.pack_unlock_price, { compact: false })}
                            period="one-time, per company"
                            features={[
                                'Company identity revealed under NDA',
                                'Valuation range and full financials',
                                'Legal and court / debt checks',
                                'Watermarked supporting documents',
                                'Access to the structured deal room',
                            ]}
                            cta={
                                <Button asChild size="lg" variant="outline" className="w-full">
                                    <Link href={route('marketplace.index')}>Browse listings</Link>
                                </Button>
                            }
                        />
                        <PlanCard
                            icon={Crown}
                            name="Buyer Premium"
                            tagline="For active acquirers"
                            description="Evaluate several targets each month at a lower cost per company."
                            price={formatBD(buyer.premium_monthly_price, { compact: false })}
                            period="per month"
                            features={[
                                `Unlock up to ${buyer.premium_monthly_unlocks} Details Packs per month`,
                                'Everything in per-company access',
                                'Use your unlocks on any live listing',
                                'Paid one month at a time — no long-term contract',
                            ]}
                            highlighted
                            badge="Best for multiple targets"
                            cta={
                                auth.user ? (
                                    <Button size="lg" className="bg-brand-gradient shadow-brand w-full" onClick={subscribe} disabled={subscribing}>
                                        {subscribing ? 'Redirecting to checkout…' : 'Activate Premium'}
                                    </Button>
                                ) : (
                                    <Button asChild size="lg" className="bg-brand-gradient shadow-brand w-full">
                                        <Link href={route('register')}>Register to activate</Link>
                                    </Button>
                                )
                            }
                        />
                    </div>
                )}

                <div className="bg-brand-lavender text-brand-ink mx-auto mt-10 flex max-w-3xl items-start gap-3 rounded-2xl border border-indigo-100 p-4 text-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-100">
                    <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {side === 'seller' ? (
                        <p>
                            All prices are in Bahraini Dinar and billed monthly. Your company is verified against its Commercial Registration and your
                            listing is reviewed by our compliance team before it is published as an anonymised teaser.
                        </p>
                    ) : (
                        <p>
                            All prices are in Bahraini Dinar. Identity verification (KYC) and a signed NDA are required before any company is
                            revealed. Escrow and completion payments are handled separately, later in the transaction.
                        </p>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

function ToggleButton({
    active,
    onClick,
    icon: Icon,
    label,
    tone,
}: {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
    tone: 'green' | 'brand';
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
                active
                    ? cn('shadow-brand text-white', tone === 'green' ? 'bg-brand-gradient-green' : 'bg-brand-gradient')
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            <Icon className="size-4" aria-hidden="true" />
            {label}
        </button>
    );
}

function PlanCard({
    icon: Icon,
    name,
    tagline,
    description,
    price,
    period,
    features,
    highlighted = false,
    badge,
    cta,
}: {
    icon: LucideIcon;
    name: string;
    tagline: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    highlighted?: boolean;
    badge?: string;
    cta: ReactNode;
}) {
    return (
        <div
            className={cn(
                'bg-card shadow-brand relative flex flex-col rounded-3xl border p-7',
                highlighted && 'border-primary shadow-brand-lg ring-primary/20 ring-4 lg:-translate-y-2',
            )}
        >
            {badge && (
                <span className="bg-brand-gradient shadow-brand absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap text-white">
                    {badge}
                </span>
            )}
            <div
                className={cn(
                    'flex size-12 items-center justify-center rounded-2xl',
                    highlighted ? 'bg-brand-gradient text-white' : 'bg-accent text-primary',
                )}
            >
                <Icon className="size-6" aria-hidden="true" />
            </div>
            <h3 className="text-brand-ink mt-5 text-xl font-extrabold dark:text-white">{name}</h3>
            {tagline && <div className="text-primary text-sm font-semibold">{tagline}</div>}
            <div className="mt-5 flex items-baseline gap-2">
                <span className="text-brand-ink text-4xl font-extrabold tracking-tight dark:text-white">{price}</span>
            </div>
            <div className="text-muted-foreground text-sm">{period}</div>
            {description && <p className="text-muted-foreground mt-4 text-sm">{description}</p>}
            <ul className="mt-6 mb-8 space-y-3 text-sm">
                {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                        <span className="bg-brand-green/15 text-brand-green mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                            <Check className="size-3.5" aria-hidden="true" />
                        </span>
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-auto">{cta}</div>
        </div>
    );
}
