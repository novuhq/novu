import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiInputField, RiShieldUserLine } from 'react-icons/ri';
import type { RuleGroupType } from 'react-querybuilder';
import { type AgentResponse, getAgentDetailQueryKey, updateAgent } from '@/api/agents';
import {
  ACCESS_RULE_POLARITIES,
  ACCESS_RULE_STARTING_POINTS,
  ACCESS_RULE_VARIABLES,
  type AccessRuleDraft,
  type AccessRulePolarity,
  accessRuleFormSchema,
  getAccessRuleFieldIssue,
  hasConditions,
  parseAccessRule,
  startFrom,
  toAccessRule,
  usesContext,
} from '@/components/agents/agent-access-rule';
import {
  SUBSCRIBER_ACCESS_MODE_SETTING_LABEL,
  SUBSCRIBER_ACCESS_MODES,
} from '@/components/agents/subscriber-access-copy';
import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import {
  createEmptyConditionsQuery,
  mergeConditionVariables,
  toConditionField,
} from '@/components/conditions-editor/conditions-variables';
import { UneditableRuleNotice } from '@/components/conditions-editor/uneditable-rule-notice';
import { Button } from '@/components/primitives/button';
import { Form, FormField } from '@/components/primitives/form/form';
import { Panel, PanelContent, PanelHeader } from '@/components/primitives/panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { NonModalSheet, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useContextTypeVariables } from '@/hooks/use-context-type-variables';

const isAllowedVariable = (variable: { name: string }) => getAccessRuleFieldIssue(variable.name) === null;

// The form schema types the query as a plain object, which an interface such as RuleGroupType only matches once spread.
const toFormValues = ({ polarity, query }: AccessRuleDraft) => ({ polarity, query: { ...query } });

const CONTEXT_PLATFORMS_WARNING =
  'Context is only known on Slack, Teams, Telegram and web chat. On WhatsApp, SMS, iMessage and email, conditions on context never match.';

function StartingPoints({ onPick }: { onPick: (point: (typeof ACCESS_RULE_STARTING_POINTS)[number]) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text-soft text-label-xs font-medium uppercase">Start from</span>
      <div className="flex flex-wrap gap-1.5">
        {ACCESS_RULE_STARTING_POINTS.map((point) => (
          <Button
            key={point.label}
            type="button"
            variant="secondary"
            mode="outline"
            size="2xs"
            onClick={() => onPick(point)}
          >
            <span className="text-text-soft">{ACCESS_RULE_POLARITIES[point.polarity].label} ·</span> {point.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

type AgentAccessRuleSheetProps = {
  agent: AgentResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly: boolean;
};

export function AgentAccessRuleSheet({ agent, open, onOpenChange, readOnly }: AgentAccessRuleSheetProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const contextTypeVariables = useContextTypeVariables();
  const variables = useMemo(
    () => mergeConditionVariables([...ACCESS_RULE_VARIABLES, ...contextTypeVariables]),
    [contextTypeVariables]
  );
  const fields = useMemo(() => variables.map(toConditionField), [variables]);

  const savedRule = agent.behavior?.accessRule;
  const [savedDraft] = useState(() => parseAccessRule(savedRule));
  const isEditable = !readOnly && savedDraft !== null;

  const form = useForm({
    mode: 'onSubmit',
    resolver: standardSchemaResolver(accessRuleFormSchema),
    defaultValues: toFormValues(savedDraft ?? { polarity: 'allow', query: createEmptyConditionsQuery() }),
  });
  const polarity = form.watch('polarity');
  const query = form.watch('query') as RuleGroupType;
  const queryError = form.formState.errors.query?.message;
  const emptyRuleError = typeof queryError === 'string' ? queryError : undefined;

  const { mutate, isPending, error } = useMutation({
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

  const save = form.handleSubmit((draft) => {
    const accessRule = toAccessRule(draft as AccessRuleDraft, variables);

    if (accessRule) mutate(accessRule);
  });

  return (
    <NonModalSheet open={open} onOpenChange={onOpenChange} className="w-full sm:max-w-[600px]">
      <header className="flex h-12 w-full shrink-0 items-center gap-2.5 border-b py-4 pl-3 pr-12">
        <RiShieldUserLine className="size-4" />
        <SheetTitle className="text-sm font-medium">{SUBSCRIBER_ACCESS_MODE_SETTING_LABEL}</SheetTitle>
      </header>
      <VisuallyHidden>
        <SheetDescription>{SUBSCRIBER_ACCESS_MODES.rule.description}</SheetDescription>
      </VisuallyHidden>

      <Form {...form}>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-5">
          {savedDraft === null ? (
            <UneditableRuleNotice rule={savedRule} />
          ) : (
            <>
              {isEditable && !hasConditions(query) && (
                <StartingPoints
                  onPick={(point) => form.reset(toFormValues(startFrom(point)), { keepDefaultValues: true })}
                />
              )}
              <Panel className="overflow-initial">
                <PanelHeader>
                  <RiInputField className="text-feature size-4" />
                  <FormField
                    control={form.control}
                    name="polarity"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                        <SelectTrigger size="2xs" className="w-auto gap-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ACCESS_RULE_POLARITIES) as AccessRulePolarity[]).map((value) => (
                            <SelectItem key={value} value={value}>
                              {ACCESS_RULE_POLARITIES[value].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <span className="text-neutral-950">subscribers where</span>
                </PanelHeader>
                <PanelContent className="flex flex-col gap-2 border-solid">
                  <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                      <ConditionsEditor
                        query={field.value as RuleGroupType}
                        onQueryChange={field.onChange}
                        fields={fields}
                        variables={variables}
                        enhancedVariables={variables}
                        isAllowedVariable={isAllowedVariable}
                        saveForm={() => undefined}
                        disabled={!isEditable}
                        allowDynamicValues={false}
                      />
                    )}
                  />
                </PanelContent>
              </Panel>
              <p className="text-foreground-400 text-xs">{ACCESS_RULE_POLARITIES[polarity].outcome}</p>
              {usesContext(query) && <p className="text-foreground-400 text-xs">{CONTEXT_PLATFORMS_WARNING}</p>}
            </>
          )}
        </div>
      </Form>

      <div className="bg-background flex shrink-0 items-center justify-end gap-2 border-t p-3">
        {(emptyRuleError || error) && (
          <p role="alert" className="text-destructive mr-auto text-xs">
            {emptyRuleError ?? error?.message}
          </p>
        )}
        <Button type="button" variant="secondary" mode="outline" onClick={() => onOpenChange(false)}>
          {isEditable ? 'Cancel' : 'Close'}
        </Button>
        {isEditable && (
          <Button type="button" onClick={save} isLoading={isPending}>
            Save rule
          </Button>
        )}
      </div>
    </NonModalSheet>
  );
}
