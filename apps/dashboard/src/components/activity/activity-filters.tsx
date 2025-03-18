import { LockUpgrade } from '@/components/icons/lock-upgrade';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ActivityFiltersData } from '@/types/activity';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { useOrganization } from '@clerk/clerk-react';
import { ApiServiceLevelEnum, ChannelTypeEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { CHANNEL_OPTIONS, DATE_RANGE_OPTIONS } from './constants';

type Fields = 'dateRange' | 'workflows' | 'channels' | 'transactionId' | 'subscriberId';

export type ActivityFilters = {
  filters: ActivityFiltersData;
  showReset?: boolean;
  onFiltersChange: (filters: ActivityFiltersData) => void;
  onReset?: () => void;
  hide?: Fields[];
  className?: string;
};

const UpgradeCtaIcon: React.ComponentType<{ className?: string }> = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={ROUTES.SETTINGS_BILLING + '?utm_source=activity-feed-retention'}
          className="block transition-all duration-200 hover:scale-110"
        >
          <LockUpgrade className="h-4 w-4 text-neutral-300 hover:text-neutral-400" />
        </Link>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>Upgrade your plan to unlock extended retention periods</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
};

export function ActivityFilters({
  onFiltersChange,
  filters,
  onReset,
  showReset = false,
  hide = [],
  className,
}: ActivityFilters) {
  const { data: workflowTemplates } = useFetchWorkflows({ limit: 100 });
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();

  const maxActivityFeedRetentionMs = getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE,
    true
  );

  const maxActivityFeedRetentionOptions = DATE_RANGE_OPTIONS.map((option) => {
    const isLegacyFreeTier =
      subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE &&
      organization &&
      organization.createdAt < new Date('2025-02-28');

    // legacy free can go up to 30 days
    const legacyFreeMaxRetentionMs = 30 * 24 * 60 * 60 * 1000;
    const maxRetentionMs = isLegacyFreeTier ? legacyFreeMaxRetentionMs : maxActivityFeedRetentionMs;

    return {
      disabled: option.ms > maxRetentionMs,
      label: option.label,
      value: option.value,
      icon: option.ms > maxRetentionMs ? UpgradeCtaIcon : undefined,
    };
  });

  return (
    <div className={cn('flex items-center gap-2 p-2 py-[11px]', className)}>
      {!hide.includes('dateRange') && (
        <FacetedFormFilter
          size="small"
          type="single"
          hideClear
          hideSearch
          hideTitle
          title="Time period"
          options={maxActivityFeedRetentionOptions}
          selected={[filters.dateRange]}
          onSelect={(values) => onFiltersChange({ ...filters, dateRange: values[0] })}
          icon={CalendarIcon}
        />
      )}

      {!hide.includes('workflows') && (
        <FacetedFormFilter
          size="small"
          type="multi"
          title="Workflows"
          options={
            workflowTemplates?.workflows?.map((workflow) => ({
              label: workflow.name,
              value: workflow._id,
            })) || []
          }
          selected={filters.workflows}
          onSelect={(values) => onFiltersChange({ ...filters, workflows: values })}
        />
      )}

      {!hide.includes('channels') && (
        <FacetedFormFilter
          size="small"
          type="multi"
          title="Channels"
          options={CHANNEL_OPTIONS}
          selected={filters.channels}
          onSelect={(values) => onFiltersChange({ ...filters, channels: values as ChannelTypeEnum[] })}
        />
      )}

      {!hide.includes('transactionId') && (
        <FacetedFormFilter
          type="text"
          size="small"
          title="Transaction ID"
          value={filters.transactionId}
          onChange={(value) => onFiltersChange({ ...filters, transactionId: value })}
          placeholder="Search by Transaction ID"
        />
      )}

      {!hide.includes('subscriberId') && (
        <FacetedFormFilter
          type="text"
          size="small"
          title="Subscriber ID"
          value={filters.subscriberId}
          onChange={(value) => onFiltersChange({ ...filters, subscriberId: value })}
          placeholder="Search by Subscriber ID"
        />
      )}

      {showReset && (
        <Button variant="secondary" mode="ghost" size="2xs" onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  );
}
