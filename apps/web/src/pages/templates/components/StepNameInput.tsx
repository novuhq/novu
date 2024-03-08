import { ReactNode } from 'react';
import { TextInput, useMantineColorScheme } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { colors } from '@novu/design-system';

import { useEnvController } from '../../../hooks';
import type { IForm } from './formTypes';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';

export const StepNameInput = ({
  path,
  defaultValue,
  label,
}: {
  path?: string;
  defaultValue: string;
  label?: ReactNode;
}) => {
  const {
    control,
    formState: { errors, isSubmitted },
  } = useFormContext<IForm>();

  const { template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);
  const showErrors = isSubmitted && errors?.steps;
  const { colorScheme } = useMantineColorScheme();

  return (
    <Controller
      control={control}
      name={`${path}.name` as any}
      defaultValue=""
      render={({ field, fieldState }) => {
        return (
          <TextInput
            styles={(theme) => ({
              root: {
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: 4,
                flex: '1 1 auto',
                width: '100%',
              },
              wrapper: {
                background: 'transparent',
                width: '100%',
              },
              input: {
                background: 'transparent',
                borderStyle: 'solid',
                borderColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
                borderWidth: '1px',
                fontSize: '20px',
                fontWeight: 'bolder',
                padding: 9,
                // paddingTop: 20,
                lineHeight: '28px',
                minHeight: 'auto',
                height: '40px',
                width: '100%',
                textOverflow: 'ellipsis',
                '&:not(:placeholder-shown)': {
                  borderStyle: 'none',
                  padding: 10,
                },
                '&:hover, &:focus': {
                  borderStyle: 'solid',
                  padding: 9,
                },
                '&:disabled': {
                  backgroundColor: colorScheme === 'dark' ? colors.B17 : theme.white,
                  color: colorScheme === 'dark' ? theme.white : theme.black,
                  opacity: 1,
                },
              },
              label: {
                fontSize: '14px',
                lineHeight: '20px',
              },
            })}
            {...field}
            label={label}
            value={field.value !== undefined ? field.value : defaultValue}
            error={showErrors && fieldState.error?.message}
            type="text"
            data-test-id="step-name"
            placeholder="Enter step name"
            disabled={readonly}
          />
        );
      }}
    />
  );
};
