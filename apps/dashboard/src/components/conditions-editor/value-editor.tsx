import { useFormContext } from 'react-hook-form';
import { useValueEditor, ValueEditorProps } from 'react-querybuilder';

import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { ControlInput } from '../primitives/control-input/control-input';
import type { HelpTextInfo } from '@/components/conditions-editor/field-type-editors';
import { shouldUseRelativeDateEditor } from '@/components/conditions-editor/field-type-editors';
import { RelativeDateValueEditor } from '@/components/conditions-editor/relative-date-value-editor';
import { HelpIcon } from '@/components/conditions-editor/help-icon';

type ExtendedContext = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  getPlaceholder?: (fieldName: string, operator: string) => string;
  getHelpText?: (fieldName: string, operator: string) => HelpTextInfo;
};

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

  // Use relative date editor for relative date operators
  if (shouldUseRelativeDateEditor(operator)) {
    return <RelativeDateValueEditor {...props} />;
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
