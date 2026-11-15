import { useFormContext } from 'react-hook-form';
import { useValueEditor, ValueEditorProps } from 'react-querybuilder';
import {
  ARRAY_ITEM_COMPARISON_OPERATORS,
  ARRAY_ITEM_EXISTS_OPERATOR,
  type ArrayItemComparisonOperator,
  type ArrayItemCondition,
  isArrayItemOperator,
  parseArrayItemConditionValue,
  serializeArrayItemConditionValue,
} from '@/components/conditions-editor/array-item-condition';
import type { HelpTextInfo } from '@/components/conditions-editor/field-type-editors';
import { shouldUseRelativeDateEditor } from '@/components/conditions-editor/field-type-editors';
import { isValuelessOperator } from '@/components/conditions-editor/field-type-operators';
import { HelpIcon } from '@/components/conditions-editor/help-icon';
import type { ConditionsValueInput } from '@/components/conditions-editor/types';
import { VariableSelect } from '@/components/conditions-editor/variable-select';
import { Code2 } from '@/components/icons/code-2';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

type RelativeDateValue = {
  amount: number | string;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
};

type ExtendedContext = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  getPlaceholder?: (fieldName: string, operator: string) => string;
  getHelpText?: (fieldName: string, operator: string) => HelpTextInfo;
  getArrayItemPaths?: (fieldName: string) => string[];
  saveForm?: () => void;
  valueInput?: ConditionsValueInput;
};

const TIME_UNITS = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
  { value: 'months', label: 'months' },
  { value: 'years', label: 'years' },
] as const;

/**
 * Neutral default. The workflow editor injects `ControlInput`; integrations inject a
 * sized plain input. Do not default to workflow `ControlInput` here.
 */
