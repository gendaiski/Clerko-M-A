import { BrandMark } from '@/components/clerko/brand-logo';
import { EmptyState } from '@/components/clerko/empty-state';
import { ListingCard } from '@/components/clerko/listing-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { formatBD } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type SharedData, type Teaser } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    Check,
    FileSignature,
    Fingerprint,
    Handshake,
    Layers,
    Lock,
    MessagesSquare,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Target,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

type Props = {
    featured: Teaser[];
    stats: { live_listings: number; sectors: number };
};

type Side = 'seller' | 'buyer';

const trust: { icon: LucideIcon; title: string; text: string; tile: string }[] = [
    {
        icon: ShieldCheck,
        title: 'Secure & confidential',
        text: 'Listings stay anonymised. Your company is never named on the public marketplace.',
        tile: 'bg-brand-gradient-green',
    },
    {
        icon: FileSignature,
        title: 'NDA-gated disclosure',
        text: 'Identity, financials and documents are released only after a signed NDA.',
        tile: 'bg-linear-to-br from-blue-500 to-blue-600',
    },
    {
        icon: BadgeCheck,
        title: 'Verified members',
        text: 'Buyers pass KYC and sellers verify their Commercial Registration before they engage.',
        tile: 'bg-linear-to-br from-violet-500 to-violet-600',
    },
    {
        icon: MessagesSquare,
        title: 'Structured deal room',
        text: 'Q&A, staged document release and indicative offers, all in one audited space.',
        tile: 'bg-linear-to-br from-orange-400 to-orange-500',
    },
];

const journeys: Record<Side, { heading: string; lead: string; steps: { icon: LucideIcon; title: string; text: string }[] }> = {
    seller: {
        heading: 'Sell with confidence',
        lead: 'Reach serious, verified buyers without revealing who you are until you are ready.',
        steps: [
            {
                icon: Fingerprint,
                title: 'Verify your company',
                text: 'Upload your CR certificate and complete identity checks. We confirm you are authorised to sell.',
            },
            {
                icon: Layers,
                title: 'Build your listing',
                text: 'Prepare an anonymised teaser and a confidential Company Details Pack with financials and documents.',
            },
            {
                icon: SlidersHorizontal,
                title: 'Choose a tier & go live',
                text: 'Pick the visibility you need. Our team reviews every listing before it is published.',
            },
            {
                icon: Handshake,
                title: 'Meet qualified buyers',
                text: 'Track NDA-bound interest and negotiate in a structured deal room.',
            },
        ],
    },
    buyer: {
        heading: 'Acquire with clarity',
        lead: 'Browse for free, then go deeper only on the businesses that fit your strategy.',
        steps: [
            {
                icon: Target,
                title: 'Set your preferences',
                text: 'Register free and tell us your sectors, locations and deal size to receive matching alerts.',
            },
            {
                icon: Search,
                title: 'Discover opportunities',
                text: 'Browse anonymised teasers with key figures: asking price, revenue and growth.',
            },
            {
                icon: FileSignature,
                title: 'Verify & sign the NDA',
                text: 'Complete KYC and sign the NDA digitally. The company’s identity is revealed to you.',
            },
            {
                icon: Lock,
                title: 'Unlock the Details Pack',
                text: 'Access valuation, financials, legal and court/debt checks, then open the deal room.',
            },
        ],
    },
};

