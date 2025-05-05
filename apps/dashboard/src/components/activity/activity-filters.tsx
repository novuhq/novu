import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ActivityFiltersData } from '@/types/activity';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { useOrganization } from '@clerk/clerk-react';
import { ChannelTypeEnum } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/primitives/badge';
import { Link } from 'react-router-dom';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { CHANNEL_OPTIONS } from './constants';
import { buildActivityDateFilters } from '@/utils/activityFilters';
import { useMemo } from 'react';
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
    if (!organization || !subscription) {
      return [];
    }

    return buildActivityDateFilters({
      organization,
      subscription,
    }).map((option) => ({
      ...option,
      icon: option.disabled ? UpgradeCtaIcon : undefined,
    }));
  }, [organization, subscription]);

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
