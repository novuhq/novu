import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { ActionIcon, Group } from '@mantine/core';

import { useStepIndex } from '../hooks/useStepIndex';
import { StepName } from './StepName';
import { colors, Sidebar, Tooltip } from '../../../design-system';
import { useBasePath } from '../hooks/useBasePath';
import { Trash } from '../../../design-system/icons';
import { ConditionsSettings } from './ConditionsSettings';
import { DeleteStepRow } from './DeleteStepRow';

const StepSidebarHeader = () => {
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();

  if (!channel) {
    return null;
  }

  return (
    <div style={{ display: 'flex', width: '100%', gap: 12 }}>
      <StepName channel={channel} />
      <Group noWrap spacing={12} ml={'auto'} sx={{ alignItems: 'flex-start' }}>
        <ConditionsSettings />
        <Tooltip label={'Delete step'}>
          <ActionIcon>
            <Trash color={colors.B60} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
};

export const StepEditorSidebar = ({ children }: { children: ReactNode }) => {
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();
  const navigate = useNavigate();
  const path = useBasePath();
  const { stepIndex, variantIndex } = useStepIndex();
  const key = `${stepIndex}_${variantIndex}`;
  const isEmailOrInApp = channel === StepTypeEnum.IN_APP || channel === StepTypeEnum.EMAIL;

  return (
    <Sidebar
      key={key}
      isOpened
      isExpanded={isEmailOrInApp}
      customHeader={<StepSidebarHeader />}
      customFooter={<DeleteStepRow />}
      isParentScrollable={isEmailOrInApp}
      onClose={() => {
        navigate(path);
      }}
    >
      {children}
    </Sidebar>
  );
};
