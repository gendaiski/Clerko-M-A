import { AdminExtractionPanel, type ExtractionRun } from '@/components/clerko/admin-extraction-panel';
import { DecisionRadioGroup, DetailList, FilePreview, JsonBlock, type DecisionOption } from '@/components/clerko/admin-ui';
import { Field, Textarea } from '@/components/clerko/field';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatDate } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileWarning, Loader2, XCircle } from 'lucide-react';
import { type FormEventHandler } from 'react';

type JsonRows = Record<string, unknown>[] | null;

type Props = {
    company: {
        id: number;
        extraction_status: string;
        extraction_error: string | null;
        cr_number: string | null;
        name_en: string | null;
        name_ar: string | null;
        legal_form: string | null;
        cr_status: string | null;
        address: string | null;
        activities: JsonRows;
        shareholders: JsonRows;
        signatories: JsonRows;
        seller_capacity: string | null;
        verification_notes: string | null;
        registration_date: string | null;
        expiry_date: string | null;
        capital: number | null;
        verification_status: string;
        seller_capacity_label: string | null;
        has_authority_document: boolean;
        extracted_data: Record<string, unknown> | unknown[] | null;
        extraction_provider: string | null;
        extraction_reference: string | null;
        unmapped_keys: string[];
        owner: { name: string; email: string; kyc_status: string };
    };
    extraction: { driver: string; runs: ExtractionRun[] };
};

type ProfileForm = {
    cr_number: string;
    name_en: string;
    name_ar: string;
    legal_form: string;
    cr_status: string;
    registration_date: string;
    expiry_date: string;
    capital: string;
    address: string;
    /** JSON text, parsed into arrays on submit. */
    activities: string;
    shareholders: string;
    signatories: string;
};

type VerifyForm = {
    decision: '' | 'verified' | 'rejected';
    notes: string;
};

const JSON_FIELDS = ['activities', 'shareholders', 'signatories'] as const;
type JsonField = (typeof JSON_FIELDS)[number];

const JSON_HINTS: Record<JsonField, string> = {
    activities: '[{"isic4_code": "6201", "activity": "Computer programming"}]',
    shareholders: '[{"name": "…", "nationality": "…", "shares_pct": 60}]',
    signatories: '[{"name": "…", "authority": "Sole"}]',
};

const DECISIONS: DecisionOption[] = [
    {
        value: 'verified',
        label: 'Verify company',
        description: 'Profile matches the CR extract and the seller has capacity to sell.',
        icon: CheckCircle2,
        tone: 'green',
    },
    { value: 'rejected', label: 'Reject', description: 'The seller is told why and can upload a new CR extract.', icon: XCircle, tone: 'red' },
];

const toJson = (rows: JsonRows) => (rows && rows.length > 0 ? JSON.stringify(rows, null, 2) : '');

/** Parse a JSON field: empty → null; otherwise must be an array of plain objects. */
function parseRows(text: string): { ok: true; value: Record<string, unknown>[] | null } | { ok: false; error: string } {
    if (text.trim() === '') {
        return { ok: true, value: null };
    }
    try {
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed) || !parsed.every((r) => r !== null && typeof r === 'object' && !Array.isArray(r))) {
            return { ok: false, error: 'Must be a JSON array of objects, e.g. [{"name": "…"}].' };
        }
        return { ok: true, value: parsed as Record<string, unknown>[] };
    } catch (e) {
        return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
    }
}

