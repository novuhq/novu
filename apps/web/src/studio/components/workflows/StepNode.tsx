import { Title } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import { hstack } from '@novu/novui/patterns';
import { FC } from 'react';
import { LocalizedMessage } from '../../../types/LocalizedMessage';
interface IStepNodeProps {
  icon: React.ReactNode;
  title: LocalizedMessage;
}

export const StepNode: FC<IStepNodeProps> = ({ icon, title }) => {
  return (
    <button
      className={cx(
        css({
          w: '[240px]',
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
        {icon}
        <Title variant="subsection">{title}</Title>
      </span>
    </button>
  );
};
