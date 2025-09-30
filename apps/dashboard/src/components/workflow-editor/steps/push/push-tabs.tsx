import { ResourceOriginEnum } from '@novu/shared';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { PushEditor } from '@/components/workflow-editor/steps/push/push-editor';
import { StepEditorProps } from '@/components/workflow-editor/steps/step-editor-types';
import { CustomStepControls } from '../controls/custom-step-controls';
import { TemplateTabs } from '../template-tabs';
import { useEditorPreview } from '../use-editor-preview';
import { PushEditorPreview } from './push-editor-preview';

export const PushTabs = (props: StepEditorProps) => {
  const { workflow, step } = props;
  const { dataSchema, uiSchema } = step.controls;
  const [tabsValue, setTabsValue] = useState('editor');
  const form = useFormContext();
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
