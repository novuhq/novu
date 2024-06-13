import { Tooltip } from '@novu/design-system';
import { IconButton, Text, type CoreProps, type IIconButtonProps } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import {
  IconOutlineAutoAwesomeMotion,
  IconOutlineAvTimer,
  IconOutlineEmail,
  IconOutlineForum,
  IconOutlineLayers,
  IconOutlineMobileFriendly,
  IconOutlineNotifications,
  IconOutlineSms,
  IconType,
} from '@novu/novui/icons';
import { VStack } from '@novu/novui/jsx';
import { vstack } from '@novu/novui/patterns';
import { FC, PropsWithChildren } from 'react';
import { LocalizedMessage } from '../../../types/LocalizedMessage';

type IWorkflowFloatingMenuProps = CoreProps;

export const WorkflowFloatingMenu: FC<IWorkflowFloatingMenuProps> = ({ className }) => {
  return (
    <menu className={cx(vstack({ display: 'flex !important', gap: '150' }), className)}>
      <WorkflowFloatingMenuSection title="Actions">
        <WorkflowFloatingMenuButton Icon={IconOutlineAutoAwesomeMotion} />
        <WorkflowFloatingMenuButton Icon={IconOutlineAvTimer} />
      </WorkflowFloatingMenuSection>
      <WorkflowFloatingMenuSection title="Channels">
        <WorkflowFloatingMenuButton
          Icon={IconOutlineNotifications}
          tooltipLabel="Guide of how to add an In-app step for embedding in code"
        />
        <WorkflowFloatingMenuButton
          Icon={IconOutlineEmail}
          tooltipLabel="Guide of how to add an Email step for embedding in code"
        />
        <WorkflowFloatingMenuButton
          Icon={IconOutlineSms}
          tooltipLabel="Guide of how to add an SMS step for embedding in code"
        />
        <WorkflowFloatingMenuButton
          Icon={IconOutlineMobileFriendly}
          tooltipLabel="Guide of how to add a Push step for embedding in code"
        />
        <WorkflowFloatingMenuButton
          Icon={IconOutlineForum}
          tooltipLabel="Guide of how to add a Chat step for embedding in code"
        />
      </WorkflowFloatingMenuSection>
    </menu>
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

interface IWorkflowFloatingMenuButtonProps extends IIconButtonProps {
  Icon: IconType;
  tooltipLabel?: LocalizedMessage;
}

function WorkflowFloatingMenuButton({ Icon, tooltipLabel }: IWorkflowFloatingMenuButtonProps) {
  return (
    <Tooltip label={tooltipLabel}>
      <IconButton
        Icon={Icon}
        className={css({
          padding: '50',
          borderRadius: '100',
          _hover: {
            // TODO: this doesn't work due to all the !important in novui... need to fix layer styles
            bg: 'legacy.B30 !important',
            '& svg': {
              color: 'typography.text.main !important',
            },
          },
        })}
      />
    </Tooltip>
  );
}
