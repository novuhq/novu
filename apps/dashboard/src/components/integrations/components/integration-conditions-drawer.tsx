import { IMessageFilter } from '@novu/shared';
import { useCallback, useState } from 'react';
import { Control, UseFormSetValue, useForm, useWatch } from 'react-hook-form';
import { RiArrowRightSLine, RiGuideFill, RiInputField } from 'react-icons/ri';
import { formatQuery, RQBJsonLogic, RuleGroupType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Button } from '@/components/primitives/button';
import { Form, FormField } from '@/components/primitives/form/form';
import { Panel, PanelContent, PanelHeader } from '@/components/primitives/panel';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { useDataRef } from '@/hooks/use-data-ref';
import { countConditions, customRuleProcessor, parseJsonLogicOptions } from '@/utils/conditions';
import { cn } from '@/utils/ui';
import { IntegrationFormData } from '../types';
import {
  countLegacyIntegrationConditions,
  createEmptyConditionsQuery,
  INTEGRATION_CONDITION_FIELDS,
  INTEGRATION_CONDITION_VARIABLES,
  isAllowedIntegrationConditionVariable,
} from '../utils/integration-conditions';
import { IntegrationConditionValueInput } from './integration-condition-value-input';

const SIDEPANEL_ACTION_ROW_CLASS = 'flex h-12 w-full justify-start gap-1.5 rounded-none px-3 text-xs font-medium';

type IntegrationConditionsDrawerProps = {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  legacyConditions?: IMessageFilter[];
  isReadOnly?: boolean;
};

type ConditionsFormValues = {
  query: RuleGroupType;
};

function queryToRules(query: RuleGroupType): Record<string, unknown> | null {
  if (!query.rules.length) {
    return null;
  }

  const logic = formatQuery(query, {
    format: 'jsonlogic',
    ruleProcessor: customRuleProcessor,
  });

  if (!logic || typeof logic !== 'object') {
    return null;
  }

  return logic as Record<string, unknown>;
}

export function IntegrationConditionsDrawer({
  control,
  setValue,
  legacyConditions,
  isReadOnly,
}: IntegrationConditionsDrawerProps) {
  const rules = useWatch({ control, name: 'rules' });
  const primary = useWatch({ control, name: 'primary' });
  const integrationName = useWatch({ control, name: 'name' });
  const rulesRef = useDataRef(rules);
  const legacyConditionsCount = countLegacyIntegrationConditions(legacyConditions);
  const buildQuery = useCallback(() => {
    if (rulesRef.current) {
      return parseJsonLogic(rulesRef.current as RQBJsonLogic, {
        generateIDs: true,
        ...parseJsonLogicOptions,
      });
    }

    return createEmptyConditionsQuery();
  }, [rulesRef]);

  const form = useForm<ConditionsFormValues>({
    defaultValues: {
      query: buildQuery(),
    },
  });
  const [isOpen, setIsOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<RuleGroupType | null>(null);

  const query = form.watch('query');
  const conditionsCount = rules ? countConditions(rules as RQBJsonLogic) : legacyConditionsCount;

  const applyQuery = (nextQuery: RuleGroupType, unsetPrimary = false) => {
    form.setValue('query', nextQuery);
    setValue('rules', queryToRules(nextQuery), { shouldDirty: true });

    if (unsetPrimary) {
      setValue('primary', false, { shouldDirty: true });
    }
  };

  const handleQueryChange = (nextQuery: RuleGroupType) => {
    const addingConditionsWhilePrimary = primary && nextQuery.rules.length > 0 && query.rules.length === 0;

    if (addingConditionsWhilePrimary) {
      setPendingQuery(nextQuery);

      return;
    }

    applyQuery(nextQuery);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      form.reset({ query: buildQuery() });
    }

    setIsOpen(open);
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        mode="ghost"
        className={cn(SIDEPANEL_ACTION_ROW_CLASS, 'border-t border-stroke-soft')}
        leadingIcon={RiGuideFill}
        trailingIcon={RiArrowRightSLine}
        onClick={() => handleOpenChange(true)}
      >
        Integration conditions
        <span className="text-text-soft ml-auto">{conditionsCount > 0 ? conditionsCount : ''}</span>
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-[600px]">
          <header className="flex h-12 w-full shrink-0 items-center gap-2.5 border-b py-4 pl-3 pr-12">
            <RiGuideFill className="size-4" />
            <SheetTitle className="text-sm font-medium">Integration conditions</SheetTitle>
          </header>
          <VisuallyHidden>
            <SheetDescription>
              Conditions that decide when this integration is selected to deliver a notification.
            </SheetDescription>
          </VisuallyHidden>

          <Form {...form}>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-5">
              <Panel className="overflow-initial">
                <PanelHeader>
                  <RiInputField className="text-feature size-4" />
                  <span className="text-neutral-950">Conditions for {integrationName || 'this integration'}</span>
                </PanelHeader>
                <PanelContent className="flex flex-col gap-2 border-solid">
                  <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                      <ConditionsEditor
                        query={field.value}
                        onQueryChange={handleQueryChange}
                        fields={INTEGRATION_CONDITION_FIELDS}
                        variables={INTEGRATION_CONDITION_VARIABLES}
                        enhancedVariables={INTEGRATION_CONDITION_VARIABLES}
                        isAllowedVariable={isAllowedIntegrationConditionVariable}
                        valueInput={IntegrationConditionValueInput}
                        saveForm={() => undefined}
                        disabled={isReadOnly}
                      />
                    )}
                  />
                </PanelContent>
              </Panel>
              <p className="text-foreground-400 text-xs">
                When a notification is sent, the first active integration whose conditions match is used. If none match,
                the primary integration is used.
              </p>
              {!rules && legacyConditionsCount > 0 && (
                <p className="text-warning-base text-xs">
                  This integration still uses {legacyConditionsCount} legacy condition
                  {legacyConditionsCount === 1 ? '' : 's'} at send time. Saving new conditions here replaces them.
                </p>
              )}
            </div>
          </Form>

          <div className="bg-background flex shrink-0 justify-end border-t p-3">
            <Button type="button" onClick={() => setIsOpen(false)}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationModal
        open={pendingQuery !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingQuery(null);
          }
        }}
        onConfirm={() => {
          if (pendingQuery) {
            applyQuery(pendingQuery, true);
          }

          setPendingQuery(null);
        }}
        title="Remove primary integration?"
        description="An integration with conditions cannot be primary. Saving these conditions will unset this integration as primary."
        confirmButtonText="Continue"
      />
    </>
  );
}
