export type Party = 'buyer' | 'seller';

export interface Answer {
    id: number;
    from: Party;
    body: string;
    created_at: string;
}

export interface Question {
    id: number;
    from: Party;
    category: string;
    body: string;
    status: 'open' | 'answered' | 'closed';
    created_at: string;
    answers: Answer[];
}

export interface RoomDocument {
    id: number;
    title: string;
    category: string;
    is_pdf: boolean;
    source: 'pack' | 'released' | 'staged';
    released_at: string | null;
}

export interface OfferRow {
    id: number;
    from: Party;
    price: number;
    structure: string;
    stake_pct: number;
    deposit_pct: number;
    conditions: string | null;
    valid_until: string | null;
    status: 'open' | 'countered' | 'accepted' | 'rejected' | 'withdrawn';
    is_counter: boolean;
    created_at: string;
}

export interface Terms {
    id: number;
    price: number;
    structure: string;
    stake_pct: number;
    deposit_pct: number;
    conditions: string | null;
    buyer_acknowledged_at: string | null;
    seller_acknowledged_at: string | null;
    agreed: boolean;
}

export interface AgentState {
    available: boolean;
    buyer_opted_in: boolean;
    seller_opted_in: boolean;
    enabled: boolean;
    summary: {
        summary: string;
        open_points: string[];
        buyer_focus: string[];
        seller_focus: string[];
        created_at: string;
    } | null;
}

export interface AuditRow {
    id: number;
    event: string;
    by: Party | 'system';
    properties: Record<string, unknown>;
    created_at: string;
}

export interface DealRoomProps {
    room: { id: number; status: 'open' | 'terms_agreed' | 'closed'; is_open: boolean; created_at: string };
    viewer: { party: Party | null; is_admin_observer: boolean };
    deal: {
        engagement_id: number;
        stage: string;
        stage_label: string;
        company_name: string | null;
        listing_reference: string;
        buyer_label: string;
        buyer_type: string | null;
        asking_price: number;
        deal_preference: string;
    };
    questions: Question[];
    documents: { pack: RoomDocument[]; released: RoomDocument[]; staged: RoomDocument[] };
    offers: OfferRow[];
    terms: Terms | null;
    agent: AgentState;
    audit: AuditRow[];
    options: {
        question_categories: Record<string, string>;
        structures: Record<string, string>;
        document_categories: Record<string, string>;
    };
}

/** "You" for the viewer's own side, otherwise the party's display name. */
export function partyName(party: Party, viewer: Party | null, buyerLabel: string): string {
    if (party === viewer) {
        return 'You';
    }
    return party === 'buyer' ? buyerLabel : 'Seller';
}
