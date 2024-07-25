import { FC, PropsWithChildren } from 'react';
import { PageContainer } from '../../../layout/PageContainer';
import { PageMeta } from '../../../layout/PageMeta';
import { WorkflowsPageHeader, type IWorkflowsPageHeaderProps } from './WorkflowsPageHeader';
import { BackButton } from '../../../../components/layout/components/LocalStudioHeader/BackButton';

export type IWorkflowsPageTemplateProps = IWorkflowsPageHeaderProps;

export const WorkflowsPageTemplate: FC<PropsWithChildren<IWorkflowsPageTemplateProps>> = ({
  title,
  children,
  icon,
  actions,
  description,
  className,
}) => {
  return (
    <PageContainer className={className}>
      <PageMeta title={title} />
      <BackButton onClick={() => {}} />
      <WorkflowsPageHeader title={title} icon={icon} actions={actions} description={description} />
      {children}
    </PageContainer>
  );
};
