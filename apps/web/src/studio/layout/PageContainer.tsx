import { FC, PropsWithChildren, ReactNode } from 'react';
import { css, cx } from '@novu/novui/css';
import { PageHeader } from './PageHeader';
import { PageMeta } from './PageMeta';
import { Container } from '@novu/novui/jsx';
import { CoreProps } from '@novu/novui';

export interface IPageContainerProps extends CoreProps {
  // TODO: this should be LocalizedMessage, but PageContainer and PageHeader don't accept it
  title: string;
  header?: ReactNode;
}

export const PageContainer: FC<PropsWithChildren<IPageContainerProps>> = ({ title, children, header, className }) => {
  return (
    <Container
      className={cx(
        css({
          overflowY: 'auto !important',
          borderRadius: '0',
          px: 'paddings.page.horizontal',
          py: 'paddings.page.vertical',
          m: '0',
          h: '100%',
          bg: 'surface.page',
        }),
        className
      )}
    >
      <PageMeta title={title} />
      <PageHeader title={title} className={css({ mb: 'margins.layout.page.titleBottom' })} />
      {!!header && (
        <section
          className={css({
            mx: 'paddings.page.horizontal',
          })}
        >
          {header}
        </section>
      )}
      <section>{children}</section>
    </Container>
  );
};
