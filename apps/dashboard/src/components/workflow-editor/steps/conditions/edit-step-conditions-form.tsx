import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ContentIssueEnum, type StepUpdateDto } from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  defaultRuleProcessorJsonLogic,
  formatQuery,
  generateID,
  RQBJsonLogic,
  RuleGroupType,
  RuleType,
} from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { z } from 'zod';

import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import { isRelativeDateOperator } from '@/components/conditions-editor/field-type-operators';
import { Form, FormField } from '@/components/primitives/form/form';
import { updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import {
  countConditions,
  getUniqueFieldNamespaces,
  getUniqueOperators,
  parseJsonLogicOptions,
} from '@/utils/conditions';
import { type EnhancedLiquidVariable } from '@/utils/parseStepVariables';
import { TelemetryEvent } from '@/utils/telemetry';
import { EditStepConditionsLayout } from './edit-step-conditions-layout';

const PAYLOAD_FIELD_PREFIX = 'payload.';
const SUBSCRIBER_DATA_FIELD_PREFIX = 'subscriber.data.';
const CONTEXT_FIELD_PREFIX = 'context.';

// Custom rule processor to handle relative date operators
const customRuleProcessor = (rule: RuleType, options: any) => {
  // Handle relative date operators
  if (isRelativeDateOperator(rule.operator)) {
    try {
      const parsedValue = JSON.parse(rule.value as string);

      if (
        parsedValue &&
        (typeof parsedValue.amount === 'number' || typeof parsedValue.amount === 'string') &&
        parsedValue.unit
      ) {
        const result = {
          [rule.operator]: [{ var: rule.field }, parsedValue],
        };

        return result;
      }
    } catch (error) {
      console.warn('Failed to parse relative date value:', rule.value, error);
    }
  }

  // Fall back to the default rule processor for all other operators
  return defaultRuleProcessorJsonLogic(rule, options);
};

const getRuleSchema = (
  fields: Array<{ value: string }>,
  isAllowedVariableFn: (variable: { name: string }) => boolean
): z.ZodType<RuleType | RuleGroupType> => {
  const allowedFields = fields.map((field) => field.value);

  return z.union([
    z
      .looseObject({
        field: z.string().min(1),
        operator: z.string(),
        value: z.string().nullable(),
      })
      .superRefine(({ field, operator, value }, ctx) => {
        if (operator === 'between' || operator === 'notBetween') {
          const values = value?.split(',').filter((val) => val.trim() !== '');

          if (!values || values.length !== 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Both values are required', path: ['value'] });
          }
        } else if (isRelativeDateOperator(operator)) {
          // Validate relative date values
          if (!value) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount and unit are required', path: ['value'] });

            return;
          }

          try {
            const parsed = JSON.parse(value);

            if (
              !parsed ||
              (!parsed.amount && parsed.amount !== 0) ||
              !['minutes', 'hours', 'days', 'weeks', 'months', 'years'].includes(parsed.unit)
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid amount or time unit',
                path: ['value'],
              });
            }
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid relative date format',
              path: ['value'],
            });
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
        const isContextField = field.startsWith(CONTEXT_FIELD_PREFIX) && field.length > CONTEXT_FIELD_PREFIX.length;

        // Context fields use additionalProperties schema pattern instead of explicit properties,
        // so they don't appear in allowedFields and need validation with isAllowedVariable
        // Example: 'context.<anything>.id' or 'context.<anything>.data' are valid, but 'context.<anything>.invalid' is not
        const isValidContextField = isContextField ? isAllowedVariableFn({ name: field }) : false;

        const shouldAddError =
          !allowedFields.includes(field) && !isPayloadField && !isSubscriberDataField && !isValidContextField;

        if (shouldAddError) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Value is not valid', path: ['field'] });
        }
      }),
    z.looseObject({
      combinator: z.string(),
      rules: z.array(z.lazy(() => getRuleSchema(fields, isAllowedVariableFn))),
    }),
  ]);
};

type FormQuery = {
  query: RuleGroupType;
};

