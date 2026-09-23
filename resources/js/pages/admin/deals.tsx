import { ResultCount } from '@/components/clerko/admin-ui';
import { DataTable } from '@/components/clerko/data-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { Pagination } from '@/components/clerko/pagination';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatBD, formatDateTime, timeAgo } from '@/lib/format';
import { type BreadcrumbItem, type Paginated } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Handshake } from 'lucide-react';

type Room = {
    id: number;
    company: string | null;
    listing_reference: string;
    buyer: string;
    stage_label: string;
    status: string;
    agreed_price: number | null;
    updated_at: string;
};

type Props = {
    rooms: Paginated<Room>;
};

/** The controller sends only the stage label, so colour by label. */
const STAGE_TONES: Record<string, 'slate' | 'blue' | 'indigo' | 'purple' | 'amber' | 'green'> = {
    'NDA requested': 'slate',
    'NDA signed': 'blue',
    'Pack unlocked': 'indigo',
    'Deal room': 'purple',
    'Indicative offer': 'amber',
    Offer: 'amber',
    'Headline terms': 'green',
    Withdrawn: 'slate',
};

const ROOM_STATUS: Record<string, string> = {
    open: 'Open',
    terms_agreed: 'Terms agreed',
    closed: 'Closed',
};

export default function AdminDeals({ rooms }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Deal rooms', href: route('admin.deals.index') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Deal rooms" />
            <PageBody>
                <PageHeader
                    eyebrow="Admin console"
                    title="Deal rooms"
                    description="Every private deal room, most recently active first. Admins can observe any room read-only."
                />

                <SectionCard
                    title="All deal rooms"
                    actions={<ResultCount from={rooms.from} to={rooms.to} total={rooms.total} noun="rooms" />}
                    bodyClassName="p-2 sm:p-3"
                >
                    <DataTable
                        rows={rooms.data}
                        rowKey={(r) => r.id}
                        empty={
                            <EmptyState
                                icon={Handshake}
                                title="No deal rooms yet"
                                description="A room opens when a buyer who has unlocked a pack starts a conversation."
                                className="m-3"
                            />
                        }
                        columns={[
                            {
                                header: 'Deal',
                                className: 'min-w-[200px]',
                                cell: (r) => (
                                    <Link href={route('deal-rooms.show', r.id)} className="group grid gap-0.5">
                                        <span className="text-brand-ink group-hover:text-primary font-semibold dark:text-white">
                                            {r.company ?? 'Unnamed company'} <span className="text-muted-foreground font-normal">×</span> {r.buyer}
                                        </span>
                                        <span className="text-muted-foreground font-mono text-xs">{r.listing_reference}</span>
                                    </Link>
                                ),
                            },
                            { header: 'Stage', cell: (r) => <StatusBadge label={r.stage_label} tone={STAGE_TONES[r.stage_label] ?? 'indigo'} /> },
                            { header: 'Room', cell: (r) => <StatusBadge status={r.status} label={ROOM_STATUS[r.status]} /> },
                            {
                                header: <span className="block text-right">Agreed price</span>,
                                className: 'text-right tabular-nums whitespace-nowrap',
                                cell: (r) =>
                                    r.agreed_price !== null ? (
                                        <span className="font-semibold">{formatBD(r.agreed_price)}</span>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    ),
                            },
                            {
                                header: 'Last activity',
                                className: 'whitespace-nowrap',
                                cell: (r) => (
                                    <time dateTime={r.updated_at} title={formatDateTime(r.updated_at)}>
                                        {timeAgo(r.updated_at)}
                                    </time>
                                ),
                            },
                            {
                                header: <span className="sr-only">Actions</span>,
                                className: 'text-right',
                                cell: (r) => (
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={route('deal-rooms.show', r.id)}>
                                            Observe
                                            <span className="sr-only">
                                                {' '}
                                                deal room {r.listing_reference} with {r.buyer}
                                            </span>
                                        </Link>
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </SectionCard>

                <Pagination page={rooms} />
            </PageBody>
        </AppLayout>
    );
}
