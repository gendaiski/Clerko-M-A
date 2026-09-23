import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    badge?: number;
}

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface User {
    id: number;
    name: string;
    email: string;
    alias: string;
    is_admin: boolean;
    kyc_status: KycStatus;
    avatar?: string;
    email_verified_at: string | null;
    [key: string]: unknown;
}

export interface Flash {
    success: string | null;
    error: string | null;
}

/** Props shared with every page (see HandleInertiaRequests). */
export interface SharedData {
    name: string;
    auth: { user: User | null };
    flash: Flash;
    unreadNotifications: number;
    [key: string]: unknown;
}

/** Shared props on pages that require login. */
export interface AuthedData extends SharedData {
    auth: Auth;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

export type Options = Record<string, string>;

/** Anonymised marketplace teaser (Listing::toTeaser). */
export interface Teaser {
    id: number;
    reference: string;
    headline: string;
    teaser_summary: string;
    sector: string;
    sector_label: string;
    employees_band: string;
    employees_label: string;
    location: string;
    location_label: string;
    established_year: number | null;
    annual_revenue: number;
    growth_pct: number | null;
    asking_price: number;
    deal_preference: string;
    deal_preference_label: string;
    highlights: string[];
    tier: string | null;
    featured: boolean;
    verified: boolean;
    views_count: number;
    published_at: string | null;
}

export interface PipelineRow {
    id: number;
    buyer: string;
    buyer_type: string | null;
    buyer_verified: boolean;
    listing_reference: string;
    stage: string;
    stage_label: string;
    last_activity_at: string | null;
    deal_room_id: number | null;
}

export interface Check {
    status: 'ok' | 'warning';
    text: string;
}
