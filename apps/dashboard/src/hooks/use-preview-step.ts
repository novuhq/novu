import type { GeneratePreviewResponseDto } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { previewStatelessStep } from '@/api/stateless-bridge';
import { previewStep } from '@/api/steps';
import { useEnvironment } from '@/context/environment/hooks';
import { useLocalMode } from '@/context/local-mode';
import { findLocalStep, findLocalWorkflow } from '@/utils/local-bridge';
import type { OmitEnvironmentFromParameters } from '@/utils/types';

type PreviewStepParameters = OmitEnvironmentFromParameters<typeof previewStep>;

/**
 * Environment-bound preview function that transparently routes to the
 * stateless bridge endpoint for virtual (local mode) workflows. Shared by the
 * `usePreviewStep` mutation and `useEditorPreview`'s query so every preview
 * surface behaves identically in local mode.
 */
export const usePreviewStepFn = () => {
  const { currentEnvironment } = useEnvironment();
  const { isLocalRoute, bridgeUrl, workflows } = useLocalMode();

  const isLocalPreview = isLocalRoute && Boolean(bridgeUrl);
  // In local mode the workflow/step ids resolve from the discover cache; the
  // first preview must wait for it (callers gate `enabled` on this).
  const isReady = !isLocalPreview || workflows !== undefined;

  const previewStepFn = useCallback(
    (args: PreviewStepParameters): Promise<GeneratePreviewResponseDto> => {
      // In local mode the workflow is virtual (not persisted), so previews go
      // through the stateless bridge endpoint with the tunnel URL attached.
      // Callers reference the workflow/step by slug OR raw id (the step editor
      // passes workflowId/stepId), so resolve by any key.
      if (isLocalPreview && bridgeUrl) {
        const workflow = findLocalWorkflow(workflows, args.workflowSlug);
        const step = findLocalStep(workflow, args.stepSlug);

        if (!workflow || !step) {
          return Promise.reject(new Error('Workflow is no longer available on the local bridge'));
        }

        // The regular preview endpoint generates the payload example
        // server-side from the persisted schema; the stateless endpoint echoes
        // what it receives. Seed the defaults from the discovered
        // payloadExample here so the sandbox editor initializes and variables
        // hydrate — user-edited values always win over the defaults.
        const clientPreview = (args.previewData?.previewPayload ?? {}) as Record<string, any>;
        const previewPayload: Record<string, unknown> = {
          ...clientPreview,
          subscriber: {
            subscriberId: 'preview-subscriber-id',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            ...(clientPreview.subscriber ?? {}),
          },
          payload: {
            ...((workflow.payloadExample as Record<string, unknown>) ?? {}),
            ...(clientPreview.payload ?? {}),
          },
        };

        return previewStatelessStep({
          environment: currentEnvironment!,
          bridgeUrl,
          workflowId: workflow.workflowId,
          stepId: step.stepId,
          stepType: step.type,
          controlValues: args.previewData?.controlValues,
          previewPayload,
          signal: args.signal,
        });
      }

      return previewStep({ environment: currentEnvironment!, ...args });
    },
    [isLocalPreview, bridgeUrl, workflows, currentEnvironment]
  );

  return { previewStepFn, isLocalPreview, isReady, bridgeUrl };
};

export const usePreviewStep = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: GeneratePreviewResponseDto) => void;
  onError?: (error: Error) => void;
} = {}) => {
  const { previewStepFn } = usePreviewStepFn();

  const { mutateAsync, isPending, error, data } = useMutation<GeneratePreviewResponseDto, Error, PreviewStepParameters>(
    {
      mutationFn: previewStepFn,
      onSuccess,
      onError,
    }
  );

  return {
    previewStep: mutateAsync,
    isPending,
    error,
    data,
  };
};
