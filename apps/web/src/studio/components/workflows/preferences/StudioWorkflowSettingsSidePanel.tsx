import { FC, useEffect, useMemo } from 'react';

import { Sidebar } from '@novu/design-system';
import { Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { useStudioWorkflowChannelPreferences } from '../../../../hooks/workflowChannelPreferences/useStudioWorkflowChannelPreferences';
import { useDiscover } from '../../../hooks/useBridgeAPI';
import { WorkflowDetailFormContext } from './WorkflowDetailFormContextProvider';
import { WorkflowSettingsSidePanelContent } from './WorkflowSettingsSidePanelContent';

type StudioWorkflowSettingsSidePanelProps = { onClose: () => void };

export const StudioWorkflowSettingsSidePanel: FC<StudioWorkflowSettingsSidePanelProps> = ({ onClose }) => {
  const { data } = useDiscover();
  const { templateId: workflowId = '' } = useParams<{ templateId: string }>();

  const { isLoading } = useStudioWorkflowChannelPreferences(workflowId);
  const { setValue } = useFormContext<WorkflowDetailFormContext>();

  const workflow = useMemo(() => {
    return data?.workflows?.find((workflow) => workflow.workflowId === workflowId);
  }, [data, workflowId]);

  useEffect(() => {
    if (workflow) {
      setValue('general.workflowId', workflow.workflowId);
      setValue('preferences', workflow.preferences);
    }
  }, [workflow]);

  return (
    <Sidebar customHeader={<Title variant="section">Workflow settings</Title>} isOpened onClose={onClose}>
      <div className={css({ colorPalette: 'mode.local' })}>
        <WorkflowSettingsSidePanelContent isLoading={isLoading} />
      </div>
    </Sidebar>
  );
};
