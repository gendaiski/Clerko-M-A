import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import * as React from 'react';

/** Label + control + validation error. */
export function Field({
    label,
    htmlFor,
    error,
    hint,
    children,
    className,
}: {
    label: React.ReactNode;
    htmlFor?: string;
    error?: string;
    hint?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
            <InputError message={error} />
        </div>
    );
}

const controlClass =
    'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(controlClass, 'min-h-24', className)} {...props} />
));
Textarea.displayName = 'Textarea';

/** Native select: accessible, works without JS libraries, easy with useForm. */
export const NativeSelect = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement> & { options: Record<string, string>; placeholder?: string }
>(({ className, options, placeholder, ...props }, ref) => (
    <select ref={ref} className={cn(controlClass, 'h-10', className)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {Object.entries(options).map(([value, label]) => (
            <option key={value} value={value}>
                {label}
            </option>
        ))}
    </select>
));
NativeSelect.displayName = 'NativeSelect';

/** Toggleable chips for multi-select filters (sectors, locations). */
export function ChipGroup({ options, value, onChange }: { options: Record<string, string>; value: string[]; onChange: (value: string[]) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {Object.entries(options).map(([key, label]) => {
                const selected = value.includes(key);
                return (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(selected ? value.filter((v) => v !== key) : [...value, key])}
                        className={cn(
                            'rounded-full border px-3 py-1 text-sm transition',
                            selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
