import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, ApiAuthSchemeEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import type { Request } from 'express';
import { getClientIp } from 'request-ip';
import { RequireAuthentication } from '../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../../rate-limiting/guards';
import {
  ApiCommonResponses,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../../shared/framework/response.decorator';
import { KeylessAccessible } from '../../shared/framework/swagger/keyless.security';
import { UserSession } from '../../shared/framework/user.decorator';
import { EnsureProviderManagedVaultCommand } from '../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.command';
import { EnsureProviderManagedVault } from '../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.usecase';
import { GetMcpConnectionStatusCommand } from '../mcp/connections/get-mcp-connection-status/get-mcp-connection-status.command';
import { GetMcpConnectionStatus } from '../mcp/connections/get-mcp-connection-status/get-mcp-connection-status.usecase';
import { GenerateMcpOAuthUrlCommand } from '../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { DisableAgentMcpServerCommand } from '../mcp/servers/disable-agent-mcp-server/disable-agent-mcp-server.command';
import { DisableAgentMcpServer } from '../mcp/servers/disable-agent-mcp-server/disable-agent-mcp-server.usecase';
import { EnableAgentMcpServerCommand } from '../mcp/servers/enable-agent-mcp-server/enable-agent-mcp-server.command';
import { EnableAgentMcpServer } from '../mcp/servers/enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { ListAgentMcpServersCommand } from '../mcp/servers/list-agent-mcp-servers/list-agent-mcp-servers.command';
import { ListAgentMcpServers } from '../mcp/servers/list-agent-mcp-servers/list-agent-mcp-servers.usecase';
import { SetAgentMcpServersCommand } from '../mcp/servers/set-agent-mcp-servers/set-agent-mcp-servers.command';
import { SetAgentMcpServers } from '../mcp/servers/set-agent-mcp-servers/set-agent-mcp-servers.usecase';
import { AgentRuntimeExceptionFilter } from '../shared/agent-runtime-exception.filter';
import {
  AgentMcpServerEnablementResponseDto,
  AgentRuntimeConfigResponseDto,
  EnableAgentMcpServerRequestDto,
  EnsureProviderManagedVaultResponseDto,
  GenerateManagedAgentRequestDto,
  GenerateManagedAgentResponseDto,
  GenerateMcpOAuthUrlRequestDto,
  GenerateMcpOAuthUrlResponseDto,
  ListAgentMcpServersResponseDto,
  McpConnectionResponseDto,
  MigrateAgentRuntimeRequestDto,
  PatchAgentRuntimeConfigRequestDto,
  SetAgentMcpServersRequestDto,
  SetAgentMcpServersResponseDto,
  UploadCustomSkillRequestDto,
  UploadCustomSkillResponseDto,
  VerifyManagedCredentialsRequestDto,
  VerifyManagedCredentialsResponseDto,
} from '../shared/dtos';
import { GenerateManagedAgentCommand } from './usecases/generate-managed-agent/generate-managed-agent.command';
import { GenerateManagedAgent } from './usecases/generate-managed-agent/generate-managed-agent.usecase';
import { GetAgentDemoQuotaCommand } from './usecases/get-agent-demo-quota/get-agent-demo-quota.command';
import { GetAgentDemoQuota } from './usecases/get-agent-demo-quota/get-agent-demo-quota.usecase';
import { GetAgentRuntimeConfigCommand } from './usecases/get-agent-runtime-config/get-agent-runtime-config.command';
import { GetAgentRuntimeConfig } from './usecases/get-agent-runtime-config/get-agent-runtime-config.usecase';
import { MigrateAgentRuntimeCommand } from './usecases/migrate-agent-runtime/migrate-agent-runtime.command';
import { MigrateAgentRuntime } from './usecases/migrate-agent-runtime/migrate-agent-runtime.usecase';
import { UpdateAgentRuntimeConfigCommand } from './usecases/update-agent-runtime-config/update-agent-runtime-config.command';
import { UpdateAgentRuntimeConfig } from './usecases/update-agent-runtime-config/update-agent-runtime-config.usecase';
import { UploadCustomSkillCommand } from './usecases/upload-custom-skill/upload-custom-skill.command';
import { UploadCustomSkill } from './usecases/upload-custom-skill/upload-custom-skill.usecase';
import { VerifyManagedCredentialsCommand } from './usecases/verify-managed-credentials/verify-managed-credentials.command';
import { VerifyManagedCredentials } from './usecases/verify-managed-credentials/verify-managed-credentials.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class AgentRuntimeController {
  constructor(
    private readonly getAgentRuntimeConfigUsecase: GetAgentRuntimeConfig,
    private readonly updateAgentRuntimeConfigUsecase: UpdateAgentRuntimeConfig,
    private readonly uploadCustomSkillUsecase: UploadCustomSkill,
    private readonly enableAgentMcpServerUsecase: EnableAgentMcpServer,
    private readonly disableAgentMcpServerUsecase: DisableAgentMcpServer,
    private readonly setAgentMcpServersUsecase: SetAgentMcpServers,
    private readonly listAgentMcpServersUsecase: ListAgentMcpServers,
    private readonly generateMcpOAuthUrlUsecase: GenerateMcpOAuthUrl,
    private readonly ensureProviderManagedVaultUsecase: EnsureProviderManagedVault,
    private readonly getMcpConnectionStatusUsecase: GetMcpConnectionStatus,
    private readonly verifyManagedCredentialsUsecase: VerifyManagedCredentials,
    private readonly generateManagedAgentUsecase: GenerateManagedAgent,
    private readonly getAgentDemoQuotaUsecase: GetAgentDemoQuota,
    private readonly migrateAgentRuntimeUsecase: MigrateAgentRuntime
  ) {}

  @Post('/verify-credentials')
  @ExternalApiAccessible()
  @KeylessAccessible()
  @ApiResponse(VerifyManagedCredentialsResponseDto)
  @ApiOperation({
    summary: 'Verify managed-runtime credentials',
    description:
      'Performs a stateless, read-only validation of the supplied API key against the selected managed-runtime provider. ' +
      'Used by the dashboard to give immediate feedback when configuring credentials before the integration is created.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  verifyManagedCredentials(
    @UserSession() user: UserSessionData,
    @Body() body: VerifyManagedCredentialsRequestDto
  ): Promise<VerifyManagedCredentialsResponseDto> {
    return this.verifyManagedCredentialsUsecase.execute(
      VerifyManagedCredentialsCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        providerId: body.providerId,
        apiKey: body.apiKey,
        externalWorkspaceId: body.externalWorkspaceId,
        region: body.region,
      })
    );
  }

  @Post('/generate')
  @ExternalApiAccessible()
  @KeylessAccessible()
  @ApiResponse(GenerateManagedAgentResponseDto)
  @ApiOperation({
    summary: 'Generate an agent configuration from a free-form prompt',
    description:
      'Translates a user-supplied description into an agent configuration (name, identifier, systemPrompt, tools, MCP servers, skills).',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  async generateManagedAgent(
    @UserSession() user: UserSessionData,
    @Body() body: GenerateManagedAgentRequestDto,
    @Req() request: Request
  ): Promise<GenerateManagedAgentResponseDto> {
    const abortController = new AbortController();
    const handleSocketClose = (): void => {
      if (request.destroyed) {
        abortController.abort();
      }
    };
    request.socket.on('close', handleSocketClose);

    const command = GenerateManagedAgentCommand.create({
      user,
      prompt: body.prompt,
      runtime: body.runtime,
    });
    // Attach signal outside `create(...)` — running an `AbortSignal` through
    // `class-transformer`'s `plainToInstance` triggers `new AbortSignal()`, which is
    // disallowed by the runtime (`ERR_ILLEGAL_CONSTRUCTOR`).
    command.signal = abortController.signal;
    if (user.scheme === ApiAuthSchemeEnum.KEYLESS) {
      command.clientIp = getClientIp(request) ?? undefined;
    }

    try {
      return await this.generateManagedAgentUsecase.execute(command);
    } finally {
      request.socket.off('close', handleSocketClose);
    }
  }

  @Get('/:identifier/demo-quota')
  @ApiOperation({
    summary: 'Get Novu managed Claude demo quota',
    description:
      'Returns monthly conversation and token usage limits for agents running on the Novu-managed Claude demo integration.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getAgentDemoQuota(@UserSession() user: UserSessionData, @Param('identifier') identifier: string) {
    return this.getAgentDemoQuotaUsecase.execute(
      GetAgentDemoQuotaCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }

  @Post('/:identifier/migrate-runtime')
  @ApiOperation({
    summary: 'Migrate managed agent off Novu demo Claude credentials',
    description:
      'Re-points a managed agent from the Novu demo Claude integration to a user-owned Anthropic integration, copying runtime config and clearing demo sessions.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  migrateAgentRuntime(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: MigrateAgentRuntimeRequestDto
  ) {
    return this.migrateAgentRuntimeUsecase.execute(
      MigrateAgentRuntimeCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        integrationId: body.integrationId,
      })
    );
  }

  @Get('/:identifier/runtime/config')
  @ApiResponse(AgentRuntimeConfigResponseDto, 200)
  @ApiOperation({
    summary: 'Get agent runtime config',
    description:
      'Fetches the live runtime configuration for a managed agent from the provider ' +
      '(model, system prompt, MCP servers, tools). Returns 422 for self-hosted agents.',
  })
  @ApiNotFoundResponse({ description: 'Agent or its runtime integration was not found.' })
  @ApiConflictResponse({
    description:
      'AGENT_RUNTIME_DRIFT — the agent record exists in Novu but the provider reports it as deleted or unreachable. ' +
      'Re-provision or delete the agent.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  @UseFilters(AgentRuntimeExceptionFilter)
  getAgentRuntimeConfig(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<AgentRuntimeConfigResponseDto> {
    return this.getAgentRuntimeConfigUsecase.execute(
      GetAgentRuntimeConfigCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }

  @Patch('/:identifier/runtime/config')
  @ApiResponse(AgentRuntimeConfigResponseDto, 200)
  @ApiOperation({
    summary: 'Update agent runtime config',
    description:
      'Applies a partial update to the managed agent runtime config on the provider. ' +
      'Accepts any combination of model, systemPrompt, tools, and skills. ' +
      'MCP enablement is managed via the dedicated `POST /agents/:identifier/mcp-servers` and ' +
      '`DELETE /agents/:identifier/mcp-servers/:mcpId` endpoints. ' +
      'Server-side diffing issues the minimal set of provider API calls. ' +
      'An empty body is accepted and returns the current config unchanged.',
  })
  @ApiNotFoundResponse({ description: 'Agent or its runtime integration was not found.' })
  @ApiConflictResponse({
    description:
      'AGENT_RUNTIME_DRIFT — the agent record exists in Novu but the provider reports it as deleted or unreachable. ' +
      'Re-provision or delete the agent.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  updateAgentRuntimeConfig(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: PatchAgentRuntimeConfigRequestDto
  ): Promise<AgentRuntimeConfigResponseDto> {
    return this.updateAgentRuntimeConfigUsecase.execute(
      UpdateAgentRuntimeConfigCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        model: body.model,
        systemPrompt: body.systemPrompt,
        tools: body.tools,
        skills: body.skills,
      })
    );
  }

  @Get('/:identifier/mcp-servers')
  @ApiResponse(ListAgentMcpServersResponseDto)
  @ApiOperation({
    summary: 'List MCP servers enabled on agent',
    description:
      'Returns the per-agent enablement records sourced from Mongo. Mongo is the source of truth for ' +
      'the agent\u2019s MCP list; the provider\u2019s `agent.mcp_servers` collection is synced from these rows.',
  })
  @ApiNotFoundResponse({ description: 'The agent was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgentMcpServers(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<ListAgentMcpServersResponseDto> {
    return this.listAgentMcpServersUsecase.execute(
      ListAgentMcpServersCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
      })
    );
  }

  @Post('/:identifier/mcp-servers')
  @ApiResponse(AgentMcpServerEnablementResponseDto, 201)
  @ApiOperation({
    summary: 'Enable an MCP server on agent',
    description:
      'Writes the per-agent enablement record and synchronously projects the new enabled set onto the runtime provider.',
  })
  @ApiNotFoundResponse({ description: 'The agent or runtime integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  enableAgentMcpServer(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: EnableAgentMcpServerRequestDto
  ): Promise<AgentMcpServerEnablementResponseDto> {
    return this.enableAgentMcpServerUsecase.execute(
      EnableAgentMcpServerCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        mcpId: body.mcpId,
        defaultScope: body.defaultScope,
      })
    );
  }

  @Put('/:identifier/mcp-servers')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(SetAgentMcpServersResponseDto, 200)
  @ApiOperation({
    summary: 'Replace the agent\u2019s enabled MCP server set',
    description:
      'Idempotent bulk update: ids in the request not currently enabled are enabled, currently-enabled ids ' +
      'missing from the request are disabled, the rest are untouched. Catalog validation fails the whole ' +
      'request up-front (no partial writes for malformed input). Per-row business / provider errors are ' +
      'collected into `failed[]` so a single bad row never strands the other edits; the dashboard surfaces ' +
      'these failures and refetches the list to render the truth.',
  })
  @ApiNotFoundResponse({ description: 'The agent or runtime integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  setAgentMcpServers(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: SetAgentMcpServersRequestDto
  ): Promise<SetAgentMcpServersResponseDto> {
    return this.setAgentMcpServersUsecase.execute(
      SetAgentMcpServersCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        mcpIds: body.mcpIds,
      })
    );
  }

  @Delete('/:identifier/mcp-servers/:mcpId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Disable an MCP server on agent',
    description:
      'Cascade-deletes any `mcp_connection` rows scoped to this enablement, removes the per-agent record, and resyncs the provider projection.',
  })
  @ApiNoContentResponse({ description: 'The MCP was disabled.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  disableAgentMcpServer(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('mcpId') mcpId: string
  ): Promise<void> {
    return this.disableAgentMcpServerUsecase.execute(
      DisableAgentMcpServerCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        mcpId,
      })
    );
  }

  @Post('/:identifier/mcp-servers/:mcpId/oauth/url')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(GenerateMcpOAuthUrlResponseDto, 200)
  @ApiOperation({
    summary: 'Generate MCP OAuth authorize URL',
    description:
      'Returns the provider authorize URL the subscriber should be redirected to for a `subscriber`-scoped connection. ' +
      'Reuses the signed-state OAuth pattern already used by chat integrations.',
  })
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  generateMcpOAuthUrl(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('mcpId') mcpId: string,
    @Body() body: GenerateMcpOAuthUrlRequestDto
  ): Promise<GenerateMcpOAuthUrlResponseDto> {
    return this.generateMcpOAuthUrlUsecase.execute(
      GenerateMcpOAuthUrlCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        mcpId,
        subscriberId: body.subscriberId,
        conversationId: body.conversationId,
      })
    );
  }

  @Post('/:identifier/mcp-servers/:mcpId/provider-vault')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(EnsureProviderManagedVaultResponseDto, 200)
  @ApiOperation({
    summary: 'Ensure a provider-managed vault and return the redirect URL',
    description:
      'For MCPs whose catalog `oauth.mode === "provider-managed"`, ensures the catalog enablement row, projects ' +
      'the agent on the runtime provider, ensures a per-subscriber vault container exists, and returns the deep ' +
      'link the dashboard opens in a new tab so the user can complete connector OAuth inside the provider ' +
      '(Claude). The subscriber is derived from the current dashboard user. Gated by ' +
      '`IS_MCP_PROVIDER_MANAGED_ENABLED`.',
  })
  @ApiNotFoundResponse({ description: 'Agent or runtime integration not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  ensureProviderManagedVault(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('mcpId') mcpId: string
  ): Promise<EnsureProviderManagedVaultResponseDto> {
    return this.ensureProviderManagedVaultUsecase.execute(
      EnsureProviderManagedVaultCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        mcpId,
      })
    );
  }

  @Get('/:identifier/mcp-servers/:mcpId/connection')
  @ApiResponse(McpConnectionResponseDto)
  @ApiOperation({
    summary: 'Get MCP connection status for a subscriber',
    description:
      'Returns the per-subscriber connection state for the (agent, mcp) pair, or null when no connection has been initiated yet. ' +
      'Used by the dashboard to render Authorize / Connected / Re-authorize CTAs without leaking encrypted tokens.',
  })
  @ApiNotFoundResponse({ description: 'Agent or MCP enablement not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getMcpConnectionStatus(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('mcpId') mcpId: string,
    @Query('subscriberId') subscriberId: string
  ): Promise<McpConnectionResponseDto | null> {
    return this.getMcpConnectionStatusUsecase.execute(
      GetMcpConnectionStatusCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        mcpId,
        subscriberId,
      })
    );
  }

  @Post('/skills')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse(UploadCustomSkillResponseDto, 201)
  @ApiOperation({
    summary: 'Upload one or more custom skills from a source',
    description:
      'Downloads the supplied source, uploads each resulting bundle to the integration provider ' +
      'as a custom skill, and returns the provider-assigned skill IDs as a uniform `skills[]` array. ' +
      'Three source variants are supported:\n\n' +
      '- `type: "github-url"` — full `https://github.com/...` URL. Always uploads exactly one skill; ' +
      'use this form to pin a ref or to disambiguate when multiple repo directories share a basename. ' +
      'Accepts `/`, `/tree/{ref}`, or `/tree/{ref}/{path}` shapes.\n' +
      '- `type: "github-repo"` — `owner/repo` slug fetched from the default branch (HEAD). ' +
      'Pass a required, non-empty `skills` array of directory basenames to upload. Each name must ' +
      'match exactly one directory containing a `SKILL.md`; ambiguous names are rejected with a 400.\n' +
      '- `type: "inline"` — raw `SKILL.md` text pasted by the caller, wrapped server-side as a single-file bundle.\n\n' +
      'Each returned `skillId` can be passed via `managedRuntime.skills` on POST /agents or ' +
      'PATCH /agents/:identifier/runtime/config as `{ type: "custom", skillId }`. ' +
      'Re-uploading a source whose derived display title matches an existing custom skill appends a new ' +
      'version to it rather than failing — the entry returns the existing `skillId` and the new `version`. ' +
      'When a multi-skill `github-repo` upload partially fails, the request is aborted at the first ' +
      'error and earlier successful uploads are NOT rolled back (they will auto-version on retry).',
  })
  @ApiNotFoundResponse({ description: 'The integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  createCustomSkill(
    @UserSession() user: UserSessionData,
    @Body() body: UploadCustomSkillRequestDto
  ): Promise<UploadCustomSkillResponseDto> {
    return this.uploadCustomSkillUsecase.execute(
      UploadCustomSkillCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        integrationId: body.integrationId,
        source: body.source,
      })
    );
  }
}
