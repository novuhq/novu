import { useParams } from 'react-router-dom';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from './WorkflowStepEditorControlsPanel';
import { useBridgeAPI, useWorkflow } from '../../../hooks/useBridgeAPI';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';
import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { BackButton } from '../../../../components/layout/components/LocalStudioHeader/BackButton';
import { DiscoverStepOutput } from '@novu/framework';
import { OutlineButton } from '../../OutlineButton';
import { IconPlayArrow } from '@novu/design-system';
import { useControlsHandler } from '../../../../hooks/workflow/useControlsHandler';

export const WorkflowsStepEditorPage = () => {
  const bridgeApi = useBridgeAPI();

  const { templateId = '', stepId = '' } = useParams<{
    templateId: string;
    stepId: string;
  }>();

  const { data: workflow } = useWorkflow(templateId, {
    refetchOnWindowFocus: 'always',
  });
  const {
    preview,
    isLoading: loadingPreview,
    error,
    controls,
    onControlsChange,
  } = useControlsHandler((data) => bridgeApi.getStepPreview(data), templateId, stepId, 'studio');

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
      defaultControls={controls}
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
  defaultControls,
  showTestButton,
  onTestClick,
  onControlsSave,
  isSavingControls,
}: {
  defaultControls: any;
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
          defaultControls={defaultControls}
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
