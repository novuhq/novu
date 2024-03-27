import { PropsWithChildren } from 'react';
import { css, cx } from '../../styled-system/css';

export interface INavMenuFooterProps {
  className?: string;
  testId?: string;
}

export const NavMenuFooter: React.FC<PropsWithChildren<INavMenuFooterProps>> = ({ children, className, testId }) => {
  return (
    <footer
      className={cx(
        css({
          textStyle: 'text.secondary',
          color: 'typography.text.secondary',
          marginTop: 'auto',
          width: '100%',
        }),
        className
      )}
      data-test-id={testId}
    >
      {children}
    </footer>
  );
};
