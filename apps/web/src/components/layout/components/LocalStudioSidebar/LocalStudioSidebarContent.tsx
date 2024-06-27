import { IconAdd } from '@novu/novui/icons';
import { Flex, Stack } from '@novu/novui/jsx';
import { Skeleton } from '@mantine/core';
import { FC } from 'react';
import { IBridgeWorkflow } from '../../../../studio/types';
import { NavMenu } from '../../../nav/NavMenu';
import { NavMenuSection } from '../../../nav/NavMenuSection';
import { LocalStudioSidebarOrganizationDisplay } from './LocalStudioSidebarOrganizationDisplay';
import { LocalStudioSidebarToggleButton } from './LocalStudioSidebarToggleButtonProps';
import { token } from '@novu/novui/tokens';
import { DocsButton } from '../../../docs/DocsButton';
import { hstack } from '@novu/novui/patterns';
import { css, cx } from '@novu/novui/css';
import { rawButtonBaseStyles } from '../../../nav/NavMenuButton/NavMenuButton.shared';
import { useStudioState } from '../../../../studio/StudioStateProvider';

type LocalStudioSidebarContentProps = {
  workflows: IBridgeWorkflow[];
  isLoading?: boolean;
};

export const LocalStudioSidebarContent: FC<LocalStudioSidebarContentProps> = ({ workflows, isLoading }) => {
  const { organizationName } = useStudioState();

  if (isLoading) {
    return <SidebarContentLoading />;
  }

  return (
    <NavMenu variant="root">
      <LocalStudioSidebarOrganizationDisplay title={organizationName || 'Your organization '} subtitle="Local studio" />
      <NavMenuSection>
        {/** TODO: handle click - link to doc page */}
        <DocsButton
          tooltip={'Open a guide'}
          TriggerButton={({ onClick }) => (
            <button onClick={onClick} className={css({ width: 'full' })}>
              <div
                className={cx(hstack({ cursor: 'pointer', justifyContent: 'flex-start' }), css(rawButtonBaseStyles))}
              >
                <IconAdd />
                <span>Add a workflow</span>
              </div>
            </button>
          )}
        />
        {workflows?.map((workflow) => (
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
