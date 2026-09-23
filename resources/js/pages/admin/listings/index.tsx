import { AdminListingTable, type AdminListingRow } from '@/components/clerko/admin-listing-table';
import { ResultCount, StatusFilter } from '@/components/clerko/admin-ui';
import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { Pagination } from '@/components/clerko/pagination';
import { SectionCard } from '@/components/clerko/section-card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Paginated } from '@/types';
import { Head } from '@inertiajs/react';
import { FileSearch } from 'lucide-react';

type Props = {
    listings: Paginated<AdminListingRow>;
    status: string;
    statuses: Record<string, string>;
};

export default function AdminListingsIndex({ listings, status, statuses }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Listing moderation', href: route('admin.listings.index') },
    ];
    const options: Record<string, string> = { ...statuses, all: 'All' };
    const current = options[status] ?? status;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Listing moderation" />
            <PageBody>
                <PageHeader
                    eyebrow="Admin console"
                    title="Listing moderation"
                    description="Check each anonymised teaser and details pack before it goes live. Approval requires a KYC-verified seller and a KYB-verified company."
                />

                <StatusFilter routeName="admin.listings.index" value={status} options={options} label="Filter listings by status" />

                <SectionCard
                    title={status === 'all' ? 'All listings' : current}
                    actions={<ResultCount from={listings.from} to={listings.to} total={listings.total} noun="listings" />}
                    bodyClassName="p-2 sm:p-3"
                >
                    <AdminListingTable
                        rows={listings.data}
                        empty={
                            <EmptyState
                                icon={FileSearch}
                                title={status === 'pending_review' ? 'Nothing awaiting review' : 'No listings here'}
                                description={
                                    status === 'pending_review'
                                        ? 'New submissions will appear here as sellers submit them.'
                                        : 'Try another status filter.'
                                }
                                className="m-3"
                            />
                        }
                    />
                </SectionCard>

                <Pagination page={listings} />
            </PageBody>
        </AppLayout>
    );
}
