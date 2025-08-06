import { ResourceOriginEnum } from '@novu/shared';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { EmailEditor } from '@/components/workflow-editor/steps/email/email-editor';
import { EmailEditorPreview } from '@/components/workflow-editor/steps/email/email-editor-preview';
import { StepEditorProps } from '@/components/workflow-editor/steps/step-editor-types';
import { TemplateTabs } from '@/components/workflow-editor/steps/template-tabs';
import { CustomStepControls } from '../controls/custom-step-controls';
import { useEditorPreview } from '../use-editor-preview';

export const EmailTabs = (props: StepEditorProps) => {
  const { workflow, step } = props;
  const { dataSchema, uiSchema } = step.controls;
  const form = useFormContext();
  const [tabsValue, setTabsValue] = useState('editor');

  const isNovuCloud = workflow.origin === ResourceOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === ResourceOriginEnum.EXTERNAL;

  const controlValues = form.watch();
  const { editorValue, setEditorValue, previewStep, previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues,
    payloadSchema: workflow.payloadSchema,
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
      workflow={workflow}
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
