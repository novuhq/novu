import { FC } from 'react';

import {
  WorkflowSubscriptionPreferences,
  WorkflowSubscriptionPreferencesProps,
} from './WorkflowSubscriptionPreferences';
import { ChannelTypeEnum } from '@novu/shared';
import { Preference, PreferenceChannel, SubscriptionPreferenceRow } from './types';
import { Tabs, Input, IconButton, Text, Textarea } from '@novu/novui';
import { Stack } from '@novu/novui/jsx';
import { IconCopyAll, IconDynamicFeed, IconManageAccounts } from '@novu/novui/icons';
import { WorkflowGeneralSettings } from './WorkflowGeneralSettings';

const MOCK_DATA: SubscriptionPreferenceRow[] = [
  { channel: 'workflow', defaultValue: true, readOnly: false },
  { channel: ChannelTypeEnum.IN_APP, defaultValue: true, readOnly: true },
  { channel: ChannelTypeEnum.EMAIL, defaultValue: false, readOnly: true },
  { channel: ChannelTypeEnum.SMS, defaultValue: true, readOnly: false },
  { channel: ChannelTypeEnum.PUSH, defaultValue: false, readOnly: true },
  { channel: ChannelTypeEnum.CHAT, defaultValue: true, readOnly: false },
];

enum WorkflowSettingsPanelTab {
  GENERAL = 'general',
  PREFERENCES = 'preferences',
}

type WorkflowSettingsSidePanelContentProps = WorkflowSubscriptionPreferencesProps;
export const WorkflowSettingsSidePanelContent: FC<WorkflowSettingsSidePanelContentProps> = ({
  updateChannelPreferences,
  preferences,
}) => {
  return (
    <Tabs
      defaultValue={WorkflowSettingsPanelTab.GENERAL}
      tabConfigs={[
        {
          value: WorkflowSettingsPanelTab.GENERAL,
          label: 'General',
          icon: <IconDynamicFeed />,
          content: <WorkflowGeneralSettings />,
        },
        {
          value: WorkflowSettingsPanelTab.PREFERENCES,
          label: 'Preferences',
          icon: <IconManageAccounts />,
          content: (
            <Stack gap="150">
              <Text color="typography.text.secondary">
                Set default notification channels for subscribers, and determine which channels they can modify
                themselves.
              </Text>
              <WorkflowSubscriptionPreferences
                preferences={preferences}
                updateChannelPreferences={updateChannelPreferences}
              />
            </Stack>
          ),
        },
      ]}
    />
  );
};
