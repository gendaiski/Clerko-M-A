import { Tabs } from '@/components/clerko/tabs';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

/* Small building blocks shared by the admin console pages. */

export const ID_TYPES: Record<string, string> = {
    cpr: 'CPR (Bahrain ID)',
    passport: 'Passport',
    gcc_id: 'GCC national ID',
};

/** Status filter tabs that reload the current index with ?status=… */
export function StatusFilter({
    routeName,
    value,
    options,
    label = 'Filter by status',
}: {
    routeName: string;
    value: string;
    options: Record<string, string>;
    label?: string;
}) {
    return (
        <nav aria-label={label} className="max-w-full overflow-x-auto">
            <Tabs
                tabs={Object.entries(options).map(([key, text]) => ({ key, label: text }))}
                value={value}
                onChange={(key) => router.get(route(routeName), { status: key }, { preserveScroll: true, preserveState: true, replace: true })}
            />
        </nav>
    );
}

/** "Showing 1–25 of 132" line for paginated tables. */
export function ResultCount({ from, to, total, noun }: { from: number | null; to: number | null; total: number; noun: string }) {
    if (total === 0) {
        return null;
    }
    return (
        <p className="text-muted-foreground text-sm" aria-live="polite">
            Showing {from}–{to} of {total.toLocaleString('en-US')} {noun}
        </p>
    );
}

export interface DecisionOption {
    value: string;
    label: string;
    description?: string;
    icon: LucideIcon;
    tone: 'green' | 'amber' | 'red';
}

const toneRing = {
    green: 'has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-500/10',
    amber: 'has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 dark:has-[:checked]:bg-amber-500/10',
    red: 'has-[:checked]:border-red-500 has-[:checked]:bg-red-50 dark:has-[:checked]:bg-red-500/10',
};
const toneIcon = {
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
};

/** Radio cards for a reviewer decision (approve / revise / reject …). */
export function DecisionRadioGroup({
    name,
    legend,
    options,
    value,
    onChange,
    invalid,
}: {
    name: string;
    legend: string;
    options: DecisionOption[];
    value: string;
    onChange: (value: string) => void;
    invalid?: boolean;
}) {
    return (
        <fieldset className="grid gap-2" aria-invalid={invalid || undefined}>
            <legend className="mb-2 text-sm font-medium">{legend}</legend>
            {options.map((o) => {
                const Icon = o.icon;
                const id = `${name}-${o.value}`;
                return (
                    <label
                        key={o.value}
                        htmlFor={id}
                        className={cn(
                            'hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-offset-2',
                            toneRing[o.tone],
                        )}
                    >
                        <input
                            id={id}
                            type="radio"
                            name={name}
                            value={o.value}
                            checked={value === o.value}
                            onChange={() => onChange(o.value)}
                            className="sr-only"
                        />
                        <Icon className={cn('mt-0.5 size-5 shrink-0', toneIcon[o.tone])} aria-hidden="true" />
                        <span className="grid gap-0.5">
                            <span className="text-sm font-semibold">{o.label}</span>
                            {o.description && <span className="text-muted-foreground text-xs">{o.description}</span>}
                        </span>
                    </label>
                );
            })}
        </fieldset>
    );
}

/** A document preview panel (PDF in an iframe or an image) with an open-in-new-tab link. */
export function FilePreview({
    title,
    src,
    kind,
    className,
    heightClass = 'h-[70vh] min-h-[420px]',
    footer,
}: {
    title: string;
    src: string;
    kind: 'iframe' | 'img';
    className?: string;
    heightClass?: string;
    footer?: ReactNode;
}) {
    return (
        <figure className={cn('bg-card shadow-brand overflow-hidden rounded-2xl border', className)}>
            <figcaption className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <span className="text-brand-ink text-sm font-bold dark:text-white">{title}</span>
                <a
                    href={src}
                    target="_blank"
                    rel="noopener"
                    className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                    Open in new tab <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">({title})</span>
                </a>
            </figcaption>
            <div className="bg-muted/40">
                {kind === 'iframe' ? (
                    <iframe src={src} title={title} className={cn('block w-full border-0', heightClass)} />
                ) : (
                    <img src={src} alt={title} className={cn('mx-auto block max-w-full object-contain', heightClass)} />
                )}
            </div>
            {footer && <div className="border-t px-4 py-3 text-sm">{footer}</div>}
        </figure>
    );
}

/** Pretty-printed JSON in a scrollable monospace block. */
export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
    const text = value === null || value === undefined ? 'null' : JSON.stringify(value, null, 2);
    return (
        <pre className={cn('bg-muted max-h-[480px] overflow-auto rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre', className)}>
            {text}
        </pre>
    );
}

/** Term / value rows for detail panels. */
export function DetailList({ items, className }: { items: { term: ReactNode; value: ReactNode }[]; className?: string }) {
    return (
        <dl className={cn('divide-y text-sm', className)}>
            {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-2 first:pt-0 last:pb-0">
                    <dt className="text-muted-foreground">{item.term}</dt>
                    <dd className="min-w-0 font-medium break-words">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}
