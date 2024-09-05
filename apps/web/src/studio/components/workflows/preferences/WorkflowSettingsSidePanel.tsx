import { FC, useMemo } from 'react';

import { ChannelPreference, WorkflowChannelPreferences } from '@novu/shared';
import { Sidebar } from '@novu/design-system';
import { Title } from '@novu/novui';
import { WorkflowSettingsSidePanelContent } from './WorkflowSettingsSidePanelContent';
import { useCloudWorkflowChannelPreferences } from '../../../../hooks/workflowChannelPreferences/useCloudWorkflowChannelPreferences';
import { useUpdateWorkflowChannelPreferences } from '../../../../hooks/workflowChannelPreferences/useUpdateWorkflowChannelPreferences';
import { useStudioWorkflowChannelPreferences } from '../../../../hooks/workflowChannelPreferences/useStudioWorkflowChannelPreferences';
import { useStudioState } from '../../../StudioStateProvider';
import { SubscriptionPreferenceRow } from './types';

type WorkflowSettingsSidePanelProps = { onClose: () => void; workflowId: string };

export const WorkflowSettingsSidePanel: FC<WorkflowSettingsSidePanelProps> = ({ onClose, workflowId }) => {
  const {
    refetch,
    workflowChannelPreferences: cloudWorkflowChannelPreferences,
    isLoading: cloudIsLoading,
  } = useCloudWorkflowChannelPreferences(workflowId);
  const { workflowChannelPreferences: studioWorkflowChannelPreferences, isLoading: studioIsLoading } =
    useStudioWorkflowChannelPreferences(workflowId);
  const { updateWorkflowChannelPreferences, isLoading: isUpdating } = useUpdateWorkflowChannelPreferences(
    workflowId,
    refetch
  );
  const { isLocalStudio } = useStudioState() || {};

  const updateChannelPreferences = (preference: SubscriptionPreferenceRow) => {
    if (!cloudWorkflowChannelPreferences) {
      return;
    }

    const { channel, ...values }: SubscriptionPreferenceRow = preference;
    const result: WorkflowChannelPreferences = { ...cloudWorkflowChannelPreferences } as WorkflowChannelPreferences;

    if (channel === 'workflow') {
      result.workflow = values as ChannelPreference;
    } else {
      result.channels[channel] = values as ChannelPreference;
    }

    updateWorkflowChannelPreferences(result);
  };

  const preferences: SubscriptionPreferenceRow[] = useMemo(() => {
    if (!cloudWorkflowChannelPreferences && !studioWorkflowChannelPreferences) {
      return [];
    }

    const workflowChannelPreferences = (
      isLocalStudio ? studioWorkflowChannelPreferences : cloudWorkflowChannelPreferences
    ) as WorkflowChannelPreferences;

    const result: SubscriptionPreferenceRow[] = [{ channel: 'workflow', ...workflowChannelPreferences.workflow }];

    for (const channel of Object.keys(workflowChannelPreferences.channels)) {
      const channelPreferences = workflowChannelPreferences.channels[channel];

      result.push({
        channel,
        ...channelPreferences,
      });
    }

    return result;
  }, [cloudWorkflowChannelPreferences, studioWorkflowChannelPreferences, isLocalStudio]);

  return (
    <Sidebar customHeader={<Title variant="section">Workflow settings</Title>} isOpened onClose={onClose}>
      <WorkflowSettingsSidePanelContent
        channelPreferencesLoading={cloudIsLoading || studioIsLoading || isUpdating}
        preferences={preferences}
        updateChannelPreferences={updateChannelPreferences}
      />
    </Sidebar>
  );
};
