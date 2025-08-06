import { memo } from 'react';
import { type Control, Controller, type Path } from 'react-hook-form';
import { RiErrorWarningLine } from 'react-icons/ri';

import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { Code2 } from '../../icons/code-2';
import { SchemaEditorFormValues } from '../utils/validation-schema';

// path: the direct RHF path to the keyName field, e.g., "propertyList.0.keyName"
type PropertyNameInputProps = {
  fieldPath: Path<SchemaEditorFormValues>;
  control: Control<SchemaEditorFormValues>;
  isDisabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

export const PropertyNameInput = memo(function PropertyNameInput({
  fieldPath,
  control,
  isDisabled = false,
  placeholder = 'Property name',
  autoFocus = false,
}: PropertyNameInputProps) {
  return (
    <div className="flex-1 flex-col">
      <Controller
        name={fieldPath}
        control={control}
        // defaultValue can be omitted if the parent useFieldArray/form sets initial values (e.g., keyName: '')
        render={({ field, fieldState }) => {
          return (
            <InputRoot hasError={!!fieldState.error} size="2xs" className={cn('font-mono')}>
              <InputWrapper>
                <Code2 className="h-4 w-4 shrink-0 text-gray-500" />
                <InputPure
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  placeholder={placeholder}
                  className="text-xs"
                  disabled={isDisabled}
                  autoFocus={autoFocus}
                />
                {fieldState.error && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-default items-center justify-center pl-1 pr-1">
                          <RiErrorWarningLine className={cn('text-destructive h-4 w-4 shrink-0')} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={5}>
                        <p>{fieldState.error.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </InputWrapper>
            </InputRoot>
          );
        }}
      />
    </div>
  );
});
