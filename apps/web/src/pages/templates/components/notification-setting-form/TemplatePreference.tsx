import { FunctionComponent } from 'react';
import { Group, Input, InputWrapperProps, Text } from '@mantine/core';
import { useFormContext, Controller } from 'react-hook-form';

import { useEnvController } from '../../../../hooks';
import { Checkbox, colors, Switch } from '@novu/design-system';
import type { IForm } from '../formTypes';
import { LabelWithTooltip } from '../../workflow/LabelWithTooltip';
import { ChannelTitle } from '../ChannelTitle';
import { ChannelTypeEnum } from '@novu/shared';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';

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
  const { template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);

  return (
    <Controller
      name="preferenceSettings"
      control={control}
      render={({ field }) => {
        const preferences: IForm['preferenceSettings'] = field.value;

        function handleCheckboxChange(e, channelType) {
          const newData = { ...preferences };
          newData[channelType] = e.currentTarget.checked;
          field.onChange(newData);
        }

        return (
          <>
            <Text color={colors.B60}>Default Channels On:</Text>
            {Object.keys(preferences).map((key) => {
              const checked = preferences[key] || false;

              return (
                <Group
                  sx={{
                    padding: 18,
                    border: `1px dashed ${colors.B40}`,
                    borderRadius: 8,
                  }}
                  position="apart"
                  key={key}
                >
                  <Text>{<ChannelTitle channel={key as ChannelTypeEnum} />}</Text>
                  <div>
                    <Switch
                      checked={checked}
                      disabled={readonly}
                      data-test-id={`preference-${key}`}
                      onChange={(e) => handleCheckboxChange(e, key)}
                    />
                  </div>
                </Group>
              );
            })}
          </>
        );
      }}
    />
  );
}

export function CriticalPreference() {
  const { control } = useFormContext();
  const { template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);

  return (
    <Controller
      name="critical"
      defaultValue={true}
      control={control}
      render={({ field }) => {
        return (
          <Group align="center" position="apart">
            <LabelWithTooltip
              label="Users will be able to manage subscriptions"
              tooltip="Allow opting out of the specific channel. Users will receive notifications in the active channels."
            />
            <Switch {...field} checked={field.value} disabled={readonly} data-test-id="critical" />
          </Group>
        );
      }}
    />
  );
}

export const InputWrapperProxy: FunctionComponent<InputWrapperProps> = ({ children, ...props }) => {
  return <Input.Wrapper {...props}>{children}</Input.Wrapper>;
};

export function CheckboxProxy({ ...props }) {
  return <Checkbox {...props} />;
}
