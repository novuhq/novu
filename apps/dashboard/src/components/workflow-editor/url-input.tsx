import { useFormContext } from 'react-hook-form';

import { ControlInput } from '@/components/primitives/control-input';
import { FormControl, FormField, FormItem, FormMessagePure } from '@/components/primitives/form/form';
import { InputProps, InputRoot } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { LiquidVariable } from '@/utils/parseStepVariablesToLiquidVariables';

type URLInputProps = Omit<InputProps, 'value' | 'onChange'> & {
  options: string[];
  withHint?: boolean;
  fields: {
    urlKey: string;
    targetKey: string;
  };
  variables: LiquidVariable[];
};

export const URLInput = ({
  options,
  placeholder,
  fields: { urlKey, targetKey },
  withHint = true,
  variables = [],
}: URLInputProps) => {
  const { control, getFieldState } = useFormContext();
  const { saveForm } = useSaveForm();
  const url = getFieldState(`${urlKey}`);
  const target = getFieldState(`${targetKey}`);
  const error = url.error || target.error;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between space-x-2">
        <div className="flex w-full">
          <InputRoot className="focus:ring- overflow-visible text-xs" hasError={!!error}>
            <FormField
              control={control}
              name={urlKey}
              render={({ field }) => (
                <FormItem className="min-w-px max-w-full basis-full">
                  <ControlInput
                    multiline={false}
                    indentWithTab={false}
                    placeholder={placeholder}
                    value={field.value}
                    onChange={field.onChange}
                    variables={variables}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={targetKey}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        saveForm();
                      }}
                    >
                      <SelectTrigger className="border-1 h-[36px] max-w-24 rounded-l-none border-l-0 text-xs focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option} className="text-xs">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          </InputRoot>
        </div>
      </div>
      <FormMessagePure error={error ? String(error.message) : undefined}>
        {withHint && 'Type {{ for variables'}
      </FormMessagePure>
    </div>
  );
};
