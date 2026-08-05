import type { ReactNode } from 'react';
import { cn } from '@/utils/ui';

type ChannelChipProps = {
  label: string;
  icon: ReactNode;
  accent: string;
  isSelected: boolean;
  onToggle: () => void;
};

export function ChannelChip({ label, icon, accent, isSelected, onToggle }: ChannelChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className={cn(
        'text-label-xs inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2 font-medium transition-colors',
        isSelected ? 'text-text-strong' : 'border-stroke-weak hover:border-stroke-soft text-text-sub bg-white'
      )}
      style={isSelected ? { backgroundColor: `${accent}1f`, borderColor: `${accent}3d` } : undefined}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}
