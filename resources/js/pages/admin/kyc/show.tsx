import { DecisionRadioGroup, DetailList, FilePreview, ID_TYPES, type DecisionOption } from '@/components/clerko/admin-ui';
import { Field, Textarea } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDateTime, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useState, type FormEventHandler, type ReactNode } from 'react';

type Props = {
    submission: {
        id: number;
        full_legal_name: string;
        nationality: string;
        id_type: string;
        id_number: string;
        review_notes: string | null;
        id_expiry: string;
        status: string;
        reviewer: string | null;
        reviewed_at: string | null;
        created_at: string;
        user: { name: string; email: string; alias: string };
    };
};

type DecideForm = {
    decision: '' | 'verified' | 'rejected';
    notes: string;
};

const DECISIONS: DecisionOption[] = [
    { value: 'verified', label: 'Verify identity', description: 'The user gets full access to Clerko M&A.', icon: CheckCircle2, tone: 'green' },
    { value: 'rejected', label: 'Reject', description: 'The user is told why and can submit new documents.', icon: XCircle, tone: 'red' },
];

const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export default function AdminKycShow({ submission }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Identity (KYC)', href: route('admin.kyc.index') },
        { title: submission.full_legal_name, href: route('admin.kyc.show', submission.id) },
    ];

    const pending = submission.status === 'pending';
    const expired = new Date(submission.id_expiry).getTime() < new Date().setHours(0, 0, 0, 0);
    const namesDiffer = normalise(submission.full_legal_name) !== normalise(submission.user.name);

    const [checks, setChecks] = useState({ name: false, expiry: false, face: false });
    const allChecked = checks.name && checks.expiry && checks.face;

    const { data, setData, post, processing, errors } = useForm<DecideForm>({ decision: '', notes: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.kyc.decide', submission.id), { preserveScroll: true });
    };

    const checklist: { key: keyof typeof checks; label: string; hint: ReactNode; warn?: boolean }[] = [
        {
            key: 'name',
            label: 'Name on the ID matches the declared legal name',
            hint: namesDiffer
                ? `Account name "${submission.user.name}" differs from the declared legal name.`
                : 'Declared name matches the account name.',
            warn: namesDiffer,
        },
        {
            key: 'expiry',
            label: 'ID is valid and not expired',
            hint: expired
                ? `Declared expiry ${formatDate(submission.id_expiry)} is in the past.`
                : `Declared expiry ${formatDate(submission.id_expiry)}. Confirm it on the document.`,
            warn: expired,
        },
        { key: 'face', label: 'Face on the ID matches the selfie', hint: 'Compare facial features, not just hairstyle or glasses.' },
    ];

    const blockVerify = data.decision === 'verified' && !allChecked;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`KYC · ${submission.full_legal_name}`} />
            <PageBody>
                <PageHeader
                    eyebrow="Identity verification"
                    title={submission.full_legal_name}
                    description={
                        <>
                            {submission.user.email} · alias <span className="font-mono">#{submission.user.alias}</span> · submitted{' '}
                            {formatDateTime(submission.created_at)}
                        </>
                    }
                    actions={<StatusBadge status={submission.status} className="px-3 py-1 text-sm" />}
                />

                <div className="grid items-start gap-6 lg:grid-cols-3">
                    <div className="grid min-w-0 gap-6 md:grid-cols-2 lg:col-span-2">
                        <FilePreview
                            title={`ID document · ${ID_TYPES[submission.id_type] ?? titleCase(submission.id_type)}`}
                            src={route('admin.kyc.file', [submission.id, 'id'])}
                            kind="iframe"
                            heightClass="h-[420px] lg:h-[520px]"
                            className="min-w-0"
                        />
                        <FilePreview
                            title="Selfie"
                            src={route('admin.kyc.file', [submission.id, 'selfie'])}
                            kind="img"
                            heightClass="h-[420px] lg:h-[520px]"
                            className="min-w-0"
                        />
                    </div>

                    <div className="grid min-w-0 gap-6">
                        <SectionCard title="Declared details">
                            <DetailList
                                items={[
                                    { term: 'Legal name', value: submission.full_legal_name },
                                    { term: 'Account name', value: submission.user.name },
                                    { term: 'Nationality', value: submission.nationality },
                                    { term: 'ID type', value: ID_TYPES[submission.id_type] ?? titleCase(submission.id_type) },
                                    { term: 'ID number', value: <span className="font-mono">{submission.id_number}</span> },
                                    {
                                        term: 'ID expiry',
                                        value: (
                                            <span className={cn(expired && 'inline-flex items-center gap-1 text-red-700 dark:text-red-400')}>
                                                {expired && <AlertTriangle className="size-3.5" aria-hidden="true" />}
                                                {formatDate(submission.id_expiry)}
                                                {expired && ' (expired)'}
                                            </span>
                                        ),
                                    },
                                ]}
                            />
                        </SectionCard>

                        {pending ? (
                            <SectionCard title="Review" className="ring-primary/20 ring-2">
                                <form onSubmit={submit} className="grid gap-5" noValidate>
                                    <fieldset className="grid gap-3">
                                        <legend className="mb-1 text-sm font-medium">Reviewer checklist</legend>
                                        {checklist.map((c) => (
                                            <div key={c.key} className="flex items-start gap-3">
                                                <Checkbox
                                                    id={`check-${c.key}`}
                                                    checked={checks[c.key]}
                                                    onCheckedChange={(v) => setChecks((prev) => ({ ...prev, [c.key]: v === true }))}
                                                    aria-describedby={`check-${c.key}-hint`}
                                                />
                                                <div className="grid gap-0.5">
                                                    <Label htmlFor={`check-${c.key}`} className="leading-snug">
                                                        {c.label}
                                                    </Label>
                                                    <span
                                                        id={`check-${c.key}-hint`}
                                                        className={cn(
                                                            'text-xs',
                                                            c.warn ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {c.hint}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </fieldset>

                                    {errors.decision && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="size-4" />
                                            <AlertDescription>{errors.decision}</AlertDescription>
                                        </Alert>
                                    )}

                                    <DecisionRadioGroup
                                        name="kyc-decision"
                                        legend="Outcome"
                                        options={DECISIONS}
                                        value={data.decision}
                                        onChange={(v) => setData('decision', v as DecideForm['decision'])}
                                        invalid={Boolean(errors.decision)}
                                    />

                                    {blockVerify && (
                                        <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
                                            Tick every checklist item before verifying.
                                        </p>
                                    )}

                                    <Field
                                        label={data.decision === 'rejected' ? 'Reason (required, sent to the user)' : 'Notes (optional)'}
                                        htmlFor="kyc-notes"
                                        error={errors.notes}
                                    >
                                        <Textarea
                                            id="kyc-notes"
                                            rows={4}
                                            maxLength={2000}
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            required={data.decision === 'rejected'}
                                            placeholder={
                                                data.decision === 'rejected'
                                                    ? 'e.g. The ID photo is blurred — please upload a clearer scan.'
                                                    : undefined
                                            }
                                        />
                                    </Field>

                                    <Button
                                        type="submit"
                                        variant={data.decision === 'rejected' ? 'destructive' : 'default'}
                                        className={data.decision === 'verified' ? 'bg-brand-gradient-green' : undefined}
                                        disabled={
                                            processing ||
                                            data.decision === '' ||
                                            blockVerify ||
                                            (data.decision === 'rejected' && data.notes.trim() === '')
                                        }
                                    >
                                        {processing
                                            ? 'Saving…'
                                            : data.decision === 'verified'
                                              ? 'Verify identity'
                                              : data.decision === 'rejected'
                                                ? 'Reject submission'
                                                : 'Record decision'}
                                    </Button>
                                </form>
                            </SectionCard>
                        ) : (
                            <SectionCard title="Outcome">
                                <div className="grid gap-3 text-sm">
                                    <div
                                        className={cn(
                                            'flex items-center gap-2 rounded-xl p-3 font-semibold',
                                            submission.status === 'verified'
                                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'
                                                : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200',
                                        )}
                                    >
                                        {submission.status === 'verified' ? (
                                            <CheckCircle2 className="size-5" aria-hidden="true" />
                                        ) : (
                                            <XCircle className="size-5" aria-hidden="true" />
                                        )}
                                        {submission.status === 'verified' ? 'Identity verified' : `Submission ${submission.status}`}
                                    </div>
                                    <DetailList
                                        items={[
                                            { term: 'Reviewed by', value: submission.reviewer ?? '—' },
                                            { term: 'Reviewed at', value: formatDateTime(submission.reviewed_at) },
                                            {
                                                term: 'Notes',
                                                value: submission.review_notes ? (
                                                    <span className="whitespace-pre-line">{submission.review_notes}</span>
                                                ) : (
                                                    '—'
                                                ),
                                            },
                                        ]}
                                    />
                                </div>
                            </SectionCard>
                        )}
                    </div>
                </div>
            </PageBody>
        </AppLayout>
    );
}
