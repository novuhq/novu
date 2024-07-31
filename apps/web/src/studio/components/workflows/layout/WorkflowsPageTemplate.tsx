import { FC, PropsWithChildren } from 'react';
import { PageContainer } from '../../../layout/PageContainer';
import { PageMeta } from '../../../layout/PageMeta';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';
import { WorkflowsPageHeader, type IWorkflowsPageHeaderProps } from './WorkflowsPageHeader';

export type IWorkflowsPageTemplateProps = IWorkflowsPageHeaderProps;

export function StepIcon({ size, type }) {
  const IconElement = WORKFLOW_NODE_STEP_ICON_DICTIONARY[type];
  if (!IconElement) {
    return null;
  }

  return (
    <>
      <IconElement size={size} />
    </>
  );
}

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
      <WorkflowsPageHeader
        className={className}
        title={title}
        icon={icon}
        actions={actions}
        description={description}
      />
      {children}
    </PageContainer>
  );
};
