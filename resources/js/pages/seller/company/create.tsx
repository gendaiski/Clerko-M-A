import { Field } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { SellerJourney } from '@/components/clerko/seller-journey';
import { StatusBadge } from '@/components/clerko/status-badge';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type AuthedData, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Building2, Download, FileSearch, IdCard, Loader2, PenLine, ShieldCheck, Upload } from 'lucide-react';
import { type FormEventHandler, type ReactNode } from 'react';

type Props = {
    capacities: Record<string, string>;
};

type CompanyForm = {
    cr_pdf: File | null;
    seller_capacity: string;
    authority_document: File | null;
    confirm_authority: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Seller dashboard', href: '/seller' },
    { title: 'Verify your business', href: '/seller/companies/create' },
];

const capacityHints: Record<string, string> = {
    shareholder: 'You own shares in the company as listed on the CR.',
    authorised_signatory: 'You are named as an authorised signatory on the CR.',
    attorney: 'You act under a power of attorney. Upload the attorney document below.',
};

export default function CompanyCreate({ capacities }: Props) {
    const { auth } = usePage<AuthedData>().props;
    const kyc = auth.user.kyc_status;

    const { data, setData, post, processing, errors, progress } = useForm<CompanyForm>({
        cr_pdf: null,
        seller_capacity: '',
        authority_document: null,
        confirm_authority: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('seller.companies.store'), { forceFormData: true });
    };

    const isAttorney = data.seller_capacity === 'attorney';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Verify your business" />
            <PageBody className="max-w-4xl">
                <SellerJourney current={0} />

                <PageHeader
                    eyebrow="Step 1 · Verify"
                    title="Verify your identity & business"
                    description="Before you can list, we confirm who you are (KYC), the business (KYB), and that you're authorised to sell."
                />

                <SectionCard bodyClassName="divide-y p-0">
                    <CheckRow
                        icon={IdCard}
                        iconClass="bg-gradient-to-br from-blue-500 to-indigo-600"
                        title="Identity verification (KYC)"
                        description="Government ID + selfie, reviewed by our compliance team"
                        status={
                            kyc === 'verified' ? (
                                <StatusBadge status="verified" label="✓ Verified" />
                            ) : kyc === 'pending' ? (
                                <StatusBadge status="pending" label="● In review" />
                            ) : (
                                <Button asChild size="sm" variant="outline">
                                    <Link href={route('verification.show', { redirect: '/seller/companies/create' })}>
                                        {kyc === 'rejected' ? 'Resubmit' : 'Verify now'}
                                    </Link>
                                </Button>
                            )
                        }
                    />
                    <CheckRow
                        icon={Building2}
                        iconClass="bg-gradient-to-br from-violet-500 to-purple-600"
                        title="Business verification (KYB)"
                        description="Your CR profile from Sijilat, read automatically and checked by compliance"
                        status={<StatusBadge tone="indigo" label="This step" />}
                    />
                    <CheckRow
                        icon={PenLine}
                        iconClass="bg-brand-gradient-green"
                        title="Authority to sell"
                        description="Confirm you're authorised to act for the company"
                        status={<StatusBadge tone="indigo" label="This step" />}
                    />
                </SectionCard>

                <SectionCard title="How to get your CR profile from Sijilat" description="It takes about a minute and is free.">
                    <ol className="grid gap-3 sm:grid-cols-3">
                        {[
                            { icon: FileSearch, title: 'Find your CR', body: 'Go to sijilat.bh and search for your Commercial Registration number.' },
                            { icon: Download, title: 'Save as PDF', body: 'Open the CR profile and print or save it as a PDF.' },
                            { icon: Upload, title: 'Upload it here', body: 'We read it automatically and our compliance team verifies it.' },
                        ].map((step, i) => (
                            <li key={step.title} className="bg-muted/50 rounded-xl border p-4">
                                <div className="flex items-center gap-2">
                                    <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-full text-xs font-bold text-white">
                                        {i + 1}
                                    </span>
                                    <step.icon className="text-primary size-4" aria-hidden="true" />
                                </div>
                                <div className="text-foreground mt-3 font-semibold">{step.title}</div>
                                <p className="text-muted-foreground mt-1 text-sm">{step.body}</p>
                            </li>
                        ))}
                    </ol>
                    <p className="text-muted-foreground mt-4 text-sm">
                        Download your company's CR profile from Sijilat (
                        <a
                            href="https://www.sijilat.bh"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium underline-offset-4 hover:underline"
                        >
                            sijilat.bh
                        </a>{' '}
                        → search your CR → print/save as PDF) and upload it here; we read it automatically and our compliance team verifies it.
                    </p>
                </SectionCard>

                <form onSubmit={submit} className="space-y-6" noValidate>
                    <SectionCard title="Company registration" description="Upload the CR profile PDF saved from Sijilat.">
                        <div className="grid gap-5">
                            <Field label="CR profile (PDF)" htmlFor="cr_pdf" error={errors.cr_pdf} hint="PDF only, up to 10 MB.">
                                <Input
                                    id="cr_pdf"
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    required
                                    onChange={(e) => setData('cr_pdf', e.target.files?.[0] ?? null)}
                                />
                            </Field>
                        </div>
                    </SectionCard>

                    <SectionCard title="Your authority to sell" description="In what capacity are you acting for this company?">
                        <fieldset className="grid gap-5">
                            <legend className="sr-only">Seller capacity</legend>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {Object.entries(capacities).map(([value, label]) => {
                                    const selected = data.seller_capacity === value;
                                    return (
                                        <label
                                            key={value}
                                            className={cn(
                                                'focus-within:ring-ring relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition focus-within:ring-2',
                                                selected
                                                    ? 'border-primary bg-brand-lavender ring-primary/30 ring-1 dark:bg-indigo-500/10'
                                                    : 'hover:bg-muted/50',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="seller_capacity"
                                                value={value}
                                                checked={selected}
                                                onChange={() =>
                                                    setData((d) => ({
                                                        ...d,
                                                        seller_capacity: value,
                                                        authority_document: value === 'attorney' ? d.authority_document : null,
                                                    }))
                                                }
                                                className="sr-only"
                                            />
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-foreground font-semibold">{label}</span>
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                                                        selected ? 'border-primary' : 'border-muted-foreground/40',
                                                    )}
                                                >
                                                    {selected && <span className="bg-primary size-2 rounded-full" />}
                                                </span>
                                            </span>
                                            {capacityHints[value] && <span className="text-muted-foreground text-sm">{capacityHints[value]}</span>}
                                        </label>
                                    );
                                })}
                            </div>
                            <InputError message={errors.seller_capacity} />

                            {isAttorney && (
                                <Field
                                    label="Power of attorney document"
                                    htmlFor="authority_document"
                                    error={errors.authority_document}
                                    hint="PDF, JPG or PNG, up to 10 MB. It must authorise you to act for the company in a sale."
                                >
                                    <Input
                                        id="authority_document"
                                        type="file"
                                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                                        required
                                        onChange={(e) => setData('authority_document', e.target.files?.[0] ?? null)}
                                    />
                                </Field>
                            )}

                            <div className="grid gap-2">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="confirm_authority"
                                        checked={data.confirm_authority}
                                        onCheckedChange={(checked) => setData('confirm_authority', checked === true)}
                                        className="mt-0.5"
                                    />
                                    <Label htmlFor="confirm_authority" className="leading-snug font-normal">
                                        I confirm I am authorised to act for this company in a sale.
                                    </Label>
                                </div>
                                <InputError message={errors.confirm_authority} />
                            </div>
                        </fieldset>
                    </SectionCard>

                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <p>Your documents are encrypted and only used for verification and compliance. Nothing here is shown to buyers.</p>
                    </div>

                    {progress && (
                        <div
                            className="bg-muted h-2 overflow-hidden rounded-full"
                            role="progressbar"
                            aria-valuenow={progress.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div className="bg-brand-gradient h-full transition-all" style={{ width: `${progress.percentage ?? 0}%` }} />
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                        <Button asChild variant="outline">
                            <Link href={route('seller.dashboard')}>
                                <ArrowLeft /> Back
                            </Link>
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-brand-gradient-green shadow-brand">
                            {processing ? <Loader2 className="animate-spin" /> : null}
                            Upload & continue <ArrowRight />
                        </Button>
                    </div>
                </form>
            </PageBody>
        </AppLayout>
    );
}

function CheckRow({
    icon: Icon,
    iconClass,
    title,
    description,
    status,
}: {
    icon: typeof IdCard;
    iconClass: string;
    title: string;
    description: string;
    status: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-white', iconClass)}>
                    <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                    <div className="text-brand-ink font-bold dark:text-white">{title}</div>
                    <div className="text-muted-foreground text-sm">{description}</div>
                </div>
            </div>
            <div className="sm:shrink-0">{status}</div>
        </div>
    );
}
