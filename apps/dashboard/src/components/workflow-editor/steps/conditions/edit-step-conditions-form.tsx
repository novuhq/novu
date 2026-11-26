import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ContentIssueEnum, EnvironmentTypeEnum, type StepUpdateDto } from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { formatQuery, generateID, RQBJsonLogic, RuleGroupType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';

import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import { getConditionsSchema } from '@/components/conditions-editor/conditions-schema';
import { Form, FormField } from '@/components/primitives/form/form';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import {
  countConditions,
  customRuleProcessor,
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

function hasFieldSuffix(field: string, prefix: string): boolean {
  return field.startsWith(prefix) && field.length > prefix.length;
}

function isRuleFieldAllowed(
  field: string,
  allowedFields: string[],
  isAllowedVariableFn: (variable: { name: string }) => boolean
): boolean {
  if (allowedFields.includes(field)) return true;
  if (hasFieldSuffix(field, PAYLOAD_FIELD_PREFIX)) return true;
  if (hasFieldSuffix(field, SUBSCRIBER_DATA_FIELD_PREFIX)) return true;

  // Context fields use additionalProperties schema pattern instead of explicit properties,
  // so they don't appear in allowedFields and need validation with isAllowedVariable
  // Example: 'context.<anything>.id' or 'context.<anything>.data' are valid, but 'context.<anything>.invalid' is not
  return hasFieldSuffix(field, CONTEXT_FIELD_PREFIX) && isAllowedVariableFn({ name: field });
}

export const EditStepConditionsForm = () => {
  const track = useTelemetry();
  const { workflow, step, update, digestStepBeforeCurrent } = useWorkflow();
  const { currentEnvironment, readOnly } = useEnvironment();
  const isReadOnly = readOnly || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;
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
    resolver: standardSchemaResolver(
      getConditionsSchema((field) =>
        isRuleFieldAllowed(
          field,
          fields.map(({ value }) => value),
          isAllowedVariable
        )
      )
    ),
    defaultValues: {
      query: { ...query },
    },
  });

  const { onBlur, saveForm } = useFormAutosave({
    previousData: {
      query: { ...query },
    },
    form,
    shouldClientValidate: true,
    save: (data) => {
      if (isReadOnly) return;
      if (!step || !workflow) return;

      const skip = formatQuery(data.query, {
        format: 'jsonlogic',
        ruleProcessor: customRuleProcessor,
      });
      const updateStepData: Partial<StepUpdateDto> = {
        controlValues: { ...step.controls.values, skip: skip || null },
      };

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
              valueInput={ControlInput}
              disabled={isReadOnly}
            />
          )}
        />
      </EditStepConditionsLayout>
    </Form>
  );
};
