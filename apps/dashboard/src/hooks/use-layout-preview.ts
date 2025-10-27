import { useQuery } from '@tanstack/react-query';
import { previewLayout } from '@/api/layouts';
import { useEnvironment } from '@/context/environment/hooks';
import { parse } from '@/utils/json';
import { QueryKeys } from '@/utils/query-keys';

export const useLayoutPreview = ({
  layoutSlug,
  controlValues,
  previewContextValue,
}: {
  layoutSlug: string;
  controlValues: Record<string, unknown>;
  previewContextValue: string;
}) => {
  const { currentEnvironment } = useEnvironment();
  const { data: parsedEditorPayload } = parse(previewContextValue);

  const { data: previewData, isPending } = useQuery({
    queryKey: [QueryKeys.previewLayout, layoutSlug, controlValues, previewContextValue],
    queryFn: async ({ signal }) => {
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
        signal,
      });
    },
    enabled: Boolean(layoutSlug && currentEnvironment && parsedEditorPayload),
    placeholderData: (previousData) => previousData,
  });

  return {
    previewData,
    isPending,
  };
};
