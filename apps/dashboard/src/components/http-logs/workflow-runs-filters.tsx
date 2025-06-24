import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { cn } from '@/utils/ui';
import { HTMLAttributes, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiLoader4Line } from 'react-icons/ri';
import { defaultWorkflowRunsFilter } from './hooks/use-workflow-runs-url-state';
import { ActivityFilters } from '@/api/activity';
import { useFetchWorkflows } from '@/hooks/use-fetch-workflows';

export type WorkflowRunsFiltersProps = HTMLAttributes<HTMLDivElement> & {
  onFiltersChange: (filter: ActivityFilters) => void;
  filterValues: ActivityFilters;
  onReset?: () => void;
  isFetching?: boolean;
};

export function WorkflowRunsFilters(props: WorkflowRunsFiltersProps) {
  const { onFiltersChange, filterValues, onReset, className, isFetching, ...rest } = props;
  const { data: workflowTemplates } = useFetchWorkflows({ limit: 100 });

  const form = useForm<ActivityFilters>({
    values: filterValues,
    defaultValues: {
      ...filterValues,
    },
  });
  const { formState, watch } = form;

  useEffect(() => {
    const subscription = watch((value) => {
      onFiltersChange(value as ActivityFilters);
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
    filterValues.channels?.length ||
    filterValues.workflows?.length ||
    filterValues.subscriberId !== '';

  return (
    <div className={cn('flex items-center gap-2 px-2.5 py-1.5', className)} {...rest}>
      <Form {...form}>
        <FormRoot className="flex items-center gap-2">
          <FormField
            control={form.control}
            name="workflows"
            render={({ field }) => (
              <FormItem className="relative">
                <FacetedFormFilter
                  type="multi"
                  size="small"
                  title="Workflows"
                  options={
                    workflowTemplates?.workflows?.map((workflow) => ({
                      label: workflow.name,
                      value: workflow._id,
                    })) || []
                  }
                  selected={field.value || []}
                  onSelect={field.onChange}
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
            name="subscriberId"
            render={({ field }) => (
              <FormItem className="relative">
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Subscriber ID"
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
