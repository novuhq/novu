import { useMutation } from '@tanstack/react-query';
import { type TestDomainRouteBody, testDomainRoute } from '@/api/domains';
import { useEnvironment } from '@/context/environment/hooks';

export function useTestDomainRoute(domain: string | undefined) {
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: ({ address, body }: { address: string; body: TestDomainRouteBody }) => {
      if (!domain || !currentEnvironment) {
        throw new Error('Route test requires a domain and environment.');
      }

      return testDomainRoute(domain, address, body, currentEnvironment);
    },
  });
}
