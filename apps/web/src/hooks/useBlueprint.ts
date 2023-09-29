import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

import { getToken } from './useAuthController';
import { useSegment } from '../components/providers/SegmentProvider';
import { ROUTES } from '../constants/routes.enum';

export const useBlueprint = () => {
  const [params] = useSearchParams();
  const blueprintId = params.get('blueprintId');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const segment = useSegment();
  const id = localStorage.getItem('blueprintId');
  const token = getToken();

  useEffect(() => {
    if (id && token !== null) {
      navigate(ROUTES.WORKFLOWS_CREATE, {
        replace: true,
      });
    }
  }, [navigate, id, token, pathname]);

  useEffect(() => {
    if (blueprintId) {
      segment.track('Notification directory CTA clicked', {
        blueprintId: blueprintId,
      });
      localStorage.setItem('blueprintId', blueprintId);
    }
  }, [blueprintId, segment]);
};
