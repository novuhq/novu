import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { RiCloseCircleLine, RiNotification3Line, RiPauseCircleLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';

type PillTone = 'neutral' | 'warning' | 'error';

const PILL_TONE_CLASSES: Record<PillTone, string> = {
  neutral: 'border-stroke-soft bg-bg-white text-text-sub',
  warning: 'border-warning-light bg-warning-lighter text-warning-base',
  error: 'border-error-light bg-error-lighter text-error-base',
};

type StatusPillProps = {
  icon: IconType;
  tone: PillTone;
  children: ReactNode;
};

function StatusPill({ icon: Icon, tone, children }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-label-xs',
        PILL_TONE_CLASSES[tone]
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  );
}

type UsageLimitsStatusPillsProps = {
  alertsEnabled: boolean;
  pauseAtLimit: boolean;
  isPaused: boolean;
  canConfigure: boolean;
  onConfigure: () => void;
};

export function UsageLimitsStatusPills({
  alertsEnabled,
  pauseAtLimit,
  isPaused,
  canConfigure,
  onConfigure,
}: UsageLimitsStatusPillsProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill icon={RiNotification3Line} tone="neutral">
          Usage alerts: {alertsEnabled ? 'On' : 'Off'}
        </StatusPill>
        {isPaused ? (
          <StatusPill icon={RiCloseCircleLine} tone="error">
            Paused
          </StatusPill>
        ) : (
          <StatusPill icon={RiPauseCircleLine} tone={pauseAtLimit ? 'warning' : 'neutral'}>
            Pause at limit: {pauseAtLimit ? 'On' : 'Off'}
          </StatusPill>
        )}
      </div>
      {canConfigure && (
        <Button variant="secondary" mode="outline" size="xs" onClick={onConfigure}>
          Configure
        </Button>
      )}
    </div>
  );
}