const getConditionsSchema = (
  fields: Array<{ value: string }>,
  isAllowedVariableFn: (variable: { name: string }) => boolean
) => {
  return z.object({
    query: z
      .object({
        combinator: z.string(),
        rules: z.array(getRuleSchema(fields, isAllowedVariableFn)),
      })
      .passthrough(),
  });
};

export const EditStepConditionsForm = () => {
  const track = useTelemetry();
  const { workflow, step, update, digestStepBeforeCurrent } = useWorkflow();
  const hasConditions = !!step?.controls.values.skip;
  const query = useMemo(
    () =>
      // Need to generate unique ids on the query and rules, otherwise react-querybuilder's
      // QueryBuilder component will do it and it will result in the form being dirty
      hasConditions
        ? parseJsonLogic(step.controls.values.skip as RQBJsonLogic, {
            generateIDs: true,
            ...parseJsonLogicOptions,
          })
        : { id: generateID(), combinator: 'and', rules: [] },
    [hasConditions, step]
  );

  const { variables, isAllowedVariable, enhancedVariables, namespaces } = useParseVariables(
    step?.variables,
    digestStepBeforeCurrent?.stepId,
    true
  );

  const isVariableAllowedInConditions = (variable: EnhancedLiquidVariable): boolean => {
    // Filter out top-level namespace variables (subscriber, payload, steps)
    // Users should use specific properties within these namespaces instead
    const isTopLevelNamespace = namespaces.some((ns) => ns.name === variable.name);

    if (isTopLevelNamespace && variable.name !== 'subscriber.data') {
      return false;
    }

    // Filter out digest summary variables (these are processed variables with filters)
    // We want to hide the raw digest variables that have type 'digest'
    if (variable.type === 'digest') {
      return false;
    }

    return true;
  };

  const filteredEnhancedVariables = enhancedVariables.filter(isVariableAllowedInConditions);

  const fields = filteredEnhancedVariables.map((enhancedVariable: EnhancedLiquidVariable) => ({
    name: enhancedVariable.name,
    label: enhancedVariable.displayLabel || enhancedVariable.name,
    value: enhancedVariable.name,
    dataType: enhancedVariable.dataType,
    inputType: enhancedVariable.inputType,
    format: enhancedVariable.format,
  }));

  const form = useForm({
    mode: 'onSubmit',
    resolver: standardSchemaResolver(getConditionsSchema(fields, isAllowedVariable)),
    defaultValues: {
      query: query as unknown as z.infer<ReturnType<typeof getConditionsSchema>>['query'],
    },
  });

  const { onBlur, saveForm } = useFormAutosave({
    previousData: {
      query: query as unknown as z.infer<ReturnType<typeof getConditionsSchema>>['query'],
    },
    form,
    shouldClientValidate: true,
    save: (data) => {
      if (!step || !workflow) return;

      const skip = formatQuery(data.query as unknown as RuleGroupType, {
        format: 'jsonlogic',
        ruleProcessor: customRuleProcessor,
      });
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
      form.reset(data);
    },
  });

  // Run saveForm on unmount
  const saveFormRef = useDataRef(saveForm);
  useEffect(() => {
    return () => {
      saveFormRef.current();
    };
  }, [saveFormRef]);

  useEffect(() => {
    if (!step) return;

    const stepConditionIssues = step.issues?.controls?.skip;

    if (stepConditionIssues && stepConditionIssues.length > 0) {
      stepConditionIssues.forEach((issue) => {
        const queryPath = 'query.rules.' + issue.variableName?.split('.').join('.rules.');

        if (issue.issueType === ContentIssueEnum.MISSING_VALUE) {
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
          stepName={step?.name}
          onBlur={onBlur}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <ConditionsEditor
                saveForm={saveForm}
                query={field.value as RuleGroupType}
                onQueryChange={field.onChange}
                fields={fields}
                variables={variables}
                isAllowedVariable={isAllowedVariable}
                enhancedVariables={filteredEnhancedVariables}
              />
            )}
          />
        </EditStepConditionsLayout>
      </Form>
    </>
  );
};
