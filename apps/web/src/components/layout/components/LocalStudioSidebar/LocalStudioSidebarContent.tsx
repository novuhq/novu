import { IconAdd, IconGroup } from '@novu/novui/icons';
import { Flex, HStack, Stack } from '@novu/novui/jsx';
import { Skeleton } from '@mantine/core';
import { FC } from 'react';
import { IBridgeWorkflow } from '../../../../studio/types';
import { NavMenu } from '../../../nav/NavMenu';
import { NavMenuLinkButton } from '../../../nav/NavMenuButton/NavMenuLinkButton';
import { NavMenuSection } from '../../../nav/NavMenuSection';
import { LocalStudioSidebarOrganizationDisplay } from './LocalStudioSidebarOrganizationDisplay';
import { LocalStudioSidebarToggleButton } from './LocalStudioSidebarToggleButtonProps';
import { token } from '@novu/novui/tokens';

type LocalStudioSidebarContentProps = {
  workflows: IBridgeWorkflow[];
  isLoading?: boolean;
};

export const LocalStudioSidebarContent: FC<LocalStudioSidebarContentProps> = ({ workflows, isLoading }) => {
  if (isLoading) {
    return <SidebarContentLoading />;
  }

  return (
    <NavMenu variant="root">
      <LocalStudioSidebarOrganizationDisplay
        // TODO: placeholder props below
        title="Organization one"
        subtitle="Local environment"
        icon={<IconGroup />}
      />
      <NavMenuSection>
        {/** TODO: handle click */}
        <NavMenuLinkButton label="Add a workflow" icon={<IconAdd />} link={'#'} />
        {workflows.map((workflow) => (
          <LocalStudioSidebarToggleButton key={workflow.workflowId} workflow={workflow} />
        ))}
      </NavMenuSection>
    </NavMenu>
  );
};

function SidebarContentLoading() {
  return (
    <Stack gap="300" p="75">
      <Flex gap="75">
        <Skeleton height={32} width={32} radius="xl" />
        <Stack flexGrow="1">
          <Skeleton height={token('lineHeights.100')} width="70%" radius="md" />
          <Skeleton height={token('lineHeights.100')} width="55%" radius="md" />
        </Stack>
      </Flex>
      <Stack gap="200">
        <Skeleton height={token('lineHeights.100')} width="60%" radius="md" />
        <Skeleton height={token('lineHeights.100')} width="70%" radius="md" />
        <Skeleton height={token('lineHeights.100')} width="55%" radius="md" />
        <Skeleton height={token('lineHeights.100')} width="75%" radius="md" />
        <Skeleton height={token('lineHeights.100')} width="70%" radius="md" />
        <Skeleton height={token('lineHeights.100')} width="55%" radius="md" />
      </Stack>
    </Stack>
  );
}
