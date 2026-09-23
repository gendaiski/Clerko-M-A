import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Success / error banners set with ->with('success'|'error', ...). */
export function FlashMessages({ className }: { className?: string }) {
    const { flash } = usePage<SharedData>().props;
    const [hidden, setHidden] = useState(false);

    useEffect(() => setHidden(false), [flash.success, flash.error]);

    if (hidden || (!flash.success && !flash.error)) {
        return null;
    }

    const isError = Boolean(flash.error);

    return (
        <div
            role={isError ? 'alert' : 'status'}
            className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
                isError
                    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
                className,
            )}
        >
            {isError ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
            <span className="flex-1">{flash.error ?? flash.success}</span>
            <button type="button" onClick={() => setHidden(true)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
                <X className="size-4" />
            </button>
        </div>
    );
}
