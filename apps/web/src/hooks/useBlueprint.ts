import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

import { useSegment } from '../components/providers/SegmentProvider';
import { ROUTES } from '../constants/routes';

export const useBlueprint = () => {
  const [params] = useSearchParams();
  const blueprintId = params.get('blueprintId');
  const navigate = useNavigate();
  const segment = useSegment();
  const id = localStorage.getItem('blueprintId');

  useEffect(() => {
    if (id) {
      navigate(ROUTES.WORKFLOWS_CREATE, {
        replace: true,
      });
    }
  }, [navigate, id]);

  useEffect(() => {
    if (blueprintId) {
      segment.track('Notification directory CTA clicked', {
        blueprintId,
      });
      localStorage.setItem('blueprintId', blueprintId);
    }
  }, [blueprintId, segment]);
};
