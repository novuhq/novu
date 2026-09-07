import { cn } from '@/utils/ui';

type LoadingIndicatorProps = {
  className?: string;
  size?: 'sm' | 'md';
};

export function LoadingIndicator({ className, size = 'sm' }: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'size-3',
    md: 'size-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-600',
        sizeClasses[size],
        className
      )}
    />
  );
}
