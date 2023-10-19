import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { useStepIndex } from '../hooks/useStepIndex';
import { StepName } from './StepName';
import { Sidebar } from '../../../design-system';
import { useBasePath } from '../hooks/useBasePath';
import { EditorSidebarHeaderActions } from './EditorSidebarHeaderActions';

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
      <EditorSidebarHeaderActions />
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
      isParentScrollable={isEmailOrInApp}
      onClose={() => {
        navigate(path);
      }}
      data-test-id="step-editor-sidebar"
    >
      {children}
    </Sidebar>
  );
};
