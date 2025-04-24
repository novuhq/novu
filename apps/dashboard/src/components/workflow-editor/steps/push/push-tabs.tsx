import { useState } from 'react';
import { WorkflowOriginEnum } from '@novu/shared';
import { StepEditorProps } from '@/components/workflow-editor/steps/configure-step-template-form';
import { PushEditor } from '@/components/workflow-editor/steps/push/push-editor';
import { CustomStepControls } from '../controls/custom-step-controls';
import { TemplateTabs } from '../template-tabs';
import { PushEditorPreview } from './push-editor-preview';
import { useFormContext } from 'react-hook-form';
import { useEditorPreview } from '../use-editor-preview';

export const PushTabs = (props: StepEditorProps) => {
  const { workflow, step } = props;
  const { dataSchema, uiSchema } = step.controls;
  const [tabsValue, setTabsValue] = useState('editor');
  const form = useFormContext();
  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === WorkflowOriginEnum.EXTERNAL;

  const { editorValue, setEditorValue, previewStep, previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues: form.getValues(),
  });

  const editorContent = (
    <>
      {isNovuCloud && <PushEditor uiSchema={uiSchema} />}
      {isExternal && <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />}
    </>
  );

  const previewContent = (
    <PushEditorPreview
      editorValue={editorValue}
      setEditorValue={setEditorValue}
      previewStep={previewStep}
      previewData={previewData}
      isPreviewPending={isPreviewPending}
    />
  );

  return (
    <TemplateTabs
      previewStep={previewStep}
      editorContent={editorContent}
      previewContent={previewContent}
      tabsValue={tabsValue}
      onTabChange={setTabsValue}
    />
  );
};
