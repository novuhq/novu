import { useOrganization } from '@clerk/clerk-react';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, SeverityLevelEnum } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { useDebouncedForm } from '@/hooks/use-debounced-form';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ActivityFiltersData } from '@/types/activity';
import { buildActivityDateFilters } from '@/utils/activityFilters';
import { ROUTES } from '@/utils/routes';
import { capitalize } from '@/utils/string';
import { cn } from '@/utils/ui';
import { IS_SELF_HOSTED } from '../../config';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { ContextFilter } from '../contexts/context-filter';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '../primitives/form/form';
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
  defaultContextOnClear = false,
}: ActivityFilters) {
  const { data: workflowTemplates } = useFetchWorkflows({ limit: 100 });
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();
  const isSubscriptionPreferencesEnabled = useFeatureFlag(
    FeatureFlagsKeysEnum.IS_SUBSCRIPTION_PREFERENCES_ENABLED,
    false
  );

  const form = useForm<ActivityFiltersData>({
    values: filters,
    defaultValues: filters,
  });
  const { watch, setValue } = form;

  useDebouncedForm(watch, onFiltersChange, 400);

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
                <FacetedFormFilter
                  size="small"
                  type="single"
                  hideClear
                  hideSearch
                  hideTitle
                  title="Time period"
                  options={maxActivityFeedRetentionOptions}
                  selected={[field.value]}
                  onSelect={(values) => setValue('dateRange', values[0])}
                  icon={CalendarIcon}
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
                  options={CHANNEL_OPTIONS}
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
