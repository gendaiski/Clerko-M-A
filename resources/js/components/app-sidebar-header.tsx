import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { unreadNotifications } = usePage<SharedData>().props;

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <Link href={route('notifications.index')} className="hover:bg-muted relative rounded-lg p-2" aria-label={`Notifications (${unreadNotifications} unread)`}>
                <Bell className="size-5" />
                {unreadNotifications > 0 && (
                    <span className="bg-brand-gradient absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                )}
            </Link>
        </header>
    );
}
