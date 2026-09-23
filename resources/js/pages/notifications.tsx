import { EmptyState } from '@/components/clerko/empty-state';
import { PageBody, PageHeader } from '@/components/clerko/page-header';
import { SectionCard } from '@/components/clerko/section-card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Bell, CheckCheck, ChevronRight, Loader2 } from 'lucide-react';
import { useState } from 'react';

type NotificationItem = {
    id: string;
    title: string;
    body: string;
    url: string | null;
    read: boolean;
    created_at: string;
};

type Props = {
    notifications: NotificationItem[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Notifications', href: '/notifications' }];

export default function Notifications({ notifications }: Props) {
    const [marking, setMarking] = useState(false);
    const unread = notifications.filter((n) => !n.read).length;

    const markAll = () =>
        router.post(
            route('notifications.read-all'),
            {},
            { preserveScroll: true, onStart: () => setMarking(true), onFinish: () => setMarking(false) },
        );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />
            <PageBody className="max-w-4xl">
                <PageHeader
                    title="Notifications"
                    description={
                        unread > 0 ? `You have ${unread} unread ${unread === 1 ? 'notification' : 'notifications'}.` : 'You are all caught up.'
                    }
                    actions={
                        unread > 0 ? (
                            <Button variant="outline" onClick={markAll} disabled={marking}>
                                {marking ? <Loader2 className="animate-spin" /> : <CheckCheck />} Mark all as read
                            </Button>
                        ) : undefined
                    }
                />

                <SectionCard bodyClassName="p-0">
                    {notifications.length === 0 ? (
                        <div className="p-5">
                            <EmptyState
                                icon={Bell}
                                title="No notifications yet"
                                description="Updates on verifications, listing reviews, NDAs, Deal Room questions and offers will appear here."
                            />
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {notifications.map((n) => (
                                <li key={n.id}>
                                    <Link
                                        href={route('notifications.open', n.id)}
                                        className={cn(
                                            'hover:bg-muted/50 focus-visible:bg-muted/50 flex items-start gap-3 px-5 py-4 transition focus-visible:outline-none',
                                            !n.read && 'bg-brand-lavender/60 dark:bg-indigo-500/5',
                                        )}
                                    >
                                        <span className="mt-1.5 flex size-2.5 shrink-0 items-center justify-center" aria-hidden="true">
                                            {!n.read && <span className="bg-primary size-2.5 rounded-full" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                                <span className={cn('text-foreground', n.read ? 'font-medium' : 'font-bold')}>
                                                    {!n.read && <span className="sr-only">Unread: </span>}
                                                    {n.title}
                                                </span>
                                                <time
                                                    dateTime={n.created_at}
                                                    title={formatDateTime(n.created_at)}
                                                    className="text-muted-foreground shrink-0 text-xs"
                                                >
                                                    {timeAgo(n.created_at)}
                                                </time>
                                            </div>
                                            {n.body && <p className="text-muted-foreground mt-0.5 text-sm">{n.body}</p>}
                                        </div>
                                        <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden="true" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </PageBody>
        </AppLayout>
    );
}
