import { useMutation } from '@tanstack/react-query';
import { getMasterJson } from '@/api/translations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';

function countExportedResources(data: Record<string, unknown>): number {
  let total = 0;

  // Count workflows
  const workflows = data.workflows as Record<string, unknown> | undefined;
  total += Object.keys(workflows || {}).length;

  // Future: Add other namespaces

  return total;
}

type UseExportMasterJsonProps = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useExportMasterJson({ onSuccess, onError }: UseExportMasterJsonProps = {}) {
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: async ({ locale }: { locale: string }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      const data = await getMasterJson({
        environment: currentEnvironment,
        locale,
      });

      return { data, locale };
    },
    onSuccess: ({ data, locale }) => {
      // Create and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${locale}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalResources = countExportedResources(data);

      const message =
        totalResources > 0
          ? `Exported ${totalResources} resource${totalResources !== 1 ? 's' : ''} for locale: ${locale}`
          : `Exported translations for locale: ${locale}`;

      showSuccessToast(message);
      onSuccess?.();
    },
    onError: (error: Error) => {
      showErrorToast(`Failed to export translations: ${error.message}`);
      onError?.(error);
    },
  });
}
