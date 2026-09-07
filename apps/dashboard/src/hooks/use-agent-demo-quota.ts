import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getAgentDemoQuota, getAgentDemoQuotaQueryKey } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

export function useAgentDemoQuota(agentIdentifier: string) {
  const { currentEnvironment } = useEnvironment();
  const isDemoManagedClaudeEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED);

  return useQuery({
    queryKey: getAgentDemoQuotaQueryKey(currentEnvironment?._id, agentIdentifier),
    queryFn: () =>
      getAgentDemoQuota(requireEnvironment(currentEnvironment, 'No environment selected'), agentIdentifier),
    enabled: Boolean(currentEnvironment && agentIdentifier && isDemoManagedClaudeEnabled),
  });
}
