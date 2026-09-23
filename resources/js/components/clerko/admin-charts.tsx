import { formatBD } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

/* Admin console charts: plain inline SVG, no chart library. */

export const CHART_COLORS = {
    subscriptions: '#4f46e5',
    unlocks: '#10b981',
};

export interface RevenueMonth {
    month: string;
    subscriptions: number;
    unlocks: number;
}

/** Round a maximum up to a "nice" axis step (1, 2, 2.5, 5 × 10^n). */
function niceStep(max: number, ticks: number): number {
    const raw = max / ticks;
    const exp = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / exp;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * exp;
}

/** Rectangle with rounded top corners only (square at the baseline). */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
    const rr = Math.max(0, Math.min(r, h, w / 2));
    return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** Track the rendered width of a container so SVG text stays at a readable pixel size. */
function useWidth<T extends HTMLElement>(fallback: number) {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(fallback);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const w = Math.floor(entries[0]?.contentRect.width ?? fallback);
            if (w > 0) {
                setWidth(w);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [fallback]);

    return [ref, width] as const;
}

function LegendSwatch({ color }: { color: string }) {
    return <span aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />;
}

/** Stacked monthly revenue: subscriptions (bottom) + pack unlocks (top). */
export function RevenueChart({ data, className }: { data: RevenueMonth[]; className?: string }) {
    const [ref, width] = useWidth<HTMLDivElement>(560);
    const [active, setActive] = useState<number | null>(null);

    const height = 220;
    const pad = { top: 22, right: 8, bottom: 28, left: 58 };
    const plotW = Math.max(width - pad.left - pad.right, 60);
    const plotH = height - pad.top - pad.bottom;

    const totals = data.map((d) => d.subscriptions + d.unlocks);
    const max = Math.max(0, ...totals);
    const isEmpty = max <= 0;
    const step = isEmpty ? 1 : niceStep(max, 4);
    const top = isEmpty ? 4 : Math.ceil(max / step) * step;
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
    const y = (v: number) => pad.top + plotH - (v / top) * plotH;

    const band = plotW / Math.max(data.length, 1);
    const barW = Math.min(28, band * 0.5);
    const gap = 2;

    const sumSubs = data.reduce((s, d) => s + d.subscriptions, 0);
    const sumUnlocks = data.reduce((s, d) => s + d.unlocks, 0);
    const summary = isEmpty
        ? 'Revenue by month, last 6 months: no paid revenue recorded.'
        : `Revenue by month, last ${data.length} months. ` +
          data
              .map(
                  (d) =>
                      `${d.month}: subscriptions ${formatBD(d.subscriptions, { compact: false })}, pack unlocks ${formatBD(d.unlocks, { compact: false })}`,
              )
              .join('; ') +
          '.';

    const activeRow = active !== null ? data[active] : null;

    return (
        <div className={cn('space-y-3', className)}>
            <div ref={ref} className="relative w-full" onMouseLeave={() => setActive(null)}>
                <svg width={width} height={height} role="img" aria-label={summary} className="block overflow-visible">
                    {/* gridlines + y ticks */}
                    <g aria-hidden="true">
                        {ticks.map((t) => (
                            <g key={t}>
                                <line x1={pad.left} x2={pad.left + plotW} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
                                <text
                                    x={pad.left - 8}
                                    y={y(t)}
                                    dy="0.32em"
                                    textAnchor="end"
                                    className="fill-muted-foreground text-[11px] tabular-nums"
                                >
                                    {isEmpty && t > 0 ? '' : formatBD(t)}
                                </text>
                            </g>
                        ))}
                    </g>

                    {/* bars */}
                    <g aria-hidden="true">
                        {data.map((d, i) => {
                            const cx = pad.left + band * i + band / 2;
                            const x = cx - barW / 2;
                            const subsH = (d.subscriptions / top) * plotH;
                            const unlockHRaw = (d.unlocks / top) * plotH;
                            const hasBoth = subsH > 0 && unlockHRaw > 0;
                            const unlockH = hasBoth ? Math.max(unlockHRaw - gap, 1) : unlockHRaw;
                            const base = pad.top + plotH;
                            const dim = active !== null && active !== i;
                            const total = d.subscriptions + d.unlocks;

                            return (
                                <g key={d.month + i} style={{ opacity: dim ? 0.45 : 1, transition: 'opacity 120ms' }}>
                                    {subsH > 0 && (
                                        <path
                                            d={
                                                unlockHRaw > 0
                                                    ? `M${x},${base - subsH} h${barW} v${subsH} h${-barW} Z`
                                                    : topRoundedRect(x, base - subsH, barW, subsH, 4)
                                            }
                                            fill={CHART_COLORS.subscriptions}
                                        />
                                    )}
                                    {unlockHRaw > 0 && (
                                        <path
                                            d={topRoundedRect(x, base - subsH - (hasBoth ? gap : 0) - unlockH, barW, unlockH, 4)}
                                            fill={CHART_COLORS.unlocks}
                                        />
                                    )}
                                    {total > 0 && (
                                        <text
                                            x={cx}
                                            y={y(total) - 6}
                                            textAnchor="middle"
                                            className="fill-foreground text-[11px] font-semibold tabular-nums"
                                        >
                                            {formatBD(total)}
                                        </text>
                                    )}
                                    <text x={cx} y={base + 18} textAnchor="middle" className="fill-muted-foreground text-xs">
                                        {d.month}
                                    </text>
                                    {/* hover target larger than the mark */}
                                    <rect
                                        x={pad.left + band * i}
                                        y={pad.top}
                                        width={band}
                                        height={plotH}
                                        fill="transparent"
                                        onMouseEnter={() => setActive(i)}
                                    />
                                </g>
                            );
                        })}
                    </g>

                    {isEmpty && (
                        <text
                            x={pad.left + plotW / 2}
                            y={pad.top + plotH / 2}
                            textAnchor="middle"
                            className="fill-muted-foreground text-sm"
                            aria-hidden="true"
                        >
                            No paid revenue in this period yet
                        </text>
                    )}
                </svg>

                {activeRow && active !== null && (
                    <div
                        aria-hidden="true"
                        className="bg-popover text-popover-foreground pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border px-3 py-2 text-xs shadow-md"
                        style={{
                            left: Math.min(Math.max(pad.left + band * active + band / 2 - 80, 0), Math.max(width - 170, 0)),
                        }}
                    >
                        <div className="mb-1 font-semibold">{activeRow.month}</div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5">
                                <LegendSwatch color={CHART_COLORS.subscriptions} /> Subscriptions
                            </span>
                            <span className="tabular-nums">{formatBD(activeRow.subscriptions, { compact: false })}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5">
                                <LegendSwatch color={CHART_COLORS.unlocks} /> Pack unlocks
                            </span>
                            <span className="tabular-nums">{formatBD(activeRow.unlocks, { compact: false })}</span>
                        </div>
                        <div className="mt-1 flex justify-between gap-3 border-t pt-1 font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">{formatBD(activeRow.subscriptions + activeRow.unlocks, { compact: false })}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span className="flex items-center gap-2">
                    <LegendSwatch color={CHART_COLORS.subscriptions} />
                    Subscriptions <span className="text-foreground font-semibold tabular-nums">{formatBD(sumSubs)}</span>
                </span>
                <span className="flex items-center gap-2">
                    <LegendSwatch color={CHART_COLORS.unlocks} />
                    Pack unlocks <span className="text-foreground font-semibold tabular-nums">{formatBD(sumUnlocks)}</span>
                </span>
            </div>

            <table className="sr-only">
                <caption>Revenue by month (BD)</caption>
                <thead>
                    <tr>
                        <th scope="col">Month</th>
                        <th scope="col">Subscriptions</th>
                        <th scope="col">Pack unlocks</th>
                        <th scope="col">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((d, i) => (
                        <tr key={d.month + i}>
                            <th scope="row">{d.month}</th>
                            <td>{formatBD(d.subscriptions, { compact: false })}</td>
                            <td>{formatBD(d.unlocks, { compact: false })}</td>
                            <td>{formatBD(d.subscriptions + d.unlocks, { compact: false })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export interface StageDatum {
    key: string;
    label: string;
    count: number;
    muted?: boolean;
}

/** Horizontal bars, one row per funnel stage, in funnel order. */
export function StageChart({ data, className }: { data: StageDatum[]; className?: string }) {
    const max = Math.max(0, ...data.map((d) => d.count));
    const total = data.reduce((s, d) => s + d.count, 0);
    const summary =
        total === 0
            ? 'Deals by stage: no engagements yet.'
            : `Deals by stage, ${total} engagements. ` + data.map((d) => `${d.label}: ${d.count}`).join('; ') + '.';

    return (
        <div className={cn('space-y-3', className)}>
            <div role="img" aria-label={summary} className="space-y-2.5">
                {data.map((d) => {
                    const pct = max > 0 ? (d.count / max) * 100 : 0;
                    return (
                        <div key={d.key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm" title={`${d.label}: ${d.count}`}>
                            <span className="text-muted-foreground truncate">{d.label}</span>
                            <svg className="block h-3.5 w-full" aria-hidden="true">
                                <rect x="0" y="0" width="100%" height="100%" rx="4" className="fill-muted" />
                                {d.count > 0 && (
                                    <rect
                                        x="0"
                                        y="0"
                                        width={`${Math.max(pct, 2)}%`}
                                        height="100%"
                                        rx="4"
                                        fill={d.muted ? '#94a3b8' : CHART_COLORS.subscriptions}
                                    />
                                )}
                            </svg>
                            <span className="text-right font-semibold tabular-nums">{d.count}</span>
                        </div>
                    );
                })}
            </div>
            {total === 0 && <p className="text-muted-foreground text-sm">No buyer engagements yet. Stages will fill in as buyers request NDAs.</p>}
        </div>
    );
}
