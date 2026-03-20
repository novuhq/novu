import { useQuery } from '@tanstack/react-query';
import { getStepResolversCount } from '@/api/step-resolvers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export function useStepResolversCount() {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.stepResolversCount, currentEnvironment?._id],
    queryFn: () => {
      if (!currentEnvironment) {
        return Promise.reject(new Error('No environment loaded'));
      }

      return getStepResolversCount({ environment: currentEnvironment });
    },
    enabled: Boolean(currentEnvironment),
  });
}
