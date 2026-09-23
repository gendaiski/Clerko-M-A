import { DataTable } from '@/components/clerko/data-table';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate, timeAgo, titleCase } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { BadgeCheck, CircleDashed } from 'lucide-react';
import { type ReactNode } from 'react';

/** Admin ListingController::row() */
export type AdminListingRow = {
    id: number;
    reference: string;
    headline: string;
    company: string | null;
    company_verified: boolean;
    sector: string;
    tier: string | null;
    status: string;
    status_label: string;
    submitted_at: string | null;
};

export function KybTick({ verified }: { verified: boolean }) {
    return verified ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <BadgeCheck className="size-3.5" aria-hidden="true" /> KYB verified
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <CircleDashed className="size-3.5" aria-hidden="true" /> KYB pending
        </span>
    );
}

export function AdminListingTable({ rows, empty }: { rows: AdminListingRow[]; empty: ReactNode }) {
    return (
        <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            empty={empty}
            columns={[
                {
                    header: 'Reference',
                    className: 'whitespace-nowrap',
                    cell: (r) => (
                        <Link href={route('admin.listings.show', r.id)} className="text-primary font-mono text-xs font-semibold hover:underline">
                            {r.reference}
                        </Link>
                    ),
                },
                {
                    header: 'Listing',
                    className: 'min-w-[220px]',
                    cell: (r) => (
                        <Link
                            href={route('admin.listings.show', r.id)}
                            className="text-brand-ink hover:text-primary line-clamp-2 font-semibold dark:text-white"
                        >
                            {r.headline || 'Untitled listing'}
                        </Link>
                    ),
                },
                {
                    header: 'Company',
                    className: 'min-w-[160px]',
                    cell: (r) => (
                        <div className="grid gap-0.5">
                            <span className="font-medium">{r.company ?? '—'}</span>
                            <KybTick verified={r.company_verified} />
                        </div>
                    ),
                },
                { header: 'Sector', cell: (r) => r.sector },
                { header: 'Tier', cell: (r) => (r.tier ? titleCase(r.tier) : <span className="text-muted-foreground">—</span>) },
                { header: 'Status', cell: (r) => <StatusBadge status={r.status} label={r.status_label} /> },
                {
                    header: 'Submitted',
                    className: 'whitespace-nowrap',
                    cell: (r) =>
                        r.submitted_at ? (
                            <time dateTime={r.submitted_at} title={formatDate(r.submitted_at)}>
                                {timeAgo(r.submitted_at)}
                            </time>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        ),
                },
                {
                    header: <span className="sr-only">Actions</span>,
                    className: 'text-right',
                    cell: (r) => (
                        <Button asChild size="sm" variant={r.status === 'pending_review' ? 'default' : 'outline'}>
                            <Link href={route('admin.listings.show', r.id)}>
                                {r.status === 'pending_review' ? 'Review' : 'Open'}
                                <span className="sr-only"> {r.reference}</span>
                            </Link>
                        </Button>
                    ),
                },
            ]}
        />
    );
}
