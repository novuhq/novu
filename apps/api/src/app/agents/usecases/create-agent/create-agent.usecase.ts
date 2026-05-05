import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AnalyticsService, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { type AgentManagedRuntime, AgentRepository, AgentRuntimeEnum } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { trackAgentCreated } from '../../agent-analytics';
import type { AgentResponseDto } from '../../dtos';
import { type ManagedRuntimeSetupDto } from '../../dtos/agent-runtime.dto';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { catalogEntryToAgentMcpServer, isMcpCatalogId } from '../../runtimes/mcp-catalog';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { AnthropicProvisioningService } from '../../services/anthropic-provisioning.service';
import { CreateAgentCommand } from './create-agent.command';

@Injectable()
export class CreateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly provisioningService: AnthropicProvisioningService,
    private readonly logger: PinoLogger
  ) {}

  async execute(command: CreateAgentCommand): Promise<AgentResponseDto> {
    const existing = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (existing) {
      throw new ConflictException(
        `An agent with identifier "${command.identifier}" already exists in this environment.`
      );
    }

    const runtime = command.runtime ?? AgentRuntimeEnum.BRIDGE;
    const setup = this.normalizeManagedRuntimeSetup(command.managedRuntime);

    await this.assertRuntimeAllowed({ command, runtime, setup });

    const managedRuntime = await this.resolveManagedRuntime({ command, runtime, setup });

    let createdAnthropicAgentId: string | undefined;
    if (setup?.mode === 'create' && managedRuntime) {
      createdAnthropicAgentId = managedRuntime.agentId;
    }

    try {
      const agent = await this.agentRepository.create({
        name: command.name,
        identifier: command.identifier,
        description: command.description,
        active: command.active ?? true,
        runtime,
        managedRuntime: runtime === AgentRuntimeEnum.CLAUDE_MANAGED ? managedRuntime : undefined,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });

      trackAgentCreated(this.analyticsService, {
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentId: agent._id,
        agentIdentifier: agent.identifier,
        active: agent.active ?? true,
        name: agent.name,
      });

      return toAgentResponse(agent);
    } catch (err) {
      if (createdAnthropicAgentId) {
        await this.cleanupProvisionedAgent(command, createdAnthropicAgentId);
      }

      throw err;
    }
  }

  private normalizeManagedRuntimeSetup(input: ManagedRuntimeSetupDto | undefined): ManagedRuntimeSetupDto | undefined {
    if (!input) {
      return undefined;
    }

    if (input.mode) {
      return input;
    }

    // Back-compat: a payload that omits `mode` but supplies the legacy fields is treated
    // as 'existing' so existing API clients keep working.
    if (input.agentId || input.environmentId || input.provider) {
      return { ...input, mode: 'existing', provider: input.provider ?? 'anthropic' };
    }

    return { ...input, mode: 'create' };
  }

  private async assertRuntimeAllowed(params: {
    command: CreateAgentCommand;
    runtime: AgentRuntimeEnum;
    setup: ManagedRuntimeSetupDto | undefined;
  }): Promise<void> {
    if (params.runtime !== AgentRuntimeEnum.CLAUDE_MANAGED) {
      return;
    }

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CLAUDE_MANAGED_AGENTS_ENABLED,
      defaultValue: false,
      environment: { _id: params.command.environmentId },
      organization: { _id: params.command.organizationId },
    });

    if (!isEnabled) {
      throw new ForbiddenException('Claude Managed Agents are not enabled for this environment.');
    }

    if (!params.setup) {
      throw new BadRequestException('managedRuntime is required when runtime is "claude_managed".');
    }

    if (params.setup.mode === 'existing') {
      if (!params.setup.agentId || !params.setup.environmentId) {
        throw new BadRequestException(
          'managedRuntime.agentId and managedRuntime.environmentId are required when mode is "existing".'
        );
      }
    } else if (params.setup.mode === 'create') {
      if (!params.setup.system) {
        throw new BadRequestException('managedRuntime.system is required when mode is "create".');
      }
    }
  }

  private async resolveManagedRuntime(params: {
    command: CreateAgentCommand;
    runtime: AgentRuntimeEnum;
    setup: ManagedRuntimeSetupDto | undefined;
  }): Promise<AgentManagedRuntime | undefined> {
    if (params.runtime !== AgentRuntimeEnum.CLAUDE_MANAGED || !params.setup) {
      return undefined;
    }

    if (params.setup.mode === 'existing') {
      if (!params.setup.agentId || !params.setup.environmentId) {
        throw new BadRequestException(
          'managedRuntime.agentId and managedRuntime.environmentId are required when mode is "existing".'
        );
      }

      return {
        provider: params.setup.provider ?? 'anthropic',
        agentId: params.setup.agentId,
        environmentId: params.setup.environmentId,
        vaultIds: params.setup.vaultIds,
        mcpServers: this.hydrateMcpServers(params.setup.mcpServers),
      };
    }

    return this.provisionManagedRuntime(params.command, params.setup);
  }

  private hydrateMcpServers(selections?: ManagedRuntimeSetupDto['mcpServers']) {
    if (!selections?.length) {
      return undefined;
    }

    const seen = new Set<string>();
    const hydrated: ReturnType<typeof catalogEntryToAgentMcpServer>[] = [];

    for (const selection of selections) {
      if (!isMcpCatalogId(selection.id)) {
        throw new BadRequestException(`Unknown MCP catalog id "${selection.id}".`);
      }

      if (seen.has(selection.id)) {
        continue;
      }

      seen.add(selection.id);
      hydrated.push(catalogEntryToAgentMcpServer(selection.id));
    }

    return hydrated;
  }

  private async provisionManagedRuntime(
    command: CreateAgentCommand,
    setup: ManagedRuntimeSetupDto
  ): Promise<AgentManagedRuntime> {
    if (setup.apiKey?.trim()) {
      await this.credentialsService.upsertApiKey({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        apiKey: setup.apiKey.trim(),
      });
    }

    const apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId).catch(() => {
      throw new BadRequestException(
        'Anthropic API key is required. Provide it in managedRuntime.apiKey or save it for the environment first.'
      );
    });

    const anthropicEnvironmentId = await this.provisioningService.ensureSharedEnvironment({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      userId: command.userId,
      apiKey,
    });

    const mcpServers = this.hydrateMcpServers(setup.mcpServers);

    const { agentId } = await this.provisioningService.createAgent({
      apiKey,
      name: command.name,
      description: command.description,
      system: setup.system,
      tools: setup.tools,
      mcpServers,
    });

    return {
      provider: 'anthropic',
      agentId,
      environmentId: anthropicEnvironmentId,
      mcpServers,
    };
  }

  private async cleanupProvisionedAgent(command: CreateAgentCommand, agentId: string): Promise<void> {
    try {
      const apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId);
      await this.provisioningService.archiveAgent(apiKey, agentId);
    } catch (err) {
      this.logger.warn(err, `Failed to clean up Anthropic agent ${agentId} after Novu persistence failure`);
    }
  }
}
