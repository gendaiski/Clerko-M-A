import { BrandLogo } from '@/components/clerko/brand-logo';
import { FlashMessages } from '@/components/clerko/flash-messages';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import { formatBD } from '@/lib/format';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, FlaskConical, Loader2, Lock, XCircle } from 'lucide-react';
import { useState } from 'react';

type Props = {
    payment: {
        uuid: string;
        /** Decimal cast: serialised as a string, e.g. "699.000". */
        amount: string | number;
        currency: string;
        description: string;
        status: string;
    };
};

type Outcome = 'paid' | 'failed';

export default function FakeCheckout({ payment }: Props) {
    const [pending, setPending] = useState<Outcome | null>(null);
    const amount = Number(payment.amount);
    const isBd = payment.currency.toUpperCase() === 'BHD';
    const settled = payment.status !== 'initiated';

    const complete = (outcome: Outcome) => {
        router.post(
            route('payments.fake-complete', payment.uuid),
            { outcome },
            { onStart: () => setPending(outcome), onFinish: () => setPending(null) },
        );
    };

    return (
        <div className="bg-brand-lavender flex min-h-svh flex-col items-center justify-center p-4 dark:bg-slate-950">
            <Head title="Test checkout" />
            <div className="w-full max-w-md space-y-5">
                <div className="flex justify-center">
                    <BrandLogo />
                </div>

                <FlashMessages />

                <div
                    role="note"
                    className="flex items-start gap-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"
                >
                    <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <div>
                        <div className="font-bold tracking-wide uppercase">Development checkout</div>
                        <p className="mt-0.5">
                            This page stands in for Tap's hosted checkout in development. No card is charged — choose the outcome to simulate.
                        </p>
                    </div>
                </div>

                <section className="bg-card shadow-brand-lg overflow-hidden rounded-2xl border" aria-labelledby="checkout-title">
                    <div className="bg-brand-gradient p-6 text-white">
                        <div className="text-sm text-white/80">Amount due</div>
                        <div className="mt-1 text-4xl font-extrabold tracking-tight">
                            {isBd
                                ? formatBD(amount, { compact: false })
                                : `${payment.currency} ${amount.toLocaleString('en-US', { maximumFractionDigits: 3 })}`}
                        </div>
                    </div>
                    <div className="space-y-5 p-6">
                        <div>
                            <h1 id="checkout-title" className="text-brand-ink font-bold dark:text-white">
                                {payment.description}
                            </h1>
                            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-mono">Ref. {payment.uuid}</span>
                                <StatusBadge status={payment.status} />
                            </div>
                        </div>

                        {settled ? (
                            <p className="text-muted-foreground text-sm">This payment has already been completed.</p>
                        ) : (
                            <div className="grid gap-3">
                                <Button
                                    size="lg"
                                    className="bg-brand-gradient-green shadow-brand"
                                    disabled={pending !== null}
                                    onClick={() => complete('paid')}
                                >
                                    {pending === 'paid' ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Simulate successful payment
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    disabled={pending !== null}
                                    onClick={() => complete('failed')}
                                >
                                    {pending === 'failed' ? <Loader2 className="animate-spin" /> : <XCircle />} Simulate failed payment
                                </Button>
                            </div>
                        )}

                        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                            <Lock className="size-3.5" aria-hidden="true" /> In production: cards, BENEFIT and Apple Pay via Tap
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
