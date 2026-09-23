import { BrandLogo } from '@/components/clerko/brand-logo';
import { Link } from '@inertiajs/react';
import { BadgeCheck, FileLock2, Handshake } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

const points = [
    { icon: BadgeCheck, text: 'Every member is identity-verified; every company is checked against its CR.' },
    { icon: FileLock2, text: 'Identities stay hidden until an NDA is signed. Documents are watermarked and logged.' },
    { icon: Handshake, text: 'A structured deal room takes you from first question to agreed headline terms.' },
];

export default function AuthSplitLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="relative grid min-h-dvh lg:grid-cols-2">
            <div className="bg-brand-gradient relative hidden flex-col justify-between p-10 text-white lg:flex">
                <Link href={route('home')} className="flex items-center gap-2 text-lg font-extrabold">
                    Clerko M&amp;A
                </Link>
                <div className="space-y-6">
                    <h2 className="max-w-md text-3xl leading-tight font-extrabold">Buy and sell businesses in Bahrain, confidentially.</h2>
                    <ul className="space-y-4">
                        {points.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex max-w-md gap-3 text-white/90">
                                <Icon className="mt-0.5 size-5 shrink-0" />
                                <span>{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="text-sm text-white/70">Kingdom of Bahrain</div>
            </div>
            <div className="flex items-center justify-center px-6 py-12">
                <div className="flex w-full max-w-sm flex-col gap-6">
                    <Link href={route('home')} className="lg:hidden">
                        <BrandLogo />
                    </Link>
                    <div className="space-y-1.5">
                        <h1 className="text-brand-ink text-2xl font-extrabold dark:text-white">{title}</h1>
                        <p className="text-muted-foreground text-sm">{description}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
