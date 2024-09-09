import { Input } from '@novu/design-system';
import { JsonSchemaForm, Title } from '@novu/novui';
import { IconOutlineSend, IconOutlineTune } from '@novu/novui/icons';
import { Box, HStack, Stack } from '@novu/novui/jsx';
import { ChannelTypeEnum } from '@novu/shared';
import { FC, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { When } from '../../../../components/utils/When';
import { formContainerClassName } from '../step-editor/WorkflowStepEditorControlsPanel';

export type ToSubscriber = {
  subscriberId: string;
  email: string;
  [key: string]: any;
};

interface IWorkflowTestControlsPanelProps {
  payloadSchema: Record<string, any>;
  stepTypes: ChannelTypeEnum[];
  to: ToSubscriber;
  onChange: (payload?: Record<string, any>, to?: ToSubscriber) => void;
}

export const WorkflowTestControlsPanel: FC<IWorkflowTestControlsPanelProps> = ({
  payloadSchema,
  onChange,
  to,
  stepTypes,
}) => {
  const { control, watch } = useForm({
    defaultValues: to,
  });

  useEffect(() => {
    const { unsubscribe } = watch((values) => {
      onChange(undefined, values as ToSubscriber);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  return (
    <Stack gap="margins.layout.page.vertical" className={formContainerClassName}>
      <Box>
        <HStack gap="50" mb="margins.layout.page.sub-section.titleBottom">
          <IconOutlineSend />
          <Title variant="subsection">Send to</Title>
        </HStack>
        <Stack gap="margins.layout.Input.input-input">
          <Controller
            control={control}
            name="subscriberId"
            render={({ field }) => <Input {...field} label="Subscriber ID" />}
          />
          <When truthy={stepTypes.includes(ChannelTypeEnum.EMAIL)}>
            <Controller control={control} name="email" render={({ field }) => <Input {...field} label="Email" />} />
          </When>
          <When truthy={stepTypes.includes(ChannelTypeEnum.SMS)}>
            <Controller
              control={control}
              name="phone"
              defaultValue={''}
              render={({ field }) => <Input {...field} label="Phone number" />}
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
              onChange(data.formData, undefined);
            }}
            schema={payloadSchema || {}}
            formData={{}}
          />
        </Stack>
      </Box>
    </Stack>
  );
};
