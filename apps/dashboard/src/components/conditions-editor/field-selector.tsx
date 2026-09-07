import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldSelectorProps } from 'react-querybuilder';

import { VariableSelect } from '@/components/conditions-editor/variable-select';
import { Code2 } from '@/components/icons/code-2';

export const FieldSelector = React.memo(
  ({ handleOnChange, options, path, value, disabled, context }: FieldSelectorProps) => {
    const form = useFormContext();
    const queryPath = 'query.rules.' + path.join('.rules.') + '.field';
    const { error } = form.getFieldState(queryPath, form.formState);

    const optionsArray = useMemo(
      () =>
        options.map((option) => ({
          label: option.label,
          value: 'value' in option ? option.value : '',
        })),
      [options]
    );

    return (
      <VariableSelect
        leftIcon={<Code2 className="text-feature size-3 min-w-3" />}
        onChange={(e) => {
          handleOnChange(e);
          context?.saveForm();
        }}
        options={optionsArray}
        title="Fields"
        value={value}
        disabled={disabled}
        error={error?.message}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.path === nextProps.path &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.options === nextProps.options &&
      prevProps.handleOnChange === nextProps.handleOnChange
    );
  }
);
