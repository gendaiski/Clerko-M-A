import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

/** Journey progress, e.g. Verify → Listing → Tier → Review → Live. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
    return (
        <ol className={cn('flex flex-wrap items-center gap-2 text-sm', className)}>
            {steps.map((step, index) => {
                const done = index < current;
                const active = index === current;
                return (
                    <li key={step} className="flex items-center gap-2">
                        <span
                            className={cn(
                                'flex size-7 items-center justify-center rounded-full text-xs font-bold',
                                done && 'bg-brand-green text-white',
                                active && 'bg-brand-gradient shadow-brand text-white',
                                !done && !active && 'bg-muted text-muted-foreground',
                            )}
                        >
                            {done ? <Check className="size-4" /> : index + 1}
                        </span>
                        <span className={cn('font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{step}</span>
                        {index < steps.length - 1 && <span className="bg-border mx-1 hidden h-px w-6 sm:block" />}
                    </li>
                );
            })}
        </ol>
    );
}
