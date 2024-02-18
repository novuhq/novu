import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SegmentedControl } from '@novu/design-system';
import { useBasePath } from '../hooks/useBasePath';

export const TriggerSegmentControl = () => {
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const value = useMemo(() => {
    return pathname.replace(basePath + '/', '');
  }, [pathname, basePath]);

  return (
    <SegmentedControl
      sx={{
        maxWidth: '100% !important',
      }}
      fullWidth
      data={[
        {
          label: 'Run a Test',
          value: 'test-workflow',
        },
        {
          label: 'Get Snippet',
          value: 'snippet',
        },
      ]}
      value={value}
      onChange={async (segmentValue) => {
        navigate(basePath + '/' + segmentValue);
      }}
    />
  );
};
