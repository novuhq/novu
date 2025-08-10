import { ReactNode } from 'react';

type ChartEmptyStateProps = {
  title?: string;
  children: ReactNode;
};

export function ChartEmptyState({ title = 'Not enough data to show', children }: ChartEmptyStateProps) {
  return (
    <div className="relative h-[160px] w-full">
      <div className="opacity-5">{children}</div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded border border-solid border-[#e1e4ea] bg-white px-2 py-1">
          <p className="text-[10px] font-medium leading-[14px] text-[#99a0ae]">{title}</p>
        </div>
      </div>
    </div>
  );
}
