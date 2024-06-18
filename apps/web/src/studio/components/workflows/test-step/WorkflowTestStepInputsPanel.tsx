import { Input } from '@novu/design-system';
import { Title } from '@novu/novui';
import { IconOutlineSend, IconOutlineTune } from '@novu/novui/icons';
import { Box, HStack, Stack } from '@novu/novui/jsx';
import { FC } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IWorkflowTestStepInputsPanelProps {}

export const WorkflowTestStepInputsPanel: FC<IWorkflowTestStepInputsPanelProps> = ({}) => {
  return (
    <Stack gap="margins.layout.page.vertical">
      <Box>
        <HStack gap="50" mb="margins.layout.page.sub-section.titleBottom">
          <IconOutlineSend />
          <Title variant="subsection">Send to</Title>
        </HStack>
        <Stack gap="margins.layout.Input.input-input">
          {/* TODO: These are placeholders */}
          <Input label="Subscriber ID" />
          <Input label="Email" />
        </Stack>
      </Box>
      <Box>
        <HStack gap="50" mb="margins.layout.page.sub-section.titleBottom">
          <IconOutlineTune />
          <Title variant="subsection">Payload</Title>
        </HStack>
        <Stack gap="margins.layout.Input.input-input">
          {/* TODO: These are placeholders */}
          <Input label="Field 1" />
          <Input label="Field 2" />
        </Stack>
      </Box>
    </Stack>
  );
};
