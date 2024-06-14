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
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { PageContainer } from '../../layout/PageContainer';
import { PageMeta } from '../../layout/PageMeta';
import { StepNode } from './StepNode';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';

export const WorkflowsDetailPage = () => {
  const title = 'Workflow name';
  const navigate = useNavigate();

  const handleSettingsClick = () => {};
  const handleTestClick = () => {};
  const handleStepClick = () => {
    // TODO: this is just a temporary step for connecting the prototype
    navigate(ROUTES.STUDIO_FLOWS_STEP_EDITOR);
  };

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
          backgroundImage: '[radial-gradient(var(--nv-colors-workflow-background-dots) 1.5px, transparent 0)]',
          backgroundSize: '[16px 16px]',
          p: '375',
          mx: '-150',
        })}
      >
        <VStack gap="0">
          <StepNode icon={<IconOutlineBolt size="32" />} title={'Workflow trigger'} />
          <StepNode icon={<IconOutlineNotifications size="32" />} title={'In-app step'} onClick={handleStepClick} />
          <StepNode icon={<IconOutlineEmail size="32" />} title={'Email step'} onClick={handleStepClick} />
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
