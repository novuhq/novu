import { useQuery } from '@tanstack/react-query';
import { AGENT_TEMPLATES, type AgentTemplate, type McpServerPreview } from '@/components/agents/create-agent-fields';
import { fetchSanity } from '@/utils/sanity';
import { agentTemplatesQuery } from '@/utils/sanity-queries';

const QUERY_KEY = ['agent-templates'];

type SanityImage = {
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
};

type SanityMcpServer = {
  id?: string;
  name?: string;
  description?: string;
  icon?: SanityImage;
  url?: string;
};

type SanityAgentTemplate = {
  _id: string;
  id?: string;
  name?: string;
  agentName?: string;
  summary?: string;
  systemPrompt?: string;
  mcpServerList?: SanityMcpServer[];
};

function mapSanityTemplate(template: SanityAgentTemplate): AgentTemplate | null {
  if (!template.id || !template.name) {
    return null;
  }

  const mcpServers: McpServerPreview[] = (template.mcpServerList ?? [])
    .filter((server): server is SanityMcpServer & { id: string } => Boolean(server?.id))
    .map((server) => ({ id: server.id, name: server.name, iconUrl: server.icon?.url }));

  return {
    templateId: template.id,
    label: template.name,
    name: template.agentName || template.name,
    instructions: template.systemPrompt || '',
    suggestedMcpServers: mcpServers.map((server) => server.id),
    mcpServers,
  };
}

/**
 * Fetches agent templates from Sanity for the onboarding/create-agent pills. Falls back to the
 * hardcoded `AGENT_TEMPLATES` when Sanity is unavailable or returns nothing.
 */
export function useAgentTemplates() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async ({ signal }) => {
      const result = await fetchSanity<SanityAgentTemplate[]>(agentTemplatesQuery, { signal });

      return (result ?? []).map(mapSanityTemplate).filter((template): template is AgentTemplate => template !== null);
    },
    // Templates rarely change — keep them fresh for an hour like the changelog query.
    staleTime: 60 * 60 * 1000,
  });

  const templates = data && data.length > 0 ? data : AGENT_TEMPLATES;

  return { templates, isLoading };
}
