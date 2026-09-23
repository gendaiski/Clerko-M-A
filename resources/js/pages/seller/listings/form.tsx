import { Field, NativeSelect, Textarea } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { SellerJourney } from '@/components/clerko/seller-journey';
import { StatusBadge } from '@/components/clerko/status-badge';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Check } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Lock,
    MapPin,
    Plus,
    ShieldAlert,
    Trash2,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import { type FormEventHandler, type KeyboardEvent, type ReactNode, useMemo, useState } from 'react';

type ListingOptions = {
    sectors: Record<string, string>;
    employee_bands: Record<string, string>;
    locations: Record<string, string>;
    deal_preferences: Record<string, string>;
    document_categories: Record<string, string>;
};

type EditableListing = {
    id: number;
    company_id: number;
    headline: string;
    teaser_summary: string;
    sector: string;
    employees_band: string;
    location: string;
    established_year: number | null;
    deal_preference: string;
    highlights: string[] | null;
    company_overview: string | null;
    financial_summary: string | null;
    valuation_summary: string | null;
    valuation_methods: { method: string; value: number | string }[] | null;
    financial_history: { year: number | string; revenue: number | string; ebitda: number | string | null }[] | null;
    legal_findings: Check[] | null;
    court_debt_checks: Check[] | null;
    annual_revenue: number;
    ebitda: number | null;
    growth_pct: number | null;
    asking_price: number;
    valuation_low: number | null;
    valuation_high: number | null;
    status: string;
};

type Props = {
    listing: EditableListing | null;
    companies: { id: number; name: string }[];
    options: ListingOptions;
};

type ValuationMethodRow = { method: string; value: string };
type HistoryRow = { year: string; revenue: string; ebitda: string };
type CheckRow = { status: 'ok' | 'warning'; text: string };

type ListingForm = {
    company_id: string;
    headline: string;
    teaser_summary: string;
    sector: string;
    employees_band: string;
    location: string;
    established_year: string;
    annual_revenue: string;
    ebitda: string;
    growth_pct: string;
    asking_price: string;
    deal_preference: string;
    highlights: string[];
    company_overview: string;
    financial_summary: string;
    valuation_low: string;
    valuation_high: string;
    valuation_summary: string;
    valuation_methods: ValuationMethodRow[];
    financial_history: HistoryRow[];
    legal_findings: CheckRow[];
    court_debt_checks: CheckRow[];
};

const MAX_HIGHLIGHTS = 6;
const MAX_HIGHLIGHT_LENGTH = 40;

const str = (v: number | string | null | undefined): string => (v === null || v === undefined ? '' : String(v));
const num = (v: string): number | null => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));

function initialData(listing: EditableListing | null, companies: Props['companies']): ListingForm {
    return {
        company_id: listing ? String(listing.company_id) : companies.length === 1 ? String(companies[0].id) : '',
        headline: listing?.headline ?? '',
        teaser_summary: listing?.teaser_summary ?? '',
        sector: listing?.sector ?? '',
        employees_band: listing?.employees_band ?? '',
        location: listing?.location ?? '',
        established_year: str(listing?.established_year),
        annual_revenue: str(listing?.annual_revenue),
        ebitda: str(listing?.ebitda),
        growth_pct: str(listing?.growth_pct),
        asking_price: str(listing?.asking_price),
        deal_preference: listing?.deal_preference ?? '',
        highlights: listing?.highlights ?? [],
        company_overview: listing?.company_overview ?? '',
        financial_summary: listing?.financial_summary ?? '',
        valuation_low: str(listing?.valuation_low),
        valuation_high: str(listing?.valuation_high),
        valuation_summary: listing?.valuation_summary ?? '',
        valuation_methods: (listing?.valuation_methods ?? []).map((r) => ({ method: r.method ?? '', value: str(r.value) })),
        financial_history: (listing?.financial_history ?? []).map((r) => ({ year: str(r.year), revenue: str(r.revenue), ebitda: str(r.ebitda) })),
        legal_findings: (listing?.legal_findings ?? []).map((r) => ({ status: r.status === 'warning' ? 'warning' : 'ok', text: r.text ?? '' })),
        court_debt_checks: (listing?.court_debt_checks ?? []).map((r) => ({ status: r.status === 'warning' ? 'warning' : 'ok', text: r.text ?? '' })),
    };
}

