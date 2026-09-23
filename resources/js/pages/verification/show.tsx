import { Field, NativeSelect } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type KycStatus } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, BadgeCheck, Camera, Clock, IdCard, Loader2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { type FormEventHandler, type ReactNode, useState } from 'react';

type Submission = {
    full_legal_name: string;
    nationality: string;
    id_type: IdType;
    status: KycStatus;
    review_notes: string | null;
    created_at: string;
};

type IdType = 'cpr' | 'passport' | 'gcc_id';

type Props = {
    status: KycStatus;
    submission: Submission | null;
    redirectTo: string | null;
};

type VerificationForm = {
    full_legal_name: string;
    nationality: string;
    id_type: IdType | '';
    id_number: string;
    id_expiry: string;
    id_document: File | null;
    selfie: File | null;
    redirect: string;
};

const ID_TYPES: Record<IdType, string> = {
    cpr: 'Bahrain CPR (smart card)',
    passport: 'Passport',
    gcc_id: 'GCC national ID',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Identity verification', href: '/verification' }];

/** Only follow app-relative redirects (the backend enforces the same rule). */
function safeRedirect(value: string | null): string | null {
    return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export default function VerificationShow({ status, submission, redirectTo }: Props) {
    const redirect = safeRedirect(redirectTo);
    const [resubmitting, setResubmitting] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Identity verification" />
            <PageBody className="max-w-3xl">
                <PageHeader
                    eyebrow="Know your customer (KYC)"
                    title="Verify your identity"
                    description="Every seller and buyer on Clerko M&A is verified. It keeps the marketplace confidential and protects both sides of a deal."
                    actions={<StatusBadge status={status} label={statusLabel(status)} />}
                />

                {status === 'pending' && submission && <PendingState submission={submission} redirect={redirect} />}
                {status === 'pending' && !submission && (
                    <StateCard tone="amber" icon={<Clock className="size-8" />} title="Your verification is in review">
                        Our compliance team usually verifies within one business day.
                    </StateCard>
                )}
                {status === 'verified' && <VerifiedState redirect={redirect} />}
                {status === 'rejected' && !resubmitting && (
                    <StateCard
                        tone="red"
                        icon={<XCircle className="size-8" />}
                        title="We couldn't verify your identity"
                        actions={<Button onClick={() => setResubmitting(true)}>Submit new documents</Button>}
                    >
                        {submission?.review_notes ? (
                            <div className="mx-auto mt-2 max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-left text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
                                <div className="mb-1 text-xs font-bold tracking-wide uppercase">Notes from our compliance team</div>
                                <p className="text-sm whitespace-pre-line">{submission.review_notes}</p>
                            </div>
                        ) : (
                            'Please check that your documents are clear, in date and match the details you entered, then submit again.'
                        )}
                    </StateCard>
                )}
                {(status === 'unverified' || (status === 'rejected' && resubmitting)) && <VerificationFormCard redirect={redirect} />}
            </PageBody>
        </AppLayout>
    );
}

function statusLabel(status: KycStatus): string {
    return { unverified: 'Not verified', pending: 'In review', verified: 'Verified', rejected: 'Not approved' }[status];
}

function StateCard({
    tone,
    icon,
    title,
    children,
    actions,
}: {
    tone: 'amber' | 'green' | 'red';
    icon: ReactNode;
    title: string;
    children?: ReactNode;
    actions?: ReactNode;
}) {
    const tones = {
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    };
    return (
        <SectionCard>
            <div className="flex flex-col items-center py-6 text-center">
                <div className={`flex size-16 items-center justify-center rounded-full ${tones[tone]}`} aria-hidden="true">
                    {icon}
                </div>
                <h2 className="text-brand-ink mt-4 text-xl font-bold dark:text-white">{title}</h2>
                {children && <div className="text-muted-foreground mt-2 max-w-md text-sm">{children}</div>}
                {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
            </div>
        </SectionCard>
    );
}

function PendingState({ submission, redirect }: { submission: Submission; redirect: string | null }) {
    return (
        <>
            <StateCard
                tone="amber"
                icon={<Clock className="size-8" />}
                title="Your documents are in review"
                actions={
                    redirect ? (
                        <Button asChild>
                            <Link href={redirect}>
                                Continue <ArrowRight />
                            </Link>
                        </Button>
                    ) : undefined
                }
            >
                Our compliance team usually verifies within one business day. We'll notify you as soon as it's done — you can keep working meanwhile.
            </StateCard>
            <SectionCard title="Your submission">
                <dl className="grid gap-4 sm:grid-cols-2">
                    <SummaryItem label="Full legal name" value={submission.full_legal_name} />
                    <SummaryItem label="Nationality" value={submission.nationality} />
                    <SummaryItem label="ID type" value={ID_TYPES[submission.id_type] ?? submission.id_type} />
                    <SummaryItem label="Submitted" value={formatDateTime(submission.created_at)} />
                </dl>
            </SectionCard>
        </>
    );
}

function VerifiedState({ redirect }: { redirect: string | null }) {
    return (
        <StateCard
            tone="green"
            icon={<BadgeCheck className="size-8" />}
            title="Your identity is verified"
            actions={
                <Button asChild className="bg-brand-gradient-green shadow-brand">
                    <Link href={redirect ?? route('dashboard')}>
                        Continue <ArrowRight />
                    </Link>
                </Button>
            }
        >
            Thank you. You have full access to list a business, sign NDAs and take part in Deal Rooms.
        </StateCard>
    );
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</dt>
            <dd className="text-foreground mt-1 font-medium">{value}</dd>
        </div>
    );
}

function VerificationFormCard({ redirect }: { redirect: string | null }) {
    const { data, setData, post, processing, errors, progress } = useForm<VerificationForm>({
        full_legal_name: '',
        nationality: '',
        id_type: '',
        id_number: '',
        id_expiry: '',
        id_document: null,
        selfie: null,
        redirect: redirect ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.store'), { forceFormData: true, preserveScroll: true });
    };

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    return (
        <form onSubmit={submit} noValidate className="grid gap-6">
            <SectionCard title="Your details" description="Enter them exactly as they appear on your ID document.">
                <div className="grid gap-5">
                    <Field label="Full legal name (as on ID)" htmlFor="full_legal_name" error={errors.full_legal_name}>
                        <Input
                            id="full_legal_name"
                            value={data.full_legal_name}
                            maxLength={150}
                            autoComplete="name"
                            onChange={(e) => setData('full_legal_name', e.target.value)}
                            required
                        />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Nationality" htmlFor="nationality" error={errors.nationality}>
                            <Input
                                id="nationality"
                                value={data.nationality}
                                maxLength={80}
                                autoComplete="country-name"
                                onChange={(e) => setData('nationality', e.target.value)}
                                placeholder="e.g. Bahraini"
                                required
                            />
                        </Field>
                        <Field label="ID type" htmlFor="id_type" error={errors.id_type}>
                            <NativeSelect
                                id="id_type"
                                value={data.id_type}
                                onChange={(e) => setData('id_type', e.target.value as IdType | '')}
                                options={ID_TYPES}
                                placeholder="Select ID type"
                                required
                            />
                        </Field>
                        <Field label="ID number" htmlFor="id_number" error={errors.id_number}>
                            <Input
                                id="id_number"
                                value={data.id_number}
                                maxLength={40}
                                onChange={(e) => setData('id_number', e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </Field>
                        <Field label="ID expiry date" htmlFor="id_expiry" error={errors.id_expiry} hint="Your ID must be valid.">
                            <Input
                                id="id_expiry"
                                type="date"
                                min={tomorrow}
                                value={data.id_expiry}
                                onChange={(e) => setData('id_expiry', e.target.value)}
                                required
                            />
                        </Field>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Documents" description="Clear, uncropped and in colour. Up to 10 MB each.">
                <div className="grid gap-5 sm:grid-cols-2">
                    <UploadTile icon={IdCard} title="ID document" description="Front of your ID (and back for CPR / GCC ID) — PDF, JPG or PNG.">
                        <Field label="Upload ID document" htmlFor="id_document" error={errors.id_document}>
                            <Input
                                id="id_document"
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setData('id_document', e.target.files?.[0] ?? null)}
                                required
                            />
                        </Field>
                    </UploadTile>
                    <UploadTile icon={Camera} title="Selfie holding your ID" description="Your face and the ID both clearly visible — JPG or PNG.">
                        <Field label="Upload selfie" htmlFor="selfie" error={errors.selfie}>
                            <Input
                                id="selfie"
                                type="file"
                                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                                capture="user"
                                onChange={(e) => setData('selfie', e.target.files?.[0] ?? null)}
                                required
                            />
                        </Field>
                    </UploadTile>
                </div>
            </SectionCard>

            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                    Your documents are encrypted at rest and used only for identity verification and compliance. They are reviewed by the Clerko
                    compliance team and never shared with buyers or sellers.
                </p>
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

            <div className="flex justify-end">
                <Button type="submit" disabled={processing} className="bg-brand-gradient shadow-brand w-full sm:w-auto">
                    {processing ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Submit for verification
                </Button>
            </div>
        </form>
    );
}

function UploadTile({ icon: Icon, title, description, children }: { icon: typeof IdCard; title: string; description: string; children: ReactNode }) {
    return (
        <div className="bg-muted/40 grid gap-4 rounded-xl border p-4">
            <div className="flex items-start gap-3">
                <div className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
                    <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                    <div className="text-foreground font-semibold">{title}</div>
                    <p className="text-muted-foreground text-xs">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}
