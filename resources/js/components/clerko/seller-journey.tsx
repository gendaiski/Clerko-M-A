import { Stepper } from '@/components/clerko/stepper';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';

export const SELLER_STEPS = ['Verify', 'Listing', 'Tier', 'Review', 'Live'];

/** Journey position for a listing status (Verify=0 … Live=4). */
export function sellerStepForStatus(status: string): number {
    switch (status) {
        case 'draft':
            return 1;
        case 'awaiting_payment':
            return 2;
        case 'pending_review':
        case 'revision_requested':
        case 'rejected':
            return 3;
        case 'live':
        case 'closed':
            return 5;
        default:
            return 1;
    }
}

/** "Seller journey" flow bar, mirroring the prototype's flowbar. */
export function SellerJourney({ current, className }: { current: number; className?: string }) {
    return (
        <div
            className={cn(
                'bg-card shadow-brand flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            <span className="text-brand-ink inline-flex items-center gap-2 text-sm font-bold dark:text-white">
                <span className="bg-brand-gradient-green flex size-7 items-center justify-center rounded-lg text-white">
                    <Building2 className="size-4" aria-hidden="true" />
                </span>
                Seller journey
            </span>
            <nav aria-label="Seller journey progress">
                <Stepper steps={SELLER_STEPS} current={current} />
            </nav>
        </div>
    );
}
