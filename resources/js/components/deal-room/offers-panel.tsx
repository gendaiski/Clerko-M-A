import { EmptyState } from '@/components/clerko/empty-state';
import { Field, NativeSelect, Textarea } from '@/components/clerko/field';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBD, formatDate, timeAgo } from '@/lib/format';
import { router, useForm } from '@inertiajs/react';
import { FileSignature } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { PartyAvatar } from './party-avatar';
import { type OfferRow, type Party, type Terms, partyName } from './types';

interface Props {
    roomId: number;
    offers: OfferRow[];
    terms: Terms | null;
    structures: Record<string, string>;
    viewer: Party | null;
    buyerLabel: string;
    askingPrice: number;
    canAct: boolean;
}

export function OffersPanel({ roomId, offers, terms, structures, viewer, buyerLabel, askingPrice, canAct }: Props) {
    const open = offers.find((o) => o.status === 'open') ?? null;
    const canPropose = canAct && !open && !terms;

    return (
        <div className="space-y-6">
            {open && <OpenOffer roomId={roomId} offer={open} structures={structures} viewer={viewer} buyerLabel={buyerLabel} canAct={canAct} />}

            {terms && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    An offer has been accepted. See <strong>Headline terms</strong> to confirm them.
                </div>
            )}

            {canPropose && (
                <OfferForm
                    roomId={roomId}
                    structures={structures}
                    title={viewer === 'buyer' ? 'Submit an indicative offer' : 'Propose terms to the buyer'}
                    submitLabel={viewer === 'buyer' ? 'Submit indicative offer' : 'Send proposal'}
                    initialPrice={offers[0]?.price ?? askingPrice}
                />
            )}

            <div>
                <h3 className="mb-2 text-sm font-semibold">Offer history</h3>
                {offers.length === 0 ? (
                    <EmptyState
                        icon={FileSignature}
                        title="No offers yet"
                        description="Indicative offers and counter-offers appear here with their status."
                    />
                ) : (
                    <ol className="space-y-2">
                        {offers.map((offer) => (
                            <li key={offer.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm">
                                <PartyAvatar party={offer.from} className="size-7" />
                                <span className="font-semibold">{partyName(offer.from, viewer, buyerLabel)}</span>
                                <span className="text-muted-foreground">{offer.is_counter ? 'countered with' : 'offered'}</span>
                                <span className="font-bold">{formatBD(offer.price, { compact: false })}</span>
                                <span className="text-muted-foreground">
                                    {structures[offer.structure] ?? offer.structure} · {offer.stake_pct}% · {offer.deposit_pct}% deposit
                                </span>
                                <StatusBadge status={offer.status} className="ml-auto" />
                                <span className="text-muted-foreground w-full text-xs sm:w-auto">{timeAgo(offer.created_at)}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
}

function OpenOffer({
    roomId,
    offer,
    structures,
    viewer,
    buyerLabel,
    canAct,
}: {
    roomId: number;
    offer: OfferRow;
    structures: Record<string, string>;
    viewer: Party | null;
    buyerLabel: string;
    canAct: boolean;
}) {
    const [countering, setCountering] = useState(false);
    const [busy, setBusy] = useState(false);
    const mine = offer.from === viewer;

    const respond = (decision: 'accept' | 'reject' | 'withdraw') => {
        const prompts = {
            accept: 'Accept this offer? Its terms become the headline terms for this deal room.',
            reject: 'Decline this offer?',
            withdraw: 'Withdraw your offer?',
        };
        if (!window.confirm(prompts[decision])) {
            return;
        }
        router.post(
            route('deal-rooms.offers.respond', [roomId, offer.id]),
            { decision },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <div className="shadow-brand-lg overflow-hidden rounded-2xl border">
            <div className="bg-brand-gradient flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-white">
                <div className="font-semibold">
                    {offer.is_counter ? 'Counter-offer' : 'Indicative offer'} from {partyName(offer.from, viewer, buyerLabel)}
                </div>
                <div className="text-sm text-white/80">{mine ? 'Awaiting the other party' : 'Awaiting your response'}</div>
            </div>
            <dl className="grid gap-4 p-5 sm:grid-cols-4">
                <Term label="Price" value={formatBD(offer.price, { compact: false })} />
                <Term label="Structure" value={`${structures[offer.structure] ?? offer.structure} (${offer.stake_pct}%)`} />
                <Term label="Deposit" value={`${offer.deposit_pct}% on signing`} />
                <Term label="Valid until" value={offer.valid_until ? formatDate(offer.valid_until) : 'Not specified'} />
                {offer.conditions && (
                    <div className="sm:col-span-4">
                        <dt className="text-muted-foreground text-xs font-semibold uppercase">Conditions</dt>
                        <dd className="mt-1 text-sm whitespace-pre-line">{offer.conditions}</dd>
                    </div>
                )}
            </dl>
            {canAct && (
                <div className="flex flex-wrap gap-2 border-t px-5 py-4">
                    {mine ? (
                        <Button variant="outline" onClick={() => respond('withdraw')} disabled={busy}>
                            Withdraw offer
                        </Button>
                    ) : (
                        <>
                            <Button className="bg-brand-gradient-green shadow-brand" onClick={() => respond('accept')} disabled={busy}>
                                Accept
                            </Button>
                            <Button variant="outline" onClick={() => setCountering(!countering)} disabled={busy}>
                                Counter
                            </Button>
                            <Button variant="ghost" onClick={() => respond('reject')} disabled={busy}>
                                Decline
                            </Button>
                        </>
                    )}
                </div>
            )}
            {countering && !mine && (
                <div className="border-t p-5">
                    <OfferForm
                        roomId={roomId}
                        structures={structures}
                        counterTo={offer}
                        title="Your counter-offer"
                        submitLabel="Send counter-offer"
                        initialPrice={offer.price}
                        onDone={() => setCountering(false)}
                    />
                </div>
            )}
        </div>
    );
}

function Term({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs font-semibold uppercase">{label}</dt>
            <dd className="mt-1 font-bold">{value}</dd>
        </div>
    );
}

type OfferForm = { price: string; structure: string; stake_pct: string; deposit_pct: string; conditions: string; valid_until: string };

function OfferForm({
    roomId,
    structures,
    counterTo,
    title,
    submitLabel,
    initialPrice,
    onDone,
}: {
    roomId: number;
    structures: Record<string, string>;
    counterTo?: OfferRow;
    title: string;
    submitLabel: string;
    initialPrice: number;
    onDone?: () => void;
}) {
    const form = useForm<OfferForm>({
        price: String(initialPrice),
        structure: counterTo?.structure ?? 'full_acquisition',
        stake_pct: String(counterTo?.stake_pct ?? 100),
        deposit_pct: String(counterTo?.deposit_pct ?? 50),
        conditions: counterTo?.conditions ?? '',
        valid_until: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const url = counterTo ? route('deal-rooms.offers.counter', [roomId, counterTo.id]) : route('deal-rooms.offers.store', roomId);
        form.post(url, { preserveScroll: true, onSuccess: () => onDone?.() });
    };

    const setStructure = (structure: string) => {
        form.setData((data) => ({ ...data, structure, stake_pct: structure === 'full_acquisition' ? '100' : data.stake_pct }));
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <h3 className="font-semibold">{title}</h3>
            {'offer' in form.errors && <p className="text-sm text-red-600">{(form.errors as Record<string, string>).offer}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Price (BD)"
                    htmlFor={`price-${counterTo?.id ?? 'new'}`}
                    error={form.errors.price}
                    hint={form.data.price ? formatBD(Number(form.data.price), { compact: false }) : undefined}
                >
                    <Input
                        id={`price-${counterTo?.id ?? 'new'}`}
                        type="number"
                        min="1"
                        step="0.001"
                        inputMode="decimal"
                        value={form.data.price}
                        onChange={(e) => form.setData('price', e.target.value)}
                        required
                    />
                </Field>
                <Field label="Structure" htmlFor={`structure-${counterTo?.id ?? 'new'}`} error={form.errors.structure}>
                    <NativeSelect
                        id={`structure-${counterTo?.id ?? 'new'}`}
                        options={structures}
                        value={form.data.structure}
                        onChange={(e) => setStructure(e.target.value)}
                    />
                </Field>
                <Field label="Stake (%)" htmlFor={`stake-${counterTo?.id ?? 'new'}`} error={form.errors.stake_pct}>
                    <Input
                        id={`stake-${counterTo?.id ?? 'new'}`}
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={form.data.stake_pct}
                        onChange={(e) => form.setData('stake_pct', e.target.value)}
                        required
                    />
                </Field>
                <Field label="Deposit on signing (%)" htmlFor={`deposit-${counterTo?.id ?? 'new'}`} error={form.errors.deposit_pct}>
                    <Input
                        id={`deposit-${counterTo?.id ?? 'new'}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.data.deposit_pct}
                        onChange={(e) => form.setData('deposit_pct', e.target.value)}
                        required
                    />
                </Field>
                <Field label="Conditions" htmlFor={`conditions-${counterTo?.id ?? 'new'}`} error={form.errors.conditions} className="sm:col-span-2">
                    <Textarea
                        id={`conditions-${counterTo?.id ?? 'new'}`}
                        value={form.data.conditions}
                        onChange={(e) => form.setData('conditions', e.target.value)}
                        placeholder="e.g. Subject to due diligence and change-of-control consents"
                        maxLength={2000}
                    />
                </Field>
                <Field label="Valid until (optional)" htmlFor={`valid-${counterTo?.id ?? 'new'}`} error={form.errors.valid_until}>
                    <Input
                        id={`valid-${counterTo?.id ?? 'new'}`}
                        type="date"
                        value={form.data.valid_until}
                        onChange={(e) => form.setData('valid_until', e.target.value)}
                    />
                </Field>
            </div>
            <p className="text-muted-foreground text-xs">
                Offers are indicative and non-binding until the parties sign transaction documents with their advisers.
            </p>
            <Button type="submit" disabled={form.processing} className="bg-brand-gradient shadow-brand">
                {submitLabel}
            </Button>
        </form>
    );
}
