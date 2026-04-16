import { useOrganization } from '@clerk/clerk-react';
import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useDebouncedForm } from '@/hooks/use-debounced-form';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ConversationFiltersData } from '@/types/conversation';
import { buildActivityDateFilters } from '@/utils/activityFilters';
import { cn } from '@/utils/ui';
import { IS_SELF_HOSTED } from '../../config';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '../primitives/form/form';
import { PROVIDER_OPTIONS } from './constants';

type ConversationFiltersProps = {
  filters: ConversationFiltersData;
  showReset?: boolean;
  onFiltersChange: (filters: ConversationFiltersData) => void;
  onReset?: () => void;
  className?: string;
};

export function ConversationFilters({
  onFiltersChange,
  filters,
  onReset,
  showReset = false,
  className,
}: ConversationFiltersProps) {
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();

  const form = useForm<ConversationFiltersData>({
    values: filters,
    defaultValues: filters,
  });
  const { watch, setValue } = form;

  useDebouncedForm(watch, onFiltersChange, 400);

  const dateFilterOptions = useMemo(() => {
    const missingSubscription = !subscription && !IS_SELF_HOSTED;

    if (!organization || missingSubscription) {
      return [];
    }

    return buildActivityDateFilters({
      organization,
      apiServiceLevel: subscription?.apiServiceLevel,
    });
  }, [organization, subscription]);

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  return (
    <Form {...form}>
      <FormRoot className={cn('flex w-full flex-wrap items-center gap-2 pb-2.5', className)}>
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
                options={dateFilterOptions}
                selected={[field.value]}
                onSelect={(values) => setValue('dateRange', values[0])}
                icon={CalendarIcon}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FacetedFormFilter
                size="small"
                type="multi"
                title="Provider"
                hideSearch
                options={PROVIDER_OPTIONS}
                selected={field.value}
                onSelect={(values) => setValue('provider', values)}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="conversationId"
          render={({ field }) => (
            <FormItem>
              <FacetedFormFilter
                type="text"
                size="small"
                title="Conversation ID"
                value={field.value}
                onChange={(value) => setValue('conversationId', value)}
                placeholder="Search by Conversation ID"
              />
            </FormItem>
          )}
        />

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
                placeholder="Search by Subscriber ID"
              />
            </FormItem>
          )}
        />

        {showReset && (
          <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset}>
            Reset
          </Button>
        )}
      </FormRoot>
    </Form>
  );
}
