import { cn } from '@/lib/utils';

type Tone = 'green' | 'amber' | 'red' | 'indigo' | 'slate' | 'purple' | 'blue';

const tones: Record<Tone, string> = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300',
    purple: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300',
    blue: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300',
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300',
};

/** Colour for every status value used across the platform. */
const statusTone: Record<string, Tone> = {
    // verification
    verified: 'green',
    pending: 'amber',
    unverified: 'slate',
    rejected: 'red',
    // extraction
    processing: 'blue',
    completed: 'green',
    failed: 'red',
    manual: 'purple',
    // listings
    draft: 'slate',
    awaiting_payment: 'amber',
    pending_review: 'amber',
    revision_requested: 'purple',
    live: 'green',
    closed: 'slate',
    // engagements
    nda_requested: 'slate',
    nda_signed: 'blue',
    pack_unlocked: 'indigo',
    deal_room: 'purple',
    offer: 'amber',
    headline_terms: 'green',
    withdrawn: 'slate',
    // offers, questions, rooms, flags
    open: 'amber',
    answered: 'green',
    countered: 'purple',
    accepted: 'green',
    terms_agreed: 'green',
    cleared: 'green',
    actioned: 'red',
    paid: 'green',
    initiated: 'amber',
};

export function StatusBadge({ status, label, tone, className }: { status?: string; label?: string; tone?: Tone; className?: string }) {
    const resolved = tone ?? (status ? statusTone[status] : undefined) ?? 'slate';
    const text = label ?? (status ? status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
                tones[resolved],
                className,
            )}
        >
            {text}
        </span>
    );
}
