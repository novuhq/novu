import { Group, TextInput, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Bell, Chat, DigestGradient, Mail, Mobile, Sms, TimerGradient } from '../../../design-system/icons';
import { useEnvController } from '../../../hooks';
import { IForm } from './formTypes';
import { useMemo } from 'react';
import { When } from '../../../components/utils/When';
import { UpdateButton } from './UpdateButton';

const stepNames: Record<StepTypeEnum | ChannelTypeEnum, string> = {
  email: 'Email',
  chat: 'Chat',
  in_app: 'In-App',
  sms: 'SMS',
  push: 'Push',
  digest: 'Digest',
  delay: 'Delay',
  trigger: 'Trigger',
};

const stepIcon: Record<StepTypeEnum | ChannelTypeEnum, (...args: any[]) => JSX.Element> = {
  email: Mail,
  chat: Chat,
  in_app: Bell,
  sms: Sms,
  push: Mobile,
  digest: DigestGradient,
  delay: TimerGradient,
  trigger: () => <></>,
};

const Input = ({ index, defaultValue }: { index: number; defaultValue: string }) => {
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
              },
            })}
            {...field}
            value={field.value || defaultValue}
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

export const StepNameInput = ({
  channel,
  color = undefined,
  index,
}: {
  channel: StepTypeEnum | ChannelTypeEnum;
  index: number;
  color?: any;
}) => {
  const Icon = stepIcon[channel];

  return (
    <Group spacing={16}>
      <Icon color={color} /> <Input defaultValue={stepNames[channel]} index={index} />
      <When truthy={['in_app', 'email'].includes(channel)}>
        <div
          style={{
            marginRight: 32,
          }}
        >
          <UpdateButton />
        </div>
      </When>
    </Group>
  );
};
