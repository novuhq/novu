import { FC } from 'react';

import { Loader } from '@mantine/core';
import { Tabs, Text } from '@novu/novui';
import { IconDynamicFeed, IconManageAccounts } from '@novu/novui/icons';
import { Grid, Stack } from '@novu/novui/jsx';
import { token } from '@novu/novui/tokens';
import { WorkflowChannelPreferences } from '@novu/shared';
import { useStudioState } from '../../../StudioStateProvider';
import { WorkflowGeneralSettings } from './WorkflowGeneralSettings';
import {
  WorkflowSubscriptionPreferences,
  WorkflowSubscriptionPreferencesProps,
} from './WorkflowSubscriptionPreferences';
import { DEFAULT_WORKFLOW_PREFERENCES } from './WorkflowSubscriptionPreferences.const';

enum WorkflowSettingsPanelTab {
  GENERAL = 'general',
  PREFERENCES = 'preferences',
}

type WorkflowSettingsSidePanelContentProps = Omit<WorkflowSubscriptionPreferencesProps, 'preferences'> & {
  preferences?: WorkflowChannelPreferences;
  isLoading?: boolean;
};

export const WorkflowSettingsSidePanelContent: FC<WorkflowSettingsSidePanelContentProps> = ({
  updateChannelPreferences,
  preferences,
  isLoading,
}) => {
  const { isLocalStudio } = useStudioState() || {};

  return (
    <Tabs
      defaultValue={WorkflowSettingsPanelTab.GENERAL}
      colorPalette={isLocalStudio ? 'mode.local' : 'mode.cloud'}
      tabConfigs={[
        {
          value: WorkflowSettingsPanelTab.GENERAL,
          label: 'General',
          icon: <IconDynamicFeed />,
          content: isLoading ? <CenteredLoader /> : <WorkflowGeneralSettings />,
        },
        {
          value: WorkflowSettingsPanelTab.PREFERENCES,
          label: 'Preferences',
          icon: <IconManageAccounts />,
          content: isLoading ? (
            <CenteredLoader />
          ) : (
            <Stack gap="150">
              <Text color="typography.text.secondary">
                Set default notification channels for subscribers, and determine which channels they can modify
                themselves.
              </Text>
              <WorkflowSubscriptionPreferences
                preferences={preferences ?? DEFAULT_WORKFLOW_PREFERENCES}
                updateChannelPreferences={updateChannelPreferences}
                arePreferencesDisabled={isLocalStudio}
              />
            </Stack>
          ),
        },
      ]}
    />
  );
};

function CenteredLoader() {
  return (
    <Grid placeContent={'center'} h="full">
      <Loader color={token('colors.colorPalette.middle')} size={32} />
    </Grid>
  );
}
