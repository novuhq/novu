import { css, cx } from '@novu/novui/css';
import { ReactNode, useEffect } from 'react';

export const Wrapper = ({ children, className }: { children: ReactNode; className?: string }) => {
  useEffect(() => {
    document.body.setAttribute('style', 'overflow: auto');
  }, []);

  return (
    <div
      className={cx(
        css({
          width: '100dvw',
          minHeight: '100dvh',
          colorPalette: 'mode.cloud',
          paddingBottom: '4rem',
          bg: 'surface.panel',
        }),
        className
      )}
    >
      {children}
    </div>
  );
};
