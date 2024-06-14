import { CoreProps, type LocalizedString, Title } from '@novu/novui';
import { Flex, HStack } from '@novu/novui/jsx';
import { FC, ReactNode } from 'react';

export interface IWorkflowsPageHeaderProps extends CoreProps {
  title: LocalizedString;
  icon: React.ReactNode;
  /** Children represent the action bar */
  children?: ReactNode | ReactNode[];
}

export const WorkflowsPageHeader: FC<IWorkflowsPageHeaderProps> = ({ icon, title, children }) => {
  return (
    <Flex justify={'space-between'} mb="100">
      <HStack gap="50">
        {icon}
        <Title variant="section">{title}</Title>
      </HStack>
      <HStack gap="100">{children}</HStack>
    </Flex>
  );
};