const DefaultConditionsValueInput: ConditionsValueInput = ({ value, onChange, placeholder, disabled }) => {
  return (
    <InputPure
      className="text-paragraph-xs h-7 px-2"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

type BaseEditorProps = {
  value: string;
  onChange: (newValue: string) => void;
  placeholder: string;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  hasError: boolean;
  helpText: HelpTextInfo | null;
  errorMessage?: string;
  disabled?: boolean;
  ValueInput: ConditionsValueInput;
};

export const ValueEditor = (props: ValueEditorProps) => {
  const form = useFormContext();
  const queryPath = 'query.rules.' + props.path.join('.rules.') + '.value';
  const { error } = form.getFieldState(queryPath, form.formState);
  const {
    variables = [],
    isAllowedVariable,
    getPlaceholder,
    getHelpText,
    getArrayItemPaths,
    saveForm,
    valueInput: ValueInput = DefaultConditionsValueInput,
  } = (props.context as ExtendedContext) ?? {};
  const { value, handleOnChange, operator, field, disabled } = props;
  const { valueAsArray, multiValueHandler } = useValueEditor(props);
  const stringValue = typeof value === 'string' ? value : `${value}`;
  const stringValueAsArray = valueAsArray.map((v) => (typeof v === 'string' ? v : `${v}`));

  if (isValuelessOperator(operator)) {
    return null;
  }

  const placeholder = getPlaceholder ? getPlaceholder(field, operator) : 'value';
  const helpText = getHelpText ? getHelpText(field, operator) : null;
  const hasError = !!error;
  const isDisabled = !!disabled;

  if (shouldUseRelativeDateEditor(operator)) {
    return (
      <RelativeDateEditor
        value={stringValue}
        onChange={handleOnChange}
        variables={variables}
        isAllowedVariable={isAllowedVariable || (() => true)}
        hasError={hasError}
        helpText={helpText}
        errorMessage={error?.message}
        disabled={isDisabled}
        ValueInput={ValueInput}
      />
    );
  }

  if (isArrayItemOperator(operator)) {
    return (
      <ArrayItemConditionEditor
        value={stringValue}
        onChange={handleOnChange}
        itemPaths={getArrayItemPaths?.(field) ?? []}
        saveForm={saveForm}
        placeholder={placeholder}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        hasError={hasError}
        helpText={helpText}
        errorMessage={error?.message}
        disabled={isDisabled}
        ValueInput={ValueInput}
      />
    );
  }

  if (operator === 'between' || operator === 'notBetween') {
    return (
      <BetweenValueEditor
        valueAsArray={stringValueAsArray}
        multiValueHandler={multiValueHandler}
        placeholder={placeholder}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        hasError={hasError}
        helpText={helpText}
        errorMessage={error?.message}
        disabled={isDisabled}
        ValueInput={ValueInput}
      />
    );
  }

  return (
    <SingleValueEditor
      value={stringValue}
      onChange={handleOnChange}
      placeholder={placeholder}
      variables={variables}
      isAllowedVariable={isAllowedVariable}
      hasError={hasError}
      helpText={helpText}
      errorMessage={error?.message}
      disabled={isDisabled}
      ValueInput={ValueInput}
    />
  );
};

function SingleValueEditor({
  value,
  onChange,
  placeholder,
  variables,
  isAllowedVariable,
  hasError,
  helpText,
  errorMessage,
  disabled,
  ValueInput,
}: BaseEditorProps) {
  return (
    <InputRoot className="bg-bg-white w-48" hasError={hasError}>
      <InputWrapper className="gap-0 px-0">
        <ValueInput
          multiline={false}
          indentWithTab={false}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          size="3xs"
          disabled={disabled}
        />
        <HelpIcon hasError={hasError} errorMessage={errorMessage} helpText={helpText} />
      </InputWrapper>
    </InputRoot>
  );
}

function BetweenValueEditor({
  valueAsArray,
  multiValueHandler,
  placeholder,
  variables,
  isAllowedVariable,
  hasError,
  helpText,
  errorMessage,
  disabled,
  ValueInput,
}: {
  valueAsArray: string[];
  multiValueHandler: (value: string, index: number) => void;
  placeholder: string;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  hasError: boolean;
  helpText: HelpTextInfo | null;
  errorMessage?: string;
  disabled?: boolean;
  ValueInput: ConditionsValueInput;
}) {
  const [fromPlaceholder, toPlaceholder] = placeholder.split(',').map((p) => p.trim());

  const editors = ['from', 'to'].map((key, i) => {
    const hasInputError = hasError && !valueAsArray[i];
    const isLastInput = i === 1;

    return (
      <InputRoot key={key} className="bg-bg-white w-28" hasError={hasInputError}>
        <InputWrapper className="gap-0 px-0">
          <ValueInput
            multiline={false}
            indentWithTab={false}
            placeholder={i === 0 ? fromPlaceholder : toPlaceholder}
            value={valueAsArray[i] ?? ''}
            onChange={(newValue) => multiValueHandler(newValue, i)}
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            size="3xs"
            disabled={disabled}
          />
          {isLastInput && <HelpIcon hasError={hasError} errorMessage={errorMessage} helpText={helpText} />}
        </InputWrapper>
      </InputRoot>
    );
  });

  return (
    <div className="flex items-start gap-1">
      {editors[0]}
      <span className="text-foreground-600 text-paragraph-xs mt-1.5">and</span>
      {editors[1]}
    </div>
  );
}

function ArrayItemConditionEditor({
  value,
  onChange,
  itemPaths,
  saveForm,
  placeholder,
  variables,
  isAllowedVariable,
  hasError,
  helpText,
  errorMessage,
  disabled,
  ValueInput,
}: BaseEditorProps & {
  itemPaths: string[];
  saveForm?: () => void;
}) {
  const condition = parseArrayItemConditionValue(value);
  const hasComparison = condition.operator !== ARRAY_ITEM_EXISTS_OPERATOR;
  const itemPathOptions = itemPaths.map((path) => ({ label: path, value: path }));

  const updateCondition = (changes: Partial<ArrayItemCondition>) => {
    const nextCondition = { ...condition, ...changes };

    if (nextCondition.operator === ARRAY_ITEM_EXISTS_OPERATOR) {
      nextCondition.value = '';
    }

    onChange(serializeArrayItemConditionValue(nextCondition));
  };

  const helpIcon = <HelpIcon hasError={hasError} errorMessage={errorMessage} helpText={helpText} />;

  return (
    <div className="flex items-start gap-1">
      <VariableSelect
        className="w-44"
        leftIcon={<Code2 className="text-feature size-3 min-w-3" />}
        title="Item properties"
        placeholder={placeholder}
        options={itemPathOptions}
        value={condition.path}
        onChange={(path) => {
          if (path === condition.path) return;

          updateCondition({ path });
          saveForm?.();
        }}
        disabled={disabled}
        error={hasError && !condition.path.trim() ? errorMessage : undefined}
      />
      <Select
        value={condition.operator}
        onValueChange={(newOperator) => {
          updateCondition({ operator: newOperator as ArrayItemComparisonOperator });
          saveForm?.();
        }}
        disabled={disabled}
      >
        <SelectTrigger
          size="2xs"
          className="bg-background hover:bg-bg-weak hover:text-text-strong text-label-xs w-fit gap-1"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="text-label-xs max-h-48 min-w-18 gap-1">
          {ARRAY_ITEM_COMPARISON_OPERATORS.map((comparison) => (
            <SelectItem key={comparison.name} value={comparison.name} className="h-6">
              <span className="text-foreground-600 text-label-xs font-medium">{comparison.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasComparison ? (
        <InputRoot className="bg-bg-white w-32" hasError={hasError && !!condition.path.trim()}>
          <InputWrapper className="gap-0 px-0">
            <ValueInput
              multiline={false}
              indentWithTab={false}
              placeholder="value"
              value={condition.value}
              onChange={(newValue) => updateCondition({ value: newValue })}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              size="3xs"
              disabled={disabled}
            />
            {helpIcon}
          </InputWrapper>
        </InputRoot>
      ) : (
        <div className="flex h-7 items-center">{helpIcon}</div>
      )}
    </div>
  );
}

function RelativeDateEditor({
  value,
  onChange,
  variables,
  isAllowedVariable,
  hasError,
  helpText,
  errorMessage,
  disabled,
  ValueInput,
}: {
  value: string;
  onChange: (newValue: string) => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  hasError: boolean;
  helpText: HelpTextInfo | null;
  errorMessage?: string;
  disabled?: boolean;
  ValueInput: ConditionsValueInput;
}) {
  const parseRelativeDateValue = (val: string): RelativeDateValue => {
    let parsedValue: RelativeDateValue = { amount: '', unit: 'days' };

    if (!val) {
      return parsedValue;
    }

    try {
      if (typeof val === 'string') {
        // Try to parse as JSON first
        const parsed = JSON.parse(val);

        if (parsed && typeof parsed === 'object' && parsed.unit) {
          // Valid JSON object with unit property
          parsedValue = {
            amount: parsed.amount,
            unit: parsed.unit || 'days',
          };
        } else {
          // If parsed value is not a valid relative date object, treat as raw amount
          parsedValue = { amount: parsed, unit: 'days' };
        }
      } else if (typeof val === 'object' && val) {
        parsedValue = val as RelativeDateValue;
      }
    } catch {
      // JSON parsing failed - treat the entire value as the amount
      // This handles cases where the value is just a liquid variable like "{{payload.amount}}"
      parsedValue = { amount: val, unit: 'days' };
    }

    return parsedValue;
  };

  const parsedValue = parseRelativeDateValue(value);

  const handleAmountChange = (newAmount: string) => {
    // If it's a variable or dynamic value, store it directly without validation
    if (newAmount.includes('{{') || newAmount.includes('${')) {
      const newValue = { ...parsedValue, amount: newAmount };
      const jsonValue = JSON.stringify(newValue);
      onChange(jsonValue);
      return;
    }

    // For static values, try to parse as number but allow any string
    const amount = parseInt(newAmount, 10);
    const finalAmount = !isNaN(amount) && amount > 0 ? amount : newAmount;

    const newValue = { ...parsedValue, amount: finalAmount };
    const jsonValue = JSON.stringify(newValue);
    onChange(jsonValue);
  };

  const handleUnitChange = (newUnit: string) => {
    const newValue = { ...parsedValue, unit: newUnit as RelativeDateValue['unit'] };
    const jsonValue = JSON.stringify(newValue);
    onChange(jsonValue);
  };

  return (
    <div className="flex items-center gap-1">
      <InputRoot className="bg-bg-white w-32" hasError={hasError}>
        <InputWrapper className="gap-0 px-0">
          <ValueInput
            multiline={false}
            indentWithTab={false}
            placeholder={'Amount'}
            value={String(parsedValue.amount)}
            onChange={handleAmountChange}
            variables={variables}
            isAllowedVariable={isAllowedVariable || (() => true)}
            size="3xs"
            disabled={disabled}
          />
          <HelpIcon hasError={hasError} errorMessage={errorMessage} helpText={helpText} contentWidth="w-[280px]" />
        </InputWrapper>
      </InputRoot>

      <Select value={parsedValue.unit} onValueChange={handleUnitChange} disabled={disabled}>
        <SelectTrigger className="bg-bg-white text-paragraph-xs border-border-strong h-7 w-20 px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_UNITS.map((unit) => (
            <SelectItem key={unit.value} value={unit.value} className="text-paragraph-xs">
              {unit.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
