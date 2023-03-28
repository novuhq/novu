import { Text } from '@mantine/core';
import { colors } from '../../../design-system';
import { TriggerSnippetTabs } from './TriggerSnippetTabs';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { SubPageWrapper } from './SubPageWrapper';
import { TriggerSegmentControl } from './TriggerSegmentControl';

export function SnippetPage() {
  const { trigger } = useTemplateEditorForm();

  return (
    <>
      <SubPageWrapper title="Trigger">
        <Text color={colors.B60} mt={-16} mb={24}>
          Test trigger as if you sent it from your API or implement it by copy/pasting it into the codebase of your
          application
        </Text>
        <TriggerSegmentControl />
        {trigger && <TriggerSnippetTabs trigger={trigger} />}
      </SubPageWrapper>
    </>
  );
}
