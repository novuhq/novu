import { Center, TextInput, useMantineColorScheme } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';

import { useEnvController } from '../../../hooks';
import { IForm } from './formTypes';
import { Variant } from '../../../design-system/icons';
import { Text, colors } from '../../../design-system';

export const StepNameInput = ({ path, defaultValue }: { path?: string; defaultValue: string }) => {
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
      name={`${path}.name` as any}
      defaultValue=""
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
                // paddingTop: 20,
                lineHeight: '28px',
                minHeight: 'auto',
                height: '54px',
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
                position: 'absolute',
                pointerEvents: 'none',
                fontSize: '14px',
                paddingLeft: '10px',
                paddingTop: '40px',
                lineHeight: '20px',
                zIndex: 1,
              },
            })}
            {...field}
            label={
              <Center inline>
                <Variant />
                <Text ml={4} color={colors.B60}>
                  Variant 12
                </Text>
              </Center>
            }
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
