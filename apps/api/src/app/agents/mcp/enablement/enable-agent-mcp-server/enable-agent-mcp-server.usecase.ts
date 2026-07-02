import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, FeatureFlagsService } from '@novu/application-generic';
import { AgentMcpServerEntity, AgentMcpServerRepository, AgentRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionScopeEnum } from '@novu/shared';
import { trackAgentMcpServerEnabled } from '../../../shared/analytics/agent-analytics';
import { AgentMcpServerEnablementResponseDto } from '../../../shared/dtos/mcp-server.dto';
import { AgentMcpDefinitionService } from '../../runtime/agent-mcp-definition.service';
import { assertMcpNovuAppFlagEnabled } from '../../shared/assert-mcp-novu-app-flag-enabled';
import { assertMcpProviderManagedFlagEnabled } from '../../shared/assert-mcp-provider-managed-flag-enabled';
import { EnableAgentMcpServerCommand } from './enable-agent-mcp-server.command';

interface MongoDuplicateKeyError extends Error {
  code?: number;
}

/**
 * Enable a catalog MCP on an agent. Writes Mongo first, then updates Anthropic's
 * shared agent MCP list (per-subscriber OAuth MCPs are not added there).
 *
 * Re-enable semantics: if a row exists with `status: 'error'` or `syncing`
 * (left over from a failed previous reconcile) the row is reused so callers
 * can retry. A row with `enabled: true` and `status: 'active'` returns 409.
 */
@Injectable()
export class EnableAgentMcpServer {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly agentMcpDefinitionService: AgentMcpDefinitionService,
    private readonly analyticsService: AnalyticsService,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: EnableAgentMcpServerCommand): Promise<AgentMcpServerEnablementResponseDto> {
    const catalogEntry = MCP_SERVERS.find((entry) => entry.id === command.mcpId);

    if (!catalogEntry) {
      throw new BadRequestException(`Unknown MCP server "${command.mcpId}". Must match a catalog id from MCP_SERVERS.`);
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const existing = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });

    // Already-enabled-and-healthy rows are idempotent no-ops: return 409 so
    // the caller can decide whether to disable+re-enable. Rows in `error` or
    // `syncing` are reused so callers can retry a failed reconcile.
    if (existing && existing.enabled && existing.status === 'active') {
      throw new ConflictException(`MCP "${command.mcpId}" is already enabled on this agent.`);
    }

    // Each MCP supports exactly one OAuth mechanism, encoded in the catalog
    // entry. There is no per-row override — the caller cannot ask for `dcr`
    // when the catalog says `novu-app`, since the mode dictates whether
    // discovery happens, which credentials are loaded, etc.
    if (!catalogEntry.oauth) {
      throw new BadRequestException(
        `MCP "${command.mcpId}" does not have OAuth connectivity configured and cannot be enabled yet.`
      );
    }

    const defaultAuthMode: McpConnectionAuthModeEnum = catalogEntry.oauth.mode;
    const defaultScope = command.defaultScope ?? McpConnectionScopeEnum.Subscriber;

    // novu-app rollout is feature-flagged per org so we can ramp safely
    // (Cloud has env credentials wired, self-hosters may not). DCR is never
    // gated by this flag — the catalog has already paid the per-MCP probe
    // cost and the auth flow does not depend on Novu-managed credentials.
    if (defaultAuthMode === McpConnectionAuthModeEnum.NovuApp) {
      await assertMcpNovuAppFlagEnabled({
        featureFlagsService: this.featureFlagsService,
        mcpId: command.mcpId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });
    }

    // provider-managed entries don't run Novu OAuth at all — Claude owns the
    // connector lifecycle. Gate per-org so the catalog migration (which
    // touches every entry that previously had no oauth field) can ship
    // ahead of the dashboard "Add from Claude" UX rollout.
    if (defaultAuthMode === McpConnectionAuthModeEnum.ProviderManaged) {
      await assertMcpProviderManagedFlagEnabled({
        featureFlagsService: this.featureFlagsService,
        mcpId: command.mcpId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });
    }

    const row = existing
      ? await this.reEnableExistingRow(existing, command, defaultScope, defaultAuthMode)
      : await this.createNewRow(agent._id, command, defaultScope, defaultAuthMode);

    // Row is in Mongo; refresh Anthropic's shared agent (not per-subscriber session MCPs).
    await this.agentMcpDefinitionService.reconcile({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
    });

    trackAgentMcpServerEnabled(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.agentIdentifier,
      mcpId: command.mcpId,
      defaultScope,
      defaultAuthMode,
    });

    return toEnablementResponse(row);
  }

  private async reEnableExistingRow(
    existing: AgentMcpServerEntity,
    command: EnableAgentMcpServerCommand,
    defaultScope: McpConnectionScopeEnum,
    defaultAuthMode: McpConnectionAuthModeEnum
  ): Promise<AgentMcpServerEntity> {
    const updated = await this.agentMcpServerRepository.findOneAndUpdate(
      {
        _id: existing._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          enabled: true,
          defaultScope,
          defaultAuthMode,
          status: 'syncing',
        },
        $unset: { lastError: 1 },
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(`Agent MCP enablement record disappeared during update.`);
    }

    return updated;
  }

  private async createNewRow(
    agentMongoId: string,
    command: EnableAgentMcpServerCommand,
    defaultScope: McpConnectionScopeEnum,
    defaultAuthMode: McpConnectionAuthModeEnum
  ): Promise<AgentMcpServerEntity> {
    try {
      return await this.agentMcpServerRepository.create({
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        _agentId: agentMongoId,
        mcpId: command.mcpId,
        enabled: true,
        defaultScope,
        defaultAuthMode,
        status: 'syncing',
      });
    } catch (err) {
      // Concurrent enable for the same (env, agent, mcp) tuple lost the
      // race against the unique index. Surface as 409 instead of 500.
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(`MCP "${command.mcpId}" is already enabled on this agent.`);
      }

      throw err;
    }
  }
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  if (!err || typeof err !== 'object') return false;
  const code = (err as MongoDuplicateKeyError).code;

  return code === 11000;
}

export function toEnablementResponse(row: AgentMcpServerEntity): AgentMcpServerEnablementResponseDto {
  return {
    id: row._id,
    mcpId: row.mcpId,
    enabled: row.enabled,
    defaultScope: row.defaultScope as McpConnectionScopeEnum,
    defaultAuthMode: row.defaultAuthMode as McpConnectionAuthModeEnum,
    status: row.status,
  };
}
