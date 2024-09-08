import { useClipboard } from '@mantine/hooks';
import { IconButton, Input, Textarea } from '@novu/novui';
import { IconCheck, IconCopyAll } from '@novu/novui/icons';
import { Stack } from '@novu/novui/jsx';
import { ChangeEvent, FC } from 'react';
import { WorkflowGeneralSettings } from './types';

export type WorkflowGeneralSettingsProps = {
  settings: WorkflowGeneralSettings;
  updateSettings: (settings: WorkflowGeneralSettings) => void;
  areSettingsDisabled?: boolean;
};

export const WorkflowGeneralSettingsForm: FC<WorkflowGeneralSettingsProps> = ({
  settings,
  updateSettings,
  areSettingsDisabled,
}) => {
  const { copied, copy } = useClipboard();
  const onChange =
    (fieldKey: keyof WorkflowGeneralSettings) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      updateSettings({ ...settings, [fieldKey]: value });
    };

  return (
    <Stack gap="150">
      <Input label="Workflow name" value={settings.name} onChange={onChange('name')} disabled={areSettingsDisabled} />
      <Input
        label="Identifier"
        description="Must be unique and all lowercase, using - only"
        rightSection={<IconButton Icon={copied ? IconCheck : IconCopyAll} onClick={() => copy(settings.workflowId)} />}
        value={settings.workflowId}
        onChange={onChange('workflowId')}
        disabled={areSettingsDisabled}
      />
      {!areSettingsDisabled && (
        <Textarea
          label="Description"
          maxLines={2}
          value={settings.description}
          onChange={onChange('description')}
          disabled={areSettingsDisabled}
        />
      )}
    </Stack>
  );
};
