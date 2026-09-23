/** Bahraini Dinar amounts, e.g. "BD 8.5M", "BD 699" or "BD 8,250,000". */
export function formatBD(amount: number | null | undefined, options: { compact?: boolean } = {}): string {
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
        return '—';
    }
    const compact = options.compact ?? true;
    if (compact && Math.abs(amount) >= 1_000_000) {
        return `BD ${trim(amount / 1_000_000)}M`;
    }
    if (compact && Math.abs(amount) >= 10_000) {
        return `BD ${trim(amount / 1_000)}K`;
    }
    return `BD ${amount.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;
}

function trim(value: number): string {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatPct(value: number | null | undefined, signed = true): string {
    if (value === null || value === undefined) {
        return '—';
    }
    const sign = signed && value > 0 ? '+' : '';
    return `${sign}${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "2h ago", "Yesterday", "3 days ago". */
export function timeAgo(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return formatDate(iso);
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function titleCase(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
