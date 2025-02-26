import { zodResolver } from '@hookform/resolvers/zod';
import { StepContentIssueEnum, type StepUpdateDto } from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { formatQuery, prepareRuleGroup, RQBJsonLogic, RuleGroupType, RuleType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { z } from 'zod';

import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import { Form, FormField } from '@/components/primitives/form/form';
import { updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useTelemetry } from '@/hooks/use-telemetry';
import { countConditions, getUniqueFieldNamespaces, getUniqueOperators } from '@/utils/conditions';
import { parseStepVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { TelemetryEvent } from '@/utils/telemetry';
import { EditStepConditionsLayout } from './edit-step-conditions-layout';

const PAYLOAD_FIELD_PREFIX = 'payload.';
const SUBSCRIBER_DATA_FIELD_PREFIX = 'subscriber.data.';

const getRuleSchema = (fields: Array<{ value: string }>): z.ZodType<RuleType | RuleGroupType> => {
  const allowedFields = fields.map((field) => field.value);

  return z.union([
    z
      .object({
        field: z.string().min(1),
        operator: z.string(),
        value: z.string().nullable(),
      })
      .passthrough()
      .superRefine(({ field, operator, value }, ctx) => {
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

        const isPayloadField = field.startsWith(PAYLOAD_FIELD_PREFIX) && field.length > PAYLOAD_FIELD_PREFIX.length;
        const isSubscriberDataField =
          field.startsWith(SUBSCRIBER_DATA_FIELD_PREFIX) && field.length > SUBSCRIBER_DATA_FIELD_PREFIX.length;

        if (!allowedFields.includes(field) && !isPayloadField && !isSubscriberDataField) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Value is not valid', path: ['field'] });
        }
      }),
    z
      .object({
        combinator: z.string(),
        rules: z.array(z.lazy(() => getRuleSchema(fields))),
      })
      .passthrough(),
  ]);
};

type FormQuery = {
  query: RuleGroupType;
};

const getConditionsSchema = (fields: Array<{ value: string }>): z.ZodType<FormQuery> => {
  return z.object({
    query: z
      .object({
        combinator: z.string(),
        rules: z.array(getRuleSchema(fields)),
      })
      .passthrough(),
  });
};

export const EditStepConditionsForm = () => {
  const track = useTelemetry();
  const { workflow, step, update } = useWorkflow();
  const hasConditions = !!step?.controls.values.skip;
  const query = useMemo(
    () =>
      // prepareRuleGroup and parseJsonLogic calls are needed to generate the unique ids on the query and rules,
      // otherwise the lib will do it and it will result in the form being dirty
      hasConditions
        ? prepareRuleGroup(parseJsonLogic(step.controls.values.skip as RQBJsonLogic))
        : prepareRuleGroup({ combinator: 'and', rules: [] }),
    [hasConditions, step]
  );

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

  const form = useForm<FormQuery>({
    mode: 'onSubmit',
    resolver: zodResolver(getConditionsSchema(fields)),
    defaultValues: {
      query,
    },
  });
  const { formState } = form;

  const onSubmit = (values: z.infer<ReturnType<typeof getConditionsSchema>>) => {
    if (!step || !workflow) return;

    const skip = formatQuery(values.query, 'jsonlogic');
    const updateStepData: Partial<StepUpdateDto> = {
      controlValues: { ...step.controls.values, skip },
    };

    if (!skip) {
      updateStepData.controlValues!.skip = null;
    }

    update(updateStepInWorkflow(workflow, step.stepId, updateStepData), {
      onSuccess: () => {
        const uniqueFieldTypes: string[] = getUniqueFieldNamespaces(skip);
        const uniqueOperators: string[] = getUniqueOperators(skip);

        if (!hasConditions) {
          track(TelemetryEvent.STEP_CONDITIONS_ADDED, {
            stepType: step.type,
            fieldTypes: uniqueFieldTypes,
            operators: uniqueOperators,
          });
        } else {
          const oldConditionsCount = countConditions(step.controls.values.skip as RQBJsonLogic);
          const newConditionsCount = countConditions(skip);

          track(TelemetryEvent.STEP_CONDITIONS_UPDATED, {
            stepType: step.type,
            fieldTypes: uniqueFieldTypes,
            operators: uniqueOperators,
            type: newConditionsCount < oldConditionsCount ? 'deletion' : 'update',
          });
        }
      },
    });
    form.reset(values);
  };

  useEffect(() => {
    if (!step) return;

    const stepConditionIssues = step.issues?.controls?.skip;

    if (stepConditionIssues && stepConditionIssues.length > 0) {
      stepConditionIssues.forEach((issue) => {
        const queryPath = 'query.rules.' + issue.variableName?.split('.').join('.rules.');

        if (issue.issueType === StepContentIssueEnum.MISSING_VALUE) {
          form.setError(`${queryPath}.value` as keyof typeof form.formState.errors, {
            message: issue.message,
          });
        } else {
          form.setError(`${queryPath}.field` as keyof typeof form.formState.errors, {
            message: issue.message,
          });
        }
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
    </>
  );
};
