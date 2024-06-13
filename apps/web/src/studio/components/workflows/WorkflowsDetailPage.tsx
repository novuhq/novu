import { Button, IconButton, Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import {
  IconCable,
  IconOutlineBolt,
  IconOutlineEmail,
  IconOutlineNotifications,
  IconPlayArrow,
  IconSettings,
} from '@novu/novui/icons';
import { Flex, HStack, VStack } from '@novu/novui/jsx';
import { PageContainer } from '../../layout/PageContainer';
import { PageMeta } from '../../layout/PageMeta';
import { StepNode } from './StepNode';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';

export const WorkflowsDetailPage = () => {
  const title = 'Workflow name';

  const handleSettingsClick = () => {};
  const handleTestClick = () => {};

  return (
    <PageContainer className={css({ colorPalette: 'mode.local' })}>
      <PageMeta title={title} />
      <Flex justify={'space-between'} mb="100">
        <HStack gap="50">
          <IconCable size="32" />
          <Title variant="section">{title}</Title>
        </HStack>
        <HStack gap="100">
          <Button Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
            Test workflow
          </Button>
          <IconButton Icon={IconSettings} onClick={handleSettingsClick} />
        </HStack>
      </Flex>
      <Flex
        // TODO fix this
        h="[95%]"
        justifyContent="center"
        className={css({
          // FIXME: popover token isn't correct. Also, ideally there should be a better way to use a token here
          backgroundImage: '[radial-gradient(var(--nv-colors-surface-popover) 1.5px, transparent 0)]',
          backgroundSize: '[16px 16px]',
          p: '375',
          mx: '-150',
        })}
      >
        <VStack gap="0">
          <StepNode icon={<IconOutlineBolt size="32" />} title={'Workflow trigger'} />
          <StepNode icon={<IconOutlineNotifications size="32" />} title={'Workflow trigger'} />
          <StepNode icon={<IconOutlineEmail size="32" />} title={'Workflow trigger'} />
        </VStack>
      </Flex>
      <WorkflowFloatingMenu
        className={css({
          zIndex: 'docked',
          position: 'fixed',
          // TODO: need to talk with Nik about how to position this
          top: '[182px]',
          right: '50',
        })}
      />
    </PageContainer>
  );
};
