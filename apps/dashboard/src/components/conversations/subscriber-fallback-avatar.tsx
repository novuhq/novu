import { useId } from 'react';
import { cn } from '@/utils/ui';

type SubscriberFallbackAvatarProps = {
  className?: string;
};

export function SubscriberFallbackAvatar({ className }: SubscriberFallbackAvatarProps) {
  const clipPathId = `subscriber-fallback-avatar-${useId().replace(/:/g, '')}`;

  return (
    <svg
      className={cn('shrink-0', className)}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8Z"
        fill="#E1E4EA"
      />
      <g clipPath={`url(#${clipPathId})`}>
        <ellipse cx="8.0001" cy="15.6008" rx="6.4" ry="4.8" fill="white" fillOpacity="0.72" />
        <circle opacity="0.9" cx="8.00005" cy="6.39922" r="3.2" fill="white" />
      </g>
      <defs>
        <clipPath id={clipPathId}>
          <rect width="16" height="16" rx="8" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
