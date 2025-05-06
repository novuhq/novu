import { StepEditorProps } from '@/components/workflow-editor/steps/configure-step-template-form';
import { EmailEditor } from '@/components/workflow-editor/steps/email/email-editor';
import { EmailEditorPreview } from '@/components/workflow-editor/steps/email/email-editor-preview';
import { TemplateTabs } from '@/components/workflow-editor/steps/template-tabs';
import { WorkflowOriginEnum } from '@novu/shared';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CustomStepControls } from '../controls/custom-step-controls';
import { useEditorPreview } from '../use-editor-preview';

export const EmailTabs = (props: StepEditorProps) => {
  const { workflow, step } = props;
  const { dataSchema, uiSchema } = step.controls;
  const form = useFormContext();
  const [tabsValue, setTabsValue] = useState('editor');

  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === WorkflowOriginEnum.EXTERNAL;

  const { editorValue, setEditorValue, previewStep, previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues: form.getValues(),
  });

  const editorContent = (
    <>
      {isNovuCloud && <EmailEditor uiSchema={uiSchema} />}
      {isExternal && <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />}
    </>
  );

  const previewContent = (
    <EmailEditorPreview
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
