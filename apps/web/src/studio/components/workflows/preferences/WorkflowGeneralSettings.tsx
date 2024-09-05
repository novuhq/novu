import { IconButton, Input, Textarea } from '@novu/novui';
import { IconCopyAll } from '@novu/novui/icons';
import { Stack } from '@novu/novui/jsx';
import { FC } from 'react';

export type WorkflowGeneralSettingsProps = {};

export const WorkflowGeneralSettings: FC<WorkflowGeneralSettingsProps> = (props) => {
  return (
    <form>
      <Stack gap="150">
        <Input label="Workflow name" />
        <Input
          label="Identifier"
          description="Must be unique and all lowercase, using - only"
          rightSection={<IconButton Icon={IconCopyAll} />}
        />
        <Textarea label="Description" maxLines={2} />
      </Stack>
    </form>
  );
};
