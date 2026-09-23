import { SectionCard } from '@/components/clerko/section-card';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { router } from '@inertiajs/react';
import { PencilLine, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export type ExtractionRun = {
    id: number;
    provider: string;
    action: string;
    status: string;
    reference: string | null;
    error: string | null;
    response: string | null;
    duration_ms: number | null;
    created_at: string;
};

type Props = {
    companyId: number;
    status: string;
    provider: string | null;
    reference: string | null;
    driver: string;
    runs: ExtractionRun[];
    unmappedKeys: string[];
    verified: boolean;
};

const runTone = (status: string) =>
    status === 'error' || status === 'failed' ? 'red' : status === 'completed' ? 'green' : status === 'manual' ? 'purple' : 'blue';

/** Provider, run log and recovery actions for a company's CR extraction. */
export function AdminExtractionPanel({ companyId, status, provider, reference, driver, runs, unmappedKeys, verified }: Props) {
    const [busy, setBusy] = useState(false);
    const post = (name: string, confirm: string) => {
        if (!window.confirm(confirm)) return;
        router.post(route(name, companyId), {}, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    };

    return (
        <SectionCard
            title="CR extraction"
            description={`Read by ${provider ?? driver}${reference ? ` · reference ${reference}` : ''}. Every call to the provider is logged below.`}
            actions={<StatusBadge status={status} label={status === 'manual' ? 'Manual entry' : undefined} />}
        >
            <div className="space-y-4 text-sm">
                {!verified && (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                                post(
                                    'admin.companies.extraction.retry',
                                    `Run the extraction again with ${driver}? The current extracted values will be replaced when it finishes.`,
                                )
                            }
                        >
                            <RefreshCw /> Re-run extraction
                        </Button>
                        {status !== 'completed' && status !== 'manual' && (
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy}
                                onClick={() =>
                                    post(
                                        'admin.companies.extraction.manual',
                                        'Stop automatic extraction and enter the profile from the PDF yourself?',
                                    )
                                }
                            >
                                <PencilLine /> Enter manually instead
                            </Button>
                        )}
                    </div>
                )}

                {status === 'manual' && (
                    <p className="rounded-xl bg-violet-50 p-3 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">
                        Enter the company profile from the CR PDF using the form, save it, then record your decision.
                    </p>
                )}

                {unmappedKeys.length > 0 && (
                    <div>
                        <div className="font-medium">Returned by the provider but not mapped to the profile</div>
                        <p className="text-muted-foreground text-xs">
                            Add any of these to <code>extraction.field_map</code> in <code>config/clerko.php</code> if they should fill a profile
                            field.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {unmappedKeys.map((key) => (
                                <code key={key} className="bg-muted rounded px-1.5 py-0.5 text-xs">
                                    {key}
                                </code>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <div className="mb-2 font-medium">Run log</div>
                    {runs.length === 0 ? (
                        <p className="text-muted-foreground italic">No provider calls yet.</p>
                    ) : (
                        <ol className="divide-y rounded-xl border">
                            {runs.map((run) => (
                                <li key={run.id} className="space-y-1 px-3 py-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs">{run.action}</span>
                                        <StatusBadge label={run.status} tone={runTone(run.status)} />
                                        <span className="text-muted-foreground text-xs">{run.provider}</span>
                                        {run.duration_ms !== null && <span className="text-muted-foreground text-xs">{run.duration_ms} ms</span>}
                                        <span className="text-muted-foreground ml-auto text-xs">{formatDateTime(run.created_at)}</span>
                                    </div>
                                    {run.error && <p className="text-xs break-words text-red-600">{run.error}</p>}
                                    {run.response && (
                                        <details>
                                            <summary className="text-primary cursor-pointer text-xs select-none">Provider response</summary>
                                            <pre className="bg-muted mt-1 max-h-64 overflow-auto rounded-lg p-2 text-[11px] whitespace-pre-wrap">
                                                {run.response}
                                            </pre>
                                        </details>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}
