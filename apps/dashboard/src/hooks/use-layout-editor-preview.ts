import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/utils/query-keys';
import { useDebouncedValue } from './use-debounced-value';
import { parse } from '@/utils/json';
import { useEnvironment } from '@/context/environment/hooks';
import { previewLayout } from '@/api/layouts';

export const useLayoutEditorPreview = ({
  layoutSlug,
  controlValues,
  previewContextValue,
}: {
  layoutSlug?: string;
  controlValues: Record<string, unknown>;
  previewContextValue: string;
}) => {
  const { currentEnvironment } = useEnvironment();
  const debouncedControlValues = useDebouncedValue(controlValues, 500);
  const { data: parsedEditorPayload } = parse(previewContextValue);

  const { data: previewData, isPending } = useQuery({
    queryKey: [QueryKeys.previewLayout, layoutSlug, debouncedControlValues, previewContextValue],
    queryFn: async () => {
      if (!layoutSlug) {
        throw new Error('Layout slug is required');
      }

      if (!parsedEditorPayload) {
        throw new Error('Invalid JSON in editor');
      }

      return await previewLayout({
        environment: currentEnvironment!,
        layoutSlug,
        previewData: {
          controlValues: debouncedControlValues,
          previewPayload: { ...parsedEditorPayload },
        },
      });
    },
    enabled: Boolean(layoutSlug && currentEnvironment && parsedEditorPayload),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return {
    previewData,
    isPending,
  };
};
