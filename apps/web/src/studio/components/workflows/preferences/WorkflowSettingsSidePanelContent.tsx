import { FC } from 'react';

import { Tabs, Text } from '@novu/novui';
import { IconDynamicFeed, IconManageAccounts } from '@novu/novui/icons';
import { Stack } from '@novu/novui/jsx';
import { WorkflowGeneralSettings } from './WorkflowGeneralSettings';
import {
  WorkflowSubscriptionPreferences,
  WorkflowSubscriptionPreferencesProps,
} from './WorkflowSubscriptionPreferences';

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
