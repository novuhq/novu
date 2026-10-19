import React from 'react';
import type { ConnectStore } from '../store';
import { ORB_FRAME_MS } from './orb-renderer';

export const PREVIEW_MORPH_MS = 2000;

export function usePreviewOrbMorph(phaseKind: ReturnType<ConnectStore['phase']['get']>['kind']): {
  previewMorphProgress: number | null;
  previewMorphComplete: boolean;
} {
  const [previewMorphProgress, setPreviewMorphProgress] = React.useState<number | null>(null);
  const previousPhaseKindRef = React.useRef(phaseKind);

  React.useEffect(() => {
    if (phaseKind !== 'preview-generated') {
      setPreviewMorphProgress(null);
      previousPhaseKindRef.current = phaseKind;

      return;
    }

    const enteringPreview = previousPhaseKindRef.current !== 'preview-generated';
    previousPhaseKindRef.current = phaseKind;

    if (!enteringPreview) {
      return;
    }

    const morphStartedAt = Date.now();
    setPreviewMorphProgress(0);

    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - morphStartedAt) / PREVIEW_MORPH_MS);
      setPreviewMorphProgress(progress);

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, ORB_FRAME_MS);

    return () => clearInterval(timer);
  }, [phaseKind]);

  const previewMorphComplete = previewMorphProgress === null ? false : previewMorphProgress >= 1;

  return { previewMorphProgress, previewMorphComplete };
}
