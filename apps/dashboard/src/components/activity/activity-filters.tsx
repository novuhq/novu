import { Badge } from '@/components/primitives/badge';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ActivityFiltersData } from '@/types/activity';
import { buildActivityDateFilters } from '@/utils/activityFilters';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { useOrganization } from '@clerk/clerk-react';
import { ChannelTypeEnum } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { CHANNEL_OPTIONS } from './constants';
import { IS_SELF_HOSTED } from '../../config';

type Fields = 'dateRange' | 'workflows' | 'channels' | 'transactionId' | 'subscriberId' | 'topicKey';

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
          className="block flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          <Badge color="purple" size="sm" variant="lighter">
            Upgrade
          </Badge>
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

  const maxActivityFeedRetentionOptions = useMemo(() => {
    const missingSubscription = !subscription && !IS_SELF_HOSTED;

    if (!organization || missingSubscription) {
      return [];
    }

    return buildActivityDateFilters({
      organization,
      apiServiceLevel: subscription?.apiServiceLevel,
    }).map((option) => ({
      ...option,
      icon: option.disabled ? UpgradeCtaIcon : undefined,
    }));
  }, [organization, subscription]);

  return (
    <div className={cn('flex items-center gap-2 pb-2.5', className)}>
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
          placeholder="Search by full Transaction ID"
        />
      )}

      {!hide.includes('subscriberId') && (
        <FacetedFormFilter
          type="text"
          size="small"
          title="Subscriber ID"
          value={filters.subscriberId}
          onChange={(value) => onFiltersChange({ ...filters, subscriberId: value })}
          placeholder="Search by full Subscriber ID"
        />
      )}

      {!hide.includes('topicKey') && (
        <FacetedFormFilter
          type="text"
          size="small"
          title="Topic Key"
          value={filters.topicKey}
          onChange={(value) => onFiltersChange({ ...filters, topicKey: value })}
          placeholder="Search by full Topic Key"
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
