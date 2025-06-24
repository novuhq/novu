import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { HTMLAttributes, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiLoader4Line, RiArrowDownSLine, RiCalendarLine, RiStarSLine } from 'react-icons/ri';
import { WorkflowRunsFilter, defaultWorkflowRunsFilter } from './hooks/use-workflow-runs-url-state';

export type WorkflowRunsFiltersProps = HTMLAttributes<HTMLDivElement> & {
  onFiltersChange: (filter: WorkflowRunsFilter) => void;
  filterValues: WorkflowRunsFilter;
  onReset?: () => void;
  isFetching?: boolean;
};

const statusOptions = [
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Success', value: 'success' },
  { label: 'Error', value: 'error' },
];

const timePeriodOptions = [
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '60D', value: '60d' },
  { label: '90D', value: '90d' },
];

const channelOptions = [
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'Push', value: 'push' },
  { label: 'In-App', value: 'in_app' },
  { label: 'Chat', value: 'chat' },
];

export function WorkflowRunsFilters(props: WorkflowRunsFiltersProps) {
  const { onFiltersChange, filterValues, onReset, className, isFetching, ...rest } = props;

  const form = useForm<WorkflowRunsFilter>({
    values: filterValues,
    defaultValues: {
      ...filterValues,
    },
  });
  const { formState, watch } = form;

  useEffect(() => {
    const subscription = watch((value) => {
      onFiltersChange(value as WorkflowRunsFilter);
    });

    return () => subscription.unsubscribe();
  }, [watch, onFiltersChange]);

  const handleReset = () => {
    form.reset(defaultWorkflowRunsFilter);
    onFiltersChange(defaultWorkflowRunsFilter);
    onReset?.();
  };

  const isResetButtonVisible =
    formState.isDirty ||
    filterValues.search !== '' ||
    filterValues.status?.length ||
    filterValues.company !== '' ||
    filterValues.timePeriod !== '60d' ||
    filterValues.channels?.length ||
    filterValues.transactionId !== '' ||
    filterValues.subscriberId !== '';

  return (
    <div className={cn('flex items-center gap-2 px-2.5 py-1.5', className)} {...rest}>
      <Form {...form}>
        <FormRoot className="flex items-center gap-2">
          {/* Time Period and Status Button Group */}
          <div className="flex rounded-lg border border-neutral-200 bg-white">
            <FormField
              control={form.control}
              name="timePeriod"
              render={({ field }) => (
                <FormItem className="relative">
                  <Button
                    type="button"
                    variant="secondary"
                    mode="ghost"
                    size="2xs"
                    className={cn(
                      'h-8 rounded-r-none border-0 border-r border-neutral-200 px-3 text-xs font-normal',
                      'hover:bg-neutral-50'
                    )}
                  >
                    <RiCalendarLine className="mr-1 h-3 w-3" />
                    {field.value || '60D'}
                    <RiArrowDownSLine className="ml-1 h-3 w-3" />
                  </Button>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        mode="ghost"
                        size="2xs"
                        className={cn('h-8 rounded-l-none border-0 px-3 text-xs font-normal', 'hover:bg-neutral-50')}
                      >
                        <RiStarSLine className="mr-1 h-3 w-3" />
                        {field.value?.length ? `${field.value.length} selected` : 'All status'}
                        <RiArrowDownSLine className="ml-1 h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0" align="start">
                      <div className="p-2">
                        {statusOptions.map((option) => (
                          <div
                            key={option.value}
                            className="flex cursor-pointer items-center rounded p-2 hover:bg-neutral-50"
                            onClick={() => {
                              const currentValues = field.value || [];
                              const newValues = currentValues.includes(option.value)
                                ? currentValues.filter((v) => v !== option.value)
                                : [...currentValues, option.value];
                              field.onChange(newValues);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={field.value?.includes(option.value) || false}
                              readOnly
                              className="mr-2"
                            />
                            <span className="text-sm">{option.label}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
          </div>

          {/* Individual Filters with Dashed Borders */}
          <FormField
            control={form.control}
            name="search"
            render={({ field }) => (
              <FormItem className="relative">
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Workflows"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search workflows..."
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channels"
            render={({ field }) => (
              <FormItem className="relative">
                <FacetedFormFilter
                  type="multi"
                  size="small"
                  title="Channels"
                  options={[
                    { label: 'Email', value: 'email' },
                    { label: 'SMS', value: 'sms' },
                    { label: 'Push', value: 'push' },
                    { label: 'In-App', value: 'in_app' },
                    { label: 'Chat', value: 'chat' },
                  ]}
                  selected={field.value || []}
                  onSelect={field.onChange}
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
                  title="TransactionId"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search by transaction ID..."
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
                  title="SubscriberId"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search by subscriber ID..."
                />
              </FormItem>
            )}
          />

          {isResetButtonVisible && (
            <div className="flex items-center gap-1">
              <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset}>
                Reset
              </Button>
              {isFetching && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
            </div>
          )}
        </FormRoot>
      </Form>
    </div>
  );
}
