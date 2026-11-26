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

export type IsRuleFieldAllowed = (field: string) => boolean;

function getRuleSchema(isFieldAllowed: IsRuleFieldAllowed): z.ZodType<RuleType | RuleGroupType> {
  return z.union([
    z
      .looseObject({
        field: z.string().min(1),
        operator: z.string(),
        value: z.string().nullable(),
      })
      .superRefine(({ field, operator, value }, ctx) => {
        const valueIssue = getRuleValueIssue(operator, value);

        if (valueIssue) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: valueIssue, path: ['value'] });

          // A relative date rule without a value skips the field check, as before
          if (isRelativeDateOperator(operator) && !value) return;
        }

        if (!isFieldAllowed(field)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Value is not valid', path: ['field'] });
        }
      }),
    z.looseObject({
      combinator: z.string(),
      rules: z.array(z.lazy(() => getRuleSchema(isFieldAllowed))),
    }),
  ]);
}

/** Form schema for `{ query }` edited by `ConditionsEditor`. Issue paths match the editor's `query.rules.N.field|value`. */
export function getConditionsSchema(isFieldAllowed: IsRuleFieldAllowed) {
  return z.object({
    query: z
      .object({
        combinator: z.string(),
        rules: z.array(getRuleSchema(isFieldAllowed)),
      })
      .passthrough(),
  });
}
