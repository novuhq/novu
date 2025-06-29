import jsonLogic, { AdditionalOperation, RulesLogic } from 'json-logic-js';

type RangeValidation =
  | {
      isValid: true;
      min: number;
      max: number;
    }
  | {
      isValid: false;
    };

type StringValidation =
  | {
      isValid: true;
      input: string;
      value: string;
    }
  | {
      isValid: false;
    };

type BooleanValidation =
  | {
      isValid: true;
      input: boolean;
    }
  | {
      isValid: false;
    };

type RelativeDateValidation =
  | {
      isValid: true;
      amount: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
    }
  | {
      isValid: false;
    };

function validateStringInput(dataInput: unknown, ruleValue: unknown): StringValidation {
  if (typeof dataInput !== 'string' || typeof ruleValue !== 'string') {
    return { isValid: false };
  }

  return { isValid: true, input: dataInput, value: ruleValue };
}

function validateRangeInput(dataInput: unknown, ruleValue: unknown): RangeValidation {
  if (!Array.isArray(ruleValue) || ruleValue.length !== 2) {
    return { isValid: false };
  }

  if (typeof dataInput !== 'number') {
    return { isValid: false };
  }

  const [min, max] = ruleValue;
  const valid = typeof min === 'number' && typeof max === 'number';

  return { isValid: valid, min, max };
}

function validateBooleanInput(dataInput: unknown): BooleanValidation {
  if (typeof dataInput !== 'boolean' && dataInput !== 'true' && dataInput !== 'false') {
    return { isValid: false };
  }

  return { isValid: true, input: typeof dataInput === 'boolean' ? dataInput : dataInput === 'true' };
}

function validateRelativeDateInput(ruleValue: unknown): RelativeDateValidation {
  if (typeof ruleValue !== 'object' || ruleValue === null) {
    return { isValid: false };
  }

  const value = ruleValue as { amount?: unknown; unit?: unknown };
  if (typeof value.amount !== 'number' || value.amount <= 0) {
    return { isValid: false };
  }

  const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months', 'years'];
  if (typeof value.unit !== 'string' || !validUnits.includes(value.unit)) {
    return { isValid: false };
  }

  return {
    isValid: true,
    amount: value.amount,
    unit: value.unit as 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years',
  };
}

function calculateRelativeDate(amount: number, unit: string, fromDate = new Date()): Date {
  const date = new Date(fromDate);

  switch (unit) {
    case 'minutes':
      date.setMinutes(date.getMinutes() - amount);
      break;
    case 'hours':
      date.setHours(date.getHours() - amount);
      break;
    case 'days':
      date.setDate(date.getDate() - amount);
      break;
    case 'weeks':
      date.setDate(date.getDate() - amount * 7);
      break;
    case 'months':
      date.setMonth(date.getMonth() - amount);
      break;
    case 'years':
      date.setFullYear(date.getFullYear() - amount);
      break;
    default:
      // fallback to days if unit is not recognized
      date.setDate(date.getDate() - amount);
      break;
  }

  return date;
}

function getToleranceMs(unit: string): number {
  switch (unit) {
    case 'minutes':
      return 60 * 1000; // ±1 minute tolerance
    case 'hours':
      return 60 * 60 * 1000; // ±1 hour tolerance
    case 'days':
    case 'weeks':
    case 'months':
      return 24 * 60 * 60 * 1000; // ±1 day tolerance
    case 'years':
      return 7 * 24 * 60 * 60 * 1000; // ±1 week tolerance
    default:
      return 24 * 60 * 60 * 1000; // default to 1 day
  }
}

function validateComparison(
  a: unknown,
  b: unknown
): { isValid: true; a: number | string | boolean; b: number | string | boolean } | { isValid: false } {
  // handle boolean values and string representations of booleans
  const booleanA = validateBooleanInput(a);
  const booleanB = validateBooleanInput(b);
  if (booleanA.isValid && booleanB.isValid) {
    return { isValid: true, a: booleanA.input, b: booleanB.input };
  }

  // try to convert to numbers if possible
  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    return { isValid: true, a: numA, b: numB };
  }

  // handle dates
  if (typeof a === 'string' && typeof b === 'string') {
    const dateA = new Date(a);
    const dateB = new Date(b);

    if (!Number.isNaN(dateA.getTime()) && !Number.isNaN(dateB.getTime())) {
      return { isValid: true, a: dateA.getTime(), b: dateB.getTime() };
    }
  }

  return { isValid: false };
}

