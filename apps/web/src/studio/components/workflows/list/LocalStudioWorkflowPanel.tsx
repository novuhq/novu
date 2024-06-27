import { Text } from '@novu/novui';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { Stack, VStack } from '@novu/novui/jsx';
import { PageContainer } from '../../../layout';
import { useDiscover } from '../../../hooks';
import { DocsButton } from '../../../../components/docs/DocsButton';
import { useStudioNavigate } from '../../../hooks';
import { ROUTES } from '../../../../constants/routes';
import { hstack } from '@novu/novui/patterns';
import { css, cx } from '@novu/novui/css';
import { Skeleton } from '@mantine/core';
import { token } from '@novu/novui/tokens';
import { WorkflowBackgroundWrapper } from '../node-view/WorkflowBackgroundWrapper';

export const LocalStudioWorkflowPanel = () => {
  const { data, isLoading } = useDiscover();
  const navigate = useStudioNavigate();
  const hasWorkflows = data?.workflows && data?.workflows?.length > 0;

  if (isLoading) {
    return <WorkflowsContentLoading />;
  }

  if (!hasWorkflows && !isLoading) {
    return <WorkflowPanelEmptyState />;
  }

  if (hasWorkflows) {
    navigate(ROUTES.STUDIO_FLOWS_VIEW, { templateId: data?.workflows[0].workflowId });
  }

  return <></>;
};

function WorkflowPanelEmptyState() {
  return (
    <PageContainer className={css({ alignContent: 'center' })}>
      <VStack gap="margins.layout.text.paragraph">
        <VStack gap="0">
          <Text color={'typography.text.secondary'}>
            A workflow holds the entire flow of steps that are sent to the subscriber.
          </Text>
          <Text color={'typography.text.secondary'}>
            Get started by adding your first workflow in your local environment.
          </Text>
        </VStack>
        <DocsButton
          TriggerButton={({ onClick }) => (
            <button onClick={onClick} className={hstack({ gap: 'margins.icons.Icon20-txt', cursor: 'pointer' })}>
              <IconOutlineMenuBook />
              <Text color={'typography.text.secondary'}>Learn more in the docs</Text>
            </button>
          )}
        />
      </VStack>
    </PageContainer>
  );
}
function WorkflowsContentLoading() {
  return (
    <PageContainer>
      <Stack pl={'75'} py={'150'}>
        <Skeleton height={token('lineHeights.100')} width={'20%'} radius="md" />
      </Stack>
      <WorkflowBackgroundWrapper>
        <VStack gap="0" p="75">
          <StepNodeSkeleton />
          <StepNodeSkeleton />
          <StepNodeSkeleton />
        </VStack>
      </WorkflowBackgroundWrapper>
    </PageContainer>
  );
}

function StepNodeSkeleton() {
  return (
    <div
      className={cx(
        css({
          w: '[240px]',
          cursor: 'pointer',
          '&:not(:last-of-type):after': {
            content: '""',
            position: 'relative',
            borderLeft: 'dashed',
            borderColor: 'workflow.node.connector',
            height: 'workflow.nodes.gap',
            display: 'block',
            left: '[calc(50% - 1px)]',
          },
        })
      )}
    >
      <span
        className={hstack({
          gap: '50',
          p: '150',
          shadow: 'medium',
          bg: 'workflow.node.surface',
          borderRadius: '150',
          _hover: {
            opacity: 'hover',
          },
        })}
      >
        <Skeleton height={token('lineHeights.200')} width={token('lineHeights.200')} radius={8} />
        <Skeleton height={token('lineHeights.100')} width={'70%'} radius="md" />
      </span>
    </div>
  );
}
