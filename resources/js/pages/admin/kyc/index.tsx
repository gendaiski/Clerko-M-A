import { ID_TYPES, ResultCount, StatusFilter } from '@/components/clerko/admin-ui';
import { DataTable } from '@/components/clerko/data-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { Pagination } from '@/components/clerko/pagination';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, timeAgo, titleCase } from '@/lib/format';
import { type BreadcrumbItem, type Paginated } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { IdCard } from 'lucide-react';

type SubmissionRow = {
    id: number;
    name: string;
    email: string;
    id_type: string;
    status: string;
    created_at: string;
};

type Props = {
    submissions: Paginated<SubmissionRow>;
    status: string;
};

const STATUSES = { pending: 'Pending', verified: 'Verified', rejected: 'Rejected', all: 'All' };

export default function AdminKycIndex({ submissions, status }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Identity (KYC)', href: route('admin.kyc.index') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Identity (KYC)" />
            <PageBody>
                <PageHeader
                    eyebrow="Admin console"
                    title="Identity verification (KYC)"
                    description="Compare each ID document with the selfie and the declared details before verifying the user."
                />

                <StatusFilter routeName="admin.kyc.index" value={status} options={STATUSES} label="Filter submissions by status" />

                <SectionCard
                    title={`${STATUSES[status as keyof typeof STATUSES] ?? status} submissions`}
                    actions={<ResultCount from={submissions.from} to={submissions.to} total={submissions.total} noun="submissions" />}
                    bodyClassName="p-2 sm:p-3"
                >
                    <DataTable
                        rows={submissions.data}
                        rowKey={(s) => s.id}
                        empty={
                            <EmptyState
                                icon={IdCard}
                                title={status === 'pending' ? 'No identity checks waiting' : 'No submissions here'}
                                description={status === 'pending' ? 'New submissions will appear here.' : 'Try another status filter.'}
                                className="m-3"
                            />
                        }
                        columns={[
                            {
                                header: 'Legal name',
                                className: 'min-w-[180px]',
                                cell: (s) => (
                                    <Link
                                        href={route('admin.kyc.show', s.id)}
                                        className="text-brand-ink hover:text-primary font-semibold dark:text-white"
                                    >
                                        {s.name}
                                    </Link>
                                ),
                            },
                            { header: 'Email', cell: (s) => <span className="break-all">{s.email}</span> },
                            { header: 'ID type', cell: (s) => ID_TYPES[s.id_type] ?? titleCase(s.id_type) },
                            { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
                            {
                                header: 'Submitted',
                                className: 'whitespace-nowrap',
                                cell: (s) => (
                                    <time dateTime={s.created_at} title={formatDateTime(s.created_at)}>
                                        {timeAgo(s.created_at)}
                                    </time>
                                ),
                            },
                            {
                                header: <span className="sr-only">Actions</span>,
                                className: 'text-right',
                                cell: (s) => (
                                    <Button asChild size="sm" variant={s.status === 'pending' ? 'default' : 'outline'}>
                                        <Link href={route('admin.kyc.show', s.id)}>
                                            {s.status === 'pending' ? 'Review' : 'Open'}
                                            <span className="sr-only"> {s.name}</span>
                                        </Link>
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </SectionCard>

                <Pagination page={submissions} />
            </PageBody>
        </AppLayout>
    );
}
