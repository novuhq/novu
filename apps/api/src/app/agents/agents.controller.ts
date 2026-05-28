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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiExcludeEndpoint, ApiOperation } from '@nestjs/swagger';
import { ProductFeature, RequirePermissions } from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  DirectionEnum,
  PermissionsEnum,
  ProductFeatureKeyEnum,
  UserSessionData,
} from '@novu/shared';
import type { Request } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import {
  ApiCommonResponses,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  AddAgentIntegrationRequestDto,
  AgentIntegrationResponseDto,
  AgentMcpServerEnablementResponseDto,
  AgentResponseDto,
  AgentRuntimeConfigResponseDto,
  CreateAgentRequestDto,
  EnableAgentMcpServerRequestDto,
  GenerateManagedAgentRequestDto,
  GenerateManagedAgentResponseDto,
  GenerateMcpOAuthUrlRequestDto,
  GenerateMcpOAuthUrlResponseDto,
  ListAgentIntegrationsQueryDto,
  ListAgentIntegrationsResponseDto,
  ListAgentMcpServersResponseDto,
  ListAgentsQueryDto,
  ListAgentsResponseDto,
  McpConnectionResponseDto,
  MigrateAgentRuntimeRequestDto,
  PatchAgentRuntimeConfigRequestDto,
  UpdateAgentBridgeRequestDto,
  UpdateAgentInboxSharedRequestDto,
  UpdateAgentIntegrationRequestDto,
  UpdateAgentRequestDto,
  UploadCustomSkillRequestDto,
  UploadCustomSkillResponseDto,
  VerifyManagedCredentialsRequestDto,
  VerifyManagedCredentialsResponseDto,
} from './dtos';
import { ConfigureTelegramWebhookResponseDto } from './dtos/configure-telegram-webhook-response.dto';
import { ConfigureWhatsAppWebhookResponseDto } from './dtos/configure-whatsapp-webhook-response.dto';
import { IssueTelegramMobileLinkRequestDto } from './dtos/issue-telegram-mobile-link-request.dto';
import { IssueTelegramMobileLinkResponseDto } from './dtos/issue-telegram-mobile-link-response.dto';
import { IssueTelegramSubscriberLinkRequestDto } from './dtos/issue-telegram-subscriber-link-request.dto';
import { IssueTelegramSubscriberLinkResponseDto } from './dtos/issue-telegram-subscriber-link-response.dto';
import { SendAgentTestEmailRequestDto } from './dtos/send-agent-test-email-request.dto';
import { SendAgentWelcomeMessageRequestDto } from './dtos/send-agent-welcome-message-request.dto';
import {
  SendWhatsAppTestTemplateRequestDto,
  SendWhatsAppTestTemplateResponseDto,
} from './dtos/send-whatsapp-test-template.dto';
import { AgentRuntimeExceptionFilter } from './filters/agent-runtime-exception.filter';
import { AgentConversationEnabledGuard } from './guards/agent-conversation-enabled.guard';
import { AddAgentIntegrationCommand } from './usecases/add-agent-integration/add-agent-integration.command';
import { AddAgentIntegration } from './usecases/add-agent-integration/add-agent-integration.usecase';
import { ConfigureTelegramAgentWebhookCommand } from './usecases/configure-telegram-agent-webhook/configure-telegram-agent-webhook.command';
import { ConfigureTelegramAgentWebhook } from './usecases/configure-telegram-agent-webhook/configure-telegram-agent-webhook.usecase';
import { ConfigureWhatsAppWebhookCommand } from './usecases/configure-whatsapp-webhook/configure-whatsapp-webhook.command';
import { ConfigureWhatsAppWebhook } from './usecases/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import { CreateAgentCommand } from './usecases/create-agent/create-agent.command';
import { CreateAgent } from './usecases/create-agent/create-agent.usecase';
import { DeleteAgentCommand } from './usecases/delete-agent/delete-agent.command';
import { DeleteAgent } from './usecases/delete-agent/delete-agent.usecase';
import { DisableAgentMcpServerCommand } from './usecases/disable-agent-mcp-server/disable-agent-mcp-server.command';
import { DisableAgentMcpServer } from './usecases/disable-agent-mcp-server/disable-agent-mcp-server.usecase';
import { EnableAgentMcpServerCommand } from './usecases/enable-agent-mcp-server/enable-agent-mcp-server.command';
import { EnableAgentMcpServer } from './usecases/enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { GenerateManagedAgentCommand } from './usecases/generate-managed-agent/generate-managed-agent.command';
import { GenerateManagedAgent } from './usecases/generate-managed-agent/generate-managed-agent.usecase';
import { GenerateMcpOAuthUrlCommand } from './usecases/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from './usecases/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { GetAgentCommand } from './usecases/get-agent/get-agent.command';
import { GetAgent } from './usecases/get-agent/get-agent.usecase';
import { GetAgentDemoQuotaCommand } from './usecases/get-agent-demo-quota/get-agent-demo-quota.command';
import { GetAgentDemoQuota } from './usecases/get-agent-demo-quota/get-agent-demo-quota.usecase';
import { GetAgentRuntimeConfigCommand } from './usecases/get-agent-runtime-config/get-agent-runtime-config.command';
import { GetAgentRuntimeConfig } from './usecases/get-agent-runtime-config/get-agent-runtime-config.usecase';
import { GetMcpConnectionStatusCommand } from './usecases/get-mcp-connection-status/get-mcp-connection-status.command';
import { GetMcpConnectionStatus } from './usecases/get-mcp-connection-status/get-mcp-connection-status.usecase';
import { IssueTelegramMobileLinkCommand } from './usecases/issue-telegram-mobile-link/issue-telegram-mobile-link.command';
import { IssueTelegramMobileLink } from './usecases/issue-telegram-mobile-link/issue-telegram-mobile-link.usecase';
import { IssueTelegramSubscriberLinkCommand } from './usecases/issue-telegram-subscriber-link/issue-telegram-subscriber-link.command';
import { IssueTelegramSubscriberLink } from './usecases/issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';
import { type AgentEmojiEntry, ListAgentEmoji } from './usecases/list-agent-emoji/list-agent-emoji.usecase';
import { ListAgentIntegrationsCommand } from './usecases/list-agent-integrations/list-agent-integrations.command';
import { ListAgentIntegrations } from './usecases/list-agent-integrations/list-agent-integrations.usecase';
import { ListAgentMcpServersCommand } from './usecases/list-agent-mcp-servers/list-agent-mcp-servers.command';
import { ListAgentMcpServers } from './usecases/list-agent-mcp-servers/list-agent-mcp-servers.usecase';
import { ListAgentsCommand } from './usecases/list-agents/list-agents.command';
import { ListAgents } from './usecases/list-agents/list-agents.usecase';
import { MigrateAgentRuntimeCommand } from './usecases/migrate-agent-runtime/migrate-agent-runtime.command';
import { MigrateAgentRuntime } from './usecases/migrate-agent-runtime/migrate-agent-runtime.usecase';
import { RemoveAgentIntegrationCommand } from './usecases/remove-agent-integration/remove-agent-integration.command';
import { RemoveAgentIntegration } from './usecases/remove-agent-integration/remove-agent-integration.usecase';
import { SendAgentTestEmailCommand } from './usecases/send-agent-test-email/send-agent-test-email.command';
import { SendAgentTestEmail } from './usecases/send-agent-test-email/send-agent-test-email.usecase';
import { SendAgentWelcomeMessageCommand } from './usecases/send-agent-welcome-message/send-agent-welcome-message.command';
import { SendAgentWelcomeMessage } from './usecases/send-agent-welcome-message/send-agent-welcome-message.usecase';
import { SendWhatsAppTestTemplateCommand } from './usecases/send-whatsapp-test-template/send-whatsapp-test-template.command';
import { SendWhatsAppTestTemplate } from './usecases/send-whatsapp-test-template/send-whatsapp-test-template.usecase';
import { UpdateAgentCommand } from './usecases/update-agent/update-agent.command';
import { UpdateAgent } from './usecases/update-agent/update-agent.usecase';
import { UpdateAgentInboxSharedCommand } from './usecases/update-agent-inbox-shared/update-agent-inbox-shared.command';
import { UpdateAgentInboxShared } from './usecases/update-agent-inbox-shared/update-agent-inbox-shared.usecase';
import { UpdateAgentIntegrationCommand } from './usecases/update-agent-integration/update-agent-integration.command';
import { UpdateAgentIntegration } from './usecases/update-agent-integration/update-agent-integration.usecase';
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
    private readonly sendAgentWelcomeMessageUsecase: SendAgentWelcomeMessage,
    private readonly getAgentRuntimeConfigUsecase: GetAgentRuntimeConfig,
    private readonly updateAgentRuntimeConfigUsecase: UpdateAgentRuntimeConfig,
    private readonly uploadCustomSkillUsecase: UploadCustomSkill,
    private readonly configureWhatsAppWebhookUsecase: ConfigureWhatsAppWebhook,
    private readonly sendWhatsAppTestTemplateUsecase: SendWhatsAppTestTemplate,
    private readonly enableAgentMcpServerUsecase: EnableAgentMcpServer,
    private readonly disableAgentMcpServerUsecase: DisableAgentMcpServer,
    private readonly listAgentMcpServersUsecase: ListAgentMcpServers,
    private readonly generateMcpOAuthUrlUsecase: GenerateMcpOAuthUrl,
    private readonly getMcpConnectionStatusUsecase: GetMcpConnectionStatus,
    private readonly configureTelegramAgentWebhookUsecase: ConfigureTelegramAgentWebhook,
    private readonly issueTelegramMobileLinkUsecase: IssueTelegramMobileLink,
    private readonly issueTelegramSubscriberLinkUsecase: IssueTelegramSubscriberLink,
    private readonly updateAgentInboxSharedUsecase: UpdateAgentInboxShared,
    private readonly verifyManagedCredentialsUsecase: VerifyManagedCredentials,
    private readonly generateManagedAgentUsecase: GenerateManagedAgent,
    private readonly getAgentDemoQuotaUsecase: GetAgentDemoQuota,
    private readonly migrateAgentRuntimeUsecase: MigrateAgentRuntime
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

  @Post('/verify-credentials')
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

    try {
      return await this.generateManagedAgentUsecase.execute(command);
    } finally {
      request.socket.off('close', handleSocketClose);
    }
  }

  @Post('/')
  @ExternalApiAccessible()
  @ApiResponse(AgentResponseDto, 201)
  @ApiOperation({
    summary: 'Create agent',
    description: 'Creates an agent scoped to the current environment. The identifier must be unique per environment.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
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
  @ExternalApiAccessible()
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

  @Post('/:identifier/integrations')
  @ExternalApiAccessible()
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
  @ExternalApiAccessible()
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

  @Post('/:identifier/integrations/:integrationIdentifier/whatsapp/auto-configure')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-configure the WhatsApp webhook for an agent integration',
    description:
      'Calls Meta to register Novu as the webhook callback for the connected WhatsApp Business Account, subscribing to message events with the auto-generated verify token. Falls back to manual configuration when the access token lacks the management scope.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  configureAgentWhatsAppWebhook(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string
  ): Promise<ConfigureWhatsAppWebhookResponseDto> {
    return this.configureWhatsAppWebhookUsecase.execute(
      ConfigureWhatsAppWebhookCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/whatsapp/test-template')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a hello_world WhatsApp template from the agent integration',
    description:
      'Sends the standard `hello_world` template via the configured WhatsApp Business phone number to a recipient supplied by the user, used at the end of the onboarding flow to verify outbound delivery without asking the user to send an inbound message themselves.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  sendAgentWhatsAppTestTemplate(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Body() body: SendWhatsAppTestTemplateRequestDto
  ): Promise<SendWhatsAppTestTemplateResponseDto> {
    return this.sendWhatsAppTestTemplateUsecase.execute(
      SendWhatsAppTestTemplateCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
        subscriberId: body.subscriberId,
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

  @Patch('/:identifier/inbox/shared')
  @ApiResponse(AgentIntegrationResponseDto)
  @ApiOperation({
    summary: 'Enable or disable the Novu shared inbox for an agent',
    description:
      'Disabling drops inbound mail addressed to this agent on the shared `agentconnect.sh` domain — custom-domain ' +
      'routes continue to deliver. Refused when no custom-domain inbox is configured (would leave the agent with ' +
      'zero inbound paths).',
  })
  @ApiNotFoundResponse({ description: 'The agent or its Novu Email integration was not found.' })
  @ProductFeature(ProductFeatureKeyEnum.AGENT_EMAIL_INTEGRATION)
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgentInboxShared(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateAgentInboxSharedRequestDto
  ): Promise<AgentIntegrationResponseDto> {
    return this.updateAgentInboxSharedUsecase.execute(
      UpdateAgentInboxSharedCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        disabled: body.disabled,
      })
    );
  }

  @Post('/:identifier/welcome-message')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send onboarding welcome message',
    description:
      'Sends a proactive DM to the agent installer after Slack OAuth, or posts a bridge-connected ' +
      'follow-up message into an existing conversation thread when conversationId is supplied.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  sendAgentWelcomeMessage(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: SendAgentWelcomeMessageRequestDto
  ): Promise<{ sent: boolean; conversationId?: string }> {
    return this.sendAgentWelcomeMessageUsecase.execute(
      SendAgentWelcomeMessageCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier: body.integrationIdentifier,
        conversationId: body.conversationId,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationId/telegram/configure')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiResponse(ConfigureTelegramWebhookResponseDto, 200)
  @ApiOperation({
    summary: 'Configure Telegram bot webhook',
    description: `Registers the Novu agent webhook URL with Telegram for the specified integration,
       generates a cryptographic secret token for webhook verification,
       and persists it on the integration. Re-running rotates the secret.`,
  })
  @ApiNotFoundResponse({
    description: 'The agent, integration, or agent-integration link was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateTelegramWebhook(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationId') integrationId: string
  ): Promise<ConfigureTelegramWebhookResponseDto> {
    return this.configureTelegramAgentWebhookUsecase.execute(
      ConfigureTelegramAgentWebhookCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationId,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationId/telegram/mobile-link')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiResponse(IssueTelegramMobileLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Issue a short-lived Telegram mobile setup link',
    description:
      'Issues a signed, single-use link (TTL = 5 minutes) that can be opened on a mobile device to finish ' +
      'configuring a Telegram bot without re-authenticating. Telegram-only.',
  })
  @ApiNotFoundResponse({
    description: 'The agent, integration, or agent-integration link was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createTelegramMobileLink(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationId') integrationId: string,
    @Body() body?: IssueTelegramMobileLinkRequestDto
  ): Promise<IssueTelegramMobileLinkResponseDto> {
    return this.issueTelegramMobileLinkUsecase.execute(
      IssueTelegramMobileLinkCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationId,
        subscriberId: body?.subscriberId,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationId/telegram/subscriber-link')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiResponse(IssueTelegramSubscriberLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Issue a Telegram subscriber-link deep link',
    description:
      'Issues a short-lived opaque start code and returns a Telegram `t.me/<bot>?start=<code>` deep link. When ' +
      'opened, Telegram sends `/start <code>` to the bot; the agent webhook consumes the code server-side and ' +
      'creates a `telegram_chat` channel endpoint so notifications can reach that subscriber via Telegram.',
  })
  @ApiNotFoundResponse({
    description: 'The agent, integration, agent-integration link, or subscriber was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createTelegramSubscriberLink(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationId') integrationId: string,
    @Body() body: IssueTelegramSubscriberLinkRequestDto
  ): Promise<IssueTelegramSubscriberLinkResponseDto> {
    return this.issueTelegramSubscriberLinkUsecase.execute(
      IssueTelegramSubscriberLinkCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationId,
        subscriberId: body.subscriberId,
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
    description:
      'Deletes an agent by identifier and removes all agent-integration links. ' +
      'For managed-runtime agents, pass `deleteFromProvider=true` to also archive the agent on the provider side (e.g. Anthropic). ' +
      'By default only the Novu record is deleted and the provider agent is left intact.',
  })
  @ApiNoContentResponse({
    description: 'The agent was deleted.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  deleteAgent(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query('deleteFromProvider') deleteFromProvider?: string
  ): Promise<void> {
    return this.deleteAgentUsecase.execute(
      DeleteAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        deleteFromProvider: deleteFromProvider === 'true',
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
