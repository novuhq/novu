import { FC, PropsWithChildren } from 'react';
import { PageContainer } from '../../../layout/PageContainer';
import { PageMeta } from '../../../layout/PageMeta';
import { WorkflowsPageHeader, type IWorkflowsPageHeaderProps } from './WorkflowsPageHeader';

export type IWorkflowsPageTemplateProps = IWorkflowsPageHeaderProps;

export const WorkflowsPageTemplate: FC<PropsWithChildren<IWorkflowsPageTemplateProps>> = ({
  title,
  children,
  icon,
  className,
}) => {
  return (
    <PageContainer className={className}>
      <PageMeta title={title} />
      <WorkflowsPageHeader title={title} icon={icon} />
      <section>{children}</section>
    </PageContainer>
  );
};
