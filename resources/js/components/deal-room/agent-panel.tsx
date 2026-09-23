import { Button } from '@/components/ui/button';
import { formatBD, timeAgo } from '@/lib/format';
import { router } from '@inertiajs/react';
import { Bot, CheckCircle2, CircleDashed, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { type AgentState, type OfferRow, type Party, type Terms } from './types';

interface Props {
    roomId: number;
    agent: AgentState;
    viewer: Party | null;
    canAct: boolean;
    terms: Terms | null;
    openOffer: OfferRow | null;
    structures: Record<string, string>;
}

export function AgentPanel({ roomId, agent, viewer, canAct, terms, openOffer, structures }: Props) {
    const [busy, setBusy] = useState(false);
    const viewerOptedIn = viewer === 'buyer' ? agent.buyer_opted_in : viewer === 'seller' ? agent.seller_opted_in : false;

    const setOptIn = (optIn: boolean) =>
        router.post(
            route('deal-rooms.agent.opt-in', roomId),
            { opt_in: optIn },
            { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
        );

    const refresh = () =>
        router.post(
            route('deal-rooms.agent.summary', roomId),
            {},
            { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
        );

    const snapshot = terms ?? openOffer;

    return (
        <aside className="shadow-brand-lg overflow-hidden rounded-2xl border" aria-label="Clerko Agent">
            <div className="bg-brand-gradient flex items-center gap-2 px-5 py-3 font-semibold text-white">
                <Bot className="size-5" /> Clerko Agent
            </div>
            <div className="space-y-5 p-5 text-sm">
                {!agent.available ? (
                    <p className="text-muted-foreground">The Clerko Agent is not available on this platform right now.</p>
                ) : !agent.enabled ? (
                    <div className="space-y-3">
                        <p className="text-muted-foreground">
                            A neutral assistant that summarises this deal room for both sides. It reads the questions, answers and offers — never
                            document contents — and only runs when <strong>both parties</strong> switch it on.
                        </p>
                        <ul className="space-y-1.5">
                            <OptIn label="Buyer" on={agent.buyer_opted_in} />
                            <OptIn label="Seller" on={agent.seller_opted_in} />
                        </ul>
                        {canAct && (
                            <Button
                                size="sm"
                                variant={viewerOptedIn ? 'outline' : 'default'}
                                onClick={() => setOptIn(!viewerOptedIn)}
                                disabled={busy}
                                className={viewerOptedIn ? '' : 'bg-brand-gradient'}
                            >
                                {viewerOptedIn ? 'Switch off for my side' : 'Switch on for my side'}
                            </Button>
                        )}
                    </div>
                ) : agent.summary ? (
                    <div className="space-y-4">
                        <section>
                            <h4 className="mb-1 font-semibold">Summary</h4>
                            <p className="text-muted-foreground">{agent.summary.summary}</p>
                        </section>
                        <List title="Open points" items={agent.summary.open_points} />
                        <List title="Buyer is focusing on" items={agent.summary.buyer_focus} />
                        <List title="Seller is focusing on" items={agent.summary.seller_focus} />
                        <div className="text-muted-foreground text-xs">Updated {timeAgo(agent.summary.created_at)}</div>
                    </div>
                ) : (
                    <p className="text-muted-foreground">Both parties have switched the agent on. Generate the first summary when you are ready.</p>
                )}

                {agent.available && agent.enabled && canAct && (
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={refresh} disabled={busy} className="bg-brand-gradient">
                            <RefreshCw className={busy ? 'animate-spin' : ''} /> {agent.summary ? 'Refresh summary' : 'Generate summary'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOptIn(false)} disabled={busy}>
                            Switch off
                        </Button>
                    </div>
                )}

                {snapshot && (
                    <section className="border-t pt-4">
                        <h4 className="mb-2 font-semibold">
                            {terms ? (terms.agreed ? 'Agreed headline terms' : 'Accepted terms (awaiting confirmation)') : 'Offer on the table'}
                        </h4>
                        <dl className="space-y-1.5">
                            <Snapshot label="Price" value={formatBD(snapshot.price)} />
                            <Snapshot label="Structure" value={structures[snapshot.structure] ?? snapshot.structure} />
                            <Snapshot label="Deposit" value={`${snapshot.deposit_pct}%`} />
                        </dl>
                    </section>
                )}

                <p className="text-muted-foreground border-t pt-4 text-xs">
                    The Clerko Agent summarises and orients only — it never advises or decides. All decisions stay with the parties and their
                    advisers.
                </p>
            </div>
        </aside>
    );
}

function OptIn({ label, on }: { label: string; on: boolean }) {
    return (
        <li className="flex items-center gap-2">
            {on ? <CheckCircle2 className="size-4 text-emerald-600" /> : <CircleDashed className="text-muted-foreground size-4" />}
            <span>
                {label}: {on ? 'switched on' : 'not yet'}
            </span>
        </li>
    );
}

function List({ title, items }: { title: string; items: string[] }) {
    if (items.length === 0) {
        return null;
    }
    return (
        <section>
            <h4 className="mb-1 font-semibold">{title}</h4>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                {items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </section>
    );
}

function Snapshot({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold">{value}</dd>
        </div>
    );
}
