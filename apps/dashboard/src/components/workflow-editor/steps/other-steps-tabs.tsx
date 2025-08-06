import { useState } from 'react';
import { CustomStepControls } from './controls/custom-step-controls';
import type { StepEditorProps } from './step-editor-types';
import { TemplateTabs } from './template-tabs';

export const OtherStepTabs = ({ workflow, step }: StepEditorProps) => {
  const { dataSchema } = step.controls;
  const [tabsValue, setTabsValue] = useState('editor');

  const editorContent = (
    <div className="px-3 py-5">
      <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />
    </div>
  );

  const previewContent = null;

  return (
    <TemplateTabs
      editorContent={editorContent}
      previewContent={previewContent}
      tabsValue={tabsValue}
      onTabChange={setTabsValue}
    />
  );
};
