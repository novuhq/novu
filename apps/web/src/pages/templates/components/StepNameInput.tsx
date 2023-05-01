import { TextInput, useMantineColorScheme } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { useEnvController } from '../../../hooks';
import { IForm } from './formTypes';
import { colors } from '@novu/notification-center';

export const StepNameInput = ({ index, defaultValue }: { index: number; defaultValue: string }) => {
  const {
    control,
    formState: { errors, isSubmitted },
  } = useFormContext<IForm>();
  const { readonly } = useEnvController();
  const showErrors = isSubmitted && errors?.steps;
  const { colorScheme } = useMantineColorScheme();

  return (
    <Controller
      control={control}
      name={`steps.${index}.name`}
      render={({ field, fieldState }) => {
        return (
          <TextInput
            styles={(theme) => ({
              root: {
                flex: '1 1 auto',
                marginRight: 16,
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
                lineHeight: '28px',
                minHeight: 'auto',
                height: 'auto',
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
            })}
            {...field}
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
