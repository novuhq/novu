import { useFormContext } from 'react-hook-form';
import { useValueEditor, ValueEditorProps } from 'react-querybuilder';

import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { ControlInput } from '../primitives/control-input/control-input';
import type { HelpTextInfo } from '@/components/conditions-editor/field-type-editors';
import { shouldUseRelativeDateEditor } from '@/components/conditions-editor/field-type-editors';
import { HelpIcon } from '@/components/conditions-editor/help-icon';

type RelativeDateValue = {
  amount: number | string;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
};

type ExtendedContext = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  getPlaceholder?: (fieldName: string, operator: string) => string;
  getHelpText?: (fieldName: string, operator: string) => HelpTextInfo;
};

const TIME_UNITS = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
  { value: 'months', label: 'months' },
  { value: 'years', label: 'years' },
] as const;

export const ValueEditor = (props: ValueEditorProps) => {
  const form = useFormContext();
  const queryPath = 'query.rules.' + props.path.join('.rules.') + '.value';
  const { error } = form.getFieldState(queryPath, form.formState);
  const { variables = [], isAllowedVariable, getPlaceholder, getHelpText } = (props.context as ExtendedContext) ?? {};
  const { value, handleOnChange, operator, field } = props;
  const { valueAsArray, multiValueHandler } = useValueEditor(props);

  if (operator === 'null' || operator === 'notNull') {
    return null;
  }

  // Handle relative date operators
  if (shouldUseRelativeDateEditor(operator)) {
    // Parse the current value
    let parsedValue: RelativeDateValue = { amount: 1, unit: 'days' };

    try {
      if (typeof value === 'string' && value) {
        const parsed = JSON.parse(value);

        if (parsed && (typeof parsed.amount === 'number' || typeof parsed.amount === 'string') && parsed.unit) {
          parsedValue = parsed;
        }
      } else if (typeof value === 'object' && value) {
        parsedValue = value as RelativeDateValue;
      }
    } catch {
      // Keep default value
    }

    const handleAmountChange = (newAmount: string) => {
      // If it's a variable or dynamic value, store it directly without validation
      if (newAmount.includes('{{') || newAmount.includes('${')) {
        const newValue = { ...parsedValue, amount: newAmount };
        const jsonValue = JSON.stringify(newValue);
        handleOnChange(jsonValue);
        return;
      }

      // For static values, try to parse as number but allow any string
      const amount = parseInt(newAmount, 10);
      const finalAmount = !isNaN(amount) && amount > 0 ? amount : newAmount;

      const newValue = { ...parsedValue, amount: finalAmount };
      const jsonValue = JSON.stringify(newValue);
      handleOnChange(jsonValue);
    };

    const handleUnitChange = (newUnit: string) => {
      const newValue = { ...parsedValue, unit: newUnit as RelativeDateValue['unit'] };
      const jsonValue = JSON.stringify(newValue);
      handleOnChange(jsonValue);
    };

    // Get help text for the operator
    const helpText = getHelpText ? getHelpText(field, operator) : null;

    return (
      <div className="flex items-center gap-1">
        <InputRoot className="bg-bg-white w-32" hasError={!!error}>
          <InputWrapper className="gap-0 px-0">
            <ControlInput
              multiline={false}
              indentWithTab={false}
              placeholder="1"
              value={String(parsedValue.amount)}
              onChange={handleAmountChange}
              variables={variables}
              isAllowedVariable={isAllowedVariable || (() => true)}
              size="3xs"
            />
            <HelpIcon hasError={!!error} errorMessage={error?.message} helpText={helpText} contentWidth="w-[280px]" />
          </InputWrapper>
        </InputRoot>

        <Select value={parsedValue.unit} onValueChange={handleUnitChange}>
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

  // Get dynamic placeholder and help text
  const placeholder = getPlaceholder ? getPlaceholder(field, operator) : 'value';
  const helpText = getHelpText ? getHelpText(field, operator) : null;

  if (operator === 'between' || operator === 'notBetween') {
    const betweenPlaceholder = getPlaceholder ? getPlaceholder(field, operator) : 'value1,value2';
    const [fromPlaceholder, toPlaceholder] = betweenPlaceholder.split(',').map((p) => p.trim());

    const editors = ['from', 'to'].map((key, i) => {
      const hasError = !!error && !valueAsArray[i];
      const isLastInput = i === 1;

      return (
        <InputRoot key={key} className="bg-bg-white w-28" hasError={hasError}>
          <InputWrapper className="gap-0 px-0">
            <ControlInput
              multiline={false}
              indentWithTab={false}
              placeholder={i === 0 ? fromPlaceholder : toPlaceholder}
              value={valueAsArray[i] ?? ''}
              onChange={(newValue) => multiValueHandler(newValue, i)}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              size="3xs"
            />
            {isLastInput && <HelpIcon hasError={!!error} errorMessage={error?.message} helpText={helpText} />}
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

  return (
    <InputRoot className="bg-bg-white w-48" hasError={!!error}>
      <InputWrapper className="gap-0 px-0">
        <ControlInput
          multiline={false}
          indentWithTab={false}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={handleOnChange}
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          size="3xs"
        />
        <HelpIcon hasError={!!error} errorMessage={error?.message} helpText={helpText} />
      </InputWrapper>
    </InputRoot>
  );
};
