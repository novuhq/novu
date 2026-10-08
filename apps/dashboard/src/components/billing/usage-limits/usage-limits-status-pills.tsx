import { RiCloseCircleLine, RiNotification3Line, RiPauseCircleLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { StatusBadge, StatusBadgeIcon } from '@/components/primitives/status-badge';
import type { UsageLimitsView } from './usage-limits-view';
import { useUsageLimitsDrawerParam } from './use-usage-limits-drawer-param';

type UsageLimitsStatusPillsProps = {
  view: UsageLimitsView;
};

export function UsageLimitsStatusPills({ view }: UsageLimitsStatusPillsProps) {
  const { setIsDrawerRequested } = useUsageLimitsDrawerParam();
  const { settings, usage, canEdit } = view;
  const { pauseAtLimit } = settings;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge>
          <StatusBadgeIcon as={RiNotification3Line} />
          Usage alerts: {settings.alerts.enabled ? 'On' : 'Off'}
        </StatusBadge>
        {usage.state === 'paused' ? (
          <StatusBadge variant="light" status="failed">
            <StatusBadgeIcon as={RiCloseCircleLine} />
            Paused
          </StatusBadge>
        ) : (
          <StatusBadge variant={pauseAtLimit ? 'light' : 'stroke'} status={pauseAtLimit ? 'pending' : 'disabled'}>
            <StatusBadgeIcon as={RiPauseCircleLine} />
            Pause at limit: {pauseAtLimit ? 'On' : 'Off'}
          </StatusBadge>
        )}
      </div>
      {canEdit && (
        <Button variant="secondary" mode="outline" size="xs" onClick={() => setIsDrawerRequested(true)}>
          Configure
        </Button>
      )}
    </div>
  );
}
