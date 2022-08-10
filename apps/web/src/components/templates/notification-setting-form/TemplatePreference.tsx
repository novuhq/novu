import { Divider, Grid, InputWrapper } from '@mantine/core';
import { useEnvController } from '../../../store/use-env-controller';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { Checkbox, colors, Text } from '../../../design-system';
import { Controller, useFormContext } from 'react-hook-form';
import styled from 'styled-components';
import { channels } from '../../../pages/templates/shared/channels';

export function TemplatePreference() {
  return (
    <>
      <Divider
        label={<Text color={colors.B40}>Your user preferences</Text>}
        color={colors.B30}
        my="xs"
        labelPosition="center"
      />

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
          <InputBackground label="Template default" description="Description here" styles={inputStyles}>
            <Grid pt={8.5}>
              {Object.keys(data).map((key) => {
                const label = channels.find((channel) => channel.tabKey === key)?.label;

                return (
                  <Grid.Col span={3}>
                    <Checkbox
                      checked={data[key] || false}
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

  return (
    <Controller
      name="critical"
      control={control}
      render={({ field }) => {
        return (
          <RelativeInputWrapper label="This is Critical" description="Description here" styles={inputStyles}>
            <StyledCheckbox
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
const InputBackground = styled(InputWrapper)`
  background: ${colors.B17};
  border-radius: 7px;
  padding: 20px;
`;

const RelativeInputWrapper = styled(InputBackground)`
  position: relative;
`;

const StyledCheckbox = styled(Checkbox)`
  position: absolute;
  right: 20px;
  top: 27.5px;
`;
