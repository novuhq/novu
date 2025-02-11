import { CalendarIcon } from 'lucide-react';
import { ChannelTypeEnum } from '@novu/shared';

import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { CHANNEL_OPTIONS, DATE_RANGE_OPTIONS } from './constants';
import { ActivityFiltersData } from '@/types/activity';
import { cn } from '@/utils/ui';

type Fields = 'dateRange' | 'workflows' | 'channels' | 'transactionId' | 'subscriberId';

export type ActivityFilters = {
  filters: ActivityFiltersData;
  showReset?: boolean;
  onFiltersChange: (filters: ActivityFiltersData) => void;
  onReset?: () => void;
  hide?: Fields[];
  className?: string;
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
          options={DATE_RANGE_OPTIONS}
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
