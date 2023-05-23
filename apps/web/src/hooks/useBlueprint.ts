import { useSearchParams } from './useSearchParams';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { getToken } from './useAuthController';
import { useSegment } from '../components/providers/SegmentProvider';
import { ROUTES } from '../constants/routes.enum';

export const useBlueprint = () => {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const segment = useSegment();

  useEffect(() => {
    const id = localStorage.getItem('blueprintId');
    const token = getToken();

    if (id && token !== null) {
      navigate(ROUTES.TEMPLATES_CREATE, {
        replace: true,
      });
    }
  }, [localStorage.getItem('blueprintId'), getToken(), pathname]);

  useEffect(() => {
    if (searchParams.blueprintId) {
      segment.track('Notification directory CTA clicked', {
        blueprintId: searchParams.blueprintId,
      });
      localStorage.setItem('blueprintId', searchParams.blueprintId);
    }
  }, [searchParams.blueprintId]);
};
