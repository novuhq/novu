import { FC } from 'react';

import { Loader } from '@mantine/core';
import { Tabs, Text } from '@novu/novui';
import { IconDynamicFeed, IconManageAccounts } from '@novu/novui/icons';
import { Grid, Stack } from '@novu/novui/jsx';
import { token } from '@novu/novui/tokens';
import { Controller, useFormContext } from 'react-hook-form';
import { useStudioState } from '../../../StudioStateProvider';
import { WorkflowDetailFormContext } from './WorkflowDetailFormContextProvider';
import { WorkflowGeneralSettingsForm } from './WorkflowGeneralSettingsForm';
import { WorkflowSubscriptionPreferences } from './WorkflowSubscriptionPreferences';

enum WorkflowSettingsPanelTab {
  GENERAL = 'general',
  PREFERENCES = 'preferences',
}

type WorkflowSettingsSidePanelContentProps = {
  isLoading?: boolean;
};

export const WorkflowSettingsSidePanelContent: FC<WorkflowSettingsSidePanelContentProps> = ({ isLoading }) => {
  const { isLocalStudio } = useStudioState() || {};
  const { control } = useFormContext<WorkflowDetailFormContext>();

  return (
    <Tabs
      defaultValue={WorkflowSettingsPanelTab.GENERAL}
      colorPalette={isLocalStudio ? 'mode.local' : 'mode.cloud'}
      tabConfigs={[
        {
          value: WorkflowSettingsPanelTab.GENERAL,
          label: 'General',
          icon: <IconDynamicFeed />,
          content: isLoading ? <CenteredLoader /> : <WorkflowGeneralSettingsForm areSettingsDisabled={isLocalStudio} />,
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
              <Controller
                name="preferences"
                control={control}
                render={({ field }) => {
                  return (
                    <WorkflowSubscriptionPreferences
                      preferences={field.value}
                      updateChannelPreferences={field.onChange}
                      arePreferencesDisabled={isLocalStudio}
                    />
                  );
                }}
              ></Controller>
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
