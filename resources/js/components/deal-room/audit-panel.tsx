import { EmptyState } from '@/components/clerko/empty-state';
import { formatBD, formatDateTime } from '@/lib/format';
import { ScrollText } from 'lucide-react';
import { type AuditRow, type Party, partyName } from './types';

const labels: Record<string, string> = {
    'deal_room.opened': 'Deal room opened',
    'deal_room.question_asked': 'Question asked',
    'deal_room.question_answered': 'Reply posted',
    'deal_room.question_closed': 'Question marked resolved',
    'deal_room.document_released': 'Document released',
    'deal_room.offer_submitted': 'Offer submitted',
    'deal_room.offer_countered': 'Counter-offer submitted',
    'deal_room.offer_accepted': 'Offer accepted',
    'deal_room.offer_rejected': 'Offer declined',
    'deal_room.offer_withdrawn': 'Offer withdrawn',
    'deal_room.terms_acknowledged': 'Headline terms confirmed',
    'deal_room.headline_terms_agreed': 'Headline terms agreed by both parties',
    'deal_room.withdrawn': 'Party withdrew from the deal room',
    'deal_room.agent_opted_in': 'Clerko Agent switched on',
    'deal_room.agent_opted_out': 'Clerko Agent switched off',
    'deal_room.agent_summary': 'Clerko Agent summary generated',
    'compliance.flagged': 'Message flagged by the contact policy',
    'compliance.cleared': 'Compliance flag cleared',
    'compliance.actioned': 'Compliance flag actioned',
};

function detail(row: AuditRow): string | null {
    const p = row.properties;
    if (typeof p.price === 'number') {
        return formatBD(p.price, { compact: false });
    }
    if (typeof p.title === 'string') {
        return p.title;
    }
    if (typeof p.category === 'string') {
        return p.category.replace(/_/g, ' ');
    }
    return null;
}

export function AuditPanel({ audit, viewer, buyerLabel }: { audit: AuditRow[]; viewer: Party | null; buyerLabel: string }) {
    if (audit.length === 0) {
        return <EmptyState icon={ScrollText} title="Nothing recorded yet" />;
    }

    return (
        <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
                A tamper-evident record of everything that happens in this deal room. Entries cannot be edited or deleted.
            </p>
            <ol className="relative space-y-4 border-l-2 pl-5">
                {audit.map((row) => {
                    const extra = detail(row);
                    return (
                        <li key={row.id} className="relative">
                            <span
                                className="bg-primary ring-background absolute top-1.5 -left-[27px] size-3 rounded-full ring-4"
                                aria-hidden="true"
                            />
                            <div className="text-sm">
                                <span className="font-semibold">{labels[row.event] ?? row.event}</span>
                                {extra && <span className="text-muted-foreground"> · {extra}</span>}
                            </div>
                            <div className="text-muted-foreground text-xs">
                                {row.by === 'system' ? 'System' : partyName(row.by, viewer, buyerLabel)} · {formatDateTime(row.created_at)}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
