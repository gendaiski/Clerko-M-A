import { EmptyState } from '@/components/clerko/empty-state';
import { ChipGroup, NativeSelect } from '@/components/clerko/field';
import { ListingCard } from '@/components/clerko/listing-card';
import { Pagination } from '@/components/clerko/pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/layouts/public-layout';
import { cn } from '@/lib/utils';
import { type Options, type Paginated, type Teaser } from '@/types';
import { router } from '@inertiajs/react';
import { Lock, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

type Sort = 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'revenue_desc';

type Filters = {
    q?: string | null;
    sector?: string[] | null;
    location?: string[] | null;
    featured?: boolean | string | number | null;
    max_price?: string | number | null;
    sort?: Sort | null;
};

type Props = {
    listings: Paginated<Teaser>;
    /** Validated query string. PHP sends an empty array (not an object) when no filter is set. */
    filters: Filters | [];
    options: { sectors: Options; locations: Options };
};

type State = {
    q: string;
    sector: string[];
    location: string[];
    featured: boolean;
    max_price: string;
    sort: Sort;
};

const sortOptions: Record<Sort, string> = {
    featured: 'Featured first',
    newest: 'Newest',
    price_asc: 'Price: low to high',
    price_desc: 'Price: high to low',
    revenue_desc: 'Highest revenue',
};

function fromProps(filters: Filters | []): State {
    const f: Filters = Array.isArray(filters) ? {} : filters;
    const featured = f.featured;
    return {
        q: f.q ?? '',
        sector: f.sector ?? [],
        location: f.location ?? [],
        featured: featured === true || featured === 1 || featured === '1' || featured === 'true',
        max_price: f.max_price !== null && f.max_price !== undefined ? String(f.max_price) : '',
        sort: f.sort ?? 'featured',
    };
}

function toQuery(state: State): Record<string, string | string[] | number> {
    const query: Record<string, string | string[] | number> = {};
    if (state.q.trim()) query.q = state.q.trim();
    if (state.sector.length) query.sector = state.sector;
    if (state.location.length) query.location = state.location;
    if (state.featured) query.featured = 1;
    if (state.max_price.trim() && Number(state.max_price) > 0) query.max_price = state.max_price.trim();
    if (state.sort !== 'featured') query.sort = state.sort;
    return query;
}

export default function MarketplaceIndex({ listings, filters, options }: Props) {
    const [state, setState] = useState<State>(() => fromProps(filters));
    const [showFilters, setShowFilters] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef(state);
    latest.current = state;

    useEffect(
        () => () => {
            if (searchTimer.current) clearTimeout(searchTimer.current);
        },
        [],
    );

    const apply = (next: State) => {
        setState(next);
        router.get(route('marketplace.index'), toQuery(next), { preserveState: true, preserveScroll: true, replace: true });
    };

    const update = (patch: Partial<State>) => apply({ ...state, ...patch });

    const onSearchChange = (q: string) => {
        const next = { ...state, q };
        setState(next);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => apply(latest.current), 400);
    };

    const onSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (searchTimer.current) clearTimeout(searchTimer.current);
        apply(state);
    };

    const activeCount = state.sector.length + state.location.length + (state.featured ? 1 : 0) + (state.max_price ? 1 : 0);
    const hasAnyFilter = activeCount > 0 || state.q.trim() !== '';

    const clearAll = () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        apply({ q: '', sector: [], location: [], featured: false, max_price: '', sort: state.sort });
    };

    return (
        <PublicLayout title="Marketplace">
            <section className="relative overflow-hidden border-b">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_80%_0%,rgba(99,102,241,0.12),transparent_70%)]"
                />
                <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-8">
                    <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                        <span className="text-brand-gradient">M&amp;A Marketplace</span>
                    </h1>
                    <p className="text-muted-foreground mt-3 max-w-2xl text-lg">Discover and acquire established businesses in Bahrain's market.</p>

                    <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
                        <form role="search" onSubmit={onSearchSubmit} className="relative flex-1">
                            <Label htmlFor="marketplace-search" className="sr-only">
                                Search listings
                            </Label>
                            <Search
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
                                aria-hidden="true"
                            />
                            <Input
                                id="marketplace-search"
                                type="search"
                                value={state.q}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search by keyword, e.g. SaaS, logistics, franchise…"
                                className="bg-card shadow-brand h-12 rounded-xl pl-12 text-base"
                                maxLength={100}
                            />
                        </form>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="marketplace-sort" className="text-muted-foreground shrink-0 text-sm">
                                Sort by
                            </Label>
                            <NativeSelect
                                id="marketplace-sort"
                                options={sortOptions}
                                value={state.sort}
                                onChange={(e) => update({ sort: e.target.value as Sort })}
                                className="bg-card shadow-brand h-12 min-w-48 rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
                <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full lg:hidden"
                            onClick={() => setShowFilters(!showFilters)}
                            aria-expanded={showFilters}
                            aria-controls="marketplace-filters"
                        >
                            <SlidersHorizontal /> {showFilters ? 'Hide filters' : 'Show filters'}
                            {activeCount > 0 && <span className="bg-primary text-primary-foreground rounded-full px-2 text-xs">{activeCount}</span>}
                        </Button>
                        <aside
                            id="marketplace-filters"
                            aria-label="Filters"
                            className={cn(
                                'bg-card shadow-brand mt-4 space-y-6 rounded-2xl border p-5 lg:sticky lg:top-24 lg:mt-0 lg:block',
                                !showFilters && 'hidden',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-brand-ink flex items-center gap-2 font-bold dark:text-white">
                                    <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters
                                </h2>
                                {hasAnyFilter && (
                                    <button type="button" onClick={clearAll} className="text-primary text-sm font-medium hover:underline">
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="filter-featured"
                                    checked={state.featured}
                                    onCheckedChange={(checked) => update({ featured: checked === true })}
                                />
                                <Label htmlFor="filter-featured" className="cursor-pointer font-normal">
                                    Featured listings only
                                </Label>
                            </div>

                            <fieldset className="space-y-3">
                                <legend className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">Sector</legend>
                                <ChipGroup options={options.sectors} value={state.sector} onChange={(sector) => update({ sector })} />
                            </fieldset>

                            <fieldset className="space-y-3">
                                <legend className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">Location</legend>
                                <ChipGroup options={options.locations} value={state.location} onChange={(location) => update({ location })} />
                            </fieldset>

                            <form
                                className="space-y-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    apply(state);
                                }}
                            >
                                <Label htmlFor="filter-max-price" className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                    Maximum asking price
                                </Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                            BD
                                        </span>
                                        <Input
                                            id="filter-max-price"
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            step={10000}
                                            value={state.max_price}
                                            onChange={(e) => setState({ ...state, max_price: e.target.value })}
                                            placeholder="Any"
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button type="submit" variant="secondary">
                                        Apply
                                    </Button>
                                </div>
                            </form>
                        </aside>
                    </div>

                    <div className="min-w-0">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-brand-ink text-xl font-extrabold tracking-tight dark:text-white" aria-live="polite">
                                {listings.total} {listings.total === 1 ? 'company' : 'companies'} available
                            </h2>
                            {listings.total > 0 && listings.from !== null && (
                                <p className="text-muted-foreground text-sm">
                                    Showing {listings.from}–{listings.to} of {listings.total}
                                </p>
                            )}
                        </div>

                        {hasAnyFilter && (
                            <div className="mb-5 flex flex-wrap gap-2">
                                {state.q.trim() && <ActiveChip label={`“${state.q.trim()}”`} onRemove={() => update({ q: '' })} />}
                                {state.featured && <ActiveChip label="Featured only" onRemove={() => update({ featured: false })} />}
                                {state.sector.map((s) => (
                                    <ActiveChip
                                        key={s}
                                        label={options.sectors[s] ?? s}
                                        onRemove={() => update({ sector: state.sector.filter((x) => x !== s) })}
                                    />
                                ))}
                                {state.location.map((l) => (
                                    <ActiveChip
                                        key={l}
                                        label={options.locations[l] ?? l}
                                        onRemove={() => update({ location: state.location.filter((x) => x !== l) })}
                                    />
                                ))}
                                {state.max_price && Number(state.max_price) > 0 && (
                                    <ActiveChip
                                        label={`Up to BD ${Number(state.max_price).toLocaleString('en-US')}`}
                                        onRemove={() => update({ max_price: '' })}
                                    />
                                )}
                            </div>
                        )}

                        {listings.data.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {listings.data.map((listing) => (
                                    <ListingCard key={listing.id} listing={listing} />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={SearchX}
                                title={hasAnyFilter ? 'No listings match your filters' : 'No live listings yet'}
                                description={
                                    hasAnyFilter
                                        ? 'Try removing a filter or broadening your search.'
                                        : 'New businesses are published after our compliance review. Check back soon.'
                                }
                                action={
                                    hasAnyFilter ? (
                                        <Button variant="outline" onClick={clearAll}>
                                            Clear all filters
                                        </Button>
                                    ) : undefined
                                }
                            />
                        )}

                        <div className="mt-8">
                            <Pagination page={listings} />
                        </div>

                        <div className="text-muted-foreground mt-8 flex items-start gap-3 rounded-2xl border border-dashed p-4 text-sm">
                            <Lock className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>
                                All listings are anonymised teasers. A company's identity, detailed financials and documents are only released to
                                verified buyers after they sign a non-disclosure agreement.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm">
            {label}
            <button type="button" onClick={onRemove} className="hover:bg-background/70 rounded-full p-0.5" aria-label={`Remove filter ${label}`}>
                <X className="size-3.5" />
            </button>
        </span>
    );
}
