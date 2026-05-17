import { useOrganization } from '@clerk/clerk-react';
import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { getAgentsListQueryKey, listAgents } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useDebouncedForm } from '@/hooks/use-debounced-form';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { ConversationFiltersData } from '@/types/conversation';
import { buildActivityDateFilters } from '@/utils/activityFilters';
import { cn } from '@/utils/ui';
import { IS_SELF_HOSTED } from '../../config';
import { Button } from '../primitives/button';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '../primitives/form/form';
import { PROVIDER_OPTIONS } from './constants';

const AGENT_FILTER_LIMIT = 100;
const AGENT_FILTER_PARAMS = { after: undefined, before: undefined, limit: AGENT_FILTER_LIMIT, identifier: '' };

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
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const canReadAgents = has({ permission: PermissionsEnum.AGENT_READ });

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

  const agentsQuery = useQuery({
    queryKey: getAgentsListQueryKey(currentEnvironment?._id, AGENT_FILTER_PARAMS),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit: AGENT_FILTER_LIMIT,
        orderBy: 'updatedAt',
        orderDirection: DirectionEnum.DESC,
      }),
    enabled: Boolean(currentEnvironment) && canReadAgents,
    staleTime: 60_000,
  });

  const agentOptions = useMemo(() => {
    const agents = agentsQuery.data?.data ?? [];

    return agents.map((agent) => ({
      label: agent.name || agent.identifier,
      value: agent.identifier,
    }));
  }, [agentsQuery.data?.data]);

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

        {canReadAgents && (
          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FacetedFormFilter
                  size="small"
                  type="single"
                  title="Agent"
                  options={agentOptions}
                  selected={field.value ? [field.value] : []}
                  onSelect={(values) => setValue('agentId', values[0] ?? '')}
                  isLoading={agentsQuery.isLoading}
                />
              </FormItem>
            )}
          />
        )}

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
