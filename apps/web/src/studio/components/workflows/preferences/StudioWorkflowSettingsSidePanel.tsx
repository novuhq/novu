import { FC } from 'react';

import { Sidebar } from '@novu/design-system';
import { Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import { useParams } from 'react-router-dom';
import { useStudioWorkflowChannelPreferences } from '../../../../hooks/workflowChannelPreferences/useStudioWorkflowChannelPreferences';
import { WorkflowSettingsSidePanelContent } from './WorkflowSettingsSidePanelContent';

type StudioWorkflowSettingsSidePanelProps = { onClose: () => void };

export const StudioWorkflowSettingsSidePanel: FC<StudioWorkflowSettingsSidePanelProps> = ({ onClose }) => {
  const { templateId: workflowId = '' } = useParams<{ templateId: string }>();

  const { isLoading, workflowChannelPreferences } = useStudioWorkflowChannelPreferences(workflowId);

  return (
    <Sidebar customHeader={<Title variant="section">Workflow settings</Title>} isOpened onClose={onClose}>
      <div className={css({ colorPalette: 'mode.local' })}>
        <WorkflowSettingsSidePanelContent
          preferences={workflowChannelPreferences}
          // Users are not able to update preferences directly in studio -- they must use framework / code
          updateChannelPreferences={() => {}}
          isLoading={isLoading}
        />
      </div>
    </Sidebar>
  );
};
