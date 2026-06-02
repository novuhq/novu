import { useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';

type SetupGuideCardProps = {
  label: string;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SetupGuideCard({ label, rightContent, children, className }: SetupGuideCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={cn('bg-bg-weak flex flex-col rounded-[10px] p-1', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-1.5"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <span className="font-code text-text-sub text-[12px] uppercase leading-4 tracking-[-0.24px]">{label}</span>
        <div className="flex items-center gap-2">
          {rightContent}
          <RiExpandUpDownLine
            className={cn('text-text-soft size-3 transition-transform', isExpanded && 'rotate-180')}
          />
        </div>
      </button>
      {isExpanded && (
        <div className="bg-bg-white flex flex-col overflow-hidden rounded-md p-3 pr-3 md:pr-6 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
          {children}
        </div>
      )}
    </div>
  );
}
