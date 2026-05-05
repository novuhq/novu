import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { AgentMcpServer } from '@novu/dal';
import { AnthropicEnvironmentRegistryService } from './anthropic-environment-registry.service';

const DEFAULT_MODEL = 'claude-opus-4-7' as const;

export const AGENT_TOOL_NAMES = ['bash', 'edit', 'read', 'write', 'glob', 'grep', 'web_fetch', 'web_search'] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export type AgentToolToggle = {
  name: AgentToolName;
  enabled: boolean;
};

export type AnthropicProvisioningCreateAgentParams = {
  apiKey: string;
  name: string;
  description?: string;
  system?: string;
  tools?: AgentToolToggle[];
  mcpServers?: AgentMcpServer[];
};

export type AnthropicProvisioningUpdateAgentParams = {
  apiKey: string;
  agentId: string;
  description?: string;
  system?: string;
  tools?: AgentToolToggle[];
  mcpServers?: AgentMcpServer[];
};

@Injectable()
export class AnthropicProvisioningService {
  constructor(
    private readonly registry: AnthropicEnvironmentRegistryService,
    private readonly logger: PinoLogger
  ) {}

  async ensureSharedEnvironment(params: {
    organizationId: string;
    environmentId: string;
    userId: string;
    apiKey: string;
  }): Promise<string> {
    const cached = await this.registry.get(params.organizationId, params.environmentId);
    if (cached) {
      return cached;
    }

    const client = this.buildClient(params.apiKey);
    const created = await client.beta.environments.create({
      name: this.buildEnvironmentName(params.organizationId, params.environmentId),
      config: {
        type: 'cloud',
        networking: { type: 'unrestricted' },
      },
    });

    await this.registry.set({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      userId: params.userId,
      anthropicEnvironmentId: created.id,
    });

    return created.id;
  }

  async createAgent(params: AnthropicProvisioningCreateAgentParams): Promise<{ agentId: string; version: number }> {
    const client = this.buildClient(params.apiKey);

    const created = await client.beta.agents.create({
      name: params.name,
      model: DEFAULT_MODEL,
      description: params.description,
      system: params.system,
      mcp_servers: this.buildMcpServers(params.mcpServers),
      tools: this.buildTools(params.tools, params.mcpServers),
    });

    return { agentId: created.id, version: created.version };
  }

  /**
   * Update an existing Anthropic agent. Anthropic uses array-replacement semantics for
   * `tools` and `mcp_servers`, so callers must always send the full desired set.
   */
  async updateAgent(params: AnthropicProvisioningUpdateAgentParams): Promise<{ version: number }> {
    const client = this.buildClient(params.apiKey);
    const current = await client.beta.agents.retrieve(params.agentId);

    const updated = await client.beta.agents.update(params.agentId, {
      version: current.version,
      ...(params.description !== undefined ? { description: params.description } : {}),
      ...(params.system !== undefined ? { system: params.system } : {}),
      ...(params.mcpServers !== undefined ? { mcp_servers: this.buildMcpServers(params.mcpServers) } : {}),
      ...(params.tools !== undefined || params.mcpServers !== undefined
        ? { tools: this.buildTools(params.tools, params.mcpServers) }
        : {}),
    });

    return { version: updated.version };
  }

  async archiveAgent(apiKey: string, agentId: string): Promise<void> {
    try {
      const client = this.buildClient(apiKey);
      await client.beta.agents.archive(agentId);
    } catch (err) {
      this.logger.warn(err, `Failed to archive Anthropic agent ${agentId} during cleanup`);
    }
  }

  private buildClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  private buildEnvironmentName(organizationId: string, environmentId: string): string {
    // Anthropic requires unique names within an organization. Scope by Novu env id so
    // re-running on a different Novu environment for the same Anthropic org doesn't
    // collide on naming.
    return `novu-${organizationId.slice(-6)}-${environmentId.slice(-6)}`;
  }

  private buildToolConfigs(toggles?: AgentToolToggle[]) {
    if (!toggles?.length) {
      return undefined;
    }

    return toggles.map((toggle) => ({
      name: toggle.name,
      enabled: toggle.enabled,
    }));
  }

  private buildMcpServers(mcpServers?: AgentMcpServer[]) {
    if (!mcpServers?.length) {
      return undefined;
    }

    return mcpServers.map((server) => ({
      type: 'url' as const,
      name: server.name,
      url: server.url,
    }));
  }

  private buildTools(tools?: AgentToolToggle[], mcpServers?: AgentMcpServer[]) {
    return [
      {
        type: 'agent_toolset_20260401' as const,
        configs: this.buildToolConfigs(tools),
      },
      ...(mcpServers ?? []).map((server) => ({
        type: 'mcp_toolset' as const,
        mcp_server_name: server.name,
      })),
    ];
  }
}
