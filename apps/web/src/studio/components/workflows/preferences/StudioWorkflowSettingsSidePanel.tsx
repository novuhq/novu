import { FC, useEffect, useMemo } from 'react';

import { Sidebar } from '@novu/design-system';
import { Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { buildWorkflowPreferences } from '@novu/shared';
import { useStudioWorkflowPreferences } from '../../../../hooks/workflowPreferences/useStudioWorkflowPreferences';
import { useDiscover } from '../../../hooks/useBridgeAPI';
import { WorkflowDetailFormContext } from './WorkflowDetailFormContextProvider';
import { WorkflowSettingsSidePanelContent } from './WorkflowSettingsSidePanelContent';

type StudioWorkflowSettingsSidePanelProps = { onClose: () => void };

export const StudioWorkflowSettingsSidePanel: FC<StudioWorkflowSettingsSidePanelProps> = ({ onClose }) => {
  const { data } = useDiscover();
  const { templateId: workflowId = '' } = useParams<{ templateId: string }>();

  const { isLoading } = useStudioWorkflowPreferences(workflowId);
  const { setValue } = useFormContext<WorkflowDetailFormContext>();

  const workflow = useMemo(() => {
    return data?.workflows?.find((wf) => wf.workflowId === workflowId);
  }, [data, workflowId]);

  useEffect(() => {
    if (workflow) {
      setValue('general.workflowId', workflow.workflowId);
      setValue('general.name', workflow.name || workflow.workflowId);
      setValue('general.description', workflow.description || '');
      setValue('general.tags', workflow.tags || []);
      setValue('preferences', buildWorkflowPreferences(workflow.preferences));
    }
  }, [setValue, workflow]);

  return (
    <Sidebar customHeader={<Title variant="section">Workflow settings</Title>} isOpened onClose={onClose}>
      <div className={css({ colorPalette: 'mode.local' })}>
        <WorkflowSettingsSidePanelContent isLoading={isLoading} workflowResourcePreferences={null} />
      </div>
    </Sidebar>
  );
};
