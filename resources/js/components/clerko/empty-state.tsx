import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon?: LucideIcon;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center', className)}>
            {Icon && (
                <div className="bg-accent text-primary mb-3 flex size-12 items-center justify-center rounded-2xl">
                    <Icon className="size-6" />
                </div>
            )}
            <div className="text-foreground font-semibold">{title}</div>
            {description && <p className="text-muted-foreground mt-1 max-w-md text-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
