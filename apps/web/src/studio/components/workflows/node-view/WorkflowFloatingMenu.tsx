import { Tooltip } from '@novu/design-system';
import { IconButton, LocalizedMessage, Text, type CoreProps, type IconButtonProps } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import {
  IconOutlineAutoAwesomeMotion,
  IconOutlineAvTimer,
  IconOutlineEmail,
  IconOutlineForum,
  IconOutlineMobileFriendly,
  IconOutlineNotifications,
  IconOutlineSms,
  IconOutlineBolt,
  IconType,
} from '@novu/novui/icons';
import { VStack } from '@novu/novui/jsx';
import { vstack } from '@novu/novui/patterns';
import { FC, PropsWithChildren } from 'react';
import { useDocsModal } from '../../../../components/docs/useDocsModal';

type IWorkflowFloatingMenuProps = CoreProps;

export const WorkflowFloatingMenu: FC<IWorkflowFloatingMenuProps> = ({ className }) => {
  const { Component: DocsModal, setPath, toggle } = useDocsModal();

  const handleClick = (pathToSet: string) => () => {
    setPath(`sdks/framework/typescript/steps/${pathToSet}`);
    toggle();
  };

  return (
    <>
      <menu className={cx(vstack({ display: 'flex', gap: '150', p: '50' }), className)}>
        <WorkflowFloatingMenuSection title="Actions">
          <WorkflowFloatingMenuButton
            Icon={IconOutlineAutoAwesomeMotion}
            tooltipLabel="Add a Digest step to your workflow"
            onClick={handleClick('digest')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineAvTimer}
            tooltipLabel="Add a Delay step to your workflow"
            onClick={handleClick('delay')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineBolt}
            tooltipLabel="Add a Custom step to your workflow"
            onClick={handleClick('custom')}
          />
        </WorkflowFloatingMenuSection>
        <WorkflowFloatingMenuSection title="Channels">
          <WorkflowFloatingMenuButton
            Icon={IconOutlineNotifications}
            tooltipLabel="Add an In-app step to your workflow"
            onClick={handleClick('inbox')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineEmail}
            tooltipLabel="Add an Email step to your workflow"
            onClick={handleClick('email')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineSms}
            tooltipLabel="Add an SMS step to your workflow"
            onClick={handleClick('sms')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineMobileFriendly}
            tooltipLabel="Add a Push step to your workflow"
            onClick={handleClick('push')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineForum}
            tooltipLabel="Add a Chat step to your workflow"
            onClick={handleClick('chat')}
          />
        </WorkflowFloatingMenuSection>
      </menu>
      <DocsModal />
    </>
  );
};

interface IWorkflowFloatingMenuSectionProps extends PropsWithChildren<CoreProps> {
  title: LocalizedMessage;
}

function WorkflowFloatingMenuSection({ title, children }: IWorkflowFloatingMenuSectionProps) {
  return (
    <VStack gap="50">
      <Text variant="secondary" fontWeight="strong">
        {title}
      </Text>
      {children}
    </VStack>
  );
}

interface IWorkflowFloatingMenuButtonProps extends IconButtonProps {
  Icon: IconType;
  tooltipLabel?: LocalizedMessage;
}

function WorkflowFloatingMenuButton({ Icon, tooltipLabel, onClick }: IWorkflowFloatingMenuButtonProps) {
  return (
    <Tooltip label={tooltipLabel} position="left">
      <IconButton
        onClick={onClick}
        Icon={Icon}
        className={css({
          padding: '75',
          borderRadius: '100',
          _hover: {
            bg: { base: 'legacy.B80', _dark: 'legacy.B30' },
            '& svg': {
              color: 'typography.text.main',
            },
          },
        })}
      />
    </Tooltip>
  );
}
