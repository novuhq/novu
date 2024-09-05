import { Flex } from '@novu/novui/jsx';
import { css, cx } from '@novu/novui/css';
import { FCWithChildren } from '../../../../types';

export const WorkflowBackgroundWrapper: FCWithChildren = ({ className, children }) => {
  return (
    <Flex
      justifyContent="center"
      flexGrow={1}
      className={cx(
        css({
          // FIXME: popover token isn't correct. Also, ideally there should be a better way to use a token here
          backgroundImage: '[radial-gradient(var(--nv-colors-workflow-background-dots) 1.5px, transparent 0)]',
          backgroundSize: '[16px 16px]',
          p: '375',
          mx: '-150',
        }),
        className
      )}
    >
      {children}
    </Flex>
  );
};
