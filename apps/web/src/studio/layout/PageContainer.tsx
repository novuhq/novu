import { CoreProps } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import { Container } from '@novu/novui/jsx';
import { FC, PropsWithChildren } from 'react';

export type IPageContainerProps = CoreProps;

export const PageContainer: FC<PropsWithChildren<IPageContainerProps>> = ({ children, className }) => {
  return (
    <Container
      className={cx(
        css({
          overflowX: 'hidden',
          borderRadius: '0',
          px: 'paddings.page.horizontal',
          py: 'paddings.page.vertical',
          m: '0',
          h: '100%',
          bg: 'surface.page',
          display: 'flex',
          flexDirection: 'column',
        }),
        className
      )}
    >
      {children}
    </Container>
  );
};
