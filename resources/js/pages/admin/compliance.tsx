import { ResultCount, StatusFilter } from '@/components/clerko/admin-ui';
import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { Pagination } from '@/components/clerko/pagination';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, timeAgo, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Check, Lock, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';

type Flag = {
    id: number;
    rule: string;
    excerpt: string;
    status: string;
    user: { name: string; email: string } | null;
    deal_room_id: number | null;
    deal: string | null;
    created_at: string;
};

type Props = {
    flags: Paginated<Flag>;
    status: string;
};

const STATUSES = { open: 'Open', cleared: 'Cleared', actioned: 'Actioned', all: 'All' };

const RULES: Record<string, { label: string; description: string }> = {
    off_platform_contact: {
        label: 'Possible off-platform contact',
        description: 'A deal-room message looked like it shared contact details or tried to move the conversation off Clerko.',
    },
};

export default function AdminCompliance({ flags, status }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Compliance', href: route('admin.compliance.index') },
    ];
    const [busy, setBusy] = useState<number | null>(null);

    const resolve = (flag: Flag, next: 'cleared' | 'actioned') => {
        setBusy(flag.id);
        router.post(route('admin.compliance.update', flag.id), { status: next }, { preserveScroll: true, onFinish: () => setBusy(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compliance flags" />
            <PageBody>
                <PageHeader
                    eyebrow="Admin console"
                    title="Compliance flags"
                    description="Messages caught by the deal-room policy filter. Parties saw a redacted version; the original text below is visible to admins only."
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusFilter routeName="admin.compliance.index" value={status} options={STATUSES} label="Filter flags by status" />
                    <ResultCount from={flags.from} to={flags.to} total={flags.total} noun="flags" />
                </div>

                {flags.data.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title={status === 'open' ? 'No open flags' : 'No flags here'}
                        description={status === 'open' ? 'All deal rooms are within policy.' : 'Try another status filter.'}
                        className="bg-card"
                    />
                ) : (
                    <ul className="grid gap-4">
                        {flags.data.map((flag) => {
                            const rule = RULES[flag.rule] ?? { label: titleCase(flag.rule), description: '' };
                            const open = flag.status === 'open';
                            return (
                                <li key={flag.id}>
                                    <article
                                        aria-labelledby={`flag-${flag.id}-title`}
                                        className={cn('bg-card shadow-brand rounded-2xl border', open && 'border-l-4 border-l-red-500')}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <span
                                                    className={cn(
                                                        'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                                        open ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-muted text-muted-foreground',
                                                    )}
                                                >
                                                    <ShieldAlert className="size-5" aria-hidden="true" />
                                                </span>
                                                <div className="min-w-0">
                                                    <h2 id={`flag-${flag.id}-title`} className="text-brand-ink font-bold dark:text-white">
                                                        {rule.label}
                                                    </h2>
                                                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                                        {flag.deal && <span className="font-medium">{flag.deal}</span>}
                                                        <span className="inline-flex items-center gap-1">
                                                            <User className="size-3.5" aria-hidden="true" />
                                                            {flag.user ? (
                                                                <>
                                                                    {flag.user.name} <span className="text-xs">({flag.user.email})</span>
                                                                </>
                                                            ) : (
                                                                'Unknown user'
                                                            )}
                                                        </span>
                                                        <time dateTime={flag.created_at} title={formatDateTime(flag.created_at)}>
                                                            {timeAgo(flag.created_at)}
                                                        </time>
                                                    </div>
                                                </div>
                                            </div>
                                            <StatusBadge status={flag.status} />
                                        </div>

                                        <div className="grid gap-3 px-5 py-4">
                                            <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                                                <Lock className="size-3.5" aria-hidden="true" /> Original message · admins only
                                            </div>
                                            <blockquote className="bg-muted rounded-xl border-l-4 border-l-amber-400 p-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                                {flag.excerpt}
                                            </blockquote>
                                            {rule.description && <p className="text-muted-foreground text-xs">{rule.description}</p>}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                                            {flag.deal_room_id ? (
                                                <Link
                                                    href={route('deal-rooms.show', flag.deal_room_id)}
                                                    className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                                                >
                                                    Observe deal room (read-only) <ArrowRight className="size-3.5" aria-hidden="true" />
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">No deal room linked</span>
                                            )}
                                            {open ? (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={busy === flag.id}
                                                        onClick={() => resolve(flag, 'cleared')}
                                                    >
                                                        <Check className="size-4" aria-hidden="true" /> Clear
                                                        <span className="sr-only"> flag {flag.id} (no breach)</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={busy === flag.id}
                                                        onClick={() => resolve(flag, 'actioned')}
                                                    >
                                                        Mark actioned<span className="sr-only"> flag {flag.id}</span>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">
                                                    {flag.status === 'cleared' ? 'Cleared — no breach found.' : 'Actioned — breach handled.'}
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <Pagination page={flags} />
            </PageBody>
        </AppLayout>
    );
}