function createStringOperator(evaluator: (input: string, value: string) => boolean) {
  return (dataInput: unknown, ruleValue: unknown): boolean => {
    const validation = validateStringInput(dataInput, ruleValue);
    if (!validation.isValid) return false;

    return evaluator(validation.input, validation.value);
  };
}

const initializeCustomOperators = (): void => {
  jsonLogic.add_operation('=', (dataInput: unknown, ruleValue: unknown): boolean => {
    const result = jsonLogic.apply({ '==': [dataInput, ruleValue] }, {});

    return typeof result === 'boolean' ? result : false;
  });

  jsonLogic.add_operation(
    'startsWith',
    createStringOperator((input, value) => input.startsWith(value))
  );

  jsonLogic.add_operation(
    'endsWith',
    createStringOperator((input, value) => input.endsWith(value))
  );

  jsonLogic.add_operation(
    'contains',
    createStringOperator((input, value) => input.includes(value))
  );

  jsonLogic.add_operation(
    'doesNotContain',
    createStringOperator((input, value) => !input.includes(value))
  );

  jsonLogic.add_operation(
    'doesNotBeginWith',
    createStringOperator((input, value) => !input.startsWith(value))
  );

  jsonLogic.add_operation(
    'doesNotEndWith',
    createStringOperator((input, value) => !input.endsWith(value))
  );

  jsonLogic.add_operation('null', (dataInput: unknown): boolean => dataInput === null);

  jsonLogic.add_operation('notNull', (dataInput: unknown): boolean => dataInput !== null);

  jsonLogic.add_operation(
    'notIn',
    (dataInput: unknown, ruleValue: unknown[]): boolean => Array.isArray(ruleValue) && !ruleValue.includes(dataInput)
  );

  jsonLogic.add_operation('between', (dataInput, ruleValue) => {
    const validation = validateRangeInput(dataInput, ruleValue);

    if (!validation.isValid) {
      return false;
    }

    return dataInput >= validation.min && dataInput <= validation.max;
  });

  jsonLogic.add_operation('notBetween', (dataInput, ruleValue) => {
    const validation = validateRangeInput(dataInput, ruleValue);

    if (!validation.isValid) {
      return false;
    }

    return dataInput < validation.min || dataInput > validation.max;
  });

  jsonLogic.rm_operation('<');
  jsonLogic.add_operation('<', (a: unknown, b: unknown) => {
    const validation = validateComparison(a, b);
    if (!validation.isValid) return false;

    return validation.a < validation.b;
  });

  jsonLogic.rm_operation('>');
  jsonLogic.add_operation('>', (a: unknown, b: unknown) => {
    const validation = validateComparison(a, b);
    if (!validation.isValid) return false;

    return validation.a > validation.b;
  });

  jsonLogic.rm_operation('<=');
  jsonLogic.add_operation('<=', (first: unknown, second: unknown, third?: unknown) => {
    // handle three argument case (typically used in between operations)
    if (third !== undefined) {
      const validation1 = validateComparison(first, second);
      const validation2 = validateComparison(second, third);
      if (!validation1.isValid || !validation2.isValid) return false;

      return validation1.a <= validation1.b && validation1.b <= validation2.b;
    }

    const validation = validateComparison(first, second);
    if (!validation.isValid) return false;

    return validation.a <= validation.b;
  });

  jsonLogic.rm_operation('>=');
  jsonLogic.add_operation('>=', (a: unknown, b: unknown) => {
    const validation = validateComparison(a, b);
    if (!validation.isValid) return false;

    return validation.a >= validation.b;
  });

  jsonLogic.rm_operation('==');
  jsonLogic.add_operation('==', (a: unknown, b: unknown) => {
    const validation = validateComparison(a, b);
    if (!validation.isValid) {
      // fall back to strict equality for other types
      return a === b;
    }

    return validation.a === validation.b;
  });

  jsonLogic.rm_operation('!=');
  jsonLogic.add_operation('!=', (a: unknown, b: unknown) => {
    const validation = validateComparison(a, b);
    if (!validation.isValid) {
      // fall back to strict inequality for other types
      return a !== b;
    }

    return validation.a !== validation.b;
  });

  jsonLogic.add_operation('moreThanXAgo', (dataInput: unknown, ruleValue: unknown): boolean => {
    const validation = validateRelativeDateInput(ruleValue);
    if (!validation.isValid) return false;

    const inputDate = new Date(dataInput as string);
    if (Number.isNaN(inputDate.getTime())) return false;

    const targetDate = calculateRelativeDate(validation.amount, validation.unit);

    return inputDate < targetDate;
  });

  jsonLogic.add_operation('lessThanXAgo', (dataInput: unknown, ruleValue: unknown): boolean => {
    const validation = validateRelativeDateInput(ruleValue);
    if (!validation.isValid) return false;

    const inputDate = new Date(dataInput as string);
    if (Number.isNaN(inputDate.getTime())) return false;

    const targetDate = calculateRelativeDate(validation.amount, validation.unit);

    return inputDate >= targetDate;
  });

  jsonLogic.add_operation('withinLast', (dataInput: unknown, ruleValue: unknown): boolean => {
    const validation = validateRelativeDateInput(ruleValue);
    if (!validation.isValid) return false;

    const inputDate = new Date(dataInput as string);
    if (Number.isNaN(inputDate.getTime())) return false;

    const targetDate = calculateRelativeDate(validation.amount, validation.unit);
    const now = new Date();

    return inputDate >= targetDate && inputDate <= now;
  });

  jsonLogic.add_operation('notWithinLast', (dataInput: unknown, ruleValue: unknown): boolean => {
    const validation = validateRelativeDateInput(ruleValue);
    if (!validation.isValid) return false;

    const inputDate = new Date(dataInput as string);
    if (Number.isNaN(inputDate.getTime())) return false;

    const targetDate = calculateRelativeDate(validation.amount, validation.unit);

    return inputDate < targetDate;
  });

  jsonLogic.add_operation('exactlyXAgo', (dataInput: unknown, ruleValue: unknown): boolean => {
    const validation = validateRelativeDateInput(ruleValue);
    if (!validation.isValid) return false;

    const inputDate = new Date(dataInput as string);
    if (Number.isNaN(inputDate.getTime())) return false;

    const targetDate = calculateRelativeDate(validation.amount, validation.unit);
    const tolerance = getToleranceMs(validation.unit);

    return Math.abs(inputDate.getTime() - targetDate.getTime()) <= tolerance;
  });
};

initializeCustomOperators();

export function evaluateRules(
  rule: RulesLogic<AdditionalOperation>,
  data: unknown,
  safe = false
): { result: boolean; error: string | undefined } {
  try {
    return { result: jsonLogic.apply(rule, data), error: undefined };
  } catch (error) {
    if (safe) {
      return { result: false, error };
    }

    throw new Error(`Failed to evaluate rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isValidRule(rule: RulesLogic<AdditionalOperation>): boolean {
  try {
    return jsonLogic.is_logic(rule);
  } catch {
    return false;
  }
}

export function extractFieldsFromRules(rules: RulesLogic<AdditionalOperation>): string[] {
  const variables = new Set<string>();

  const collectVariables = (node: RulesLogic<AdditionalOperation>) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    const entries = Object.entries(node);

    for (const [key, value] of entries) {
      if (key === 'var' && typeof value === 'string') {
        variables.add(value);
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object') {
            collectVariables(item);
          }
        });
        continue;
      }

      if (typeof value === 'object') {
        collectVariables(value as RulesLogic<AdditionalOperation>);
      }
    }
  };

  collectVariables(rules);

  return Array.from(variables);
}
