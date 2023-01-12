import { ActivePageEnum } from '../pages/templates/editor/TemplateEditorPage';
import { useSearchParams } from './useSearchParams';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getToken } from '../store/use-auth-controller';

export const useBlueprint = () => {
  const searchParams = useSearchParams();
  const navigate = useNavigate();

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
      localStorage.setItem('blueprintId', searchParams.blueprintId);
      navigate(`/templates/create?page=${ActivePageEnum.WORKFLOW}`, {
        replace: true,
      });
    }
  }, [searchParams.blueprintId]);
};
