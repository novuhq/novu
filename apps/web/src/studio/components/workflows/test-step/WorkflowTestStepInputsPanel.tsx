import { Input } from '@novu/design-system';
import { JsonSchemaForm, Title } from '@novu/novui';
import { IconOutlineSend, IconOutlineTune } from '@novu/novui/icons';
import { Box, HStack, Stack } from '@novu/novui/jsx';
import { ChannelTypeEnum } from '@novu/shared';
import { FC, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { When } from '../../../../components/utils/When';

export type ToSubscriber = {
  subscriberId: string;
  email: string;
  [key: string]: any;
};

interface IWorkflowTestStepInputsPanelProps {
  payloadSchema: Record<string, any>;
  stepTypes: ChannelTypeEnum[];
  to: ToSubscriber;
  onChange: (payload?: Record<string, any>, to?: ToSubscriber) => void;
}

export const WorkflowTestStepInputsPanel: FC<IWorkflowTestStepInputsPanelProps> = ({
  payloadSchema,
  onChange,
  to,
  stepTypes,
}) => {
  const { control, watch } = useForm({
    defaultValues: {
      ...to,
      phone: '',
    },
  });

  const values = watch();

  useEffect(() => {
    onChange(undefined, values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  return (
    <Stack gap="margins.layout.page.vertical">
      <Box>
        <HStack gap="50" mb="margins.layout.page.sub-section.titleBottom">
          <IconOutlineSend />
          <Title variant="subsection">Send to</Title>
        </HStack>
        <Stack gap="margins.layout.Input.input-input">
          <Controller
            control={control}
            name={`subscriberId`}
            render={({ field }) => {
              return <Input {...field} label="Subscriber ID" />;
            }}
          />
          <When truthy={stepTypes.includes(ChannelTypeEnum.EMAIL)}>
            <Controller
              control={control}
              name={`email`}
              render={({ field }) => {
                return <Input {...field} label="Email" />;
              }}
            />
          </When>
          <When truthy={stepTypes.includes(ChannelTypeEnum.SMS)}>
            <Controller
              control={control}
              name={`phone`}
              render={({ field }) => {
                return <Input {...field} label="Phone number" />;
              }}
            />
          </When>
        </Stack>
      </Box>
      <Box>
        <HStack gap="50" mb="margins.layout.page.sub-section.titleBottom">
          <IconOutlineTune />
          <Title variant="subsection">Payload</Title>
        </HStack>
        <Stack gap="margins.layout.Input.input-input">
          <JsonSchemaForm
            onChange={(data) => {
              if (onChange) {
                onChange(data, undefined);
              }
            }}
            schema={payloadSchema || {}}
            formData={{}}
          />
        </Stack>
      </Box>
    </Stack>
  );
};
