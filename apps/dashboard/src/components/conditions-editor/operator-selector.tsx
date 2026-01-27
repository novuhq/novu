import React from 'react';
import { OperatorSelectorProps } from 'react-querybuilder';

import { toSelectOptions } from '@/components/conditions-editor/select-option-utils';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { cn } from '@/utils/ui';

export const OperatorSelector = React.memo(
  ({ disabled, value, options, handleOnChange, context }: OperatorSelectorProps) => {
    return (
      <Select
        onValueChange={(e) => {
          handleOnChange(e);
          context?.saveForm();
        }}
        disabled={disabled}
        value={value}
      >
        <SelectTrigger
          size="2xs"
          className={cn('w-fit bg-background hover:bg-bg-weak hover:text-text-strong text-label-xs gap-1')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={cn('min-w-18 text-label-xs max-h-48 gap-1')}>
          {toSelectOptions(options, false)}
        </SelectContent>
      </Select>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.options === nextProps.options &&
      prevProps.handleOnChange === nextProps.handleOnChange
    );
  }
);
