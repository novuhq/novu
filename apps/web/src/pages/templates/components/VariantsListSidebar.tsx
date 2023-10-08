import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { ActionIcon, Group } from '@mantine/core';

import { useStepIndex } from '../hooks/useStepIndex';
import { StepName } from './StepName';
import { colors, Sidebar, Tooltip } from '../../../design-system';
import { useBasePath } from '../hooks/useBasePath';
import { Trash, VariantPlus } from '../../../design-system/icons';
import { ConditionsSettings } from './ConditionsSettings';

const VariantsSidebarHeader = ({ variantsCount }: { variantsCount: number }) => {
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();

  if (!channel) {
    return null;
  }

  return (
    <div style={{ display: 'flex', width: '100%', gap: 12 }}>
      <StepName channel={channel} variantsCount={variantsCount} />
      <Group noWrap spacing={12} ml={'auto'} sx={{ alignItems: 'flex-start' }}>
        <Tooltip label={'Add variant'}>
          <ActionIcon>
            <VariantPlus width="20px" height="20px" color={colors.B60} />
          </ActionIcon>
        </Tooltip>
        <ConditionsSettings root />
        <Tooltip label={'Delete step'}>
          <ActionIcon>
            <Trash color={colors.B60} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
};

export const VariantsListSidebar = ({ children, variantsCount }: { children: ReactNode; variantsCount: number }) => {
  const navigate = useNavigate();
  const path = useBasePath();
  const { stepIndex } = useStepIndex();

  return (
    <Sidebar
      key={`${stepIndex}`}
      isOpened
      customHeader={<VariantsSidebarHeader variantsCount={variantsCount} />}
      onClose={() => {
        navigate(path);
      }}
    >
      {children}
    </Sidebar>
  );
};
