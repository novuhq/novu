import { Title, type LocalizedMessage } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import { hstack } from '@novu/novui/patterns';
import { FC, MouseEventHandler } from 'react';
interface IStepNodeProps {
  icon: React.ReactNode;
  title: LocalizedMessage;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export const StepNode: FC<IStepNodeProps> = ({ icon, title, onClick }) => {
  return (
    <button
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
      onClick={onClick}
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
        {icon}
        <Title variant="subsection">{title}</Title>
      </span>
    </button>
  );
};
