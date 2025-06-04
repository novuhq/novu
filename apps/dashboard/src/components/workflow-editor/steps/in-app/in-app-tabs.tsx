import { StepEditorProps } from '@/components/workflow-editor/steps/configure-step-template-form';
import { InAppEditor } from '@/components/workflow-editor/steps/in-app/in-app-editor';
import { InAppEditorPreview } from '@/components/workflow-editor/steps/in-app/in-app-editor-preview';
import { TemplateTabs } from '@/components/workflow-editor/steps/template-tabs';
import { WorkflowOriginEnum } from '@/utils/enums';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CustomStepControls } from '../controls/custom-step-controls';
import { useEditorPreview } from '../use-editor-preview';

export const InAppTabs = (props: StepEditorProps) => {
  const { workflow, step } = props;
  const { dataSchema, uiSchema } = step.controls;
  const form = useFormContext();
  const [tabsValue, setTabsValue] = useState('editor');

  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === WorkflowOriginEnum.EXTERNAL;

  // Watch specific fields that matter for in-app previews
  const watchedValues = form.watch([
    'subject',
    'body',
    'avatar',
    'primaryAction',
    'secondaryAction',
    'redirect',
    'data',
    'disableOutputSanitization',
  ]);
  const controlValues = {
    subject: watchedValues[0],
    body: watchedValues[1],
    avatar: watchedValues[2],
    primaryAction: watchedValues[3],
    secondaryAction: watchedValues[4],
    redirect: watchedValues[5],
    data: watchedValues[6],
    disableOutputSanitization: watchedValues[7],
  };

  const { editorValue, setEditorValue, previewStep, previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues,
  });

  const editorContent = (
    <>
      {isNovuCloud && <InAppEditor uiSchema={uiSchema} />}
      {isExternal && <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />}
    </>
  );

  const previewContent = (
    <InAppEditorPreview
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
