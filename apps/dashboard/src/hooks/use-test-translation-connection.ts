import { useMutation } from '@tanstack/react-query';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { testTranslationConnection, ConnectionTestResponseDto } from '../api/translation-settings';

/**
 * Hook to test the OpenAI connection with configured API key
 *
 * Performs a minimal API call to verify:
 * - API key is valid
 * - API key has appropriate permissions
 * - Network connectivity is working
 *
 * Note: This is a mutation (not a query) because:
 * - It's an action that should be explicitly triggered
 * - It shouldn't be cached or refetched automatically
 * - It may have side effects (rate limiting, billing)
 *
 * @returns Mutation result with test status and latency information
 */
export function useTestTranslationConnection() {
  const { currentEnvironment } = useEnvironment();

  return useMutation<ConnectionTestResponseDto, Error, void>({
    mutationFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Environment not available. Please try again.');
      }
      return testTranslationConnection({ environment: currentEnvironment });
    },
    onError: (error) => {
      showErrorToast(error?.message || 'Connection test failed. Please check your API key.', 'Connection test failed');
    },
  });
}
