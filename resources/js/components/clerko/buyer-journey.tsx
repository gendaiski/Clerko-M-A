import { Stepper } from '@/components/clerko/stepper';
import { formatBD, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Teaser } from '@/types';
import { Link } from '@inertiajs/react';
import { MapPin, Target, Users } from 'lucide-react';
import { type ReactNode } from 'react';

export const BUYER_STEPS = ['Preferences', 'Discover', 'NDA', 'Unlock', 'Details Pack'];

/** "Buyer journey" bar shown at the top of each Scenario 2 page. */
export function BuyerJourney({ current, className }: { current: number; className?: string }) {
    return (
        <div className={cn('bg-card shadow-brand flex flex-col gap-3 rounded-2xl border px-4 py-3 md:flex-row md:items-center md:gap-6', className)}>
            <span className="text-brand-ink flex shrink-0 items-center gap-2 text-sm font-bold dark:text-white">
                <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-lg text-white">
                    <Target className="size-4" aria-hidden="true" />
                </span>
                Buyer journey
            </span>
            <nav aria-label="Buyer journey progress">
                <Stepper steps={BUYER_STEPS} current={current} />
            </nav>
        </div>
    );
}

/** Compact anonymised teaser summary used beside the NDA / unlock steps. */
export function TeaserSummary({
    listing,
    title,
    children,
    className,
}: {
    listing: Teaser;
    title?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('bg-card shadow-brand overflow-hidden rounded-2xl border', className)}>
            <div className="bg-brand-gradient p-5 text-white">
                <div className="text-xs font-semibold tracking-wide text-white/80 uppercase">{title ?? `Listing ${listing.reference}`}</div>
                <div className="mt-1 text-lg leading-snug font-bold">{listing.headline}</div>
            </div>
            <div className="space-y-4 p-5">
                <dl className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted rounded-xl p-2.5">
                        <dt className="text-muted-foreground text-[11px]">Asking</dt>
                        <dd className="text-sm font-bold">{formatBD(listing.asking_price)}</dd>
                    </div>
                    <div className="bg-muted rounded-xl p-2.5">
                        <dt className="text-muted-foreground text-[11px]">Revenue</dt>
                        <dd className="text-sm font-bold">{formatBD(listing.annual_revenue)}</dd>
                    </div>
                    <div className="bg-muted rounded-xl p-2.5">
                        <dt className="text-muted-foreground text-[11px]">Growth</dt>
                        <dd className="text-sm font-bold">{formatPct(listing.growth_pct)}</dd>
                    </div>
                </dl>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>{listing.sector_label}</span>
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden="true" /> {listing.location_label}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden="true" /> {listing.employees_band}
                    </span>
                    {listing.established_year && <span>Est. {listing.established_year}</span>}
                </div>
                {children}
                <Link href={route('marketplace.show', listing.reference)} className="text-primary inline-block text-sm font-semibold hover:underline">
                    View teaser
                </Link>
            </div>
        </div>
    );
}
