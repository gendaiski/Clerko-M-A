import { Textarea } from '@/components/clerko/field';
import { PageBody } from '@/components/clerko/page-header';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Stepper } from '@/components/clerko/stepper';
import { Tabs } from '@/components/clerko/tabs';
import { AgentPanel } from '@/components/deal-room/agent-panel';
import { AuditPanel } from '@/components/deal-room/audit-panel';
import { DocumentsPanel } from '@/components/deal-room/documents-panel';
import { OffersPanel } from '@/components/deal-room/offers-panel';
import { QaPanel } from '@/components/deal-room/qa-panel';
import { TermsPanel } from '@/components/deal-room/terms-panel';
import { type DealRoomProps } from '@/components/deal-room/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatBD } from '@/lib/format';
import { Head, useForm } from '@inertiajs/react';
import { Eye, Lock, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type TabKey = 'qa' | 'documents' | 'offers' | 'terms' | 'audit';

const STAGES = ['Deal room opened', 'Offers', 'Headline terms', 'Completion (later release)'];

/** Offers is current while negotiating; Headline terms once an offer is accepted. */
function stageIndex(hasTerms: boolean, agreed: boolean): number {
    if (agreed) return 3;
    if (hasTerms) return 2;
    return 1;
}

export default function DealRoomShow(props: DealRoomProps) {
    const { room, viewer, deal, questions, documents, offers, terms, agent, audit, options } = props;
    const canAct = viewer.party !== null && room.is_open;
    const openOffer = offers.find((o) => o.status === 'open') ?? null;

    const [tab, setTab] = useState<TabKey>(() => {
        const requested = new URLSearchParams(window.location.search).get('tab');
        return (['qa', 'documents', 'offers', 'terms', 'audit'].includes(requested ?? '') ? requested : 'qa') as TabKey;
    });

    const selectTab = (key: string) => {
        setTab(key as TabKey);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        window.history.replaceState(window.history.state, '', url);
    };

    const openQuestions = questions.filter((q) => q.status === 'open').length;
    const title = `${deal.company_name ?? deal.listing_reference} × ${deal.buyer_label}`;

    const breadcrumbs = viewer.is_admin_observer
        ? [
              { title: 'Admin', href: '/admin' },
              { title: 'Deal rooms', href: route('admin.deals.index') },
              { title, href: route('deal-rooms.show', room.id) },
          ]
        : viewer.party === 'seller'
          ? [
                { title: 'Seller', href: route('seller.dashboard') },
                { title: 'Deal room', href: route('deal-rooms.show', room.id) },
            ]
          : [
                { title: 'Buyer', href: route('buyer.dashboard') },
                { title: 'Deal room', href: route('deal-rooms.show', room.id) },
            ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Deal room · ${title}`} />
            <PageBody>
                <header className="bg-card shadow-brand flex flex-col gap-4 rounded-2xl border p-5 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <div className="text-primary flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                            <Lock className="size-3.5" /> Confidential deal room · {deal.listing_reference}
                        </div>
                        <h1 className="text-brand-ink text-2xl font-extrabold tracking-tight dark:text-white">{title}</h1>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                            <StatusBadge status={deal.stage} label={deal.stage_label} />
                            {room.status === 'closed' && <StatusBadge label="Closed" tone="slate" />}
                            <span>Asking {formatBD(deal.asking_price)}</span>
                            {deal.buyer_type && <span>· Buyer: {deal.buyer_type.replace(/_/g, ' ')}</span>}
                        </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                        {viewer.is_admin_observer ? (
                            <StatusBadge label="Admin observer · read-only" tone="purple" />
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                <ShieldCheck className="size-3.5" /> You are the {viewer.party} · role-based access
                            </span>
                        )}
                        {canAct && <WithdrawDialog roomId={room.id} />}
                    </div>
                </header>

                {!room.is_open && (
                    <div className="text-muted-foreground flex items-center gap-2 rounded-2xl border border-dashed p-4 text-sm">
                        <Eye className="size-4" /> This deal room is closed. Its full record remains available to both parties.
                    </div>
                )}

                <Stepper steps={STAGES} current={stageIndex(terms !== null, terms?.agreed ?? false)} />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="bg-card shadow-brand min-w-0 space-y-5 rounded-2xl border p-5">
                        <Tabs
                            value={tab}
                            onChange={selectTab}
                            tabs={[
                                { key: 'qa', label: 'Q&A', count: openQuestions },
                                { key: 'documents', label: 'Documents', count: documents.released.length },
                                { key: 'offers', label: 'Offers', count: openOffer ? 1 : 0 },
                                { key: 'terms', label: 'Headline terms' },
                                { key: 'audit', label: 'Audit trail' },
                            ]}
                        />

                        {tab === 'qa' && (
                            <QaPanel
                                roomId={room.id}
                                questions={questions}
                                categories={options.question_categories}
                                viewer={viewer.party}
                                buyerLabel={deal.buyer_label}
                                canAct={canAct}
                            />
                        )}
                        {tab === 'documents' && (
                            <DocumentsPanel
                                roomId={room.id}
                                documents={documents}
                                categories={options.document_categories}
                                viewer={viewer.party}
                                canAct={canAct}
                            />
                        )}
                        {tab === 'offers' && (
                            <OffersPanel
                                roomId={room.id}
                                offers={offers}
                                terms={terms}
                                structures={options.structures}
                                viewer={viewer.party}
                                buyerLabel={deal.buyer_label}
                                askingPrice={deal.asking_price}
                                canAct={canAct}
                            />
                        )}
                        {tab === 'terms' && (
                            <TermsPanel
                                roomId={room.id}
                                terms={terms}
                                structures={options.structures}
                                viewer={viewer.party}
                                buyerLabel={deal.buyer_label}
                                canAct={canAct}
                            />
                        )}
                        {tab === 'audit' && <AuditPanel audit={audit} viewer={viewer.party} buyerLabel={deal.buyer_label} />}
                    </div>

                    <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        <AgentPanel
                            roomId={room.id}
                            agent={agent}
                            viewer={viewer.party}
                            canAct={canAct}
                            terms={terms}
                            openOffer={openOffer}
                            structures={options.structures}
                        />
                    </div>
                </div>
            </PageBody>
        </AppLayout>
    );
}

function WithdrawDialog({ roomId }: { roomId: number }) {
    const [open, setOpen] = useState(false);
    const form = useForm({ reason: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('deal-rooms.withdraw', roomId), { preserveScroll: true, onSuccess: () => setOpen(false) });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Withdraw from deal
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Withdraw from this deal room?</DialogTitle>
                        <DialogDescription>
                            The deal room closes for both parties and any open offer is withdrawn. The record stays available. Your reason is kept in
                            the audit trail and shared with Clerko only.
                        </DialogDescription>
                    </DialogHeader>
                    <label htmlFor="withdraw-reason" className="sr-only">
                        Reason
                    </label>
                    <Textarea
                        id="withdraw-reason"
                        value={form.data.reason}
                        onChange={(e) => form.setData('reason', e.target.value)}
                        placeholder="Reason for withdrawing"
                        required
                        maxLength={1000}
                    />
                    {form.errors.reason && <p className="text-sm text-red-600">{form.errors.reason}</p>}
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" variant="destructive" disabled={form.processing || !form.data.reason.trim()}>
                            Withdraw
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
