import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { InAppEditor } from '@/components/workflow-editor/steps/in-app/in-app-editor';
import { InAppEditorPreview } from '@/components/workflow-editor/steps/in-app/in-app-editor-preview';
import { StepEditorProps } from '@/components/workflow-editor/steps/step-editor-types';
import { TemplateTabs } from '@/components/workflow-editor/steps/template-tabs';
import { ResourceOriginEnum } from '@/utils/enums';
import { CustomStepControls } from '../controls/custom-step-controls';
import { useEditorPreview } from '../use-editor-preview';

export const InAppTabs = (props: StepEditorProps) => {
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
