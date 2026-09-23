import { BrandMark } from '@/components/clerko/brand-logo';

export default function AppLogo() {
    return (
        <>
            <BrandMark className="size-8 rounded-lg" />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-extrabold">
                    Clerko <span className="text-brand-gradient">M&amp;A</span>
                </span>
            </div>
        </>
    );
}
