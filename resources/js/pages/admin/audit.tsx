import { ResultCount } from '@/components/clerko/admin-ui';
import { DataTable } from '@/components/clerko/data-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { Pagination } from '@/components/clerko/pagination';
import { SectionCard } from '@/components/clerko/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Link2, Link2Off, ScrollText, Search, ShieldCheck, X } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

type AuditRow = {
    id: number;
    event: string;
    actor: string | null;
    subject: string | null;
    properties: Record<string, unknown> | unknown[] | null;
    ip_address: string | null;
    hash: string;
    created_at: string;
};

type Props = {
    events: Paginated<AuditRow>;
    /** null = not run; 0 = chain intact; N > 0 = first broken event id. */
    chainBrokenAt: number | null;
    filter: string | null;
};

const PREFIXES = ['listing.', 'company.', 'kyc.', 'nda.', 'pack.', 'deal_room.', 'compliance.', 'payment.'];

function compactJson(value: AuditRow['properties']): string | null {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value) && value.length === 0) return null;
    if (!Array.isArray(value) && Object.keys(value).length === 0) return null;
    return JSON.stringify(value);
}

export default function AdminAudit({ events, chainBrokenAt, filter }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Audit trail', href: route('admin.audit.index') },
    ];
    const [event, setEvent] = useState(filter ?? '');
    const [verifying, setVerifying] = useState(false);

    const applyFilter = (value: string) => {
        router.get(route('admin.audit.index'), value.trim() ? { event: value.trim() } : {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        applyFilter(event);
    };

    const verify = () => {
        setVerifying(true);
        router.get(
            route('admin.audit.index'),
            { verify: 1, ...(filter ? { event: filter } : {}) },
            { preserveScroll: true, preserveState: true, onFinish: () => setVerifying(false) },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit trail" />
            <PageBody>
                <PageHeader
                    eyebrow="Admin console"
                    title="Audit trail"
                    description="Append-only, hash-chained record of every regulated action on the platform."
                    actions={
                        <Button type="button" onClick={verify} disabled={verifying} className="bg-brand-gradient shadow-brand">
                            <ShieldCheck className="size-4" aria-hidden="true" /> {verifying ? 'Verifying…' : 'Verify chain integrity'}
                        </Button>
                    }
                />

                <div aria-live="polite">
                    {chainBrokenAt === 0 && (
                        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                            <Link2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
                            <div>
                                <div className="font-semibold">Hash chain intact</div>
                                <div className="text-sm opacity-90">
                                    Every event's hash matches its contents and the previous event. No tampering detected.
                                </div>
                            </div>
                        </div>
                    )}
                    {chainBrokenAt !== null && chainBrokenAt > 0 && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
                        >
                            <Link2Off className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
                            <div>
                                <div className="font-semibold">Chain broken at event #{chainBrokenAt}</div>
                                <div className="text-sm opacity-90">
                                    The stored hash for this event no longer matches its contents or its predecessor. Treat records from #
                                    {chainBrokenAt} onwards as untrusted and escalate.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <SectionCard>
                    <form onSubmit={onSubmit} className="grid gap-3" role="search">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="event-filter">Event prefix</Label>
                                <div className="relative">
                                    <Search
                                        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="event-filter"
                                        value={event}
                                        onChange={(e) => setEvent(e.target.value)}
                                        placeholder="e.g. listing. or kyc.verified"
                                        className="pl-9 font-mono"
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit">Filter</Button>
                                {filter && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setEvent('');
                                            applyFilter('');
                                        }}
                                    >
                                        <X className="size-4" aria-hidden="true" /> Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-muted-foreground mr-1 text-xs">Quick filters:</span>
                            {PREFIXES.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    aria-pressed={filter === p}
                                    onClick={() => {
                                        setEvent(p);
                                        applyFilter(p);
                                    }}
                                    className={cn(
                                        'rounded-full border px-2.5 py-0.5 font-mono text-xs transition',
                                        filter === p ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </form>
                </SectionCard>

                <SectionCard
                    title={
                        filter ? (
                            <>
                                Events matching <code className="font-mono">{filter}*</code>
                            </>
                        ) : (
                            'All events'
                        )
                    }
                    actions={<ResultCount from={events.from} to={events.to} total={events.total} noun="events" />}
                    bodyClassName="p-2 sm:p-3"
                >
                    <DataTable
                        rows={events.data}
                        rowKey={(e) => e.id}
                        className="[&_table]:min-w-[980px] [&_td]:py-2 [&_td]:align-top"
                        empty={
                            <EmptyState
                                icon={ScrollText}
                                title="No events"
                                description={filter ? `Nothing recorded with the prefix "${filter}".` : 'Nothing has been recorded yet.'}
                                className="m-3"
                            />
                        }
                        columns={[
                            {
                                header: '#',
                                className: 'whitespace-nowrap tabular-nums',
                                cell: (e) => (
                                    <span
                                        className={cn(
                                            'font-mono text-xs',
                                            chainBrokenAt !== null && chainBrokenAt > 0 && e.id === chainBrokenAt && 'font-bold text-red-600',
                                        )}
                                    >
                                        {e.id}
                                    </span>
                                ),
                            },
                            {
                                header: 'Time',
                                className: 'whitespace-nowrap',
                                cell: (e) => (
                                    <time dateTime={e.created_at} className="text-xs">
                                        {formatDateTime(e.created_at)}
                                    </time>
                                ),
                            },
                            {
                                header: 'Event',
                                className: 'whitespace-nowrap',
                                cell: (e) => <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{e.event}</code>,
                            },
                            { header: 'Actor', cell: (e) => e.actor ?? <span className="text-muted-foreground italic">System</span> },
                            {
                                header: 'Subject',
                                className: 'whitespace-nowrap',
                                cell: (e) =>
                                    e.subject ? (
                                        <span className="font-mono text-xs">{e.subject}</span>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    ),
                            },
                            {
                                header: 'Properties',
                                className: 'max-w-[280px]',
                                cell: (e) => {
                                    const json = compactJson(e.properties);
                                    if (!json) return <span className="text-muted-foreground">—</span>;
                                    return json.length > 60 ? (
                                        <details>
                                            <summary className="text-muted-foreground cursor-pointer truncate font-mono text-xs">{json}</summary>
                                            <pre className="bg-muted mt-1 max-h-60 overflow-auto rounded-lg p-2 font-mono text-[11px] break-all whitespace-pre-wrap">
                                                {JSON.stringify(e.properties, null, 2)}
                                            </pre>
                                        </details>
                                    ) : (
                                        <code className="text-muted-foreground font-mono text-xs break-all">{json}</code>
                                    );
                                },
                            },
                            {
                                header: 'IP',
                                className: 'whitespace-nowrap',
                                cell: (e) => <span className="font-mono text-xs">{e.ip_address ?? '—'}</span>,
                            },
                            {
                                header: 'Hash',
                                className: 'whitespace-nowrap',
                                cell: (e) => (
                                    <span className="text-muted-foreground font-mono text-xs" title="First 12 characters of the SHA-256 chain hash">
                                        {e.hash}…
                                    </span>
                                ),
                            },
                        ]}
                    />
                </SectionCard>

                <Pagination page={events} />
            </PageBody>
        </AppLayout>
    );
}
