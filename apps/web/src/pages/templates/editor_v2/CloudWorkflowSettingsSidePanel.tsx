import { FC, useEffect } from 'react';

import { Sidebar } from '@novu/design-system';
import { Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import { useFormContext } from 'react-hook-form';
import { useParams, useSearchParams } from 'react-router-dom';
import { WorkflowTypeEnum } from '@novu/shared';
import { useCloudWorkflowPreferences } from '../../../hooks/workflowPreferences/useCloudWorkflowPreferences';
import { WorkflowDetailFormContext } from '../../../studio/components/workflows/preferences/WorkflowDetailFormContextProvider';
import { WorkflowSettingsSidePanelContent } from '../../../studio/components/workflows/preferences/WorkflowSettingsSidePanelContent';

type CloudWorkflowSettingsSidePanelProps = { onClose: () => void };

export const CloudWorkflowSettingsSidePanel: FC<CloudWorkflowSettingsSidePanelProps> = ({ onClose }) => {
  const { templateId: workflowId = '' } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const { isLoading, workflowUserPreferences, workflowResourcePreferences } = useCloudWorkflowPreferences(workflowId);
  const { setValue, getValues } = useFormContext<WorkflowDetailFormContext>();

  useEffect(() => {
    if (workflowUserPreferences !== undefined && getValues('preferences') === undefined) {
      setValue('preferences', workflowUserPreferences, { shouldDirty: false });
    }
  }, [setValue, workflowUserPreferences]);

  return (
    <Sidebar customHeader={<Title variant="section">Workflow settings</Title>} isOpened onClose={onClose}>
      <div className={css({ colorPalette: 'mode.local' })}>
        <WorkflowSettingsSidePanelContent
          isLoading={isLoading}
          workflowType={searchParams.get('type') as WorkflowTypeEnum}
          workflowResourcePreferences={workflowResourcePreferences}
        />
      </div>
    </Sidebar>
  );
};
