import { FunctionComponent } from 'react';
import { Group, Input, InputWrapperProps, Text } from '@mantine/core';
import styled from '@emotion/styled';
import { useFormContext, Controller } from 'react-hook-form';

import { useEnvController } from '../../../../hooks';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { Checkbox, colors, Switch } from '../../../../design-system';
import { channels } from '../../shared/channels';
import type { IForm } from '../formTypes';

export function TemplatePreference() {
  return (
    <>
      <CriticalPreference />
      <ChannelPreference />
    </>
  );
}

export function ChannelPreference() {
  const { control } = useFormContext();

  return (
    <Controller
      name="preferenceSettings"
      control={control}
      render={({ field }) => {
        const { readonly } = useEnvController();

        const preferences: IForm['preferenceSettings'] = field.value;

        function handleCheckboxChange(e, channelType) {
          const newData = { ...preferences };
          newData[channelType] = e.currentTarget.checked;
          field.onChange(newData);
        }

        return (
          <InputBackground
            label="Template Defaults"
            description="Check the channels you would like to be ON by default"
            styles={inputStyles}
          >
            {Object.keys(preferences).map((key) => {
              const label = channels.find((channel) => channel.tabKey === key)?.label;
              const checked = preferences[key] || false;

              return (
                <StyledCheckbox
                  mb={8}
                  checked={checked}
                  disabled={readonly}
                  data-test-id={`preference-${key}`}
                  label={label}
                  onChange={(e) => handleCheckboxChange(e, key)}
                />
              );
            })}
          </InputBackground>
        );
      }}
    />
  );
}

export function CriticalPreference() {
  const { control } = useFormContext();
  const { readonly } = useEnvController();

  return (
    <Controller
      name="critical"
      defaultValue={false}
      control={control}
      render={({ field }) => {
        return (
          <Group mb={24} align="center" position="apart">
            <Text weight="bold" size={14}>
              Users will be able to manage subscriptions
            </Text>
            <Switch {...field} checked={!field.value || false} disabled={readonly} data-test-id="critical" />
          </Group>
        );
      }}
    />
  );
}

export const InputWrapperProxy: FunctionComponent<InputWrapperProps> = ({ children, ...props }) => {
  return <Input.Wrapper {...props}>{children}</Input.Wrapper>;
};

const InputBackground = styled(InputWrapperProxy)`
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.B98)};
  border-radius: 7px;
`;

const StyledCheckbox = styled(CheckboxProxy)<{ checked: boolean }>`
  label {
    ${({ checked }) =>
      !checked &&
      `
    color: ${colors.B60}
  `}
  }
`;

export function CheckboxProxy({ ...props }) {
  return <Checkbox {...props} />;
}
