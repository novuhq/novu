import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { Sidebar } from '@novu/design-system';

import { useStepIndex } from '../hooks/useStepIndex';
import { StepName } from './StepName';
import { useBasePath } from '../hooks/useBasePath';
import { EditorSidebarHeaderActions } from './EditorSidebarHeaderActions';

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
      <EditorSidebarHeaderActions />
    </div>
  );
};

export const VariantsListSidebar = ({ isLoading = false, children }: { isLoading?: boolean; children: ReactNode }) => {
  const navigate = useNavigate();
  const path = useBasePath();
  const { stepIndex } = useStepIndex();

  return (
    <Sidebar
      key={`${stepIndex}`}
      isOpened
      isLoading={isLoading}
      customHeader={<VariantsSidebarHeader isLoading={isLoading} />}
      onClose={() => {
        navigate(path);
      }}
      styles={{
        body: {
          '> form': {
            gap: 0,
          },
          '.sidebar-body-holder': {
            marginRight: 0,
            paddingRight: 0,
          },
        },
      }}
      data-test-id="variants-list-sidebar"
    >
      {children}
    </Sidebar>
  );
};
