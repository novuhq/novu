import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../LocalStudioHeader/BackButton';

export function WorkflowHeaderBackButton() {
  const navigate = useNavigate();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const shouldHideBackButton = !templateId;

  return <>{!shouldHideBackButton && <BackButton onClick={() => navigate(-1)} />}</>;
}
