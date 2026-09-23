import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export function KpiCard({
    label,
    value,
    icon: Icon,
    hint,
    tone = 'indigo',
    className,
}: {
    label: string;
    value: ReactNode;
    icon?: LucideIcon;
    hint?: ReactNode;
    tone?: 'indigo' | 'green' | 'purple' | 'amber' | 'blue';
    className?: string;
}) {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10',
        green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
        purple: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10',
    };

    return (
        <div className={cn('bg-card shadow-brand rounded-2xl border p-5', className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="text-muted-foreground text-sm font-medium">{label}</div>
                    <div className="text-brand-ink text-2xl font-extrabold tracking-tight dark:text-white">{value}</div>
                </div>
                {Icon && (
                    <div className={cn('flex size-10 items-center justify-center rounded-xl', tones[tone])}>
                        <Icon className="size-5" />
                    </div>
                )}
            </div>
            {hint && <div className="text-muted-foreground mt-2 text-xs">{hint}</div>}
        </div>
    );
}
