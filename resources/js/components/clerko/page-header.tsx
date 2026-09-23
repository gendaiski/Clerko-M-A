import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export function PageHeader({
    title,
    description,
    actions,
    eyebrow,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    eyebrow?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
            <div className="space-y-1.5">
                {eyebrow && <div className="text-primary text-xs font-semibold tracking-wide uppercase">{eyebrow}</div>}
                <h1 className="text-brand-ink text-2xl font-extrabold tracking-tight md:text-3xl dark:text-white">{title}</h1>
                {description && <p className="text-muted-foreground max-w-2xl">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** Standard padded page body used inside the app layout. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-8', className)}>{children}</div>;
}
