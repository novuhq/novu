import { previewStep } from '@/api/steps';
import { useEnvironment } from '@/context/environment/hooks';
import { useMutation } from '@tanstack/react-query';
import type { GeneratePreviewResponseDto } from '@novu/shared';
import type { OmitEnvironmentFromParameters } from '@/utils/types';

type PreviewStepParameters = OmitEnvironmentFromParameters<typeof previewStep>;

export const usePreviewStep = ({
  onSuccess,
  onError,
}: { onSuccess?: (data: GeneratePreviewResponseDto) => void; onError?: (error: Error) => void } = {}) => {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync, isPending, error, data } = useMutation<GeneratePreviewResponseDto, Error, PreviewStepParameters>(
    {
      mutationFn: (args: PreviewStepParameters) => previewStep({ environment: currentEnvironment!, ...args }),
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
