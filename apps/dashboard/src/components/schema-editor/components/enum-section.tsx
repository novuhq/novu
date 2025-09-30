import { memo, useCallback } from 'react';
import { type Control, Controller, Path, useFieldArray } from 'react-hook-form';
import { RiAddLine, RiDeleteBin2Line, RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { InputPure, InputRoot } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

import { getMarginClassPx } from '../utils/ui-helpers';
import type { SchemaEditorFormValues } from '../utils/validation-schema';

interface EnumChoiceProps {
  enumChoicePath: string;
  enumIndex: number;
  control: Control<any>;
  onRemove: () => void;
}

const EnumChoice = memo<EnumChoiceProps>(function EnumChoice({ enumChoicePath, enumIndex, control, onRemove }) {
  return (
    <div className="flex items-center space-x-2">
      <Controller
        name={enumChoicePath}
        control={control}
        render={({ field: choiceField, fieldState: choiceFieldState }) => (
          <InputRoot hasError={!!choiceFieldState.error} size="2xs" className="flex-1">
            <InputPure {...choiceField} placeholder={`Choice ${enumIndex + 1}`} className="pl-2 text-xs" />
            {choiceFieldState.error && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-default items-center justify-center pl-1 pr-1">
                      <RiErrorWarningLine className={cn('text-destructive h-4 w-4 shrink-0')} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={5}>
                    <p>{choiceFieldState.error.message}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </InputRoot>
        )}
      />

      <Button
        variant="error"
        mode="ghost"
        size="2xs"
        leadingIcon={RiDeleteBin2Line}
        onClick={onRemove}
        aria-label="Delete property"
        className={cn('border-1 !ml-1.5 h-7 w-7 border-neutral-200')}
      />
    </div>
  );
});

interface EnumSectionProps {
  enumArrayPath: Path<SchemaEditorFormValues>;
  control: Control<any>;
  indentationLevel: number;
}

export const EnumSection = memo<EnumSectionProps>(function EnumSection({ enumArrayPath, control, indentationLevel }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: enumArrayPath,
    keyName: 'enumChoiceId',
  });

  const handleAddChoice = useCallback(() => {
    append('', { shouldFocus: true });
  }, [append]);

  return (
    <div className={cn('mt-1 space-y-1', getMarginClassPx(indentationLevel + 1))}>
      {fields.map((enumField, enumIndex) => (
        <EnumChoice
          key={enumField.enumChoiceId}
          enumChoicePath={`${enumArrayPath}.${enumIndex}`}
          enumIndex={enumIndex}
          control={control}
          onRemove={() => remove(enumIndex)}
        />
      ))}
      <Button
        size="2xs"
        variant="secondary"
        mode="lighter"
        onClick={handleAddChoice}
        leadingIcon={RiAddLine}
        className="mt-1"
      >
        Add Choice
      </Button>
    </div>
  );
});
