import { Control, Controller, useFormContext } from 'react-hook-form';
import { Textarea } from '@mantine/core';
import { LackIntegrationError } from './LackIntegrationError';
import { IForm } from './use-template-controller.hook';
import { colors } from '../../design-system';
import { useEnvController } from '../../store/use-env-controller';

export function TemplateSMSEditor({
  control,
  index,
  isIntegrationActive,
}: {
  control: Control<IForm>;
  index: number;
  errors: any;
  isIntegrationActive: boolean;
}) {
  const { readonly } = useEnvController();
  const {
    formState: { errors },
  } = useFormContext();

  return (
    <>
      {!isIntegrationActive ? <LackIntegrationError channelType="SMS" /> : null}
      <Controller
        name={`steps.${index}.template.content` as any}
        control={control}
        render={({ field }) => (
          <Textarea
            styles={TextAreaStyles}
            {...field}
            data-test-id="smsNotificationContent"
            error={errors?.steps ? errors.steps[index]?.template?.content?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={field.value || ''}
            label="SMS message content"
            placeholder="Add notification content here..."
          />
        )}
      />
    </>
  );
}

const TextAreaStyles = (theme) => {
  const dark = theme.colorScheme === 'dark';

  const primaryColor = dark ? theme.white : theme.colors.gray[8];
  const invalidColor = theme.colors.gradient[5];
  const secondaryColor = dark ? theme.colors.dark[3] : theme.colors.gray[6];

  return {
    input: {
      borderColor: dark ? theme.colors.dark[5] : theme.colors.gray[5],
      backgroundColor: 'transparent',
      color: primaryColor,
      margin: '5px 0px',
      '&:focus, &:focus-within': {
        borderColor: theme.colors.gray[7],
      },
      '&::placeholder': {
        color: secondaryColor,
      },
    },
    label: {
      color: primaryColor,
      fontWeight: 700,
      fontSize: '14px',
      lineHeight: '17px',
      margin: '5px 0px',
    },
    invalid: {
      borderColor: invalidColor,
      color: primaryColor,
      '&::placeholder': {
        color: secondaryColor,
      },
    },
    error: {
      color: `${invalidColor} !important`,
      fontSize: '12px',
    },
    disabled: {
      backgroundColor: `${dark ? colors.B20 : colors.B98} !important`,
      borderColor: `${dark ? colors.B30 : colors.BGLight} !important`,
      color: `${secondaryColor} !important`,
      '&::placeholder': {
        color: `${secondaryColor} !important`,
      },
    },
  };
};
