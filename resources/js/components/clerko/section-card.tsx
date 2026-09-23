import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/** A titled white card, the basic building block of app pages. */
export function SectionCard({
    title,
    description,
    actions,
    children,
    className,
    bodyClassName,
}: {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <section className={cn('bg-card shadow-brand rounded-2xl border', className)}>
            {(title || actions) && (
                <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
                    <div>
                        {title && <h2 className="text-brand-ink font-bold dark:text-white">{title}</h2>}
                        {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={cn('p-5', bodyClassName)}>{children}</div>
        </section>
    );
}
