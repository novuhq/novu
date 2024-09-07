import { FC, useEffect } from 'react';

import { Sidebar } from '@novu/design-system';
import { Title } from '@novu/novui';
import { useParams } from 'react-router-dom';
import { useCloudWorkflowChannelPreferences } from '../../../hooks/workflowChannelPreferences/useCloudWorkflowChannelPreferences';
import { useUpdateWorkflowChannelPreferences } from '../../../hooks/workflowChannelPreferences/useUpdateWorkflowChannelPreferences';
import { WorkflowSettingsSidePanelContent } from '../../../studio/components/workflows/preferences/WorkflowSettingsSidePanelContent';
import { css } from '@novu/novui/css';
import { useFormContext } from 'react-hook-form';
import { WorkflowDetailFormContext } from '../../../studio/components/workflows/preferences/WorkflowDetailFormContextProvider';

type CloudWorkflowSettingsSidePanelProps = { onClose: () => void };

// FIXME: move this!
export const CloudWorkflowSettingsSidePanel: FC<CloudWorkflowSettingsSidePanelProps> = ({ onClose }) => {
  // TODO: safeguard against no url
  const { templateId: workflowId = '' } = useParams<{ templateId: string }>();

  const { isLoading, workflowChannelPreferences } = useCloudWorkflowChannelPreferences(workflowId);
  const { updateWorkflowChannelPreferences } = useUpdateWorkflowChannelPreferences(workflowId);

  const { setValue } = useFormContext<WorkflowDetailFormContext>();

  useEffect(() => {
    if (workflowChannelPreferences) {
      setValue('preferences', workflowChannelPreferences);
    }
  }, [workflowChannelPreferences]);

  return (
    <Sidebar customHeader={<Title variant="section">Workflow settings</Title>} isOpened onClose={onClose}>
      <div className={css({ colorPalette: 'mode.local' })}>
        <WorkflowSettingsSidePanelContent
          preferences={workflowChannelPreferences}
          updateChannelPreferences={updateWorkflowChannelPreferences}
          isLoading={isLoading}
        />
      </div>
    </Sidebar>
  );
};
