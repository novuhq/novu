import { ControlInput } from '@/components/primitives/control-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input, InputRoot, InputWrapper } from '@/components/primitives/input';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { parseStepVariablesToLiquidVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { capitalize } from '@/utils/string';
import { type WidgetProps } from '@rjsf/utils';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { getFieldName } from './template-utils';

export function TextWidget(props: WidgetProps) {
  const { label, readonly, disabled, id, required } = props;
  const { control } = useFormContext();
  const { step } = useWorkflow();
  const variables = useMemo(() => (step ? parseStepVariablesToLiquidVariables(step.variables) : []), [step]);

  const extractedName = useMemo(() => getFieldName(id), [id]);
  const isNumberType = useMemo(() => props.schema.type === 'number', [props.schema.type]);

  return (
    <FormField
      control={control}
      name={extractedName}
      render={({ field, fieldState }) => (
        <FormItem className="w-full py-1">
          <FormLabel className="text-xs">{capitalize(label)}</FormLabel>
          <FormControl>
            {isNumberType ? (
              <Input
                type="number"
                {...field}
                hasError={!!fieldState.error}
                onChange={(e) => {
                  if (e.target.value === '') {
                    field.onChange('');
                    return;
                  }
                  const val = Number(e.target.value);
                  const isNaN = Number.isNaN(val);
                  const finalValue = isNaN ? '' : val;
                  field.onChange(finalValue);
                }}
                required={required}
                readOnly={readonly}
                disabled={disabled}
                placeholder={capitalize(label)}
              />
            ) : (
              <InputRoot hasError={!!fieldState.error}>
                <InputWrapper className="flex h-full items-center p-2 py-1">
                  <ControlInput
                    indentWithTab={false}
                    placeholder={capitalize(label)}
                    id={label}
                    value={field.value}
                    onChange={field.onChange}
                    variables={variables}
                    size="sm"
                  />
                </InputWrapper>
              </InputRoot>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
