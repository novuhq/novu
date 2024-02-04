import { useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { useStepIndex } from '../hooks/useStepIndex';
import { useNavigateFromEditor } from '../hooks/useNavigateFromEditor';
import { ChannelPreviewSidebar } from './ChannelPreviewSidebar';

const DummyPreviewComponent = () => {
  return <div>dummy</div>;
};

export const ChannelPreview = () => {
  const { channel } = useParams<{
    channel: StepTypeEnum | undefined;
  }>();
  const { stepIndex } = useStepIndex();

  useNavigateFromEditor(true);

  if (stepIndex === -1 || channel === undefined) {
    return null;
  }

  return (
    <>
      <ChannelPreviewSidebar>
        <DummyPreviewComponent />
      </ChannelPreviewSidebar>
    </>
  );
};
