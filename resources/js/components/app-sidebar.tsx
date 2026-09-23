import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type AuthedData, type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Building2,
    FileSearch,
    Gauge,
    Handshake,
    IdCard,
    LayoutDashboard,
    ListChecks,
    ScrollText,
    Settings2,
    ShieldAlert,
    Store,
    Target,
} from 'lucide-react';
import AppLogo from './app-logo';

const sellingItems: NavItem[] = [
    { title: 'Seller dashboard', url: '/seller', icon: LayoutDashboard },
    { title: 'Add a company', url: '/seller/companies/create', icon: Building2 },
    { title: 'New listing', url: '/seller/listings/create', icon: ListChecks },
];

const buyingItems: NavItem[] = [
    { title: 'Buyer dashboard', url: '/buyer', icon: Target },
    { title: 'Marketplace', url: '/marketplace', icon: Store },
    { title: 'Preferences', url: '/buyer/preferences', icon: Settings2 },
];

const adminItems: NavItem[] = [
    { title: 'Overview', url: '/admin', icon: Gauge },
    { title: 'Listing moderation', url: '/admin/listings', icon: FileSearch },
    { title: 'Companies (KYB)', url: '/admin/companies', icon: Building2 },
    { title: 'Identity (KYC)', url: '/admin/kyc', icon: IdCard },
    { title: 'Deal rooms', url: '/admin/deals', icon: Handshake },
    { title: 'Compliance', url: '/admin/compliance', icon: ShieldAlert },
    { title: 'Audit trail', url: '/admin/audit', icon: ScrollText },
];

export function AppSidebar() {
    const { auth } = usePage<AuthedData>().props;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-4">
                {auth.user.is_admin && <NavMain label="Admin console" items={adminItems} />}
                <NavMain label="Selling" items={sellingItems} />
                <NavMain label="Buying" items={buyingItems} />
                <NavMain
                    label="Account"
                    items={[
                        {
                            title: auth.user.kyc_status === 'verified' ? 'Identity verified' : 'Verify identity',
                            url: '/verification',
                            icon: BadgeCheck,
                        },
                    ]}
                />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
