import { GeneratePreviewResponseDto } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { previewLayout } from '@/api/layouts';
import { useEnvironment } from '@/context/environment/hooks';
import { parse } from '@/utils/json';

export const useLayoutPreview = () => {
  const { currentEnvironment } = useEnvironment();

  const {
    data: previewData,
    isPending,
    mutateAsync,
  } = useMutation<
    GeneratePreviewResponseDto,
    Error,
    { controlValues: Record<string, unknown>; previewContextValue: string; layoutSlug: string }
  >({
    mutationFn: async ({ controlValues, previewContextValue, layoutSlug }) => {
      const { data: parsedEditorPayload } = parse(previewContextValue);

      if (!layoutSlug) {
        throw new Error('Layout slug is required');
      }

      if (!parsedEditorPayload) {
        throw new Error('Invalid JSON in editor');
      }

      return await previewLayout({
        environment: currentEnvironment!,
        layoutSlug: layoutSlug,
        previewData: {
          controlValues,
          previewPayload: { ...parsedEditorPayload },
        },
      });
    },
  });

  return {
    previewData,
    isPending,
    preview: mutateAsync,
  };
};
