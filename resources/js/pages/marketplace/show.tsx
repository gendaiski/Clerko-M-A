import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { formatBD, formatDate, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type SharedData, type Teaser } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Building2,
    CalendarDays,
    Check,
    CircleCheck,
    Eye,
    FileSignature,
    Handshake,
    Lock,
    MapPin,
    Sparkles,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

type Engagement = {
    id: number;
    stage: string;
    nda_signed: boolean;
    pack_unlocked: boolean;
    deal_room_id: number | null;
};

type Props = {
    listing: Teaser;
    isOwner: boolean;
    engagement: Engagement | null;
};

export default function MarketplaceShow({ listing, isOwner, engagement }: Props) {
    return (
        <PublicLayout title={listing.headline}>
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
                <Link
                    href={route('marketplace.index')}
                    className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Back to marketplace
                </Link>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <article className="bg-card shadow-brand rounded-3xl border p-6 md:p-8">
                        <div className="flex flex-wrap items-center gap-2">
                            {listing.verified && <StatusBadge tone="green" label="✓ Verified company" />}
                            <StatusBadge tone="amber" label="Identity gated" />
                            {listing.featured && <StatusBadge tone="purple" label="Featured" />}
                            {listing.tier && listing.tier !== 'standard' && (
                                <StatusBadge tone="indigo" label={`${listing.tier[0].toUpperCase()}${listing.tier.slice(1)} listing`} />
                            )}
                            <span className="text-muted-foreground ml-auto text-xs">Ref. {listing.reference}</span>
                        </div>

                        <div className="text-primary mt-6 text-xs font-semibold tracking-wide uppercase">{listing.sector_label}</div>
                        <h1 className="text-brand-ink mt-1 text-3xl leading-tight font-extrabold tracking-tight md:text-4xl dark:text-white">
                            {listing.headline}
                        </h1>
                        <p className="text-muted-foreground mt-4 text-base leading-relaxed whitespace-pre-line">{listing.teaser_summary}</p>

                        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                            <Figure label="Asking price" value={formatBD(listing.asking_price)} highlight />
                            <Figure label="Annual revenue" value={formatBD(listing.annual_revenue)} />
                            <Figure
                                label="Year-on-year growth"
                                value={formatPct(listing.growth_pct)}
                                valueClassName={
                                    listing.growth_pct !== null && listing.growth_pct > 0 ? 'text-emerald-600 dark:text-emerald-400' : undefined
                                }
                            />
                        </dl>

                        {listing.highlights.length > 0 && (
                            <section className="mt-8">
                                <h2 className="text-brand-ink font-bold dark:text-white">Investment highlights</h2>
                                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                                    {listing.highlights.map((h) => (
                                        <li key={h} className="flex items-start gap-2.5 text-sm">
                                            <CircleCheck className="text-brand-green mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                            <span>{h}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <section className="mt-8">
                            <h2 className="text-brand-ink font-bold dark:text-white">At a glance</h2>
                            <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Fact icon={Building2} label="Sector" value={listing.sector_label} />
                                <Fact icon={Users} label="Size" value={listing.employees_label} />
                                <Fact icon={MapPin} label="Location" value={listing.location_label} />
                                <Fact icon={CalendarDays} label="Established" value={listing.established_year ?? '—'} />
                                <Fact icon={Handshake} label="Deal type" value={listing.deal_preference_label} />
                                <Fact icon={Eye} label="Listed" value={formatDate(listing.published_at)} />
                            </dl>
                        </section>

                        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>
                                <strong className="font-semibold">This teaser is anonymised.</strong> The company name, detailed financials,
                                valuation, legal checks and documents unlock after you verify your identity, sign the NDA and pay the access fee (or
                                use a Buyer Premium unlock).
                            </p>
                        </div>
                    </article>

                    <aside className="space-y-4 lg:sticky lg:top-24">
                        <AccessCard listing={listing} isOwner={isOwner} engagement={engagement} />
                        <div className="bg-card shadow-brand rounded-2xl border p-5 text-sm">
                            <div className="text-brand-ink font-bold dark:text-white">How access works</div>
                            <ol className="text-muted-foreground mt-3 space-y-2.5">
                                <li className="flex gap-2.5">
                                    <StepDot n={1} /> Verify your identity (KYC) — once, for all listings.
                                </li>
                                <li className="flex gap-2.5">
                                    <StepDot n={2} /> Sign the NDA digitally — the company is revealed to you.
                                </li>
                                <li className="flex gap-2.5">
                                    <StepDot n={3} /> Unlock the Company Details Pack, then open the deal room.
                                </li>
                            </ol>
                            <Link href={route('pricing')} className="text-primary mt-4 inline-block font-semibold hover:underline">
                                See buyer pricing
                            </Link>
                        </div>
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}

function AccessCard({ listing, isOwner, engagement }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [requesting, setRequesting] = useState(false);

    const requestAccess = () => {
        router.post(route('engagements.store', listing.reference), {}, { onStart: () => setRequesting(true), onFinish: () => setRequesting(false) });
    };

    let body: ReactNode;

    if (!auth.user) {
        body = (
            <>
                <p className="text-muted-foreground text-sm">Sign in or create a free buyer account to request access and sign the NDA.</p>
                <div className="mt-5 space-y-2.5">
                    <Button asChild size="lg" className="bg-brand-gradient shadow-brand w-full">
                        <Link href={route('login')}>Sign in to request access</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="w-full">
                        <Link href={route('register')}>Create a free account</Link>
                    </Button>
                </div>
            </>
        );
    } else if (isOwner) {
        return (
            <div className="bg-card shadow-brand rounded-2xl border p-6">
                <div className="flex items-center gap-2">
                    <BadgeCheck className="text-primary size-5" aria-hidden="true" />
                    <h2 className="text-brand-ink text-lg font-bold dark:text-white">This is your listing</h2>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                    This is how buyers see your anonymised teaser. Manage it and follow buyer interest from your seller workspace.
                </p>
                <Button asChild size="lg" className="bg-brand-gradient shadow-brand mt-5 w-full">
                    <Link href={route('seller.listings.show', listing.id)}>
                        Manage listing <ArrowRight />
                    </Link>
                </Button>
            </div>
        );
    } else if (!engagement) {
        body = (
            <>
                <p className="text-muted-foreground text-sm">
                    Sign the NDA to reveal the company's identity, then unlock the full Company Details Pack.
                </p>
                <div className="mt-5 space-y-2.5">
                    <Button size="lg" className="bg-brand-gradient shadow-brand w-full" onClick={requestAccess} disabled={requesting}>
                        <FileSignature /> {requesting ? 'Requesting…' : 'Request access & sign NDA'}
                    </Button>
                    <Button asChild size="lg" variant="outline" className="w-full">
                        <Link href={route('buyer.preferences.edit')}>Get alerts for similar listings</Link>
                    </Button>
                </div>
                <p className="text-muted-foreground mt-3 text-xs">
                    The seller is notified of your request. You appear only under your anonymous buyer alias.
                </p>
            </>
        );
    } else if (engagement.stage === 'withdrawn') {
        body = (
            <>
                <p className="text-muted-foreground text-sm">
                    You withdrew from this opportunity. Your history remains available in your buyer workspace.
                </p>
                <Button asChild size="lg" variant="outline" className="mt-5 w-full">
                    <Link href={route('buyer.dashboard')}>Go to my acquisitions</Link>
                </Button>
            </>
        );
    } else {
        const next = !engagement.nda_signed
            ? {
                  href: route('engagements.nda', engagement.id),
                  label: 'Continue to the NDA',
                  hint: 'Your request is open. Sign the NDA to reveal the company.',
              }
            : !engagement.pack_unlocked
              ? {
                    href: route('engagements.unlock', engagement.id),
                    label: 'Unlock the Details Pack',
                    hint: 'NDA signed. Unlock the Company Details Pack to continue.',
                }
              : engagement.deal_room_id
                ? {
                      href: route('deal-rooms.show', engagement.deal_room_id),
                      label: 'Open Deal Room',
                      hint: 'Your deal room with the seller is open.',
                  }
                : {
                      href: route('engagements.pack', engagement.id),
                      label: 'Open Company Details Pack',
                      hint: 'You have full access to this company’s Details Pack.',
                  };

        body = (
            <>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-sm">Your status</span>
                    <StatusBadge status={engagement.stage} />
                </div>
                <ol className="mt-4 space-y-2 text-sm">
                    <Progress done label="Access requested" />
                    <Progress done={engagement.nda_signed} label="NDA signed — identity revealed" />
                    <Progress done={engagement.pack_unlocked} label="Company Details Pack unlocked" />
                </ol>
                <p className="text-muted-foreground mt-4 text-sm">{next.hint}</p>
                <Button asChild size="lg" className="bg-brand-gradient shadow-brand mt-4 w-full">
                    <Link href={next.href}>
                        {next.label} <ArrowRight />
                    </Link>
                </Button>
            </>
        );
    }

    return (
        <div className="bg-card shadow-brand-lg rounded-2xl border p-6">
            <div className="flex items-center gap-2">
                <Sparkles className="text-primary size-5" aria-hidden="true" />
                <h2 className="text-brand-ink text-lg font-bold dark:text-white">Ready to go deeper?</h2>
            </div>
            <div className="mt-2">{body}</div>
        </div>
    );
}

function Figure({ label, value, highlight = false, valueClassName }: { label: string; value: string; highlight?: boolean; valueClassName?: string }) {
    return (
        <div className={cn('rounded-2xl p-4', highlight ? 'bg-brand-gradient shadow-brand text-white' : 'bg-muted')}>
            <dt className={cn('text-xs font-medium', highlight ? 'text-white/80' : 'text-muted-foreground')}>{label}</dt>
            <dd className={cn('mt-1 text-2xl font-extrabold tracking-tight', !highlight && 'text-brand-ink dark:text-white', valueClassName)}>
                {value}
            </dd>
        </div>
    );
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="bg-accent text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="text-sm font-semibold">{value}</dd>
            </div>
        </div>
    );
}

function StepDot({ n }: { n: number }) {
    return <span className="bg-accent text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">{n}</span>;
}

function Progress({ done, label }: { done: boolean; label: string }) {
    return (
        <li className="flex items-center gap-2.5">
            <span
                className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-brand-green text-white' : 'bg-muted text-muted-foreground',
                )}
            >
                {done ? <Check className="size-3" aria-hidden="true" /> : <Lock className="size-2.5" aria-hidden="true" />}
            </span>
            <span className={cn(!done && 'text-muted-foreground')}>{label}</span>
            <span className="sr-only">{done ? '(done)' : '(to do)'}</span>
        </li>
    );
}
