import { BrandLogo } from '@/components/clerko/brand-logo';
import { FlashMessages } from '@/components/clerko/flash-messages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';

const nav = [
    { label: 'Home', href: '/' },
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'Pricing', href: '/pricing' },
];

export default function PublicLayout({ title, children }: { title?: string; children: ReactNode }) {
    const { auth } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const url = usePage().url;

    return (
        <div className="bg-background flex min-h-screen flex-col">
            {title && <Head title={title} />}
            <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
                    <Link href="/" aria-label="Clerko M&A home">
                        <BrandLogo />
                    </Link>
                    <nav className="hidden items-center gap-1 md:flex">
                        {nav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                                    (item.href === '/' ? url === '/' : url.startsWith(item.href))
                                        ? 'text-primary bg-accent'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="hidden items-center gap-2 md:flex">
                        {auth.user ? (
                            <Button asChild className="bg-brand-gradient shadow-brand">
                                <Link href={route('dashboard')}>My workspace</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost">
                                    <Link href={route('login')}>Sign in</Link>
                                </Button>
                                <Button asChild className="bg-brand-gradient shadow-brand">
                                    <Link href={route('register')}>Get started</Link>
                                </Button>
                            </>
                        )}
                    </div>
                    <button type="button" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
                        {open ? <X /> : <Menu />}
                    </button>
                </div>
                {open && (
                    <div className="space-y-1 border-t px-4 py-3 md:hidden">
                        {nav.map((item) => (
                            <Link key={item.href} href={item.href} className="hover:bg-muted block rounded-lg px-3 py-2 text-sm font-medium">
                                {item.label}
                            </Link>
                        ))}
                        <Link
                            href={auth.user ? route('dashboard') : route('login')}
                            className="text-primary block rounded-lg px-3 py-2 text-sm font-semibold"
                        >
                            {auth.user ? 'My workspace' : 'Sign in'}
                        </Link>
                    </div>
                )}
            </header>

            <div className="mx-auto w-full max-w-7xl px-4 pt-4 empty:hidden md:px-8">
                <FlashMessages />
            </div>

            <main className="flex-1">{children}</main>

            <footer className="bg-brand-ink mt-16 text-slate-300">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4 md:px-8">
                    <div className="space-y-3 md:col-span-2">
                        <div className="text-lg font-extrabold text-white">
                            Clerko <span className="text-brand-violet">M&amp;A</span>
                        </div>
                        <p className="max-w-sm text-sm text-slate-400">
                            Bahrain's M&amp;A marketplace connecting verified buyers and sellers, with confidential, NDA-gated disclosure and a
                            structured deal room.
                        </p>
                    </div>
                    <div>
                        <div className="mb-3 text-sm font-semibold text-white">Platform</div>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/marketplace" className="hover:text-white">
                                    Marketplace
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="hover:text-white">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href={auth.user ? route('seller.companies.create') : route('register')} className="hover:text-white">
                                    Sell your business
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <div className="mb-3 text-sm font-semibold text-white">Trust</div>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li>KYC &amp; KYB verified members</li>
                            <li>NDA before identity is revealed</li>
                            <li>Watermarked, logged documents</li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/10">
                    <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-500 md:px-8">
                        © {new Date().getFullYear()} Clerko M&amp;A. Kingdom of Bahrain.
                    </div>
                </div>
            </footer>
        </div>
    );
}
