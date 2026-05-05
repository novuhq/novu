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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ProductFeature, RequirePermissions } from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  DirectionEnum,
  PermissionsEnum,
  ProductFeatureKeyEnum,
  UserSessionData,
} from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import {
  ApiCommonResponses,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  AddAgentIntegrationRequestDto,
  AgentCredentialsResponseDto,
  AgentIntegrationResponseDto,
  AgentResponseDto,
  CreateAgentRequestDto,
  ListAgentIntegrationsQueryDto,
  ListAgentIntegrationsResponseDto,
  ListAgentsQueryDto,
  ListAgentsResponseDto,
  ListMcpCatalogResponseDto,
  ListSharedMcpCredentialsResponseDto,
  SetSharedMcpCredentialRequestDto,
  SetSharedMcpCredentialResponseDto,
  TestClaudeManagedAgentResponseDto,
  UpdateAgentBridgeRequestDto,
  UpdateAgentIntegrationRequestDto,
  UpdateAgentMcpServersRequestDto,
  UpdateAgentRequestDto,
  UpdateAnthropicAgentCredentialsRequestDto,
} from './dtos';
import { SendAgentTestEmailRequestDto } from './dtos/send-agent-test-email-request.dto';
import { AgentConversationEnabledGuard } from './guards/agent-conversation-enabled.guard';
import { AddAgentIntegrationCommand } from './usecases/add-agent-integration/add-agent-integration.command';
import { AddAgentIntegration } from './usecases/add-agent-integration/add-agent-integration.usecase';
import { CreateAgentCommand } from './usecases/create-agent/create-agent.command';
import { CreateAgent } from './usecases/create-agent/create-agent.usecase';
import { DeleteAgentCommand } from './usecases/delete-agent/delete-agent.command';
import { DeleteAgent } from './usecases/delete-agent/delete-agent.usecase';
import { DisconnectSubscriberMcpCommand } from './usecases/disconnect-subscriber-mcp/disconnect-subscriber-mcp.command';
import { DisconnectSubscriberMcp } from './usecases/disconnect-subscriber-mcp/disconnect-subscriber-mcp.usecase';
import { GetAgentCommand } from './usecases/get-agent/get-agent.command';
import { GetAgent } from './usecases/get-agent/get-agent.usecase';
import { GetAnthropicAgentCredentialsCommand } from './usecases/get-anthropic-agent-credentials/get-anthropic-agent-credentials.command';
import { GetAnthropicAgentCredentials } from './usecases/get-anthropic-agent-credentials/get-anthropic-agent-credentials.usecase';
import { type AgentEmojiEntry, ListAgentEmoji } from './usecases/list-agent-emoji/list-agent-emoji.usecase';
import { ListAgentIntegrationsCommand } from './usecases/list-agent-integrations/list-agent-integrations.command';
import { ListAgentIntegrations } from './usecases/list-agent-integrations/list-agent-integrations.usecase';
import { ListAgentsCommand } from './usecases/list-agents/list-agents.command';
import { ListAgents } from './usecases/list-agents/list-agents.usecase';
import { ListMcpCatalog } from './usecases/list-mcp-catalog/list-mcp-catalog.usecase';
import { ListSharedMcpCredentialsCommand } from './usecases/list-shared-mcp-credentials/list-shared-mcp-credentials.command';
import { ListSharedMcpCredentials } from './usecases/list-shared-mcp-credentials/list-shared-mcp-credentials.usecase';
import { ListSubscriberMcpConnectionsCommand } from './usecases/list-subscriber-mcp-connections/list-subscriber-mcp-connections.command';
import { ListSubscriberMcpConnections } from './usecases/list-subscriber-mcp-connections/list-subscriber-mcp-connections.usecase';
import { RemoveAgentIntegrationCommand } from './usecases/remove-agent-integration/remove-agent-integration.command';
import { RemoveAgentIntegration } from './usecases/remove-agent-integration/remove-agent-integration.usecase';
import { RemoveSharedMcpCredentialCommand } from './usecases/remove-shared-mcp-credential/remove-shared-mcp-credential.command';
import { RemoveSharedMcpCredential } from './usecases/remove-shared-mcp-credential/remove-shared-mcp-credential.usecase';
import { SendAgentTestEmailCommand } from './usecases/send-agent-test-email/send-agent-test-email.command';
import { SendAgentTestEmail } from './usecases/send-agent-test-email/send-agent-test-email.usecase';
import { SetSharedMcpCredentialCommand } from './usecases/set-shared-mcp-credential/set-shared-mcp-credential.command';
import { SetSharedMcpCredential } from './usecases/set-shared-mcp-credential/set-shared-mcp-credential.usecase';
import { TestClaudeManagedAgentCommand } from './usecases/test-claude-managed-agent/test-claude-managed-agent.command';
import { TestClaudeManagedAgent } from './usecases/test-claude-managed-agent/test-claude-managed-agent.usecase';
import { UpdateAgentCommand } from './usecases/update-agent/update-agent.command';
import { UpdateAgent } from './usecases/update-agent/update-agent.usecase';
import { UpdateAgentIntegrationCommand } from './usecases/update-agent-integration/update-agent-integration.command';
import { UpdateAgentIntegration } from './usecases/update-agent-integration/update-agent-integration.usecase';
import { UpdateAgentMcpServersCommand } from './usecases/update-agent-mcp-servers/update-agent-mcp-servers.command';
import { UpdateAgentMcpServers } from './usecases/update-agent-mcp-servers/update-agent-mcp-servers.usecase';
import { UpdateAnthropicAgentCredentialsCommand } from './usecases/update-anthropic-agent-credentials/update-anthropic-agent-credentials.command';
import { UpdateAnthropicAgentCredentials } from './usecases/update-anthropic-agent-credentials/update-anthropic-agent-credentials.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(AgentConversationEnabledGuard)
@ApiExcludeController()
@RequireAuthentication()
export class AgentsController {
  constructor(
    private readonly createAgentUsecase: CreateAgent,
    private readonly listAgentsUsecase: ListAgents,
    private readonly getAgentUsecase: GetAgent,
    private readonly updateAgentUsecase: UpdateAgent,
    private readonly deleteAgentUsecase: DeleteAgent,
    private readonly addAgentIntegrationUsecase: AddAgentIntegration,
    private readonly listAgentIntegrationsUsecase: ListAgentIntegrations,
    private readonly updateAgentIntegrationUsecase: UpdateAgentIntegration,
    private readonly removeAgentIntegrationUsecase: RemoveAgentIntegration,
    private readonly listAgentEmojiUsecase: ListAgentEmoji,
    private readonly sendAgentTestEmailUsecase: SendAgentTestEmail,
    private readonly getAnthropicAgentCredentialsUsecase: GetAnthropicAgentCredentials,
    private readonly updateAnthropicAgentCredentialsUsecase: UpdateAnthropicAgentCredentials,
    private readonly testClaudeManagedAgentUsecase: TestClaudeManagedAgent,
    private readonly listMcpCatalogUsecase: ListMcpCatalog,
    private readonly updateAgentMcpServersUsecase: UpdateAgentMcpServers,
    private readonly listSharedMcpCredentialsUsecase: ListSharedMcpCredentials,
    private readonly setSharedMcpCredentialUsecase: SetSharedMcpCredential,
    private readonly removeSharedMcpCredentialUsecase: RemoveSharedMcpCredential,
    private readonly listSubscriberMcpConnectionsUsecase: ListSubscriberMcpConnections,
    private readonly disconnectSubscriberMcpUsecase: DisconnectSubscriberMcp
  ) {}

