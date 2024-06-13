import { CoreProps } from '@novu/novui';
import { css } from '@novu/novui/css';
import { FC, PropsWithChildren, ReactNode } from 'react';
import { PageContainer } from './PageContainer';
import { PageHeader } from './PageHeader';
import { PageMeta } from './PageMeta';

export interface IPageTemplateProps extends CoreProps {
  // TODO: this should be LocalizedMessage, but PageContainer and PageHeader don't accept it
  title: string;
  header?: ReactNode;
}

export const PageTemplate: FC<PropsWithChildren<IPageTemplateProps>> = ({ title, children, header, className }) => {
  return (
    <PageContainer className={className}>
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
    </PageContainer>
  );
};
