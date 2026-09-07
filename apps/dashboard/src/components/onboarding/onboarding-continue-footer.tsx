import { CalendarDays, ChevronRight } from 'lucide-react';
import { BOOK_DEMO_URL } from '@/components/header-navigation/support-drawer-constants';
import { cn } from '@/utils/ui';

type OnboardingContinueFooterProps = {
  onContinue: () => void;
  className?: string;
};

/** "Continue setup" CTA plus the book-a-demo line, shared by the onboarding steps that advance. */
export function OnboardingContinueFooter({ onContinue, className }: OnboardingContinueFooterProps) {
  return (
    <div className={cn('mt-8', className)}>
      <button
        type="button"
        onClick={onContinue}
        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] px-2.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%), linear-gradient(90deg, #0e121b 0%, #0e121b 100%)',
          boxShadow: '0 1px 2px 0 rgba(27,28,29,0.48), 0 0 0 1px #242628',
        }}
      >
        Continue setup
        <ChevronRight className="size-4" />
      </button>

      <div className="text-text-sub mt-4 flex items-center gap-2 text-xs">
        <span>Have questions?</span>
        <a
          href={BOOK_DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-strong inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          <CalendarDays className="size-4" />
          Book a demo
        </a>
      </div>
    </div>
  );
}
