import type { RuleGroupType, RuleType } from 'react-querybuilder';
import { z } from 'zod';
import { getArrayItemConditionIssue, isArrayItemOperator } from '@/components/conditions-editor/array-item-condition';
import { isRelativeDateOperator, isValuelessOperator } from '@/components/conditions-editor/field-type-operators';

const RELATIVE_DATE_UNITS = ['minutes', 'hours', 'days', 'weeks', 'months', 'years'];

function getRelativeDateValueIssue(value: string): string | null {
  try {
    const parsed = JSON.parse(value);

    if (!parsed || (!parsed.amount && parsed.amount !== 0) || !RELATIVE_DATE_UNITS.includes(parsed.unit)) {
      return 'Invalid amount or time unit';
    }

    return null;
  } catch {
    return 'Invalid relative date format';
  }
}

function getRuleValueIssue(operator: string, value: string | null): string | null {
  if (operator === 'between' || operator === 'notBetween') {
    const values = value?.split(',').filter((val) => val.trim() !== '');

    return !values || values.length !== 2 ? 'Both values are required' : null;
  }

  if (isRelativeDateOperator(operator)) {
    return value ? getRelativeDateValueIssue(value) : 'Amount and unit are required';
  }

  if (isArrayItemOperator(operator)) {
    return getArrayItemConditionIssue(value);
  }

  if (!isValuelessOperator(operator) && !value?.trim()) {
    return 'Value is required';
  }

  return null;
}

export type ConditionsSchemaOptions = {
  getFieldIssue: (field: string) => string | null;
  getOperatorIssue?: (rule: RuleType) => string | null;
};

function getRuleSchema(options: ConditionsSchemaOptions): z.ZodType<RuleType | RuleGroupType> {
  return z.union([
    z
      .looseObject({
        field: z.string().min(1, 'Field is required'),
        operator: z.string(),
        value: z.string().nullable(),
      })
      .superRefine((rule, ctx) => {
        const { field, operator, value } = rule;
        const valueIssue = options.getOperatorIssue?.(rule) ?? getRuleValueIssue(operator, value);

        if (valueIssue) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: valueIssue, path: ['value'] });

          if (isRelativeDateOperator(operator) && !value) return;
        }

        const fieldIssue = options.getFieldIssue(field);

        if (fieldIssue) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: fieldIssue, path: ['field'] });
        }
      }),
    z.looseObject({
      combinator: z.string(),
      rules: z.array(z.lazy(() => getRuleSchema(options))),
    }),
  ]);
}

export function getConditionsSchema(options: ConditionsSchemaOptions) {
  return z.object({
    query: z
      .object({
        combinator: z.string(),
        rules: z.array(getRuleSchema(options)),
      })
      .passthrough(),
  });
}
