import { ActivePageEnum } from '../pages/templates/editor/TemplateEditorPage';
import { useSearchParams } from './use-search-params';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getToken } from '../store/use-auth-controller';
import { useSegment } from './use-segment';

export const useBlueprint = () => {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const segment = useSegment();

  useEffect(() => {
    const id = localStorage.getItem('blueprintId');
    const token = getToken();

    if (id && token) {
      navigate(`/templates/create?page=${ActivePageEnum.WORKFLOW}`, {
        replace: true,
      });
    }
  }, [localStorage.getItem('blueprintId'), getToken()]);

  useEffect(() => {
    if (searchParams.blueprintId) {
      segment.track('Notification directory CTA clicked', {
        blueprintId: searchParams.blueprintId,
      });
      localStorage.setItem('blueprintId', searchParams.blueprintId);
      navigate(`/templates/create?page=${ActivePageEnum.WORKFLOW}`, {
        replace: true,
      });
    }
  }, [searchParams.blueprintId]);
};
