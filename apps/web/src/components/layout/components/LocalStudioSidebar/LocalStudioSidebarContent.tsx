import { IconAdd } from '@novu/novui/icons';
import { Flex, Stack } from '@novu/novui/jsx';
import { Skeleton } from '@mantine/core';
import { FC } from 'react';
import { token } from '@novu/novui/tokens';
import { css, cx } from '@novu/novui/css';
import { WithLoadingSkeleton } from '@novu/novui';
import type { DiscoverWorkflowOutput } from '@novu/framework/internal';
import { NavMenu } from '../../../nav/NavMenu';
import { NavMenuSection } from '../../../nav/NavMenuSection';
import { LocalStudioSidebarOrganizationDisplay } from './LocalStudioSidebarOrganizationDisplay';
import { LocalStudioSidebarToggleButton } from './LocalStudioSidebarToggleButton';
import { useStudioState } from '../../../../studio/StudioStateProvider';
import { NavMenuButtonInner, rawButtonBaseStyles } from '../../../nav/NavMenuButton/NavMenuButton.shared';
import { useDocsModal } from '../../../docs/useDocsModal';
import { PATHS } from '../../../docs/docs.const';

type LocalStudioSidebarContentProps = {
  workflows: DiscoverWorkflowOutput[];
  isLoading?: boolean;
};

export const LocalStudioSidebarContent: WithLoadingSkeleton<FC<LocalStudioSidebarContentProps>> = ({
  workflows,
  isLoading,
}) => {
  const { organizationName } = useStudioState();
  const { Component, toggle, setPath } = useDocsModal();

  if (isLoading) {
    return <LoadingDisplay />;
  }

  return (
    <>
      <NavMenu variant="root">
        <LocalStudioSidebarOrganizationDisplay
          title={'Local Studio'}
          subtitle={organizationName || 'Your organization '}
        />
        <NavMenuSection>
          <button
            onClick={(e) => {
              e.preventDefault();
              setPath(PATHS.WORKFLOW_INTRODUCTION);
              toggle();
            }}
            className={css({ width: 'full' })}
          >
            <NavMenuButtonInner
              icon={<IconAdd />}
              className={cx(css({ cursor: 'pointer', justifyContent: 'flex-start' }), css(rawButtonBaseStyles))}
            >
              Add a workflow
            </NavMenuButtonInner>
          </button>

          {workflows?.map((workflow) => (
            <LocalStudioSidebarToggleButton key={workflow.workflowId} workflow={workflow} />
          ))}
        </NavMenuSection>
      </NavMenu>
      <Component />
    </>
  );
};

LocalStudioSidebarContent.LoadingDisplay = LoadingDisplay;

function LoadingDisplay() {
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
