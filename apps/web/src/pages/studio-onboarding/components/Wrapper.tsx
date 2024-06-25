import { css, cx } from '@novu/novui/css';
import { ReactNode } from 'react';

export const Wrapper = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div
      className={cx(
        css({
          width: '100dvw',
          height: '100dvh',
          colorPalette: 'mode.cloud',
        }),
        className
      )}
    >
      {children}
    </div>
  );
};
