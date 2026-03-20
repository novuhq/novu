import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getStepResolversCount } from '@/api/step-resolvers';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { QueryKeys } from '@/utils/query-keys';

export function useStepResolversCount() {
  const { currentEnvironment } = useEnvironment();
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);

  return useQuery({
    queryKey: [QueryKeys.stepResolversCount, currentEnvironment?._id],
    queryFn: () => {
      if (!currentEnvironment) {
        return Promise.reject(new Error('No environment loaded'));
      }

      return getStepResolversCount({ environment: currentEnvironment });
    },
    enabled: Boolean(currentEnvironment && isStepResolverEnabled),
  });
}
