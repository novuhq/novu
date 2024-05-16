import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { Sidebar } from '@novu/design-system';

import { useStepIndex } from '../hooks/useStepIndex';
import { StepName } from './StepName';
import { useBasePath } from '../hooks/useBasePath';
import { EditorSidebarHeaderActions } from './EditorSidebarHeaderActions';
import { useStepVariantsCount } from '../hooks/useStepVariantsCount';
import { useNavigateToVariantPreview } from '../hooks/useNavigateToVariantPreview';

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
      <EditorSidebarHeaderActions preview />
    </div>
  );
};

export const ChannelPreviewSidebar = ({ children }: { children: ReactNode }) => {
  const { stepUuid } = useParams<{
    stepUuid: string;
  }>();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { navigateToVariantPreview } = useNavigateToVariantPreview();
  const { stepIndex, variantIndex } = useStepIndex();
  const { variantsCount } = useStepVariantsCount();
  const key = `${stepIndex}_${variantIndex}`;

  return (
    <Sidebar
      key={key}
      isOpened
      customHeader={<StepSidebarHeader />}
      onClose={() => {
        if (variantsCount > 0) {
          navigateToVariantPreview({ variantUuid: stepUuid });

          return;
        }
        navigate(basePath);
      }}
      data-test-id="step-editor-sidebar"
    >
      {children}
    </Sidebar>
  );
};