  @Get('/emoji')
  @ApiOperation({
    summary: 'List available emoji',
    description:
      'Returns the set of well-known cross-platform emoji names supported for agent reactions. ' +
      'Each entry includes the normalized name and a unicode representation for display.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgentEmoji(): Promise<AgentEmojiEntry[]> {
    return this.listAgentEmojiUsecase.execute();
  }

  @Post('/')
  @ApiResponse(AgentResponseDto, 201)
  @ApiOperation({
    summary: 'Create agent',
    description: 'Creates an agent scoped to the current environment. The identifier must be unique per environment.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createAgent(@UserSession() user: UserSessionData, @Body() body: CreateAgentRequestDto): Promise<AgentResponseDto> {
    return this.createAgentUsecase.execute(
      CreateAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        name: body.name,
        identifier: body.identifier,
        description: body.description,
        active: body.active,
        runtime: body.runtime,
        managedRuntime: body.managedRuntime,
      })
    );
  }

  @Get('/')
  @ApiResponse(ListAgentsResponseDto)
  @ApiOperation({
    summary: 'List agents',
    description:
      'Returns a cursor-paginated list of agents for the current environment. Use **after**, **before**, **limit**, **orderBy**, and **orderDirection** query parameters.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgents(@UserSession() user: UserSessionData, @Query() query: ListAgentsQueryDto): Promise<ListAgentsResponseDto> {
    return this.listAgentsUsecase.execute(
      ListAgentsCommand.create({
        user,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
        identifier: query.identifier,
      })
    );
  }

  @Get('/claude/credentials')
  @ApiResponse(AgentCredentialsResponseDto)
  @ApiOperation({
    summary: 'Get Claude Managed Agents credential status',
    description: 'Returns whether the current environment has an Anthropic API key configured for managed agents.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getClaudeManagedAgentCredentials(@UserSession() user: UserSessionData): Promise<AgentCredentialsResponseDto> {
    return this.getAnthropicAgentCredentialsUsecase.execute(
      GetAnthropicAgentCredentialsCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
      })
    );
  }

