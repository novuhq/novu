import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { AgentSuggestionResponse, fetchAgentSuggestions } from '@/api/ai';
import { AGENT_TEMPLATES, type AgentTemplate } from '@/components/agents/create-agent-fields';
import { useManagedAgentRuntimeEnabled } from '@/hooks/use-managed-agent-runtime-enabled';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';

const QUERY_KEY = 'agent-suggestions';

function mapSuggestionToTemplate(suggestion: AgentSuggestionResponse): AgentTemplate {
  return {
    templateId: suggestion.id,
    label: suggestion.name,
    name: suggestion.name,
    instructions: suggestion.prompt,
    suggestedMcpServers: [],
    mcpServers: [],
  };
}

/**
 * Fetches AI agent suggestions tailored to the organization industry/domain for the
 * onboarding/create-agent suggestion pills. Falls back to the hardcoded `AGENT_TEMPLATES` when the
 * feature is disabled or the endpoint returns nothing. `refresh()` regenerates the suggestions on
 * the server.
 */
export function useAgentSuggestions() {
  const isManagedAgentRuntimeEnabled = useManagedAgentRuntimeEnabled();
  const { currentEnvironment } = useEnvironment();
  const refreshRef = useRef(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [QUERY_KEY, currentEnvironment?._id],
    queryFn: async () => {
      if (!currentEnvironment) throw new Error('Environment not loaded');

      const shouldRefresh = refreshRef.current;
      refreshRef.current = false;

      const result = await fetchAgentSuggestions({ environment: currentEnvironment, refresh: shouldRefresh });

      return result.map(mapSuggestionToTemplate);
    },
    enabled: isManagedAgentRuntimeEnabled && IS_AI_FEATURES_ENABLED && !!currentEnvironment,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const refresh = useCallback(() => {
    refreshRef.current = true;
    refetch();
  }, [refetch]);

  const templates = data && data.length > 0 ? data : AGENT_TEMPLATES;

  return { templates, isLoading, isFetching, refresh };
}
