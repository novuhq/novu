import { Button, Title } from '@novu/novui';
import { IconOutlineEmail, IconPlayArrow } from '@novu/novui/icons';
import { Flex, HStack } from '@novu/novui/jsx';
import { PageContainer } from '../../layout/PageContainer';
import { PageMeta } from '../../layout/PageMeta';
import { WorkflowsPanelLayout } from './layout';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from './WorkflowStepEditorInputsPanel';

export const WorkflowsStepEditorPage = () => {
  const title = 'Email step';

  const handleTestClick = () => {};

  return (
    <PageContainer>
      <PageMeta title={title} />
      <Flex justify={'space-between'} mb="100">
        <HStack gap="50">
          <IconOutlineEmail size="32" />
          <Title variant="section">{title}</Title>
        </HStack>
        <HStack gap="100">
          <Button Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
            Test workflow
          </Button>
        </HStack>
      </Flex>
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel />
        <WorkflowStepEditorInputsPanel />
      </WorkflowsPanelLayout>
    </PageContainer>
  );
};
