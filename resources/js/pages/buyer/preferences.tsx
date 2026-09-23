import { BuyerJourney } from '@/components/clerko/buyer-journey';
import { ChipGroup, Field } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Options } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Gift, LoaderCircle } from 'lucide-react';
import { type FormEvent } from 'react';

type Preference = {
    sectors: string[];
    locations: string[];
    min_deal_size: number | null;
    max_deal_size: number | null;
    alerts_enabled: boolean;
};

type Props = {
    preference: Preference | null;
    buyerType: string | null;
    options: {
        sectors: Options;
        locations: Options;
        buyer_types: Options;
    };
};

type PreferenceForm = {
    buyer_type: string;
    sectors: string[];
    locations: string[];
    min_deal_size: string;
    max_deal_size: string;
    alerts_enabled: boolean;
};

export default function BuyerPreferences({ preference, buyerType, options }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Buyer dashboard', href: route('buyer.dashboard') },
        { title: 'Preferences', href: route('buyer.preferences.edit') },
    ];

    const { data, setData, put, processing, errors } = useForm<PreferenceForm>({
        buyer_type: buyerType ?? '',
        sectors: preference?.sectors ?? [],
        locations: preference?.locations ?? [],
        min_deal_size: preference?.min_deal_size != null ? String(preference.min_deal_size) : '',
        max_deal_size: preference?.max_deal_size != null ? String(preference.max_deal_size) : '',
        alerts_enabled: preference?.alerts_enabled ?? true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(route('buyer.preferences.update'), { preserveScroll: true });
    };

    const fieldErrors = errors as Record<string, string | undefined>;
    const firstNestedError = (prefix: string) => Object.entries(fieldErrors).find(([key]) => key.startsWith(`${prefix}.`))?.[1];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Acquisition preferences" />
            <PageBody className="max-w-4xl">
                <BuyerJourney current={0} />

                <PageHeader
                    eyebrow="Step 1 · Preferences"
                    title="Set your acquisition preferences"
                    description="Tell us what you're looking for and we'll match you with new listings and send alerts as they go live."
                />

                <form onSubmit={submit} className="space-y-6">
                    <SectionCard title="About you" description="Sellers see your buyer type next to your anonymous alias.">
                        <fieldset>
                            <legend className="mb-3 text-sm font-medium">Buyer type</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {Object.entries(options.buyer_types).map(([value, label]) => {
                                    const checked = data.buyer_type === value;
                                    return (
                                        <label
                                            key={value}
                                            className={cn(
                                                'flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-medium transition',
                                                'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2',
                                                checked ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="buyer_type"
                                                value={value}
                                                checked={checked}
                                                onChange={() => setData('buyer_type', value)}
                                                className="accent-primary size-4"
                                            />
                                            {label}
                                        </label>
                                    );
                                })}
                            </div>
                            <InputError message={errors.buyer_type} className="mt-2" />
                        </fieldset>
                    </SectionCard>

                    <SectionCard title="What you're looking for" description="Leave a group empty to match any sector or location.">
                        <div className="space-y-6">
                            <fieldset>
                                <legend className="mb-3 text-sm font-medium">Target sectors</legend>
                                <ChipGroup options={options.sectors} value={data.sectors} onChange={(v) => setData('sectors', v)} />
                                <InputError message={errors.sectors ?? firstNestedError('sectors')} className="mt-2" />
                            </fieldset>

                            <fieldset>
                                <legend className="mb-3 text-sm font-medium">Locations</legend>
                                <ChipGroup options={options.locations} value={data.locations} onChange={(v) => setData('locations', v)} />
                                <InputError message={errors.locations ?? firstNestedError('locations')} className="mt-2" />
                            </fieldset>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Minimum deal size"
                                    htmlFor="min_deal_size"
                                    error={errors.min_deal_size}
                                    hint="Asking price, in Bahraini Dinar"
                                >
                                    <MoneyInput
                                        id="min_deal_size"
                                        value={data.min_deal_size}
                                        onChange={(v) => setData('min_deal_size', v)}
                                        placeholder="No minimum"
                                    />
                                </Field>
                                <Field
                                    label="Maximum deal size"
                                    htmlFor="max_deal_size"
                                    error={errors.max_deal_size}
                                    hint="Asking price, in Bahraini Dinar"
                                >
                                    <MoneyInput
                                        id="max_deal_size"
                                        value={data.max_deal_size}
                                        onChange={(v) => setData('max_deal_size', v)}
                                        placeholder="No maximum"
                                    />
                                </Field>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="alerts_enabled"
                                    checked={data.alerts_enabled}
                                    onCheckedChange={(checked) => setData('alerts_enabled', checked === true)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <Label htmlFor="alerts_enabled" className="cursor-pointer">
                                        Email me when a matching business is listed
                                    </Label>
                                    <p className="text-muted-foreground mt-1 text-xs">You can turn alerts off at any time.</p>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                        <Gift className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <p>
                            <strong className="font-semibold">Registration and teaser browsing are free.</strong> You'll verify your identity (KYC)
                            and pay only when you request access to a specific company.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                        <Button asChild variant="outline">
                            <Link href={route('buyer.dashboard')}>Cancel</Link>
                        </Button>
                        <Button type="submit" className="bg-brand-gradient shadow-brand" disabled={processing}>
                            {processing && <LoaderCircle className="animate-spin" />}
                            Save & browse the marketplace
                        </Button>
                    </div>
                </form>
            </PageBody>
        </AppLayout>
    );
}

function MoneyInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
        <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">BD</span>
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-10"
            />
        </div>
    );
}
