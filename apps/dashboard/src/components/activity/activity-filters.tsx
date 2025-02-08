import { ChannelTypeEnum } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem } from '../primitives/form/form';

export type ActivityFilters = {
  onFiltersChange: (filters: ActivityFiltersData) => void;
  initialValues: ActivityFiltersData;
  onReset?: () => void;
};

export type ActivityFiltersData = {
  dateRange: string;
  channels: ChannelTypeEnum[];
  workflows: string[];
  transactionId: string;
  subscriberId: string;
};

const DATE_RANGE_OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const CHANNEL_OPTIONS = [
  { value: ChannelTypeEnum.SMS, label: 'SMS' },
  { value: ChannelTypeEnum.EMAIL, label: 'Email' },
  { value: ChannelTypeEnum.IN_APP, label: 'In-App' },
  { value: ChannelTypeEnum.PUSH, label: 'Push' },
  { value: ChannelTypeEnum.CHAT, label: 'Chat' },
];

export const defaultActivityFilters: ActivityFiltersData = {
  dateRange: '30d',
  channels: [],
  workflows: [],
  transactionId: '',
  subscriberId: '',
} as const;

export function ActivityFilters({ onFiltersChange, initialValues, onReset }: ActivityFilters) {
  const form = useForm<ActivityFiltersData>({
    defaultValues: initialValues || defaultActivityFilters,
  });

  const watchedValues = form.watch();

  const hasChanges = useMemo(() => {
    return (
      watchedValues.dateRange !== defaultActivityFilters.dateRange ||
      watchedValues.channels.length > 0 ||
      watchedValues.workflows.length > 0 ||
      watchedValues.transactionId !== defaultActivityFilters.transactionId ||
      watchedValues.subscriberId !== defaultActivityFilters.subscriberId
    );
  }, [watchedValues]);

  const { data: workflowTemplates } = useFetchWorkflows({ limit: 100 });

  useEffect(() => {
    const subscription = form.watch((value) => {
      onFiltersChange(value as ActivityFiltersData);
    });

    return () => subscription.unsubscribe();
  }, [form, onFiltersChange]);

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const handleReset = () => {
    form.reset(defaultActivityFilters);
    onFiltersChange(defaultActivityFilters);
    onReset?.();
  };

  return (
    <Form {...form}>
      <form className="flex items-center gap-2 p-2 py-[11px]">
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FacetedFormFilter
                size="small"
                type="single"
                hideClear
                hideSearch
                hideTitle
                title="Time period"
                options={DATE_RANGE_OPTIONS}
                selected={[field.value]}
                onSelect={(values) => field.onChange(values[0])}
                icon={CalendarIcon}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workflows"
          render={({ field }) => (
            <FormItem className="space-y-0">
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
                onSelect={(values) => field.onChange(values)}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="channels"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FacetedFormFilter
                size="small"
                type="multi"
                title="Channels"
                options={CHANNEL_OPTIONS}
                selected={field.value}
                onSelect={(values) => field.onChange(values)}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transactionId"
          render={({ field }) => (
            <FormItem className="relative">
              <FacetedFormFilter
                type="text"
                size="small"
                title="Transaction ID"
                value={field.value}
                onChange={field.onChange}
                placeholder="Search by Transaction ID"
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subscriberId"
          render={({ field }) => (
            <FormItem className="relative">
              <FacetedFormFilter
                type="text"
                size="small"
                title="Subscriber ID"
                value={field.value}
                onChange={field.onChange}
                placeholder="Search by Subscriber ID"
              />
            </FormItem>
          )}
        />

        {hasChanges && (
          <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset}>
            Reset
          </Button>
        )}
      </form>
    </Form>
  );
}
