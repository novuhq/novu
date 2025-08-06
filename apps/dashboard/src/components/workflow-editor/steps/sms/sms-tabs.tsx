import { ResourceOriginEnum } from '@novu/shared';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CustomStepControls } from '@/components/workflow-editor/steps/controls/custom-step-controls';
import { SmsEditor } from '@/components/workflow-editor/steps/sms/sms-editor';
import { SmsEditorPreview } from '@/components/workflow-editor/steps/sms/sms-editor-preview';
import { StepEditorProps } from '@/components/workflow-editor/steps/step-editor-types';
import { TemplateTabs } from '@/components/workflow-editor/steps/template-tabs';
import { useEditorPreview } from '../use-editor-preview';

export const SmsTabs = (props: StepEditorProps) => {
  const { workflow, step } = props;
  const { dataSchema, uiSchema } = step.controls;
  const form = useFormContext();
  const [tabsValue, setTabsValue] = useState('editor');

  const controlValues = form.watch();
  const { editorValue, setEditorValue, previewStep, previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues,
    payloadSchema: workflow.payloadSchema,
  });

  const isNovuCloud = workflow.origin === ResourceOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === ResourceOriginEnum.EXTERNAL;

  const editorContent = (
    <>
      {isNovuCloud && <SmsEditor uiSchema={uiSchema} />}
      {isExternal && <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />}
    </>
  );

  const previewContent = (
    <SmsEditorPreview
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
      editorContent={editorContent}
      previewContent={previewContent}
      tabsValue={tabsValue}
      onTabChange={setTabsValue}
      previewStep={previewStep}
    />
  );
};
