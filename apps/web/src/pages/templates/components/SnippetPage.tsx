import { Text } from '@mantine/core';
import { colors } from '@novu/design-system';

import { TriggerSnippetTabs } from './TriggerSnippetTabs';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { TriggerSegmentControl } from './TriggerSegmentControl';
import { When } from '../../../components/utils/When';
import { WorkflowSidebar } from './WorkflowSidebar';

export function SnippetPage() {
  const { trigger, isCreating, isUpdating } = useTemplateEditorForm();

  return (
    <WorkflowSidebar title="Trigger">
      <Text color={colors.B60} mt={-16}>
        Test trigger as if you sent it from your API or implement it by copy/pasting it into the codebase of your
        application.
      </Text>
      <When truthy={!isCreating && !isUpdating}>
        <TriggerSegmentControl />
        {trigger && <TriggerSnippetTabs trigger={trigger} />}
      </When>
    </WorkflowSidebar>
  );
}
