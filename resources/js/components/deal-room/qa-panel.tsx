import { EmptyState } from '@/components/clerko/empty-state';
import { Field, NativeSelect, Textarea } from '@/components/clerko/field';
import { StatusBadge } from '@/components/clerko/status-badge';
import { Tabs } from '@/components/clerko/tabs';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/format';
import { useForm } from '@inertiajs/react';
import { MessagesSquare, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { PartyAvatar } from './party-avatar';
import { type Party, type Question, partyName } from './types';

interface Props {
    roomId: number;
    questions: Question[];
    categories: Record<string, string>;
    viewer: Party | null;
    buyerLabel: string;
    canAct: boolean;
}

export function QaPanel({ roomId, questions, categories, viewer, buyerLabel, canAct }: Props) {
    const [filter, setFilter] = useState<'all' | 'open' | 'answered' | 'closed'>('all');
    const form = useForm({ category: 'financial', body: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('deal-rooms.questions.store', roomId), {
            preserveScroll: true,
            onSuccess: () => form.reset('body'),
        });
    };

    const visible = questions.filter((q) => filter === 'all' || q.status === filter);
    const count = (status: Question['status']) => questions.filter((q) => q.status === status).length;

    return (
        <div className="space-y-5">
            {canAct && (
                <form onSubmit={submit} className="bg-muted/40 space-y-3 rounded-2xl border p-4">
                    <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                        <Field label="Topic" htmlFor="qa-category" error={form.errors.category}>
                            <NativeSelect
                                id="qa-category"
                                options={categories}
                                value={form.data.category}
                                onChange={(e) => form.setData('category', e.target.value)}
                            />
                        </Field>
                        <Field label="Your question" htmlFor="qa-body" error={form.errors.body}>
                            <Textarea
                                id="qa-body"
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                placeholder="Ask a clear, specific question…"
                                maxLength={4000}
                                required
                            />
                        </Field>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <ShieldCheck className="size-3.5" /> Contact details are removed automatically — keep all communication on Clerko.
                        </p>
                        <Button type="submit" disabled={form.processing || !form.data.body.trim()} className="bg-brand-gradient shadow-brand">
                            Post question
                        </Button>
                    </div>
                </form>
            )}

            <Tabs
                value={filter}
                onChange={(key) => setFilter(key as typeof filter)}
                tabs={[
                    { key: 'all', label: 'All', count: questions.length },
                    { key: 'open', label: 'Open', count: count('open') },
                    { key: 'answered', label: 'Answered', count: count('answered') },
                    { key: 'closed', label: 'Closed', count: count('closed') },
                ]}
            />

            {visible.length === 0 ? (
                <EmptyState
                    icon={MessagesSquare}
                    title="No questions yet"
                    description="Questions and answers between the buyer and the seller appear here, organised by topic."
                />
            ) : (
                <ul className="space-y-4">
                    {visible.map((question) => (
                        <QuestionThread
                            key={question.id}
                            roomId={roomId}
                            question={question}
                            categories={categories}
                            viewer={viewer}
                            buyerLabel={buyerLabel}
                            canAct={canAct}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function QuestionThread({
    roomId,
    question,
    categories,
    viewer,
    buyerLabel,
    canAct,
}: {
    roomId: number;
    question: Question;
    categories: Record<string, string>;
    viewer: Party | null;
    buyerLabel: string;
    canAct: boolean;
}) {
    const [replying, setReplying] = useState(false);
    const form = useForm({ body: '' });

    const reply = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('deal-rooms.questions.answer', [roomId, question.id]), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setReplying(false);
            },
        });
    };

    const closeQuestion = () => form.post(route('deal-rooms.questions.close', [roomId, question.id]), { preserveScroll: true });

    return (
        <li className="bg-card rounded-2xl border p-4">
            <div className="flex items-start gap-3">
                <PartyAvatar party={question.from} />
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{partyName(question.from, viewer, buyerLabel)}</span>
                        <StatusBadge label={categories[question.category] ?? question.category} tone="indigo" />
                        <StatusBadge status={question.status} />
                        <span className="text-muted-foreground ml-auto text-xs">{timeAgo(question.created_at)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-line">{question.body}</p>
                </div>
            </div>

            {question.answers.length > 0 && (
                <ul className="mt-4 space-y-3 border-l-2 pl-4 sm:ml-4">
                    {question.answers.map((answer) => (
                        <li key={answer.id} className="flex items-start gap-3">
                            <PartyAvatar party={answer.from} className="size-7" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold">{partyName(answer.from, viewer, buyerLabel)}</span>
                                    <span className="text-muted-foreground ml-auto text-xs">{timeAgo(answer.created_at)}</span>
                                </div>
                                <p className="text-sm whitespace-pre-line">{answer.body}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {canAct && question.status !== 'closed' && (
                <div className="mt-3 sm:ml-11">
                    {replying ? (
                        <form onSubmit={reply} className="space-y-2">
                            <Textarea
                                aria-label="Reply"
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                maxLength={4000}
                                required
                                autoFocus
                            />
                            {form.errors.body && <p className="text-sm text-red-600">{form.errors.body}</p>}
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={form.processing || !form.data.body.trim()}>
                                    Post reply
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setReplying(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => setReplying(true)}>
                                Reply
                            </Button>
                            {question.from === viewer && (
                                <Button type="button" size="sm" variant="ghost" onClick={closeQuestion} disabled={form.processing}>
                                    Mark resolved
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
