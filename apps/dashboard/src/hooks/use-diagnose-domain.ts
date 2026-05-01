import { useMutation } from '@tanstack/react-query';
import { diagnoseDomain } from '@/api/domains';
import { useEnvironment } from '@/context/environment/hooks';

export function useDiagnoseDomain(domain: string | undefined) {
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: () => {
      if (!domain || !currentEnvironment) {
        throw new Error('Diagnose requires a domain and environment.');
      }

      return diagnoseDomain(domain, currentEnvironment);
    },
  });
}
