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
            // TODO: extract to semantic token
            borderColor: 'legacy.B40',
            // TODO: extract to semantic token
            height: '250',
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
          // TODO: extract to semantic token
          bg: { base: 'legacy.white', _dark: 'legacy.B17' },
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
