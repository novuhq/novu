import { FC, useEffect } from 'react';

import { Sidebar } from '@novu/design-system';
import { Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import { useFormContext } from 'react-hook-form';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCloudWorkflowChannelPreferences } from '../../../hooks/workflowChannelPreferences/useCloudWorkflowChannelPreferences';
import { WorkflowDetailFormContext } from '../../../studio/components/workflows/preferences/WorkflowDetailFormContextProvider';
import { WorkflowSettingsSidePanelContent } from '../../../studio/components/workflows/preferences/WorkflowSettingsSidePanelContent';
import { WorkflowTypeEnum } from '@novu/shared';

type CloudWorkflowSettingsSidePanelProps = { onClose: () => void };

export const CloudWorkflowSettingsSidePanel: FC<CloudWorkflowSettingsSidePanelProps> = ({ onClose }) => {
  const { templateId: workflowId = '' } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const { isLoading, workflowChannelPreferences } = useCloudWorkflowChannelPreferences(workflowId);
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
          isLoading={isLoading}
          workflowType={searchParams.get('type') as WorkflowTypeEnum}
        />
      </div>
    </Sidebar>
  );
};
