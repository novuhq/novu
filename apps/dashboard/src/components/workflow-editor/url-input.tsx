import { RedirectTargetEnum } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { InputProps, InputRoot } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

type URLInputProps = Omit<InputProps, 'value' | 'onChange'> & {
  options: string[];
  fields: {
    urlKey: string;
    targetKey: string;
  };
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
};

export const URLInput = ({
  options,
  placeholder,
  fields: { urlKey, targetKey },
  variables = [],
  isAllowedVariable,
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
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    variables={variables}
                    isAllowedVariable={isAllowedVariable}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={targetKey}
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <Select
                      value={field.value ?? RedirectTargetEnum.SELF}
                      onValueChange={(value) => {
                        field.onChange(value);
                        saveForm();
                      }}
                    >
                      <SelectTrigger className="border h-[36px] max-w-24 rounded-l-none border-l-0 text-xs focus:ring-0">
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
      <FormField control={control} name={urlKey} render={() => <FormMessage />} />
    </div>
  );
};
