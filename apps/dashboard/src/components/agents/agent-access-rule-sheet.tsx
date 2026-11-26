import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiInputField, RiShieldUserLine } from 'react-icons/ri';
import type { RuleGroupType } from 'react-querybuilder';
import { type AgentResponse, getAgentDetailQueryKey, updateAgent } from '@/api/agents';
import {
  ACCESS_RULE_SUBSCRIBER_VARIABLES,
  getAccessRuleFieldIssue,
  getAccessRuleOperatorIssue,
  parseAccessRule,
  toAccessRule,
} from '@/components/agents/agent-access-rule';
import { SUBSCRIBER_ACCESS_MODES } from '@/components/agents/subscriber-access-copy';
import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import { getConditionsSchema } from '@/components/conditions-editor/conditions-schema';
import { mergeIntegrationConditionVariables } from '@/components/integrations/utils/integration-conditions';
import { Button } from '@/components/primitives/button';
import { Form, FormField } from '@/components/primitives/form/form';
import { Panel, PanelContent, PanelHeader } from '@/components/primitives/panel';
import { NonModalSheet, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useContextTypeVariables } from '@/hooks/use-context-type-variables';
import { useDataRef } from '@/hooks/use-data-ref';

const conditionsSchema = getConditionsSchema({
  getFieldIssue: getAccessRuleFieldIssue,
  getOperatorIssue: getAccessRuleOperatorIssue,
});

const isAllowedVariable = (variable: { name: string }) => getAccessRuleFieldIssue(variable.name) === null;

type AgentAccessRuleSheetProps = {
  agent: AgentResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly: boolean;
};

/** Saving switches the agent to `rule` access with the edited rule; closing without saving changes nothing. */
export function AgentAccessRuleSheet({ agent, open, onOpenChange, readOnly }: AgentAccessRuleSheetProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const contextTypeVariables = useContextTypeVariables();
  const variables = useMemo(
    () => mergeIntegrationConditionVariables([...ACCESS_RULE_SUBSCRIBER_VARIABLES, ...contextTypeVariables]),
    [contextTypeVariables]
  );
  const fields = useMemo(
    () =>
      variables.map((variable) => ({
        name: variable.name,
        label: variable.displayLabel || variable.name,
        value: variable.name,
        dataType: variable.dataType,
      })),
    [variables]
  );

  const form = useForm({
    mode: 'onSubmit',
    resolver: standardSchemaResolver(conditionsSchema),
    defaultValues: { query: { ...parseAccessRule(agent.behavior?.accessRule) } },
  });
  const [emptyRuleError, setEmptyRuleError] = useState(false);

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: (accessRule: Record<string, unknown>) =>
      updateAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        behavior: { subscriberAccess: 'rule', accessRule },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agent.identifier),
      });
      onOpenChange(false);
    },
  });

  const savedRuleRef = useDataRef(agent.behavior?.accessRule);
  useEffect(() => {
    if (!open) return;

    form.reset({ query: { ...parseAccessRule(savedRuleRef.current) } });
    setEmptyRuleError(false);
    reset();
  }, [open, form, savedRuleRef, reset]);

  const save = form.handleSubmit(({ query }) => {
    const accessRule = toAccessRule(query as RuleGroupType, variables);

    if (!accessRule) {
      setEmptyRuleError(true);

      return;
    }

    mutate(accessRule);
  });

  return (
    <NonModalSheet open={open} onOpenChange={onOpenChange} className="w-full sm:max-w-[600px]">
      <header className="flex h-12 w-full shrink-0 items-center gap-2.5 border-b py-4 pl-3 pr-12">
        <RiShieldUserLine className="size-4" />
        <SheetTitle className="text-sm font-medium">Access rule</SheetTitle>
      </header>
      <SheetDescription className="px-3 pt-3">{SUBSCRIBER_ACCESS_MODES.rule.description}</SheetDescription>

      <Form {...form}>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-5">
          <Panel className="overflow-initial">
            <PanelHeader>
              <RiInputField className="text-feature size-4" />
              <span className="text-neutral-950">Accept messages when</span>
            </PanelHeader>
            <PanelContent className="flex flex-col gap-2 border-solid">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <ConditionsEditor
                    query={field.value as RuleGroupType}
                    onQueryChange={(query) => {
                      setEmptyRuleError(false);
                      field.onChange(query);
                    }}
                    fields={fields}
                    variables={variables}
                    enhancedVariables={variables}
                    isAllowedVariable={isAllowedVariable}
                    saveForm={() => undefined}
                    disabled={readOnly}
                  />
                )}
              />
            </PanelContent>
          </Panel>
          <p className="text-foreground-400 text-xs">
            Senders who are not subscribers are always denied. On <code>subscriber.data</code>, equals matches text and
            true/false. To compare a stored number, use greater than or less than.
          </p>
        </div>
      </Form>

      <div className="bg-background flex shrink-0 items-center justify-end gap-2 border-t p-3">
        {(emptyRuleError || error) && (
          <p role="alert" className="text-destructive mr-auto text-xs">
            {emptyRuleError ? 'Add at least one condition.' : error?.message}
          </p>
        )}
        <Button type="button" variant="secondary" mode="outline" onClick={() => onOpenChange(false)}>
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && (
          <Button type="button" onClick={save} isLoading={isPending}>
            Save rule
          </Button>
        )}
      </div>
    </NonModalSheet>
  );
}
