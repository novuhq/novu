import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { RiAddLine, RiDeleteBin2Line, RiErrorWarningLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FormField } from '@/components/primitives/form/form';
import { InputRoot } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { NovuSignatureHeader } from './novu-signature-header';
import { SectionHeader } from './section-header';

type KeyValuePairListProps = {
  fieldName: 'headers' | 'body';
  label: string;
  tooltip?: string;
};

export function KeyValuePairList({ fieldName, label, tooltip }: KeyValuePairListProps) {
  const { control } = useFormContext();
  const { saveForm, saveFormDebounced } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const handleAdd = () => {
    append({ key: '', value: '' });
    saveFormDebounced();
  };

  const handleRemove = (index: number) => {
    remove(index);
    saveFormDebounced();
  };

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader label={label} tooltip={tooltip} />
      <div className="flex flex-col gap-1">
        {fieldName === 'headers' && <NovuSignatureHeader />}
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-1">
            <Controller
              control={control}
              name={`${fieldName}.${index}.key`}
              render={({ field: keyField, fieldState: keyFieldState }) => (
                <InputRoot className="w-[200px] flex-shrink-0" hasError={!!keyFieldState.error}>
                  <ControlInput
                    size="2xs"
                    multiline={false}
                    indentWithTab={false}
                    placeholder="key..."
                    value={keyField.value}
                    isAllowedVariable={isAllowedVariable}
                    variables={variables}
                    onChange={(val) => keyField.onChange(typeof val === 'string' ? val : '')}
                    onBlur={() => {
                      keyField.onBlur();
                      saveForm();
                    }}
                  />
                  {keyFieldState.error && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-default items-center justify-center pl-1 pr-1">
                            <RiErrorWarningLine className="text-destructive h-4 w-4 shrink-0" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={5}>
                          <p>{keyFieldState.error.message}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </InputRoot>
              )}
            />
            <Controller
              control={control}
              name={`${fieldName}.${index}.value`}
              render={({ field: valueField, fieldState: valueFieldState }) => (
                <InputRoot className="min-w-0 flex-1" hasError={!!valueFieldState.error}>
                  <ControlInput
                    size="2xs"
                    multiline={false}
                    indentWithTab={false}
                    placeholder="Insert value..."
                    value={valueField.value}
                    isAllowedVariable={isAllowedVariable}
                    variables={variables}
                    onChange={(val) => valueField.onChange(typeof val === 'string' ? val : '')}
                    onBlur={() => {
                      valueField.onBlur();
                      saveForm();
                    }}
                  />
                  {valueFieldState.error && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-default items-center justify-center pl-1 pr-1">
                            <RiErrorWarningLine className="text-destructive h-4 w-4 shrink-0" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={5}>
                          <p>{valueFieldState.error.message}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </InputRoot>
              )}
            />
            <Button
              type="button"
              variant="error"
              mode="ghost"
              size="2xs"
              className="border ml-0! h-7 w-7 flex-shrink-0 border-neutral-200"
              leadingIcon={RiDeleteBin2Line}
              onClick={() => handleRemove(index)}
              aria-label="Delete header"
            />
          </div>
        ))}

        <FormField
          control={control}
          name={fieldName}
          render={() => (
            <Button
              type="button"
              variant="secondary"
              mode="ghost"
              size="2xs"
              className="w-fit gap-1 px-1 text-xs text-text-sub"
              onClick={handleAdd}
            >
              <RiAddLine className="size-3.5" />
              Add {fieldName === 'headers' ? 'header' : 'field'}
            </Button>
          )}
        />
      </div>
    </div>
  );
}
