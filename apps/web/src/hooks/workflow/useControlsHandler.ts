import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSegment } from '../../components/providers/SegmentProvider';

export function useControlsHandler(
  getPreview: (controls) => Promise<any>,
  workflowId: string,
  stepId: string,
  source: string
) {
  const segment = useSegment();
  const [controls, setControls] = useState({});
  const [payload, setPayload] = useState({});

  const {
    data: preview,
    isLoading,
    refetch: fetchPreview,
    error,
  } = useQuery<any, any, any>(
    ['preview', workflowId, stepId, payload, controls],
    () =>
      getPreview({
        workflowId,
        stepId,
        payload,
        controls,
      }),
    {
      enabled: !!workflowId && !!stepId,
    }
  );

  const onControlsChange = (type: string, form: any, id?: string) => {
    switch (type) {
      case 'step':
        segment.track('Step Controls Changes', {
          key: id,
          origin: source,
        });
        setControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
      default:
        throw new Error('Invalid control type');
    }
  };

  return {
    preview,
    isLoading,
    fetchPreview,
    error,
    controls,
    payload,
    setControls,
    setPayload,
    onControlsChange,
  };
}
