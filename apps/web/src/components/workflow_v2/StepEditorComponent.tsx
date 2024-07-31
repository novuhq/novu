import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { DiscoverStepOutput } from '@novu/framework';
import { IconPlayArrow } from '@novu/design-system';
import { WorkflowsPanelLayout } from '../../studio/components/workflows/layout/WorkflowsPanelLayout';
import { WorkflowStepEditorContentPanel } from '../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../studio/components/workflows/node-view/WorkflowNodes';
import { BackButton } from '../layout/components/LocalStudioHeader/BackButton';
import { WorkflowsPageTemplate } from '../../studio/components/workflows/layout/WorkflowsPageTemplate';
import { OutlineButton } from '../../studio/components/OutlineButton';

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
