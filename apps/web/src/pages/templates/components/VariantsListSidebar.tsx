import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { useStepIndex } from '../hooks/useStepIndex';
import { StepName } from './StepName';
import { Sidebar } from '../../../design-system';
import { useBasePath } from '../hooks/useBasePath';
import { EditorSidebarHeaderActions } from './EditorSidebarHeaderActions';

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
      <EditorSidebarHeaderActions />
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
    >
      {children}
    </Sidebar>
  );
};
