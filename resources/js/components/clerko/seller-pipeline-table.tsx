import { DataTable } from '@/components/clerko/data-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { StatusBadge } from '@/components/clerko/status-badge';
import { timeAgo, titleCase } from '@/lib/format';
import { type PipelineRow } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowRight, BadgeCheck, Clock, Users } from 'lucide-react';

/** Buyer types as labelled on the buyer preferences page. */
const BUYER_TYPES: Record<string, string> = {
    strategic: 'Strategic acquirer',
    pe_fund: 'PE / fund',
    family_office: 'Family office',
    individual: 'Individual investor',
};

export function buyerTypeLabel(type: string | null): string | null {
    if (!type) {
        return null;
    }
    return BUYER_TYPES[type] ?? titleCase(type);
}

function nextStepHint(row: PipelineRow): string {
    switch (row.stage) {
        case 'nda_requested':
            return 'Awaiting NDA signature';
        case 'nda_signed':
            return 'Awaiting pack unlock';
        case 'pack_unlocked':
            return 'Reviewing Details Pack';
        case 'withdrawn':
            return 'Buyer withdrew';
        default:
            return '—';
    }
}

/** The seller's anonymised interest pipeline (dashboard and listing page). */
export function SellerPipelineTable({
    rows,
    showListing = true,
    emptyDescription,
}: {
    rows: PipelineRow[];
    showListing?: boolean;
    emptyDescription?: string;
}) {
    return (
        <DataTable<PipelineRow>
            rows={rows}
            rowKey={(row) => row.id}
            empty={
                <EmptyState
                    icon={Users}
                    title="No buyer interest yet"
                    description={
                        emptyDescription ??
                        'When verified buyers request access to your teaser, they appear here anonymised — you follow each one from NDA to Deal Room.'
                    }
                />
            }
            columns={[
                {
                    header: 'Buyer (anonymised)',
                    cell: (row) => (
                        <div>
                            <div className="text-foreground font-semibold">{row.buyer}</div>
                            {row.buyer_type && <div className="text-muted-foreground text-xs">{buyerTypeLabel(row.buyer_type)}</div>}
                        </div>
                    ),
                },
                {
                    header: 'Verified',
                    cell: (row) =>
                        row.buyer_verified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <BadgeCheck className="size-4" aria-hidden="true" /> KYC
                            </span>
                        ) : (
                            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                <Clock className="size-3.5" aria-hidden="true" /> Pending
                            </span>
                        ),
                },
                ...(showListing
                    ? [
                          {
                              header: 'Listing',
                              cell: (row: PipelineRow) => <span className="font-mono text-xs font-semibold">{row.listing_reference}</span>,
                          },
                      ]
                    : []),
                {
                    header: 'Stage',
                    cell: (row) => <StatusBadge status={row.stage} label={row.stage_label} />,
                },
                {
                    header: 'Last activity',
                    cell: (row) => <span className="text-muted-foreground whitespace-nowrap">{timeAgo(row.last_activity_at)}</span>,
                },
                {
                    header: <span className="sr-only">Actions</span>,
                    className: 'text-right',
                    cell: (row) =>
                        row.deal_room_id ? (
                            <Link
                                href={route('deal-rooms.show', row.deal_room_id)}
                                className="text-primary inline-flex items-center gap-1 font-semibold whitespace-nowrap hover:underline"
                            >
                                Open Deal Room <ArrowRight className="size-3.5" aria-hidden="true" />
                            </Link>
                        ) : (
                            <span className="text-muted-foreground text-xs whitespace-nowrap">{nextStepHint(row)}</span>
                        ),
                },
            ]}
        />
    );
}