export default function Welcome({ featured, stats }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [side, setSide] = useState<Side>('seller');
    const sellHref = auth.user ? route('seller.companies.create') : route('register');
    const journey = journeys[side];
    const sample = featured[0];

    return (
        <PublicLayout title="Bahrain's confidential M&A marketplace">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_380px_at_85%_10%,rgba(99,102,241,0.14),transparent_70%)]"
                />
                <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
                    <div>
                        <span className="bg-brand-gradient shadow-brand inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white">
                            <ShieldCheck className="size-4" /> Bahrain's confidential M&amp;A marketplace
                        </span>
                        <h1 className="text-brand-ink mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl dark:text-white">
                            The Future of <span className="text-brand-gradient">M&amp;A is Here</span>
                        </h1>
                        <p className="text-muted-foreground mt-6 max-w-xl text-lg">
                            Connect verified buyers and sellers of Bahraini businesses.{' '}
                            <strong className="text-foreground font-semibold">
                                Anonymised listings, NDA-gated disclosure and a structured deal room
                            </strong>{' '}
                            — from first look to agreed headline terms.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button
                                asChild
                                size="lg"
                                className="bg-brand-gradient-green px-6 text-white shadow-[0_10px_22px_rgba(16,185,129,0.3)] hover:opacity-95"
                            >
                                <Link href={sellHref}>
                                    <Building2 /> Sell your business <ArrowRight />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="px-6">
                                <Link href={route('marketplace.index')}>
                                    <Search /> Find opportunities
                                </Link>
                            </Button>
                        </div>
                        {stats.live_listings > 0 && (
                            <dl className="text-muted-foreground mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="bg-brand-green size-2 rounded-full" aria-hidden="true" />
                                    <dt className="sr-only">Live listings</dt>
                                    <dd>
                                        <strong className="text-foreground">{stats.live_listings}</strong> live{' '}
                                        {stats.live_listings === 1 ? 'listing' : 'listings'}
                                    </dd>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-blue-500" aria-hidden="true" />
                                    <dt className="sr-only">Sectors</dt>
                                    <dd>
                                        <strong className="text-foreground">{stats.sectors}</strong> {stats.sectors === 1 ? 'sector' : 'sectors'}
                                    </dd>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-violet-500" aria-hidden="true" />
                                    <dt className="sr-only">Membership</dt>
                                    <dd>KYC-verified members</dd>
                                </div>
                            </dl>
                        )}
                    </div>

                    <HeroVisual sample={sample} />
                </div>
            </section>

            {/* Trust features */}
            <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
                <SectionHeading
                    title="Everything you need to close the deal"
                    text="Built for Bahrain's M&A market — from discovery to agreed terms."
                />
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {trust.map(({ icon: Icon, title, text, tile }) => (
                        <div key={title} className="bg-card shadow-brand rounded-2xl border p-6">
                            <div className={cn('flex size-12 items-center justify-center rounded-xl text-white', tile)}>
                                <Icon className="size-6" aria-hidden="true" />
                            </div>
                            <h3 className="text-brand-ink mt-5 text-lg font-bold dark:text-white">{title}</h3>
                            <p className="text-muted-foreground mt-1.5 text-sm">{text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="bg-brand-lavender dark:bg-muted/30">
                <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
                    <SectionHeading title="How it works" text="A guided journey whichever side of the deal you're on." />
                    <div
                        role="group"
                        aria-label="Choose a journey"
                        className="bg-card shadow-brand mx-auto mt-8 grid max-w-xl grid-cols-2 gap-1 rounded-2xl border p-1.5"
                    >
                        <SideButton
                            active={side === 'seller'}
                            onClick={() => setSide('seller')}
                            tone="green"
                            icon={Building2}
                            label="Business sellers"
                        />
                        <SideButton active={side === 'buyer'} onClick={() => setSide('buyer')} tone="brand" icon={Target} label="Business buyers" />
                    </div>

                    <div
                        className={cn(
                            'shadow-brand-lg mt-8 rounded-3xl p-6 text-white transition-colors md:p-10',
                            side === 'seller' ? 'bg-brand-gradient-green' : 'bg-brand-gradient',
                        )}
                    >
                        <div className="max-w-2xl">
                            <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">{journey.heading}</h3>
                            <p className="mt-2 text-white/85">{journey.lead}</p>
                        </div>
                        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {journey.steps.map(({ icon: Icon, title, text }, i) => (
                                <li key={title} className="rounded-2xl bg-white/12 p-5 ring-1 ring-white/20 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="flex size-10 items-center justify-center rounded-xl bg-white/20">
                                            <Icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <span className="text-xs font-semibold tracking-wide text-white/75 uppercase">Step {i + 1} of 4</span>
                                    </div>
                                    <div className="mt-4 font-bold">{title}</div>
                                    <p className="mt-1 text-sm text-white/85">{text}</p>
                                </li>
                            ))}
                        </ol>
                        <div className="mt-8">
                            {side === 'seller' ? (
                                <Button asChild variant="secondary" className="text-brand-ink bg-white hover:bg-white/90">
                                    <Link href={sellHref}>
                                        Start your listing <ArrowRight />
                                    </Link>
                                </Button>
                            ) : (
                                <Button asChild variant="secondary" className="text-brand-ink bg-white hover:bg-white/90">
                                    <Link href={auth.user ? route('buyer.preferences.edit') : route('register')}>
                                        Set your preferences <ArrowRight />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured listings */}
            <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-brand-ink text-3xl font-extrabold tracking-tight dark:text-white">
                            Featured <span className="text-brand-gradient">opportunities</span>
                        </h2>
                        <p className="text-muted-foreground mt-2">Anonymised teasers from verified sellers. Names are revealed only under NDA.</p>
                    </div>
                    {featured.length > 0 && (
                        <Button asChild variant="outline">
                            <Link href={route('marketplace.index')}>
                                View all listings <ArrowRight />
                            </Link>
                        </Button>
                    )}
                </div>
                <div className="mt-8">
                    {featured.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {featured.map((listing) => (
                                <ListingCard key={listing.id} listing={listing} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Building2}
                            title="New opportunities are on their way"
                            description="Listings appear here once they pass our compliance review. Set your preferences to be alerted as soon as a matching business goes live."
                            action={
                                <Button asChild className="bg-brand-gradient shadow-brand">
                                    <Link href={auth.user ? route('buyer.preferences.edit') : route('register')}>Get matching alerts</Link>
                                </Button>
                            }
                        />
                    )}
                </div>
            </section>

            {/* Closing CTA */}
            <section className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
                <div className="bg-brand-gradient shadow-brand-lg relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white md:px-16">
                    <div aria-hidden="true" className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10" />
                    <div aria-hidden="true" className="absolute -bottom-28 -left-20 size-72 rounded-full bg-white/5" />
                    <div className="relative">
                        <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Ready to make your next deal?</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-white/85">
                            Join Bahrain's M&amp;A marketplace and connect with verified buyers and sellers — confidentially.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <Button asChild size="lg" className="bg-brand-ink hover:bg-brand-ink/90 px-6 text-white">
                                <Link href={auth.user ? route('dashboard') : route('register')}>
                                    {auth.user ? 'Go to my workspace' : 'Get started free'}
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="border-white/40 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                            >
                                <Link href={route('marketplace.index')}>Browse the marketplace</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}

function SectionHeading({ title, text }: { title: string; text: string }) {
    return (
        <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-brand-ink text-3xl font-extrabold tracking-tight dark:text-white">{title}</h2>
            <p className="text-muted-foreground mt-3">{text}</p>
        </div>
    );
}

function SideButton({
    active,
    onClick,
    tone,
    icon: Icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    tone: 'green' | 'brand';
    icon: LucideIcon;
    label: string;
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
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
        >
            <Icon className="size-4" aria-hidden="true" />
            {label}
        </button>
    );
}

/** Illustrative preview of the disclosure journey (uses a real featured teaser when available). */
function HeroVisual({ sample }: { sample?: Teaser }) {
    const steps = [
        { label: 'Anonymised teaser', hint: 'Browse free', done: true },
        { label: 'Identity verified', hint: 'KYC', done: true },
        { label: 'NDA signed', hint: 'Company revealed', done: true },
        { label: 'Company Details Pack', hint: 'Financials & checks', done: false },
        { label: 'Deal room', hint: 'Q&A and offers', done: false },
    ];

    return (
        <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
            <div className="bg-card shadow-brand-lg rounded-3xl border p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <BrandMark className="size-8" />
                        <div>
                            <div className="text-sm font-bold">{sample ? sample.sector_label : 'Confidential listing'}</div>
                            <div className="text-muted-foreground text-xs">{sample ? `Ref. ${sample.reference}` : 'Anonymised teaser'}</div>
                        </div>
                    </div>
                    <StatusBadge tone="amber" label="Identity gated" />
                </div>
                <div className="mt-5 text-lg leading-snug font-bold">{sample ? sample.headline : 'Established Bahraini business'}</div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-brand-gradient rounded-2xl p-4 text-white">
                        <div className="text-xl font-extrabold">{sample ? formatBD(sample.asking_price) : '•••'}</div>
                        <div className="text-xs text-white/80">Asking price</div>
                    </div>
                    <div className="bg-brand-gradient-green rounded-2xl p-4 text-white">
                        <div className="text-xl font-extrabold">{sample ? formatBD(sample.annual_revenue) : '•••'}</div>
                        <div className="text-xs text-white/80">Annual revenue</div>
                    </div>
                </div>
                <ol className="mt-5 space-y-2.5">
                    {steps.map((step) => (
                        <li key={step.label} className="flex items-center gap-3 text-sm">
                            <span
                                className={cn(
                                    'flex size-6 shrink-0 items-center justify-center rounded-full',
                                    step.done ? 'bg-brand-green text-white' : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {step.done ? <Check className="size-3.5" /> : <Lock className="size-3" />}
                            </span>
                            <span className={cn('font-medium', !step.done && 'text-muted-foreground')}>{step.label}</span>
                            <span className="text-muted-foreground ml-auto text-xs">{step.hint}</span>
                        </li>
                    ))}
                </ol>
            </div>
            <div className="bg-card shadow-brand absolute -top-5 -right-3 hidden items-center gap-3 rounded-2xl border px-4 py-3 sm:flex">
                <span className="bg-brand-gradient-green flex size-9 items-center justify-center rounded-xl text-white">
                    <FileSignature className="size-4" />
                </span>
                <div className="text-sm">
                    <div className="font-bold">NDA signed</div>
                    <div className="text-muted-foreground text-xs">Identity revealed to buyer</div>
                </div>
            </div>
            <div className="bg-card shadow-brand absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border px-4 py-3 sm:flex">
                <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl text-white">
                    <ShieldCheck className="size-4" />
                </span>
                <div className="text-sm">
                    <div className="font-bold">Watermarked &amp; logged</div>
                    <div className="text-muted-foreground text-xs">Every document view</div>
                </div>
            </div>
        </div>
    );
}