function daysUntil(date: string | null): number | null {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export default function AdminCompanyShow({ company, extraction }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Companies (KYB)', href: route('admin.companies.index') },
        { title: company.name_en ?? company.cr_number ?? `Company #${company.id}`, href: route('admin.companies.show', company.id) },
    ];

    const profile = useForm<ProfileForm>({
        cr_number: company.cr_number ?? '',
        name_en: company.name_en ?? '',
        name_ar: company.name_ar ?? '',
        legal_form: company.legal_form ?? '',
        cr_status: company.cr_status ?? '',
        registration_date: company.registration_date ?? '',
        expiry_date: company.expiry_date ?? '',
        capital: company.capital !== null ? String(company.capital) : '',
        address: company.address ?? '',
        activities: toJson(company.activities),
        shareholders: toJson(company.shareholders),
        signatories: toJson(company.signatories),
    });

    const verify = useForm<VerifyForm>({ decision: '', notes: '' });

    const saveProfile: FormEventHandler = (e) => {
        e.preventDefault();
        const parsed: Partial<Record<JsonField, Record<string, unknown>[] | null>> = {};
        let valid = true;
        for (const field of JSON_FIELDS) {
            const result = parseRows(profile.data[field]);
            if (result.ok) {
                parsed[field] = result.value;
                profile.clearErrors(field);
            } else {
                profile.setError(field, result.error);
                valid = false;
            }
        }
        if (!valid) {
            return;
        }
        profile.transform((data) => ({
            ...data,
            ...parsed,
            capital: data.capital.trim() === '' ? null : data.capital,
        }));
        profile.put(route('admin.companies.update', company.id), {
            preserveScroll: true,
            onSuccess: () => profile.setDefaults(),
        });
    };

    const submitDecision: FormEventHandler = (e) => {
        e.preventDefault();
        verify.post(route('admin.companies.verify', company.id), { preserveScroll: true });
    };

    const extractionDone = company.extraction_status === 'completed';
    const expiryDays = daysUntil(company.expiry_date);
    const ownerKycOk = company.owner.kyc_status === 'verified';
    const decided = company.verification_status !== 'pending';

    const text = (
        field: Exclude<keyof ProfileForm, JsonField>,
        label: string,
        opts: { type?: string; dir?: 'rtl' | 'ltr'; mono?: boolean; className?: string } = {},
    ) => (
        <Field label={label} htmlFor={field} error={profile.errors[field]} className={opts.className}>
            <Input
                id={field}
                type={opts.type ?? 'text'}
                dir={opts.dir}
                lang={opts.dir === 'rtl' ? 'ar' : undefined}
                value={profile.data[field]}
                onChange={(e) => profile.setData(field, e.target.value)}
                className={opts.mono ? 'font-mono' : undefined}
                aria-invalid={Boolean(profile.errors[field]) || undefined}
                {...(opts.type === 'number' ? { min: 0, step: '0.001', inputMode: 'decimal' as const } : {})}
            />
        </Field>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`KYB · ${company.name_en ?? company.cr_number ?? 'Company'}`} />
            <PageBody>
                <PageHeader
                    eyebrow="KYB verification"
                    title={company.name_en ?? 'Unnamed company'}
                    description={
                        <>
                            CR <span className="font-mono">{company.cr_number ?? '—'}</span>
                            {company.name_ar && (
                                <>
                                    {' · '}
                                    <span dir="rtl" lang="ar">
                                        {company.name_ar}
                                    </span>
                                </>
                            )}
                            {' · '}owned by {company.owner.name}
                        </>
                    }
                    actions={
                        <>
                            <StatusBadge
                                status={company.extraction_status}
                                label={`Extraction ${company.extraction_status}`}
                                tone={company.extraction_status === 'pending' ? 'slate' : undefined}
                            />
                            <StatusBadge
                                status={company.verification_status}
                                label={`KYB ${company.verification_status}`}
                                className="px-3 py-1 text-sm"
                            />
                        </>
                    }
                />

                {!extractionDone && company.extraction_status !== 'manual' && (
                    <Alert variant={company.extraction_status === 'failed' ? 'destructive' : 'default'}>
                        {company.extraction_status === 'failed' ? <FileWarning className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
                        <AlertTitle>{company.extraction_status === 'failed' ? 'Extraction failed' : 'Extraction not finished'}</AlertTitle>
                        <AlertDescription>
                            {company.extraction_status === 'failed'
                                ? (company.extraction_error ?? 'The CR extract could not be read.') +
                                  ' Enter the profile manually from the PDF, or reject and ask for a clearer extract.'
                                : `Status: ${company.extraction_status}. The profile below may be empty until extraction completes — reload in a moment.`}
                        </AlertDescription>
                    </Alert>
                )}

                {expiryDays !== null && expiryDays <= 30 && (
                    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                        <AlertTriangle className="size-4 !text-amber-600" />
                        <AlertTitle>{expiryDays < 0 ? 'CR has expired' : 'CR expires soon'}</AlertTitle>
                        <AlertDescription>
                            Expiry date {formatDate(company.expiry_date)}
                            {expiryDays < 0 ? ` (${Math.abs(expiryDays)} days ago)` : ` (in ${expiryDays} days)`}. Ask the seller for a renewed CR
                            before relying on this verification.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <FilePreview
                        title="Sijilat CR extract (PDF)"
                        src={route('seller.companies.cr-pdf', company.id)}
                        kind="iframe"
                        className="min-w-0 lg:sticky lg:top-4"
                        heightClass="h-[60vh] min-h-[420px] lg:h-[78vh]"
                    />

                    <SectionCard
                        title="Company profile"
                        description="Correct anything the extraction got wrong. Changes are recorded in the audit trail."
                        className="min-w-0"
                    >
                        <form onSubmit={saveProfile} className="grid gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {text('cr_number', 'CR number', { mono: true })}
                                {text('cr_status', 'CR status')}
                                {text('name_en', 'Name (English)', { className: 'sm:col-span-2' })}
                                {text('name_ar', 'Name (Arabic)', { dir: 'rtl', className: 'sm:col-span-2' })}
                                {text('legal_form', 'Legal form')}
                                {text('capital', 'Capital (BD)', { type: 'number' })}
                                {text('registration_date', 'Registration date', { type: 'date' })}
                                {text('expiry_date', 'Expiry date', { type: 'date' })}
                            </div>
                            <Field label="Registered address" htmlFor="address" error={profile.errors.address}>
                                <Textarea
                                    id="address"
                                    rows={2}
                                    value={profile.data.address}
                                    onChange={(e) => profile.setData('address', e.target.value)}
                                />
                            </Field>

                            {JSON_FIELDS.map((field) => (
                                <Field
                                    key={field}
                                    label={
                                        <span className="capitalize">
                                            {field} <span className="text-muted-foreground font-normal normal-case">(JSON)</span>
                                        </span>
                                    }
                                    htmlFor={field}
                                    error={profile.errors[field]}
                                    hint={
                                        <>
                                            Array of objects, e.g. <code className="font-mono">{JSON_HINTS[field]}</code>. Leave empty for none.
                                        </>
                                    }
                                >
                                    <Textarea
                                        id={field}
                                        rows={6}
                                        spellCheck={false}
                                        value={profile.data[field]}
                                        onChange={(e) => {
                                            profile.setData(field, e.target.value);
                                            if (profile.errors[field]) profile.clearErrors(field);
                                        }}
                                        className="font-mono text-xs"
                                        aria-invalid={Boolean(profile.errors[field]) || undefined}
                                    />
                                </Field>
                            ))}

                            <div className="flex flex-wrap items-center gap-3">
                                <Button type="submit" disabled={profile.processing || !profile.isDirty}>
                                    {profile.processing ? 'Saving…' : 'Save corrections'}
                                </Button>
                                {profile.isDirty && !profile.processing && (
                                    <span className="text-sm text-amber-700 dark:text-amber-400">Unsaved changes</span>
                                )}
                                {profile.recentlySuccessful && (
                                    <span className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400" role="status">
                                        <CheckCircle2 className="size-4" aria-hidden="true" /> Saved
                                    </span>
                                )}
                                <span className="text-muted-foreground ml-auto text-xs">
                                    Capital shown as {formatBD(company.capital, { compact: false })}
                                </span>
                            </div>
                        </form>
                    </SectionCard>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-3">
                    <div className="grid min-w-0 gap-6 lg:col-span-2">
                        <SectionCard title="Seller & authority" description="Who is selling, and on what authority.">
                            <div className="grid gap-6 md:grid-cols-2">
                                <DetailList
                                    items={[
                                        { term: 'Owner', value: company.owner.name },
                                        {
                                            term: 'Email',
                                            value: (
                                                <a href={`mailto:${company.owner.email}`} className="text-primary hover:underline">
                                                    {company.owner.email}
                                                </a>
                                            ),
                                        },
                                        {
                                            term: 'Identity (KYC)',
                                            value: (
                                                <span className="inline-flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={company.owner.kyc_status} />
                                                    {!ownerKycOk && (
                                                        <span className="text-muted-foreground text-xs">Listings cannot go live until verified</span>
                                                    )}
                                                </span>
                                            ),
                                        },
                                    ]}
                                />
                                <DetailList
                                    items={[
                                        {
                                            term: 'Seller capacity',
                                            value: company.seller_capacity_label ?? <span className="text-muted-foreground">Not stated</span>,
                                        },
                                        {
                                            term: 'Authority document',
                                            value: company.has_authority_document ? (
                                                <a
                                                    href={route('admin.companies.authority-document', company.id)}
                                                    target="_blank"
                                                    rel="noopener"
                                                    className="text-primary inline-flex items-center gap-1 hover:underline"
                                                >
                                                    Open document <ExternalLink className="size-3.5" aria-hidden="true" />
                                                </a>
                                            ) : (
                                                <span
                                                    className={
                                                        company.seller_capacity && company.seller_capacity !== 'shareholder'
                                                            ? 'text-amber-700 dark:text-amber-400'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    None uploaded
                                                </span>
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                            <p className="text-muted-foreground mt-4 text-xs">
                                Check the seller appears among the shareholders or signatories above, or that the authority document (e.g. power of
                                attorney) covers a sale.
                            </p>
                        </SectionCard>

                        <AdminExtractionPanel
                            companyId={company.id}
                            status={company.extraction_status}
                            provider={company.extraction_provider}
                            reference={company.extraction_reference}
                            driver={extraction.driver}
                            runs={extraction.runs}
                            unmappedKeys={company.unmapped_keys}
                            verified={company.verification_status === 'verified'}
                        />

                        <SectionCard title="Raw extracted data" description="Exactly what the extractor read from the PDF, for reference.">
                            {company.extracted_data ? (
                                <details className="group">
                                    <summary className="text-primary cursor-pointer text-sm font-medium select-none">Show extracted JSON</summary>
                                    <JsonBlock value={company.extracted_data} className="mt-3" />
                                </details>
                            ) : (
                                <p className="text-muted-foreground text-sm italic">
                                    No extracted data{company.extraction_status !== 'completed' ? ' yet' : ''}.
                                </p>
                            )}
                        </SectionCard>
                    </div>

                    <SectionCard title="Decision" className="ring-primary/20 min-w-0 ring-2">
                        {decided && (
                            <div className="bg-muted mb-4 grid gap-1.5 rounded-xl p-3 text-sm">
                                <div className="flex items-center gap-2">
                                    Current outcome: <StatusBadge status={company.verification_status} />
                                </div>
                                {company.verification_notes && (
                                    <p className="text-muted-foreground whitespace-pre-line">{company.verification_notes}</p>
                                )}
                                <p className="text-muted-foreground text-xs">Recording a new decision replaces this one and notifies the seller.</p>
                            </div>
                        )}
                        <form onSubmit={submitDecision} className="grid gap-4" noValidate>
                            {verify.errors.decision && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="size-4" />
                                    <AlertDescription>{verify.errors.decision}</AlertDescription>
                                </Alert>
                            )}
                            <DecisionRadioGroup
                                name="kyb-decision"
                                legend={decided ? 'New outcome' : 'Outcome'}
                                options={DECISIONS}
                                value={verify.data.decision}
                                onChange={(v) => verify.setData('decision', v as VerifyForm['decision'])}
                                invalid={Boolean(verify.errors.decision)}
                            />
                            <Field
                                label={verify.data.decision === 'rejected' ? 'Reason (required, sent to seller)' : 'Notes (optional)'}
                                htmlFor="kyb-notes"
                                error={verify.errors.notes}
                            >
                                <Textarea
                                    id="kyb-notes"
                                    rows={4}
                                    maxLength={2000}
                                    value={verify.data.notes}
                                    onChange={(e) => verify.setData('notes', e.target.value)}
                                    required={verify.data.decision === 'rejected'}
                                />
                            </Field>
                            {profile.isDirty && (
                                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> You have unsaved profile corrections. Save
                                    them before recording a decision.
                                </p>
                            )}
                            <Button
                                type="submit"
                                variant={verify.data.decision === 'rejected' ? 'destructive' : 'default'}
                                className={verify.data.decision === 'verified' ? 'bg-brand-gradient-green' : undefined}
                                disabled={
                                    verify.processing ||
                                    verify.data.decision === '' ||
                                    (verify.data.decision === 'rejected' && verify.data.notes.trim() === '')
                                }
                            >
                                {verify.processing
                                    ? 'Saving…'
                                    : verify.data.decision === 'rejected'
                                      ? 'Reject company'
                                      : verify.data.decision === 'verified'
                                        ? 'Verify company'
                                        : 'Record decision'}
                            </Button>
                        </form>
                    </SectionCard>
                </div>
            </PageBody>
        </AppLayout>
    );
}
