import { EmptyState } from '@/components/clerko/empty-state';
import { Button } from '@/components/ui/button';
import { formatBD, formatDateTime } from '@/lib/format';
import { router } from '@inertiajs/react';
import { CheckCircle2, CircleDashed, ClipboardList, Lock } from 'lucide-react';
import { useState } from 'react';
import { type Party, type Terms } from './types';

export function TermsPanel({
    roomId,
    terms,
    structures,
    viewer,
    buyerLabel,
    canAct,
}: {
    roomId: number;
    terms: Terms | null;
    structures: Record<string, string>;
    viewer: Party | null;
    buyerLabel: string;
    canAct: boolean;
}) {
    const [busy, setBusy] = useState(false);

    if (!terms) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="No headline terms yet"
                description="When one party accepts the other's offer, its price, structure, deposit and conditions become the headline terms. Both parties then confirm them here."
            />
        );
    }

    const viewerAcknowledged = viewer === 'buyer' ? terms.buyer_acknowledged_at : viewer === 'seller' ? terms.seller_acknowledged_at : null;

    const acknowledge = () =>
        router.post(
            route('deal-rooms.terms.acknowledge', roomId),
            {},
            { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
        );

    return (
        <div className="space-y-5">
            <dl className="divide-y rounded-2xl border">
                <Row label="Price" value={formatBD(terms.price, { compact: false })} />
                <Row label="Structure" value={`${structures[terms.structure] ?? terms.structure} (${terms.stake_pct}%)`} />
                <Row label="Deposit" value={`${terms.deposit_pct}% on signing`} />
                <Row label="Conditions" value={terms.conditions || 'None recorded'} />
            </dl>

            <div className="grid gap-3 sm:grid-cols-2">
                <Acknowledgement label={viewer === 'buyer' ? 'You (buyer)' : buyerLabel} at={terms.buyer_acknowledged_at} />
                <Acknowledgement label={viewer === 'seller' ? 'You (seller)' : 'Seller'} at={terms.seller_acknowledged_at} />
            </div>

            {terms.agreed ? (
                <div className="space-y-3">
                    <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                        <span>Both parties have confirmed these headline terms. They are recorded in the audit trail.</span>
                    </div>
                    <div className="text-muted-foreground flex gap-2 rounded-2xl border border-dashed p-4 text-sm">
                        <Lock className="mt-0.5 size-4 shrink-0" />
                        <span>
                            Next: deposit, escrow, ownership transfer and completion (Scenario 4) — coming in a later release. Clerko never holds
                            client money; settlement will run through a regulated third-party escrow provider.
                        </span>
                    </div>
                </div>
            ) : (
                canAct &&
                !viewerAcknowledged && (
                    <div className="space-y-2">
                        <Button onClick={acknowledge} disabled={busy} className="bg-brand-gradient-green shadow-brand">
                            Confirm headline terms
                        </Button>
                        <p className="text-muted-foreground text-xs">
                            Confirming records your agreement to these headline terms. They remain subject to definitive transaction documents.
                        </p>
                    </div>
                )
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="font-bold sm:text-right">{value}</dd>
        </div>
    );
}

function Acknowledgement({ label, at }: { label: string; at: string | null }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm">
            {at ? <CheckCircle2 className="size-5 text-emerald-600" /> : <CircleDashed className="text-muted-foreground size-5" />}
            <div>
                <div className="font-semibold">{label}</div>
                <div className="text-muted-foreground text-xs">{at ? `Confirmed ${formatDateTime(at)}` : 'Not yet confirmed'}</div>
            </div>
        </div>
    );
}