/** Mirrors the server-side check: legal suffixes are ignored when matching the company name. */
function nameTokens(name: string | undefined): string[] {
    if (!name || /^Company #\d+$/.test(name)) {
        return [];
    }
    const cleaned = name
        .replace(/\b(w\.?l\.?l\.?|b\.?s\.?c\.?|s\.?p\.?c\.?|co\.?|company|ltd\.?)(?=\s|$|[.,])/gi, '')
        .trim()
        .replace(/^[\s.,]+|[\s.,]+$/g, '')
        .toLowerCase();
    return cleaned.length >= 3 ? [cleaned] : [];
}

export default function ListingFormPage({ listing, companies, options }: Props) {
    const isEdit = listing !== null;
    const { data, setData, post, put, processing, errors } = useForm<ListingForm>(initialData(listing, companies));
    const err = errors as Record<string, string | undefined>;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('seller.listings.update', listing.id), { preserveScroll: true });
        } else {
            post(route('seller.listings.store'), { preserveScroll: true });
        }
    };

    const selectedCompany = companies.find((c) => String(c.id) === data.company_id);
    const namesCompany = useMemo(() => {
        const haystack = `${data.headline} ${data.teaser_summary} ${data.highlights.join(' ')}`.toLowerCase();
        return nameTokens(selectedCompany?.name).some((token) => haystack.includes(token));
    }, [data.headline, data.teaser_summary, data.highlights, selectedCompany]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Seller dashboard', href: route('seller.dashboard') },
        ...(isEdit ? [{ title: 'Listing', href: route('seller.listings.show', listing.id) }] : []),
        {
            title: isEdit ? 'Edit listing' : 'New listing',
            href: isEdit ? route('seller.listings.edit', listing.id) : route('seller.listings.create'),
        },
    ];

    const errorCount = Object.keys(errors).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Edit listing' : 'Build your listing'} />
            <PageBody>
                <SellerJourney current={1} />

                <PageHeader
                    eyebrow="Step 2 · Listing"
                    title={isEdit ? 'Edit your listing' : 'Build your listing'}
                    description={
                        <>
                            Complete the structured profile. Buyers first see an <b className="text-foreground">anonymised teaser</b> — your identity
                            stays gated behind an NDA.
                        </>
                    }
                />

                {listing?.status === 'revision_requested' && (
                    <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <p>Our team requested changes. Save your edits, then press “Resubmit for review” on the listing page.</p>
                    </div>
                )}

                {errorCount > 0 && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
                    >
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <p>Please fix {errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`} below.</p>
                    </div>
                )}

                <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="grid min-w-0 gap-6">
                        {/* (a) Teaser */}
                        <SectionCard
                            title={
                                <span className="flex flex-wrap items-center gap-2">
                                    A · Anonymised teaser <StatusBadge tone="blue" label="Public" />
                                </span>
                            }
                            description="Shown on the marketplace to every visitor. It must not identify the company."
                        >
                            <div className="grid gap-5">
                                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                                    <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    <p>
                                        Do not name the company, its brands, CR number, or anything that makes it identifiable. Its identity is only
                                        released to buyers who sign the NDA.
                                    </p>
                                </div>

                                <Field
                                    label="Company"
                                    htmlFor="company_id"
                                    error={err.company_id}
                                    hint="Private — used for verification, never shown on the teaser."
                                >
                                    <NativeSelect
                                        id="company_id"
                                        value={data.company_id}
                                        onChange={(e) => setData('company_id', e.target.value)}
                                        options={Object.fromEntries(companies.map((c) => [String(c.id), c.name]))}
                                        placeholder="Select a company"
                                        required
                                    />
                                </Field>

                                <Field
                                    label="Headline"
                                    htmlFor="headline"
                                    error={err.headline}
                                    hint={`${data.headline.length}/120 · e.g. “Profitable GCC B2B SaaS with recurring revenue”`}
                                >
                                    <Input
                                        id="headline"
                                        value={data.headline}
                                        maxLength={120}
                                        onChange={(e) => setData('headline', e.target.value)}
                                        required
                                    />
                                </Field>

                                {namesCompany && (
                                    <p role="alert" className="-mt-2 flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                                        <AlertTriangle className="size-4" aria-hidden="true" /> Your teaser appears to mention the company name.
                                        Please remove it.
                                    </p>
                                )}

                                <Field
                                    label="Teaser summary"
                                    htmlFor="teaser_summary"
                                    error={err.teaser_summary}
                                    hint={`${data.teaser_summary.length}/1500`}
                                >
                                    <Textarea
                                        id="teaser_summary"
                                        rows={4}
                                        maxLength={1500}
                                        value={data.teaser_summary}
                                        onChange={(e) => setData('teaser_summary', e.target.value)}
                                        placeholder="What the business does, who it serves and why it is attractive — without naming it."
                                        required
                                    />
                                </Field>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Field label="Sector" htmlFor="sector" error={err.sector}>
                                        <NativeSelect
                                            id="sector"
                                            value={data.sector}
                                            onChange={(e) => setData('sector', e.target.value)}
                                            options={options.sectors}
                                            placeholder="Select sector"
                                            required
                                        />
                                    </Field>
                                    <Field label="Company size" htmlFor="employees_band" error={err.employees_band}>
                                        <NativeSelect
                                            id="employees_band"
                                            value={data.employees_band}
                                            onChange={(e) => setData('employees_band', e.target.value)}
                                            options={options.employee_bands}
                                            placeholder="Select size"
                                            required
                                        />
                                    </Field>
                                    <Field label="Location" htmlFor="location" error={err.location}>
                                        <NativeSelect
                                            id="location"
                                            value={data.location}
                                            onChange={(e) => setData('location', e.target.value)}
                                            options={options.locations}
                                            placeholder="Select location"
                                            required
                                        />
                                    </Field>
                                    <Field label="Established (year)" htmlFor="established_year" error={err.established_year}>
                                        <Input
                                            id="established_year"
                                            type="number"
                                            inputMode="numeric"
                                            min={1900}
                                            max={new Date().getFullYear()}
                                            value={data.established_year}
                                            onChange={(e) => setData('established_year', e.target.value)}
                                            placeholder="e.g. 2014"
                                        />
                                    </Field>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <MoneyField
                                        id="annual_revenue"
                                        label="Annual revenue (BD)"
                                        value={data.annual_revenue}
                                        error={err.annual_revenue}
                                        onChange={(v) => setData('annual_revenue', v)}
                                        required
                                    />
                                    <MoneyField
                                        id="ebitda"
                                        label="EBITDA (BD)"
                                        value={data.ebitda}
                                        error={err.ebitda}
                                        onChange={(v) => setData('ebitda', v)}
                                        allowNegative
                                    />
                                    <Field label="Revenue growth (% YoY)" htmlFor="growth_pct" error={err.growth_pct}>
                                        <Input
                                            id="growth_pct"
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            min={-100}
                                            max={1000}
                                            value={data.growth_pct}
                                            onChange={(e) => setData('growth_pct', e.target.value)}
                                            placeholder="e.g. 25"
                                        />
                                    </Field>
                                    <MoneyField
                                        id="asking_price"
                                        label="Asking price (BD)"
                                        value={data.asking_price}
                                        error={err.asking_price}
                                        onChange={(v) => setData('asking_price', v)}
                                        required
                                    />
                                    <Field label="Deal preference" htmlFor="deal_preference" error={err.deal_preference} className="sm:col-span-2">
                                        <NativeSelect
                                            id="deal_preference"
                                            value={data.deal_preference}
                                            onChange={(e) => setData('deal_preference', e.target.value)}
                                            options={options.deal_preferences}
                                            placeholder="Select deal type"
                                            required
                                        />
                                    </Field>
                                </div>

                                <HighlightsInput
                                    value={data.highlights}
                                    onChange={(v) => setData('highlights', v)}
                                    error={err.highlights ?? Object.entries(err).find(([k]) => k.startsWith('highlights.'))?.[1]}
                                />
                            </div>
                        </SectionCard>

                        {/* (b) Details Pack */}
                        <SectionCard
                            title={
                                <span className="flex flex-wrap items-center gap-2">
                                    B · Company Details Pack <StatusBadge tone="purple" label="After NDA + unlock" />
                                </span>
                            }
                            description="Released only to verified buyers who have signed the NDA and unlocked the pack. Optional now — you can complete it before review."
                        >
                            <div className="grid gap-6">
                                <Field label="Company overview" htmlFor="company_overview" error={err.company_overview}>
                                    <Textarea
                                        id="company_overview"
                                        rows={5}
                                        maxLength={5000}
                                        value={data.company_overview}
                                        onChange={(e) => setData('company_overview', e.target.value)}
                                        placeholder="History, products and services, customers, team and operations."
                                    />
                                </Field>
                                <Field label="Financial summary" htmlFor="financial_summary" error={err.financial_summary}>
                                    <Textarea
                                        id="financial_summary"
                                        rows={4}
                                        maxLength={5000}
                                        value={data.financial_summary}
                                        onChange={(e) => setData('financial_summary', e.target.value)}
                                        placeholder="e.g. Profitable, recurring-revenue business with 25% YoY growth and a diversified client base across the GCC."
                                    />
                                </Field>

                                <fieldset className="grid gap-4">
                                    <legend className="text-brand-ink mb-1 text-sm font-bold dark:text-white">Valuation</legend>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <MoneyField
                                            id="valuation_low"
                                            label="Valuation — low (BD)"
                                            value={data.valuation_low}
                                            error={err.valuation_low}
                                            onChange={(v) => setData('valuation_low', v)}
                                        />
                                        <MoneyField
                                            id="valuation_high"
                                            label="Valuation — high (BD)"
                                            value={data.valuation_high}
                                            error={err.valuation_high}
                                            onChange={(v) => setData('valuation_high', v)}
                                        />
                                    </div>
                                    <Field label="Valuation summary" htmlFor="valuation_summary" error={err.valuation_summary}>
                                        <Textarea
                                            id="valuation_summary"
                                            rows={3}
                                            maxLength={3000}
                                            value={data.valuation_summary}
                                            onChange={(e) => setData('valuation_summary', e.target.value)}
                                            placeholder="How the range was reached and the key assumptions."
                                        />
                                    </Field>
                                </fieldset>

                                <RepeatableRows
                                    legend="Valuation methods"
                                    description="Up to 6, e.g. DCF, EBITDA multiple, comparable transactions."
                                    rows={data.valuation_methods}
                                    max={6}
                                    error={err.valuation_methods}
                                    addLabel="Add method"
                                    onAdd={() => setData('valuation_methods', [...data.valuation_methods, { method: '', value: '' }])}
                                    onRemove={(i) =>
                                        setData(
                                            'valuation_methods',
                                            data.valuation_methods.filter((_, j) => j !== i),
                                        )
                                    }
                                    render={(row, i) => (
                                        <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                            <Field label="Method" htmlFor={`vm-method-${i}`} error={err[`valuation_methods.${i}.method`]}>
                                                <Input
                                                    id={`vm-method-${i}`}
                                                    value={row.method}
                                                    maxLength={80}
                                                    onChange={(e) =>
                                                        setData('valuation_methods', updateAt(data.valuation_methods, i, { method: e.target.value }))
                                                    }
                                                    placeholder="e.g. EBITDA multiple (6.5x)"
                                                />
                                            </Field>
                                            <MoneyField
                                                id={`vm-value-${i}`}
                                                label="Value (BD)"
                                                value={row.value}
                                                error={err[`valuation_methods.${i}.value`]}
                                                onChange={(v) => setData('valuation_methods', updateAt(data.valuation_methods, i, { value: v }))}
                                            />
                                        </div>
                                    )}
                                />

                                <RepeatableRows
                                    legend="Financial history"
                                    description="Up to 10 years of revenue and EBITDA."
                                    rows={data.financial_history}
                                    max={10}
                                    error={err.financial_history}
                                    addLabel="Add year"
                                    onAdd={() => {
                                        const years = data.financial_history.map((r) => Number(r.year)).filter((y) => !Number.isNaN(y) && y > 0);
                                        const next = years.length ? Math.max(...years) + 1 : new Date().getFullYear() - 1;
                                        setData('financial_history', [...data.financial_history, { year: String(next), revenue: '', ebitda: '' }]);
                                    }}
                                    onRemove={(i) =>
                                        setData(
                                            'financial_history',
                                            data.financial_history.filter((_, j) => j !== i),
                                        )
                                    }
                                    render={(row, i) => (
                                        <div className="grid flex-1 gap-3 sm:grid-cols-[120px_1fr_1fr]">
                                            <Field label="Year" htmlFor={`fh-year-${i}`} error={err[`financial_history.${i}.year`]}>
                                                <Input
                                                    id={`fh-year-${i}`}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={1990}
                                                    value={row.year}
                                                    onChange={(e) =>
                                                        setData('financial_history', updateAt(data.financial_history, i, { year: e.target.value }))
                                                    }
                                                />
                                            </Field>
                                            <MoneyField
                                                id={`fh-revenue-${i}`}
                                                label="Revenue (BD)"
                                                value={row.revenue}
                                                error={err[`financial_history.${i}.revenue`]}
                                                onChange={(v) => setData('financial_history', updateAt(data.financial_history, i, { revenue: v }))}
                                            />
                                            <MoneyField
                                                id={`fh-ebitda-${i}`}
                                                label="EBITDA (BD)"
                                                value={row.ebitda}
                                                error={err[`financial_history.${i}.ebitda`]}
                                                onChange={(v) => setData('financial_history', updateAt(data.financial_history, i, { ebitda: v }))}
                                                allowNegative
                                            />
                                        </div>
                                    )}
                                />

                                <ChecksEditor
                                    legend="Legal findings"
                                    description="Summary of the legal position — licences, contracts, disputes."
                                    field="legal_findings"
                                    rows={data.legal_findings}
                                    errors={err}
                                    onChange={(rows) => setData('legal_findings', rows)}
                                />

                                <ChecksEditor
                                    legend="Court & debt checks"
                                    description="Litigation, enforcement and outstanding debt searches."
                                    field="court_debt_checks"
                                    rows={data.court_debt_checks}
                                    errors={err}
                                    onChange={(rows) => setData('court_debt_checks', rows)}
                                />
                            </div>
                        </SectionCard>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                            <Button asChild variant="outline">
                                <Link href={isEdit ? route('seller.listings.show', listing.id) : route('seller.dashboard')}>
                                    <ArrowLeft /> {isEdit ? 'Cancel' : 'Back'}
                                </Link>
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-brand-gradient-green shadow-brand">
                                {processing && <Loader2 className="animate-spin" />}
                                {isEdit ? 'Save changes' : 'Save draft & continue'} <ArrowRight />
                            </Button>
                        </div>
                    </div>

                    <aside className="grid gap-4 lg:sticky lg:top-6">
                        <TeaserPreview data={data} options={options} />
                        <div className="bg-card text-muted-foreground shadow-brand rounded-2xl border p-4 text-sm">
                            <div className="text-foreground mb-2 font-semibold">What buyers see, and when</div>
                            <ul className="space-y-2">
                                <li className="flex gap-2">
                                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /> Teaser: everyone on the
                                    marketplace
                                </li>
                                <li className="flex gap-2">
                                    <Lock className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" /> Company Details Pack: verified buyers
                                    after NDA and unlock
                                </li>
                                <li className="flex gap-2">
                                    <Lock className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" /> Staged documents: released by you,
                                    per Deal Room
                                </li>
                            </ul>
                        </div>
                    </aside>
                </form>
            </PageBody>
        </AppLayout>
    );
}

function updateAt<T>(rows: T[], index: number, patch: Partial<T>): T[] {
    return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

function MoneyField({
    id,
    label,
    value,
    error,
    onChange,
    required,
    allowNegative,
}: {
    id: string;
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
    required?: boolean;
    allowNegative?: boolean;
}) {
    const n = num(value);
    return (
        <Field label={label} htmlFor={id} error={error} hint={n !== null && Math.abs(n) >= 10_000 ? `≈ ${formatBD(n)}` : undefined}>
            <Input
                id={id}
                type="number"
                inputMode="decimal"
                step="any"
                min={allowNegative ? undefined : 0}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                placeholder="0"
            />
        </Field>
    );
}

function HighlightsInput({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
    const [draft, setDraft] = useState('');
    const full = value.length >= MAX_HIGHLIGHTS;

    const add = () => {
        const tag = draft.trim().slice(0, MAX_HIGHLIGHT_LENGTH);
        if (!tag || full || value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
            return;
        }
        onChange([...value, tag]);
        setDraft('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
        } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    return (
        <Field
            label={`Highlights (${value.length}/${MAX_HIGHLIGHTS})`}
            htmlFor="highlight-input"
            error={error}
            hint={`Short selling points, up to ${MAX_HIGHLIGHT_LENGTH} characters each. Press Enter to add.`}
        >
            {value.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Highlights">
                    {value.map((tag) => (
                        <li
                            key={tag}
                            className="bg-brand-lavender text-primary inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm font-medium dark:bg-indigo-500/10"
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((v) => v !== tag))}
                                className="hover:bg-primary/10 rounded-full p-0.5"
                                aria-label={`Remove highlight “${tag}”`}
                            >
                                <X className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex gap-2">
                <Input
                    id="highlight-input"
                    value={draft}
                    maxLength={MAX_HIGHLIGHT_LENGTH}
                    disabled={full}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={full ? 'Maximum reached' : 'e.g. Recurring revenue'}
                />
                <Button type="button" variant="outline" onClick={add} disabled={full || draft.trim() === ''}>
                    <Plus /> Add
                </Button>
            </div>
        </Field>
    );
}

function RepeatableRows<T>({
    legend,
    description,
    rows,
    max,
    error,
    addLabel,
    onAdd,
    onRemove,
    render,
}: {
    legend: string;
    description: string;
    rows: T[];
    max: number;
    error?: string;
    addLabel: string;
    onAdd: () => void;
    onRemove: (index: number) => void;
    render: (row: T, index: number) => ReactNode;
}) {
    return (
        <fieldset className="grid gap-3">
            <legend className="text-brand-ink text-sm font-bold dark:text-white">{legend}</legend>
            <p className="text-muted-foreground -mt-2 text-xs">{description}</p>
            {rows.length === 0 && <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-sm">None added yet.</p>}
            {rows.map((row, i) => (
                <div key={i} className="bg-muted/40 flex items-start gap-3 rounded-xl border p-3">
                    {render(row, i)}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 shrink-0"
                        onClick={() => onRemove(i)}
                        aria-label={`Remove ${legend.toLowerCase()} row ${i + 1}`}
                    >
                        <Trash2 />
                    </Button>
                </div>
            ))}
            <InputError message={error} />
            <div>
                <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={rows.length >= max}>
                    <Plus /> {addLabel}
                </Button>
            </div>
        </fieldset>
    );
}

function ChecksEditor({
    legend,
    description,
    field,
    rows,
    errors,
    onChange,
}: {
    legend: string;
    description: string;
    field: 'legal_findings' | 'court_debt_checks';
    rows: CheckRow[];
    errors: Record<string, string | undefined>;
    onChange: (rows: CheckRow[]) => void;
}) {
    return (
        <RepeatableRows
            legend={legend}
            description={description}
            rows={rows}
            max={12}
            error={errors[field]}
            addLabel="Add item"
            onAdd={() => onChange([...rows, { status: 'ok', text: '' }])}
            onRemove={(i) => onChange(rows.filter((_, j) => j !== i))}
            render={(row, i) => (
                <div className="grid flex-1 gap-3 sm:grid-cols-[150px_1fr]">
                    <Field label="Status" htmlFor={`${field}-status-${i}`} error={errors[`${field}.${i}.status`]}>
                        <NativeSelect
                            id={`${field}-status-${i}`}
                            value={row.status}
                            onChange={(e) => onChange(updateAt(rows, i, { status: e.target.value === 'warning' ? 'warning' : 'ok' }))}
                            options={{ ok: '✓ Clear', warning: '⚠ Needs attention' }}
                        />
                    </Field>
                    <Field label="Finding" htmlFor={`${field}-text-${i}`} error={errors[`${field}.${i}.text`]}>
                        <Input
                            id={`${field}-text-${i}`}
                            value={row.text}
                            maxLength={300}
                            onChange={(e) => onChange(updateAt(rows, i, { text: e.target.value }))}
                            placeholder="e.g. No pending litigation in Bahraini courts"
                        />
                    </Field>
                </div>
            )}
        />
    );
}

function TeaserPreview({ data, options }: { data: ListingForm; options: ListingOptions }) {
    const asking = num(data.asking_price);
    const revenue = num(data.annual_revenue);
    const growth = num(data.growth_pct);
    const sector = options.sectors[data.sector];
    const size = options.employee_bands[data.employees_band];
    const location = options.locations[data.location];

    return (
        <div className="bg-card shadow-brand-lg overflow-hidden rounded-2xl border" aria-label="Anonymised teaser preview">
            <div className="bg-brand-gradient p-5 text-white">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
                    <Lock className="size-3" aria-hidden="true" /> Identity gated
                </span>
                <div className="mt-3 text-3xl font-extrabold tracking-tight">{asking !== null ? formatBD(asking) : 'BD —'}</div>
                <div className="text-sm text-white/80">Asking price</div>
            </div>
            <div className="space-y-4 p-5">
                <div>
                    <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Anonymised teaser preview</div>
                    <div
                        className={cn(
                            'text-brand-ink mt-1 leading-snug font-bold dark:text-white',
                            !data.headline && 'text-muted-foreground font-medium italic',
                        )}
                    >
                        {data.headline || 'Your headline appears here'}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {[sector, size, location].filter(Boolean).join(' · ') || 'Sector · size · location'}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted rounded-xl p-3">
                        <div className="font-bold">{revenue !== null ? formatBD(revenue) : '—'}</div>
                        <div className="text-muted-foreground text-xs">Revenue</div>
                    </div>
                    <div className="bg-muted rounded-xl p-3">
                        <div className={cn('flex items-center gap-1 font-bold', growth !== null && growth > 0 && 'text-emerald-600')}>
                            {growth !== null && <TrendingUp className="size-3.5" aria-hidden="true" />} {formatPct(growth)}
                        </div>
                        <div className="text-muted-foreground text-xs">Growth</div>
                    </div>
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {size && (
                        <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" aria-hidden="true" /> {size}
                        </span>
                    )}
                    {location && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden="true" /> {location}
                        </span>
                    )}
                    {data.established_year && <span>Est. {data.established_year}</span>}
                    {options.deal_preferences[data.deal_preference] && <span>{options.deal_preferences[data.deal_preference]}</span>}
                </div>
                {data.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {data.highlights.map((h) => (
                            <StatusBadge key={h} label={h} tone="indigo" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
