import styled from '@emotion/styled';
import { StepTypeEnum } from '@novu/shared';
import { useParams } from 'react-router-dom';
import { PreviewComponent } from './ChannelPreview';

const VariantPreviewContainer = styled.div`
  display: grid;
  grid-template-columns: minmax(auto, 90rem);
  justify-content: center;
  justify-items: center;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 1rem;
`;

export const VariantPreview = () => {
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();

  if (!channel) {
    return null;
  }

  return (
    <VariantPreviewContainer>
      <PreviewComponent channel={channel} />
    </VariantPreviewContainer>
  );
};
