import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export interface TabItem {
    key: string;
    label: ReactNode;
    count?: number;
}

/** Controlled tab bar. */
export function Tabs({ tabs, value, onChange, className }: { tabs: TabItem[]; value: string; onChange: (key: string) => void; className?: string }) {
    return (
        <div role="tablist" className={cn('bg-muted inline-flex flex-wrap gap-1 rounded-xl p-1', className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={value === tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                        value === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="bg-primary/10 text-primary rounded-full px-1.5 text-xs font-semibold">{tab.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}
