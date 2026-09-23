import { ResultCount, StatusFilter } from '@/components/clerko/admin-ui';
import { DataTable } from '@/components/clerko/data-table';
import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { Pagination } from '@/components/clerko/pagination';
import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDate, timeAgo } from '@/lib/format';
import { type BreadcrumbItem, type Paginated } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Building2 } from 'lucide-react';

type CompanyRow = {
    id: number;
    name: string | null;
    cr_number: string | null;
    owner: string;
    extraction_status: string;
    verification_status: string;
    expiry_date: string | null;
    cr_expires_soon: boolean;
    created_at: string;
};

type Props = {
    companies: Paginated<CompanyRow>;
    status: string;
};

const STATUSES = { pending: 'Pending', verified: 'Verified', rejected: 'Rejected', all: 'All' };

const EXTRACTION_LABELS: Record<string, string> = {
    pending: 'Queued',
    processing: 'Extracting',
    completed: 'Extracted',
    failed: 'Failed',
};

export default function AdminCompaniesIndex({ companies, status }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Companies (KYB)', href: route('admin.companies.index') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Companies (KYB)" />
            <PageBody>
                <PageHeader
                    eyebrow="Admin console"
                    title="Company verification (KYB)"
                    description="Check each extracted profile against its Sijilat CR extract, correct errors, then verify or reject."
                />

                <StatusFilter routeName="admin.companies.index" value={status} options={STATUSES} label="Filter companies by verification status" />

                <SectionCard
                    title={`${STATUSES[status as keyof typeof STATUSES] ?? status} companies`}
                    actions={<ResultCount from={companies.from} to={companies.to} total={companies.total} noun="companies" />}
                    bodyClassName="p-2 sm:p-3"
                >
                    <DataTable
                        rows={companies.data}
                        rowKey={(c) => c.id}
                        empty={
                            <EmptyState
                                icon={Building2}
                                title={status === 'pending' ? 'No companies awaiting verification' : 'No companies here'}
                                description={
                                    status === 'pending' ? 'Companies appear here once a seller uploads a CR extract.' : 'Try another status filter.'
                                }
                                className="m-3"
                            />
                        }
                        columns={[
                            {
                                header: 'Company',
                                className: 'min-w-[200px]',
                                cell: (c) => (
                                    <Link
                                        href={route('admin.companies.show', c.id)}
                                        className="text-brand-ink hover:text-primary font-semibold dark:text-white"
                                    >
                                        {c.name ?? <span className="text-muted-foreground italic">Name not extracted</span>}
                                    </Link>
                                ),
                            },
                            {
                                header: 'CR no.',
                                className: 'whitespace-nowrap',
                                cell: (c) => <span className="font-mono text-xs">{c.cr_number ?? '—'}</span>,
                            },
                            { header: 'Owner', cell: (c) => c.owner },
                            {
                                header: 'Extraction',
                                cell: (c) => (
                                    <StatusBadge
                                        status={c.extraction_status}
                                        label={EXTRACTION_LABELS[c.extraction_status]}
                                        tone={c.extraction_status === 'pending' ? 'slate' : undefined}
                                    />
                                ),
                            },
                            { header: 'KYB', cell: (c) => <StatusBadge status={c.verification_status} /> },
                            {
                                header: 'CR expiry',
                                className: 'whitespace-nowrap',
                                cell: (c) =>
                                    c.expiry_date ? (
                                        <span
                                            className={
                                                c.cr_expires_soon
                                                    ? 'inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400'
                                                    : undefined
                                            }
                                        >
                                            {c.cr_expires_soon && <AlertTriangle className="size-3.5" aria-hidden="true" />}
                                            {formatDate(c.expiry_date)}
                                            {c.cr_expires_soon && <span className="sr-only"> (expires soon)</span>}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    ),
                            },
                            {
                                header: 'Added',
                                className: 'whitespace-nowrap',
                                cell: (c) => (
                                    <time dateTime={c.created_at} title={formatDate(c.created_at)}>
                                        {timeAgo(c.created_at)}
                                    </time>
                                ),
                            },
                            {
                                header: <span className="sr-only">Actions</span>,
                                className: 'text-right',
                                cell: (c) => (
                                    <Button asChild size="sm" variant={c.verification_status === 'pending' ? 'default' : 'outline'}>
                                        <Link href={route('admin.companies.show', c.id)}>
                                            {c.verification_status === 'pending' ? 'Review' : 'Open'}
                                            <span className="sr-only"> {c.name ?? c.cr_number ?? `company ${c.id}`}</span>
                                        </Link>
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </SectionCard>

                <Pagination page={companies} />
            </PageBody>
        </AppLayout>
    );
}
