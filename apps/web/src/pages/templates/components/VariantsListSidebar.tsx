import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { Sidebar } from '@novu/design-system';

import { useStepIndex } from '../hooks/useStepIndex';
import { StepName } from './StepName';
import { VariantsListSidebarActions } from './VariantsListSidebarActions';
import { useBasePath } from '../hooks/useBasePath';

const VariantsSidebarHeader = ({ isLoading }: { isLoading?: boolean }) => {
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();

  if (!channel || isLoading) {
    return null;
  }

  return (
    <div style={{ display: 'flex', width: '100%', gap: 12 }}>
      <StepName channel={channel} />
      <VariantsListSidebarActions />
    </div>
  );
};

export const VariantsListSidebar = ({ isLoading = false, children }: { isLoading?: boolean; children: ReactNode }) => {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { stepIndex } = useStepIndex();

  return (
    <Sidebar
      key={`${stepIndex}`}
      isOpened
      isExpanded
      isLoading={isLoading}
      customHeader={<VariantsSidebarHeader isLoading={isLoading} />}
      onClose={() => {
        navigate(basePath);
      }}
      styles={{
        body: {
          '> form': {
            gap: 0,
          },
        },
      }}
      data-test-id="variants-list-sidebar"
    >
      {children}
    </Sidebar>
  );
};
