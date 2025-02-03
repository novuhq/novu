import { useEffect, useMemo } from 'react';
import { useBlocker } from 'react-router-dom';
import { formatQuery, RQBJsonLogic, RuleGroupType, RuleType } from 'react-querybuilder';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { prepareRuleGroup } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import type { StepUpdateDto } from '@novu/shared';

import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import { Form, FormField } from '@/components/primitives/form/form';
import { parseStepVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { EditStepConditionsLayout } from './edit-step-conditions-layout';

const rulesSchema: z.ZodType<RuleType | RuleGroupType> = z.union([
  z
    .object({
      field: z.string().min(1),
      operator: z.string(),
      value: z.string().nullable(),
    })
    .passthrough()
    .superRefine(({ operator, value }, ctx) => {
      if (operator === 'between' || operator === 'notBetween') {
        const values = value?.split(',').filter((val) => val.trim() !== '');
        if (!values || values.length !== 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Both values are required', path: ['value'] });
        }
      } else if (operator !== 'null' && operator !== 'notNull') {
        const trimmedValue = value?.trim();
        if (!trimmedValue || trimmedValue.length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Value is required', path: ['value'] });
        }
      }
    }),
  z
    .object({
      combinator: z.string(),
      rules: z.array(z.lazy(() => rulesSchema)),
    })
    .passthrough(),
]);

type FormQuery = {
  query: RuleGroupType;
};

const conditionsSchema: z.ZodType<FormQuery> = z.object({
  query: z
    .object({
      combinator: z.string(),
      rules: z.array(rulesSchema),
    })
    .passthrough(),
});

export const EditStepConditionsForm = () => {
  const { workflow, step, update } = useWorkflow();
  const query = useMemo(
    () =>
      // prepareRuleGroup and parseJsonLogic calls are needed to generate the unique ids on the query and rules,
      // otherwise the lib will do it and it will result in the form being dirty
      step?.controls.values.skip
        ? prepareRuleGroup(parseJsonLogic(step.controls.values.skip as RQBJsonLogic))
        : prepareRuleGroup({ combinator: 'and', rules: [] }),
    [step]
  );
  const form = useForm<FormQuery>({
    mode: 'onSubmit',
    resolver: zodResolver(conditionsSchema),
    defaultValues: {
      query,
    },
  });
  const { formState } = form;
  const blocker = useBlocker(formState.isDirty);
  useBeforeUnload(formState.isDirty);

  const { fields, variables } = useMemo(() => {
    if (!step) return { fields: [], variables: [] };

    const parsedVariables = parseStepVariables(step.variables);
    return {
      fields: parsedVariables.primitives.map((primitive) => ({
        name: primitive.label,
        label: primitive.label,
        value: primitive.label,
      })),
      variables: [...parsedVariables.primitives, ...parsedVariables.namespaces],
    };
  }, [step]);

  const onSubmit = (values: z.infer<typeof conditionsSchema>) => {
    if (!step || !workflow) return;

    const skip = formatQuery(values.query, 'jsonlogic');
    const updateStepData: Partial<StepUpdateDto> = {
      controlValues: { ...step.controls.values, skip },
    };
    if (!skip) {
      updateStepData.controlValues!.skip = null;
    }

    update(updateStepInWorkflow(workflow, step.stepId, updateStepData));
    form.reset(values);
  };

  useEffect(() => {
    if (!step) return;

    const stepConditionIssues = step.issues?.controls?.skip;
    if (stepConditionIssues && stepConditionIssues.length > 0) {
      stepConditionIssues.forEach((issue) => {
        const queryPath = 'query.rules.' + issue.variableName?.split('.').join('.rules.') + '.value';
        form.setError(queryPath as keyof typeof form.formState.errors, {
          message: issue.message,
        });
      });
    }
  }, [form, step]);

  return (
    <>
      <Form {...form}>
        <EditStepConditionsLayout
          onSubmit={form.handleSubmit(onSubmit)}
          stepName={step?.name}
          disabled={!formState.isDirty}
        >
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <ConditionsEditor
                query={field.value}
                onQueryChange={field.onChange}
                fields={fields}
                variables={variables}
              />
            )}
          />
        </EditStepConditionsLayout>
      </Form>
      <UnsavedChangesAlertDialog blocker={blocker} />
    </>
  );
};