  @Put('/claude/credentials')
  @ApiResponse(AgentCredentialsResponseDto)
  @ApiOperation({
    summary: 'Update Claude Managed Agents credentials',
    description: 'Stores the Anthropic API key for the current environment as an encrypted environment variable.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateClaudeManagedAgentCredentials(
    @UserSession() user: UserSessionData,
    @Body() body: UpdateAnthropicAgentCredentialsRequestDto
  ): Promise<AgentCredentialsResponseDto> {
    return this.updateAnthropicAgentCredentialsUsecase.execute(
      UpdateAnthropicAgentCredentialsCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        apiKey: body.apiKey,
      })
    );
  }

  @Get('/mcp/catalog')
  @ApiResponse(ListMcpCatalogResponseDto)
  @ApiOperation({
    summary: 'List the curated MCP server catalog',
    description: 'Returns the MCP servers a Claude Managed agent can be connected to.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listMcpCatalog(): ListMcpCatalogResponseDto {
    return this.listMcpCatalogUsecase.execute();
  }

  @Get('/claude/mcp/credentials/shared')
  @ApiResponse(ListSharedMcpCredentialsResponseDto)
  @ApiOperation({
    summary: 'List shared MCP credentials',
    description: 'Returns the per-MCP configured/not-set status for shared-scope MCP servers in the org vault.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listSharedMcpCredentials(@UserSession() user: UserSessionData): Promise<ListSharedMcpCredentialsResponseDto> {
    return this.listSharedMcpCredentialsUsecase.execute(
      ListSharedMcpCredentialsCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
      })
    );
  }

  @Put('/claude/mcp/credentials/shared')
  @ApiResponse(SetSharedMcpCredentialResponseDto)
  @ApiOperation({
    summary: 'Store a shared static-bearer credential for an MCP server',
    description:
      'Writes a static-bearer credential into the org-level Anthropic vault for a shared-scope MCP server. Replaces any prior credential for the same server URL.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  setSharedMcpCredential(
    @UserSession() user: UserSessionData,
    @Body() body: SetSharedMcpCredentialRequestDto
  ): Promise<SetSharedMcpCredentialResponseDto> {
    return this.setSharedMcpCredentialUsecase.execute(
      SetSharedMcpCredentialCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        mcpServerName: body.mcpServerName,
        token: body.token,
      })
    );
  }

  @Delete('/claude/mcp/credentials/shared/:mcpServerName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiOperation({
    summary: 'Remove a shared MCP credential',
    description: 'Archives the static-bearer credential for the given MCP server in the org vault.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  async removeSharedMcpCredential(
    @UserSession() user: UserSessionData,
    @Param('mcpServerName') mcpServerName: string
  ): Promise<void> {
    await this.removeSharedMcpCredentialUsecase.execute(
      RemoveSharedMcpCredentialCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        mcpServerName: mcpServerName as never,
      })
    );
  }

  @Get('/:identifier/mcp/connections/:subscriberId')
  @ApiOperation({
    summary: "Admin: list a subscriber's MCP connections for an agent",
    description:
      'Returns the per-subscriber MCP connection state (Connected / Not connected / Expired) for the agent. Useful for the admin "Connections" view in the dashboard.',
  })
  @ApiNotFoundResponse({ description: 'The agent was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listSubscriberMcpConnections(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('subscriberId') subscriberId: string
  ) {
    return this.listSubscriberMcpConnectionsUsecase.execute(
      ListSubscriberMcpConnectionsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        agentIdentifier: identifier,
        subscriberId,
      })
    );
  }

  @Delete('/:identifier/mcp/connections/:subscriberId/:mcpServerName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiOperation({
    summary: "Admin: disconnect a subscriber's MCP connection for an agent",
    description: 'Archives the per-subscriber Anthropic credential for the given MCP server.',
  })
  @ApiNotFoundResponse({ description: 'The agent was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  async disconnectSubscriberMcp(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('subscriberId') subscriberId: string,
    @Param('mcpServerName') mcpServerName: string
  ): Promise<void> {
    await this.disconnectSubscriberMcpUsecase.execute(
      DisconnectSubscriberMcpCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        agentIdentifier: identifier,
        subscriberId,
        mcpServerName,
      })
    );
  }

  @Put('/:identifier/claude/mcp')
  @ApiResponse(AgentResponseDto)
  @ApiOperation({
    summary: 'Replace MCP servers attached to a Claude Managed agent',
    description:
      'Replaces the MCP server list on the agent and bumps the corresponding Anthropic agent version. Pass an empty array to detach all MCP servers.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgentMcpServers(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateAgentMcpServersRequestDto
  ): Promise<AgentResponseDto> {
    return this.updateAgentMcpServersUsecase.execute(
      UpdateAgentMcpServersCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        mcpServers: body.mcpServers,
      })
    );
  }

  @Post('/:identifier/integrations')
  @ApiResponse(AgentIntegrationResponseDto, 201)
  @ApiOperation({
    summary: 'Link integration to agent',
    description:
      'Creates a link between an agent (by identifier) and an integration (by integration **identifier**, not the internal _id).',
  })
  @ApiNotFoundResponse({
    description: 'The agent or integration was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  addAgentIntegration(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: AddAgentIntegrationRequestDto
  ): Promise<AgentIntegrationResponseDto> {
    return this.addAgentIntegrationUsecase.execute(
      AddAgentIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier: body.integrationIdentifier,
        providerId: body.providerId,
      })
    );
  }

  @Get('/:identifier/integrations')
  @ApiResponse(ListAgentIntegrationsResponseDto)
  @ApiOperation({
    summary: 'List agent integrations',
    description:
      'Lists integration links for an agent identified by its external identifier. Supports cursor pagination via **after**, **before**, **limit**, **orderBy**, and **orderDirection**.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgentIntegrations(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: ListAgentIntegrationsQueryDto
  ): Promise<ListAgentIntegrationsResponseDto> {
    return this.listAgentIntegrationsUsecase.execute(
      ListAgentIntegrationsCommand.create({
        user,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
        integrationIdentifier: query.integrationIdentifier,
      })
    );
  }

  @Patch('/:identifier/integrations/:agentIntegrationId')
  @ApiResponse(AgentIntegrationResponseDto)
  @ApiOperation({
    summary: 'Update agent-integration link',
    description: 'Updates which integration a link points to (by integration **identifier**, not the internal _id).',
  })
  @ApiNotFoundResponse({
    description: 'The agent, integration, or link was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgentIntegration(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('agentIntegrationId') agentIntegrationId: string,
    @Body() body: UpdateAgentIntegrationRequestDto
  ): Promise<AgentIntegrationResponseDto> {
    return this.updateAgentIntegrationUsecase.execute(
      UpdateAgentIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        agentIntegrationId,
        integrationIdentifier: body.integrationIdentifier,
      })
    );
  }

  @Delete('/:identifier/integrations/:agentIntegrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove agent-integration link',
    description: 'Deletes a specific agent-integration link by its document id.',
  })
  @ApiNoContentResponse({
    description: 'The link was removed.',
  })
  @ApiNotFoundResponse({
    description: 'The agent or agent-integration link was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  removeAgentIntegration(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('agentIntegrationId') agentIntegrationId: string
  ): Promise<void> {
    return this.removeAgentIntegrationUsecase.execute(
      RemoveAgentIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        agentIntegrationId,
      })
    );
  }

  @Post('/:identifier/test-email')
  @HttpCode(HttpStatus.OK)
  @ProductFeature(ProductFeatureKeyEnum.AGENT_EMAIL_INTEGRATION)
  @ApiOperation({
    summary: 'Send a test email to the agent inbound address',
    description:
      'Sends a test email to the configured inbound address using the agent outbound provider (or the Novu demo integration as fallback). Used to verify the inbound email pipeline.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  sendAgentTestEmail(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: SendAgentTestEmailRequestDto
  ): Promise<{ success: boolean }> {
    return this.sendAgentTestEmailUsecase.execute(
      SendAgentTestEmailCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        targetAddress: body.targetAddress,
      })
    );
  }

  @Post('/:identifier/claude/test')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(TestClaudeManagedAgentResponseDto)
  @ApiOperation({
    summary: 'Test Claude Managed Agents configuration',
    description: 'Validates that the configured Anthropic API key can access the agent and environment ids.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  testClaudeManagedAgent(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<TestClaudeManagedAgentResponseDto> {
    return this.testClaudeManagedAgentUsecase.execute(
      TestClaudeManagedAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
      })
    );
  }

  @Put('/:identifier/bridge')
  @ApiResponse(AgentResponseDto)
  @ApiOperation({
    summary: 'Update agent bridge configuration',
    description:
      'Updates the bridge URL configuration for an agent. Used by the CLI to register dev tunnel URLs. Refuses to activate dev bridges on production environments.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgentBridge(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateAgentBridgeRequestDto
  ): Promise<AgentResponseDto> {
    return this.updateAgentUsecase.execute(
      UpdateAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        bridgeUrl: body.bridgeUrl,
        devBridgeUrl: body.devBridgeUrl,
        devBridgeActive: body.devBridgeActive,
      })
    );
  }

  @Get('/:identifier')
  @ApiResponse(AgentResponseDto)
  @ApiOperation({
    summary: 'Get agent',
    description: 'Retrieves an agent by its external identifier (not the internal MongoDB id).',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getAgent(@UserSession() user: UserSessionData, @Param('identifier') identifier: string): Promise<AgentResponseDto> {
    return this.getAgentUsecase.execute(
      GetAgentCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }

  @Patch('/:identifier')
  @ApiResponse(AgentResponseDto)
  @ApiOperation({
    summary: 'Update agent',
    description: 'Updates an agent by its external identifier.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgent(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateAgentRequestDto
  ): Promise<AgentResponseDto> {
    return this.updateAgentUsecase.execute(
      UpdateAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        name: body.name,
        description: body.description,
        active: body.active,
        behavior: body.behavior,
        runtime: body.runtime,
        managedRuntime: body.managedRuntime,
        bridgeUrl: body.bridgeUrl,
        devBridgeUrl: body.devBridgeUrl,
        devBridgeActive: body.devBridgeActive,
      })
    );
  }

  @Delete('/:identifier')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete agent',
    description: 'Deletes an agent by identifier and removes all agent-integration links.',
  })
  @ApiNoContentResponse({
    description: 'The agent was deleted.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  deleteAgent(@UserSession() user: UserSessionData, @Param('identifier') identifier: string): Promise<void> {
    return this.deleteAgentUsecase.execute(
      DeleteAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }
}
