import { useParams } from 'react-router-dom';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from './WorkflowStepEditorControlsPanel';
import { useWorkflow, useWorkflowPreview } from '../../../hooks/useBridgeAPI';
import { useEffect, useState } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';
import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { BackButton } from '../../../../components/layout/components/LocalStudioHeader/BackButton';
import { DiscoverStepOutput } from '@novu/framework';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { OutlineButton } from '../../OutlineButton';
import { IconPlayArrow } from '@novu/design-system';

export const WorkflowsStepEditorPage = () => {
  const segment = useSegment();
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});

  const { templateId = '', stepId = '' } = useParams<{
    templateId: string;
    stepId: string;
  }>();

  const { data: workflow } = useWorkflow(templateId, {
    refetchOnWindowFocus: 'always',
  });

  const {
    data: preview,
    isLoading: loadingPreview,
    refetch,
    error,
  } = useWorkflowPreview(
    { workflowId: templateId, stepId: stepId, controls, payload },
    {
      refetchOnWindowFocus: 'always',
    }
  );

  function onControlsChange(type: string, form: any, id?: string) {
    switch (type) {
      case 'step':
        segment.track('Step Controls Changes', {
          key: id,
          origin: 'studio',
        });
        setStepControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }

    refetch();
  }

  const step = workflow?.steps.find((item) => item.stepId === stepId);

  return (
    <WorkflowsStepEditor
      source="studio"
      step={step}
      onControlsChange={onControlsChange}
      preview={preview}
      error={error}
      workflow={workflow}
      loadingPreview={loadingPreview}
      controls={controls}
    />
  );
};

export const WorkflowsStepEditor = ({
  source,
  onGoBack,
  onControlsChange,
  step,
  preview,
  error,
  workflow,
  loadingPreview,
  controls,
  showTestButton,
  onTestClick,
  onControlsSave,
  isSavingControls,
}: {
  controls: any;
  preview: any;
  error: any;
  workflow: any;
  loadingPreview: boolean;
  step?: DiscoverStepOutput;
  source?: 'studio' | 'playground' | 'dashboard';
  onGoBack?: () => void;
  onControlsChange: (type: string, form: any, id?: string) => void;
  showTestButton?: boolean;
  onTestClick?: () => void;
  onControlsSave?: () => void;
  isSavingControls?: boolean;
}) => {
  const title = step?.stepId;

  return (
    <PageWrapper
      source={source}
      onGoBack={onGoBack}
      title={title}
      step={step}
      showTestButton={showTestButton}
      onTestClick={onTestClick}
    >
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
          className={css({ marginTop: source === 'playground' ? '-40px' : '0' })}
          onSave={onControlsSave}
          isLoadingSave={isSavingControls}
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

function PageWrapper({ children, source, onGoBack, title, step, showTestButton, onTestClick }) {
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
    <WorkflowsPageTemplate
      title={title}
      icon={<Icon step={step} size="32" />}
      actions={
        showTestButton && (
          <OutlineButton Icon={IconPlayArrow} onClick={onTestClick}>
            Test workflow
          </OutlineButton>
        )
      }
    >
      {children}
    </WorkflowsPageTemplate>
  );
}
