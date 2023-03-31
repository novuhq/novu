import { Group, TextInput, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Bell, Chat, DigestGradient, Mail, Mobile, Sms, TimerGradient } from '../../../design-system/icons';
import { useEnvController } from '../../../hooks';
import { IForm } from './formTypes';

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
      defaultValue={defaultValue}
      render={({ field, fieldState }) => {
        return (
          <TextInput
            styles={(theme) => ({
              root: {
                width: '95%',
              },
              wrapper: {
                background: 'transparent',
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
            value={field.value || ''}
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
  if (channel === StepTypeEnum.EMAIL || channel === ChannelTypeEnum.EMAIL) {
    return (
      <Group align="center" spacing={16}>
        <Mail color={color} /> <Input defaultValue="Email" index={index} />
      </Group>
    );
  }

  if (channel === StepTypeEnum.IN_APP || channel === ChannelTypeEnum.IN_APP) {
    return (
      <Group align="center" spacing={16}>
        <Bell color={color} /> <Input defaultValue="In-App" index={index} />
      </Group>
    );
  }

  if (channel === StepTypeEnum.CHAT || channel === ChannelTypeEnum.CHAT) {
    return (
      <Group align="center" spacing={16}>
        <Chat color={color} /> <Input defaultValue="Chat" index={index} />
      </Group>
    );
  }

  if (channel === StepTypeEnum.PUSH || channel === ChannelTypeEnum.PUSH) {
    return (
      <Group align="center" spacing={16}>
        <Mobile color={color} /> <Input defaultValue="Push" index={index} />
      </Group>
    );
  }

  if (channel === StepTypeEnum.SMS || channel === ChannelTypeEnum.SMS) {
    return (
      <Group align="center" spacing={16}>
        <Sms color={color} /> <Input defaultValue="SMS" index={index} />
      </Group>
    );
  }

  if (channel === StepTypeEnum.DELAY) {
    return (
      <Group align="center" spacing={16}>
        <TimerGradient /> <Input defaultValue="Delay" index={index} />
      </Group>
    );
  }

  if (channel === StepTypeEnum.DIGEST) {
    return (
      <Group align="center" spacing={16}>
        <DigestGradient /> <Input defaultValue="Digest" index={index} />
      </Group>
    );
  }

  return <>{channel}</>;
};
