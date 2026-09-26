import type { ComponentProps } from 'react';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/utils/ui';

export function ThinkingIndicator({
  label,
  className,
  ...props
}: Omit<ComponentProps<'output'>, 'children' | 'label'> & {
  label: string;
}) {
  return (
    <output
      data-slot="thinking-indicator"
      className={cn('text-text-soft flex items-center gap-2.5 text-sm', className)}
      {...props}
    >
      <span
        aria-hidden
        className="bg-primary-base size-1.5 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
      />
      <Shimmer key={label} as="span" className="text-text-soft relative inline-block text-sm leading-none">
        {label}
      </Shimmer>
    </output>
  );
}
