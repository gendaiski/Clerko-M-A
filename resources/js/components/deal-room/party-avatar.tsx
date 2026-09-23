import { cn } from '@/lib/utils';
import { type Party } from './types';

export function PartyAvatar({ party, className }: { party: Party; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                party === 'buyer' ? 'bg-brand-gradient' : 'bg-brand-gradient-green',
                className,
            )}
        >
            {party === 'buyer' ? 'B' : 'S'}
        </span>
    );
}
