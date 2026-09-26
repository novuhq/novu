import { useOrganization } from '@clerk/react';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, SeverityLevelEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useDebouncedForm } from '@/hooks/use-debounced-form';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ActivityFiltersData } from '@/types/activity';
import { buildActivityDateFilters, getActivityFeedRetentionStart } from '@/utils/activityFilters';
import { isChannelVisibleInUi } from '@/utils/channels';
import { capitalize } from '@/utils/string';
import { cn } from '@/utils/ui';
import { IS_CLOUD } from '../../config';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { ContextFilter } from '../contexts/context-filter';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '../primitives/form/form';
import { ActivityDateRangeFilter } from './activity-date-range-filter';
import { CHANNEL_OPTIONS } from './constants';

type Fields =
  | 'dateRange'
  | 'workflows'
  | 'channels'
  | 'transactionId'
  | 'subscriberId'
  | 'topicKey'
  | 'subscriptionId'
  | 'severity'
  | 'contextKeys';

export type ActivityFilters = {
  filters: ActivityFiltersData;
  showReset?: boolean;
  onFiltersChange: (filters: ActivityFiltersData) => void;
  onReset?: () => void;
  hide?: Fields[];
  className?: string;
  defaultContextOnClear?: boolean;
};

export function ActivityFilters({
  onFiltersChange,
  filters,
  onReset,
  showReset = false,
  hide = [],
  className,
  defaultContextOnClear = false,
}: ActivityFilters) {
  const { data: workflowTemplates } = useFetchWorkflows({ limit: 100 });
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();
  const isSubscriptionPreferencesEnabled = useFeatureFlag(
    FeatureFlagsKeysEnum.IS_SUBSCRIPTION_PREFERENCES_ENABLED,
    false
  );
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);
  const channelOptions = useMemo(
    () => CHANNEL_OPTIONS.filter((option) => isChannelVisibleInUi(option.value, isToolChannelEnabled)),
    [isToolChannelEnabled]
  );
  const dateFilterConfig = useMemo(() => {
    if (!organization || (!subscription && IS_CLOUD)) {
      return { options: [], retentionStart: undefined };
    }

    return {
      options: buildActivityDateFilters({
        organization,
        apiServiceLevel: subscription?.apiServiceLevel,
      }),
      retentionStart: getActivityFeedRetentionStart({
        organization,
        apiServiceLevel: subscription?.apiServiceLevel,
      }),
    };
  }, [organization, subscription]);

  const form = useForm<ActivityFiltersData>({
    values: filters,
    defaultValues: filters,
  });
  const { watch, setValue } = form;

  useDebouncedForm(watch, onFiltersChange, 400);

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  return (
    <Form {...form}>
      <FormRoot className={cn('w-full flex flex-wrap items-center gap-2 pb-2.5', className)}>
        {!hide.includes('dateRange') && (
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem>
                <ActivityDateRangeFilter
                  value={field.value}
                  onChange={field.onChange}
                  presetOptions={dateFilterConfig.options}
                  retentionStart={dateFilterConfig.retentionStart}
                />
              </FormItem>
            )}
          />
        )}

        {!hide.includes('workflows') && (
          <FormField
            control={form.control}
            name="workflows"
            render={({ field }) => (
              <FormItem>
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
                  selected={field.value}
                  onSelect={(values) => setValue('workflows', values)}
                />
              </FormItem>
            )}
          />
        )}

        {!hide.includes('channels') && (
          <FormField
            control={form.control}
            name="channels"
            render={({ field }) => (
              <FormItem>
                <FacetedFormFilter
                  size="small"
                  type="multi"
                  title="Channels"
                  hideSearch
                  options={channelOptions}
                  selected={field.value}
                  onSelect={(values) => setValue('channels', values as ChannelTypeEnum[])}
                />
              </FormItem>
            )}
          />
        )}

        {!hide.includes('transactionId') && (
          <FormField
            control={form.control}
            name="transactionId"
            render={({ field }) => (
              <FormItem>
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Transaction ID"
                  value={field.value}
                  onChange={(value) => setValue('transactionId', value)}
                  placeholder="Search by full Transaction ID"
                />
              </FormItem>
            )}
          />
        )}

        {!hide.includes('subscriberId') && (
          <FormField
            control={form.control}
            name="subscriberId"
            render={({ field }) => (
              <FormItem>
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Subscriber ID"
                  value={field.value}
                  onChange={(value) => setValue('subscriberId', value)}
                  placeholder="Search by full Subscriber ID"
                />
              </FormItem>
            )}
          />
        )}

        {!hide.includes('topicKey') && (
          <FormField
            control={form.control}
            name="topicKey"
            render={({ field }) => (
              <FormItem>
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Topic Key"
                  value={field.value}
                  onChange={(value) => setValue('topicKey', value)}
                  placeholder="Search by full Topic Key"
                />
              </FormItem>
            )}
          />
        )}

        {isSubscriptionPreferencesEnabled && !hide.includes('subscriptionId') && (
          <FormField
            control={form.control}
            name="subscriptionId"
            render={({ field }) => (
              <FormItem>
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Subscription ID"
                  value={field.value}
                  onChange={(value) => setValue('subscriptionId', value)}
                  placeholder="Search by full Subscription ID"
                />
              </FormItem>
            )}
          />
        )}

        {!hide.includes('severity') && (
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FacetedFormFilter
                  size="small"
                  type="multi"
                  title="Severity"
                  hideSearch
                  options={Object.values(SeverityLevelEnum).map((severity) => ({
                    label: capitalize(severity),
                    value: severity,
                  }))}
                  selected={field.value}
                  onSelect={(values) => setValue('severity', values as SeverityLevelEnum[])}
                />
              </FormItem>
            )}
          />
        )}

        {!hide.includes('contextKeys') && (
          <FormField
            control={form.control}
            name="contextKeys"
            render={({ field }) => (
              <FormItem>
                <ContextFilter
                  contextKeys={field.value}
                  onContextKeysChange={field.onChange}
                  defaultOnClear={defaultContextOnClear}
                  size="small"
                />
              </FormItem>
            )}
          />
        )}

        {showReset && (
          <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset}>
            Reset
          </Button>
        )}
      </FormRoot>
    </Form>
  );
}
