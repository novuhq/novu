import { PageContainer, When } from '@novu/design-system';
import { FC, PropsWithChildren, ReactNode } from 'react';
import PageHeader from '../../components/layout/components/PageHeader';
import { css } from '../../styled-system/css';

export interface ISettingsPageContainerProps {
  // TODO: this should be LocalizedMessage, but PageContainer and PageHeader don't accept it
  title: string;
  header?: ReactNode;
}

/**
 * This should eventually replace `Container` in the design system
 */
const SettingsPageContentContainer: FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <section
      className={css({
        m: '150',
        bg: 'surface.page',
      })}
    >
      {children}
    </section>
  );
};

export const SettingsPageContainer: FC<PropsWithChildren<ISettingsPageContainerProps>> = ({
  title,
  children,
  header,
}) => {
  return (
    <PageContainer title={title}>
      <PageHeader title={title} />
      <When truthy={!!header}>
        <section
          className={css({
            mx: '150',
          })}
        >
          {header}
        </section>
      </When>
      <SettingsPageContentContainer>{children}</SettingsPageContentContainer>
    </PageContainer>
  );
};
