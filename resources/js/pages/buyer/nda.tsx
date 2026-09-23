import { BuyerJourney, TeaserSummary } from '@/components/clerko/buyer-journey';
import { Field } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type KycStatus, type Teaser } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Eye, FileSignature, Hourglass, LoaderCircle, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { type FormEvent } from 'react';

type Nda = {
    title: string;
    version: string;
    clauses: { heading: string; body: string }[];
};

type Props = {
    engagement: { id: number };
    listing: Teaser;
    nda: Nda;
    kycStatus: KycStatus;
};

type SignForm = {
    signed_name: string;
    agree: boolean;
};

export default function BuyerNda({ engagement, listing, nda, kycStatus }: Props) {
    const { url } = usePage();
    const verified = kycStatus === 'verified';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Buyer dashboard', href: route('buyer.dashboard') },
        { title: `Listing ${listing.reference}`, href: route('marketplace.show', listing.reference) },
        { title: 'Sign NDA', href: route('engagements.nda', engagement.id) },
    ];

    const { data, setData, post, processing, errors } = useForm<SignForm>({ signed_name: '', agree: false });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('engagements.nda.sign', engagement.id), { preserveScroll: true });
    };

    const canSubmit = verified && data.signed_name.trim() !== '' && data.agree && !processing;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sign NDA" />
            <PageBody>
                <BuyerJourney current={2} />

                <PageHeader
                    eyebrow="Step 3 · Non-disclosure agreement"
                    title="Sign the Non-Disclosure Agreement"
                    description="Signing digitally binds you to confidentiality and reveals the company's identity for this listing."
                />

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-6">
                        {!verified && <KycCallout status={kycStatus} redirect={url} />}

                        <SectionCard title={nda.title} description={`Version ${nda.version} · Governed by the laws of the Kingdom of Bahrain`}>
                            <div
                                tabIndex={0}
                                role="document"
                                aria-label="NDA terms"
                                className="bg-muted/40 focus-visible:ring-ring max-h-[26rem] overflow-y-auto rounded-xl border p-5 text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
                            >
                                <ol className="space-y-4">
                                    {nda.clauses.map((clause, i) => (
                                        <li key={clause.heading} className="flex gap-3">
                                            <span className="text-primary w-6 shrink-0 font-bold">{i + 1}.</span>
                                            <div>
                                                <div className="text-brand-ink font-semibold dark:text-white">{clause.heading}</div>
                                                <p className="text-muted-foreground mt-1">{clause.body}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <p className="text-muted-foreground mt-3 text-xs">
                                Scroll to read the full agreement. A signed PDF copy will be available to download once you sign.
                            </p>
                        </SectionCard>

                        <SectionCard title="Sign electronically">
                            <form onSubmit={submit} className="space-y-5">
                                <fieldset disabled={!verified} className="space-y-5 disabled:opacity-60">
                                    <Field
                                        label="Type your full legal name to sign"
                                        htmlFor="signed_name"
                                        error={errors.signed_name}
                                        hint="Must match the name on your verified identity document."
                                    >
                                        <Input
                                            id="signed_name"
                                            value={data.signed_name}
                                            onChange={(e) => setData('signed_name', e.target.value)}
                                            autoComplete="name"
                                            maxLength={150}
                                            className="h-11 font-serif text-lg italic"
                                            placeholder="Full legal name"
                                        />
                                    </Field>

                                    <div>
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="agree"
                                                checked={data.agree}
                                                onCheckedChange={(checked) => setData('agree', checked === true)}
                                                className="mt-0.5"
                                                aria-describedby={errors.agree ? 'agree-error' : undefined}
                                            />
                                            <Label htmlFor="agree" className="cursor-pointer leading-snug font-normal">
                                                I have read and agree to the NDA terms above, and I will keep all information about this business
                                                confidential.
                                            </Label>
                                        </div>
                                        <InputError id="agree-error" message={errors.agree} className="mt-2" />
                                    </div>
                                </fieldset>

                                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
                                    <Button asChild variant="outline">
                                        <Link href={route('marketplace.show', listing.reference)}>
                                            <ArrowLeft /> Back to teaser
                                        </Link>
                                    </Button>
                                    <Button type="submit" className="bg-brand-gradient shadow-brand" disabled={!canSubmit}>
                                        {processing ? <LoaderCircle className="animate-spin" /> : <FileSignature />}
                                        Sign &amp; reveal the company
                                    </Button>
                                </div>
                            </form>
                        </SectionCard>
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-6">
                        <TeaserSummary listing={listing} />
                        <div className="bg-card shadow-brand rounded-2xl border p-5 text-sm">
                            <div className="text-brand-ink font-bold dark:text-white">What signing means</div>
                            <ul className="text-muted-foreground mt-3 space-y-3">
                                <li className="flex gap-2.5">
                                    <Eye className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    The company's name is revealed to you immediately.
                                </li>
                                <li className="flex gap-2.5">
                                    <Lock className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    All contact with the seller stays on Clerko while the NDA applies.
                                </li>
                                <li className="flex gap-2.5">
                                    <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    Documents are watermarked to your account and every view is logged.
                                </li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </PageBody>
        </AppLayout>
    );
}

function KycCallout({ status, redirect }: { status: KycStatus; redirect: string }) {
    const pending = status === 'pending';
    const Icon = pending ? Hourglass : ShieldAlert;

    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center',
                pending
                    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100',
            )}
        >
            <Icon className="size-6 shrink-0" aria-hidden="true" />
            <div className="flex-1 text-sm">
                <div className="font-semibold">
                    {pending
                        ? 'Identity verification in progress'
                        : status === 'rejected'
                          ? 'Your identity verification needs attention'
                          : 'Verify your identity to sign'}
                </div>
                <p className="opacity-90">
                    {pending
                        ? 'Our compliance team is reviewing your documents. You can sign this NDA as soon as you are verified — we will notify you.'
                        : 'The NDA must be signed by a verified person. It takes a few minutes to submit your ID, and you will come straight back here.'}
                </p>
            </div>
            <Button asChild variant={pending ? 'outline' : 'default'} className={cn('shrink-0', !pending && 'bg-brand-gradient shadow-brand')}>
                <Link href={route('verification.show', { redirect })}>
                    {pending ? 'View status' : status === 'rejected' ? 'Resubmit verification' : 'Verify my identity'}
                </Link>
            </Button>
        </div>
    );
}
