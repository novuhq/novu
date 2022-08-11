import { Divider, Grid, InputWrapper, useMantineColorScheme } from '@mantine/core';
import { useEnvController } from '../../../store/use-env-controller';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { Checkbox, colors, Text, Switch } from '../../../design-system';
import styled from 'styled-components';
import { channels } from '../../../pages/templates/shared/channels';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';

export function TemplatePreference() {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <>
      <StyledDivider dark={dark} />

      <Grid>
        <Grid.Col span={6}>
          <ChannelPreference />
        </Grid.Col>
        <Grid.Col span={6}>
          <CriticalPreference />
        </Grid.Col>
      </Grid>
    </>
  );
}

export function ChannelPreference() {
  const { control } = useFormContext();
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Controller
      name="preferenceSettings"
      control={control}
      render={({ field }) => {
        const { readonly } = useEnvController();
        const preferences = field.value;
        const mock = { channel: true };
        const data = preferences ? preferences : mock;

        function handleCheckboxChange(e, channelType) {
          const newData = Object.assign({}, preferences);
          newData[channelType] = e.currentTarget.checked;
          field.onChange(newData);
        }

        return (
          <InputBackground dark={dark} label="Template default" description="Description here" styles={inputStyles}>
            <Grid pt={8.5}>
              {Object.keys(data).map((key) => {
                const label = channels.find((channel) => channel.tabKey === key)?.label;
                const checked = data[key] || false;

                return (
                  <Grid.Col span={3}>
                    <StyledCheckbox
                      isChecked={checked}
                      checked={checked}
                      disabled={readonly}
                      data-test-id={`preference-${key}`}
                      label={label}
                      onChange={(e) => handleCheckboxChange(e, key)}
                    />
                  </Grid.Col>
                );
              })}
            </Grid>
          </InputBackground>
        );
      }}
    />
  );
}

export function CriticalPreference() {
  const { readonly } = useEnvController();
  const { control } = useFormContext();
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Controller
      name="critical"
      control={control}
      render={({ field }) => {
        return (
          <RelativeInputWrapper
            dark={dark}
            label="This is Critical"
            description="Description here"
            styles={inputStyles}
          >
            <StyledSwitch
              {...field}
              checked={field.value || false}
              disabled={readonly}
              data-test-id="critical"
              label=""
            />
          </RelativeInputWrapper>
        );
      }}
    />
  );
}

const InputBackground = styled(InputWrapperProxy)<{ dark }>`
  background: ${({ dark }) => (dark ? colors.B17 : colors.B98)};
  border-radius: 7px;
  padding: 20px;
`;

const RelativeInputWrapper = styled(InputBackground)<{ dark }>`
  position: relative;
`;

const StyledCheckbox = styled(CheckboxProxy)<{ isChecked }>`
  label {
    ${({ isChecked }) =>
      !isChecked &&
      `
    color: ${colors.B60}
  `}
  }
`;

const StyledSwitch = styled(Switch)`
  position: absolute;
  right: 20px;
  top: 27.5px;
`;

export function StyledDivider({ dark, ...props }) {
  return (
    <Divider
      color={dark ? colors.B20 : colors.BGLight}
      label={<Text color={dark ? colors.B40 : colors.B70}>Your user preferences</Text>}
      my="xs"
      labelPosition="center"
      {...props}
    />
  );
}

export function InputWrapperProxy({ children, ...props }) {
  return <InputWrapper {...props}>{children}</InputWrapper>;
}

export function CheckboxProxy({ ...props }) {
  return <Checkbox {...props} />;
}
