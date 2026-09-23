import { StatusBadge } from '@/components/clerko/status-badge';
import { formatBD, formatPct } from '@/lib/format';
import { type Teaser } from '@/types';
import { Link } from '@inertiajs/react';
import { BadgeCheck, Eye, MapPin, Sparkles, TrendingUp, Users } from 'lucide-react';

/** Anonymised teaser card used on the marketplace and dashboards. */
export function ListingCard({ listing }: { listing: Teaser }) {
    return (
        <Link
            href={route('marketplace.show', listing.reference)}
            className="group bg-card shadow-brand hover:shadow-brand-lg flex flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5"
        >
            <div className="bg-brand-gradient relative p-5 text-white">
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    {listing.tier && listing.tier !== 'standard' && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 capitalize">⚡ {listing.tier}</span>
                    )}
                    {listing.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5">
                            <BadgeCheck className="size-3" /> Verified
                        </span>
                    )}
                    {listing.featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5">
                            <Sparkles className="size-3" /> Featured
                        </span>
                    )}
                </div>
                <div className="mt-4 text-3xl font-extrabold tracking-tight">{formatBD(listing.asking_price)}</div>
                <div className="text-sm text-white/80">Asking price</div>
                <div className="absolute top-5 right-5 flex items-center gap-1 text-xs text-white/80">
                    <Eye className="size-3.5" /> {listing.views_count}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
                <div>
                    <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">{listing.sector_label}</div>
                    <h3 className="text-brand-ink group-hover:text-primary text-lg leading-snug font-bold dark:text-white">{listing.headline}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted rounded-xl p-3">
                        <div className="font-bold">{formatBD(listing.annual_revenue)}</div>
                        <div className="text-muted-foreground text-xs">Revenue</div>
                    </div>
                    <div className="bg-muted rounded-xl p-3">
                        <div className="flex items-center gap-1 font-bold">
                            <Users className="size-3.5" /> {listing.employees_band}
                        </div>
                        <div className="text-muted-foreground text-xs">Employees</div>
                    </div>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {listing.growth_pct !== null && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <TrendingUp className="size-3.5" /> {formatPct(listing.growth_pct)} growth
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" /> {listing.location_label}
                    </span>
                    {listing.established_year && <span>Est. {listing.established_year}</span>}
                </div>
                {listing.highlights.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1.5">
                        {listing.highlights.slice(0, 3).map((h) => (
                            <StatusBadge key={h} label={h} tone="indigo" />
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}
