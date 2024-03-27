import { TextInput, useMantineColorScheme } from '@mantine/core';
import { colors } from '@novu/notification-center';
import { Controller, useFormContext } from 'react-hook-form';
import { useEnvController } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';

export const NameInput = () => {
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
      name="name"
      defaultValue="Untitled"
      render={({ field, fieldState }) => {
        return (
          <TextInput
            styles={(theme) => ({
              root: {
                flex: '1 1 auto',
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
                  backgroundColor: colorScheme === 'dark' ? colors.B15 : theme.white,
                  color: colorScheme === 'dark' ? theme.white : theme.black,
                  opacity: 1,
                },
              },
            })}
            {...field}
            value={field.value || ''}
            error={showErrors && fieldState.error?.message}
            type="text"
            data-test-id="name-input"
            placeholder="Enter workflow name"
            disabled={readonly}
          />
        );
      }}
    />
  );
};
