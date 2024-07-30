import { useParams } from 'react-router-dom';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from './WorkflowStepEditorControlsPanel';
import { useWorkflow, useWorkflowPreview } from '../../../hooks/useBridgeAPI';
import { useEffect, useMemo, useState } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';
import { useTelemetry } from '../../../../hooks/useNovuAPI';
import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { BackButton } from '../../../../components/layout/components/LocalStudioHeader/BackButton';

export const WorkflowsStepEditorPage = ({
  workflowId,
  parentStepId,
  source,
  onGoBack,
}: {
  workflowId?: string;
  parentStepId?: string;
  source?: 'studio' | 'playground' | 'dashboard';
  onGoBack?: () => void;
}) => {
  const track = useTelemetry();
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});
  const { templateId = '', stepId = '' } = useParams<{
    templateId: string;
    stepId: string;
  }>();

  const { data: workflow } = useWorkflow(workflowId || templateId, {
    ...(source === 'playground' ? {} : { refetchOnWindowFocus: 'always' }),
  });
  const {
    data: preview,
    isLoading: loadingPreview,
    refetch,
    error,
  } = useWorkflowPreview(
    { workflowId: workflowId || templateId, stepId: parentStepId || stepId, controls, payload },
    {
      ...(source === 'playground' ? {} : { refetchOnWindowFocus: 'always' }),
    }
  );

  const step = workflow?.steps.find((item) => item.stepId === parentStepId || item.stepId === stepId);
  const title = step?.stepId;

  function onControlsChange(type: string, form: any, id?: string) {
    switch (type) {
      case 'step':
        track('Step Controls Changes', {
          key: id,
          origin: source === 'playground' ? 'playground' : 'local',
        });
        setStepControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }

    refetch();
  }

  return (
    <PageWrapper source={source} onGoBack={onGoBack} title={title} step={step}>
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel
          source={source}
          onlyPreviewView={source === 'playground'}
          step={step}
          error={error}
          preview={preview}
          isLoadingPreview={loadingPreview}
        />
        <WorkflowStepEditorControlsPanel
          source={source}
          step={step}
          workflow={workflow}
          onChange={onControlsChange}
          defaultControls={controls}
        />
      </WorkflowsPanelLayout>
    </PageWrapper>
  );
};

function Icon({ size, step }) {
  const IconElement = WORKFLOW_NODE_STEP_ICON_DICTIONARY[step?.type];
  if (!IconElement) {
    return null;
  }

  return (
    <>
      <IconElement size={size} />
    </>
  );
}

function PageWrapper({ children, source, onGoBack, title, step }) {
  if (source === 'playground') {
    return (
      <div>
        <HStack
          className={css({ marginTop: '8px', marginBottom: '8px', height: 'inherit', borderRadius: '0 8px 8px 0' })}
        >
          <BackButton
            styles={{
              paddingLeft: '0',
              paddingRight: '0',
              _hover: { '& p, & svg': { color: 'typography.text.main !important' } },
            }}
            onClick={() => {
              if (onGoBack) {
                onGoBack();
              }
            }}
          />
        </HStack>
        {children}
      </div>
    );
  }

  return (
    <WorkflowsPageTemplate title={title} icon={<Icon step={step} size="32" />}>
      {children}
    </WorkflowsPageTemplate>
  );
}
