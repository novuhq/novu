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

type IWorkflowFloatingMenuProps = CoreProps;

export const WorkflowFloatingMenu: FC<IWorkflowFloatingMenuProps> = ({ className }) => {
  const handleClick = (pathToSet: string) => () => {
    window.open(`https://docs.novu.co/sdks/framework/typescript/steps/${pathToSet}`, '_blank');
  };

  return (
    <>
      <menu className={cx(vstack({ display: 'flex', gap: '150', p: '50' }), className)}>
        <WorkflowFloatingMenuSection title="Actions">
          <WorkflowFloatingMenuButton
            Icon={IconOutlineAutoAwesomeMotion}
            tooltipLabel="View the Digest step documentation"
            onClick={handleClick('digest')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineAvTimer}
            tooltipLabel="View the Delay step documentation"
            onClick={handleClick('delay')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineBolt}
            tooltipLabel="View the Custom step documentation"
            onClick={handleClick('custom')}
          />
        </WorkflowFloatingMenuSection>
        <WorkflowFloatingMenuSection title="Channels">
          <WorkflowFloatingMenuButton
            Icon={IconOutlineNotifications}
            tooltipLabel="View the In-app step documentation"
            onClick={handleClick('inbox')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineEmail}
            tooltipLabel="View the Email step documentation"
            onClick={handleClick('email')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineSms}
            tooltipLabel="View the SMS step documentation"
            onClick={handleClick('sms')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineMobileFriendly}
            tooltipLabel="View the Push step documentation"
            onClick={handleClick('push')}
          />
          <WorkflowFloatingMenuButton
            Icon={IconOutlineForum}
            tooltipLabel="View the Chat step documentation"
            onClick={handleClick('chat')}
          />
        </WorkflowFloatingMenuSection>
      </menu>
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
