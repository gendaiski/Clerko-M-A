import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export interface Column<T> {
    header: ReactNode;
    cell: (row: T) => ReactNode;
    className?: string;
}

/** Simple responsive table (scrolls horizontally on small screens). */
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    empty,
    className,
}: {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string | number;
    empty?: ReactNode;
    className?: string;
}) {
    if (rows.length === 0 && empty) {
        return <>{empty}</>;
    }

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                    <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                        {columns.map((c, i) => (
                            <th key={i} className={cn('px-3 py-2.5 font-semibold', c.className)}>
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={rowKey(row)} className="hover:bg-muted/50 border-b last:border-0">
                            {columns.map((c, i) => (
                                <td key={i} className={cn('px-3 py-3 align-middle', c.className)}>
                                    {c.cell(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
