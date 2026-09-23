import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
    return (
        <div className={cn('bg-brand-gradient shadow-brand flex size-9 items-center justify-center rounded-xl text-white', className)}>
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                <path d="M4 17l5-5 4 4 7-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 8h5v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}

export function BrandLogo({ className }: { className?: string }) {
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <BrandMark />
            <span className="text-brand-ink text-lg font-extrabold tracking-tight dark:text-white">
                Clerko <span className="text-brand-gradient">M&amp;A</span>
            </span>
        </span>
    );
}
