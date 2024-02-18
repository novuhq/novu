import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { StepTypeEnum, DELAYED_STEPS } from '@novu/shared';

import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { VariantsListSidebar } from './VariantsListSidebar';
import { useBasePath } from '../hooks/useBasePath';
import { VariantsList } from './VariantsList';
import { VariantPreview } from './VariantPreview';

const VariantsPageContainer = styled.div`
  display: grid;
  grid-template-columns: 25rem 1fr;
  grid-template-rows: 100%;
  gap: 1rem;
  height: 100%;

  @media screen and (min-width: 1367px) {
    gap: 3rem;
    grid-template-columns: 27rem 1fr;
  }
`;

export function VariantsPage() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const { isLoading } = useTemplateEditorForm();

  if (!channel) {
    return null;
  }

  const isDelayedStep = DELAYED_STEPS.includes(channel as StepTypeEnum);
  if (isDelayedStep) {
    navigate(`${basePath}/${channel}/${stepUuid}`);
  }

  return (
    <VariantsListSidebar isLoading={isLoading}>
      <VariantsPageContainer>
        <VariantsList />
        <VariantPreview />
      </VariantsPageContainer>
    </VariantsListSidebar>
  );
}
