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
  Query,
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
import { RequireAuthentication } from '../../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../../../rate-limiting/guards';
import {
  ApiCommonResponses,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../../../shared/framework/response.decorator';
import { KeylessAccessible } from '../../../shared/framework/swagger/keyless.security';
import { UserSession } from '../../../shared/framework/user.decorator';
import { SendAgentWelcomeMessageCommand } from '../../conversation-runtime/reply/send-agent-welcome-message/send-agent-welcome-message.command';
import { SendAgentWelcomeMessage } from '../../conversation-runtime/reply/send-agent-welcome-message/send-agent-welcome-message.usecase';
import { SendAgentTestEmailCommand } from '../../email/send-agent-test-email/send-agent-test-email.command';
import { SendAgentTestEmail } from '../../email/send-agent-test-email/send-agent-test-email.usecase';
import { UpdateAgentInboxSharedCommand } from '../../management/usecases/update-agent-inbox-shared/update-agent-inbox-shared.command';
import { UpdateAgentInboxShared } from '../../management/usecases/update-agent-inbox-shared/update-agent-inbox-shared.usecase';
import {
  AddAgentIntegrationRequestDto,
  AgentIntegrationResponseDto,
  ListAgentIntegrationsQueryDto,
  ListAgentIntegrationsResponseDto,
  UpdateAgentInboxSharedRequestDto,
  UpdateAgentIntegrationRequestDto,
} from '../../shared/dtos';
import { ConfigureWhatsAppWebhookResponseDto } from '../../shared/dtos/configure-whatsapp-webhook-response.dto';
import { IssueSlackSetupLinkResponseDto } from '../../shared/dtos/issue-slack-setup-link-response.dto';
import { SendAgentTestEmailRequestDto } from '../../shared/dtos/send-agent-test-email-request.dto';
import { SendAgentWelcomeMessageRequestDto } from '../../shared/dtos/send-agent-welcome-message-request.dto';
import {
  SendWhatsAppTestTemplateRequestDto,
  SendWhatsAppTestTemplateResponseDto,
} from '../../shared/dtos/send-whatsapp-test-template.dto';
import { IssueSlackSetupLinkCommand } from '../slack-linking/issue-slack-setup-link/issue-slack-setup-link.command';
import { IssueSlackSetupLink } from '../slack-linking/issue-slack-setup-link/issue-slack-setup-link.usecase';
import { ConfigureWhatsAppWebhookCommand } from '../whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.command';
import { ConfigureWhatsAppWebhook } from '../whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import { SendWhatsAppTestTemplateCommand } from '../whatsapp/send-whatsapp-test-template/send-whatsapp-test-template.command';
import { SendWhatsAppTestTemplate } from '../whatsapp/send-whatsapp-test-template/send-whatsapp-test-template.usecase';
import { AddAgentIntegrationCommand } from './add-agent-integration/add-agent-integration.command';
import { AddAgentIntegration } from './add-agent-integration/add-agent-integration.usecase';
import { ListAgentIntegrationsCommand } from './list-agent-integrations/list-agent-integrations.command';
import { ListAgentIntegrations } from './list-agent-integrations/list-agent-integrations.usecase';
import { RemoveAgentIntegrationCommand } from './remove-agent-integration/remove-agent-integration.command';
import { RemoveAgentIntegration } from './remove-agent-integration/remove-agent-integration.usecase';
import { UpdateAgentIntegrationCommand } from './update-agent-integration/update-agent-integration.command';
import { UpdateAgentIntegration } from './update-agent-integration/update-agent-integration.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class AgentIntegrationsController {
  constructor(
    private readonly addAgentIntegrationUsecase: AddAgentIntegration,
    private readonly listAgentIntegrationsUsecase: ListAgentIntegrations,
    private readonly updateAgentIntegrationUsecase: UpdateAgentIntegration,
    private readonly removeAgentIntegrationUsecase: RemoveAgentIntegration,
    private readonly sendAgentTestEmailUsecase: SendAgentTestEmail,
    private readonly sendAgentWelcomeMessageUsecase: SendAgentWelcomeMessage,
    private readonly configureWhatsAppWebhookUsecase: ConfigureWhatsAppWebhook,
    private readonly sendWhatsAppTestTemplateUsecase: SendWhatsAppTestTemplate,
    private readonly issueSlackSetupLinkUsecase: IssueSlackSetupLink,
    private readonly updateAgentInboxSharedUsecase: UpdateAgentInboxShared
  ) {}

  @Post('/:identifier/integrations')
  @ExternalApiAccessible()
  @KeylessAccessible()
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
  @KeylessAccessible()
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
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send onboarding welcome message',
    description:
      'Sends a proactive DM to the agent installer after Slack OAuth, a welcome email after email ' +
      'connection, or posts a bridge-connected follow-up message into an existing conversation thread ' +
      'when conversationId is supplied.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  sendAgentWelcomeMessage(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: SendAgentWelcomeMessageRequestDto
  ): Promise<{ sent: boolean; conversationId?: string; claimToken?: string }> {
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

  @Post('/:identifier/integrations/:integrationId/slack/setup-link')
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiResponse(IssueSlackSetupLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Issue a short-lived Slack setup link',
    description:
      'Issues a signed, single-use link (TTL = 5 minutes) that can be opened to paste a Slack App ' +
      'Configuration Token without re-authenticating. Slack-only.',
  })
  @ApiNotFoundResponse({
    description: 'The agent, integration, or agent-integration link was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createSlackSetupLink(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationId') integrationId: string
  ): Promise<IssueSlackSetupLinkResponseDto> {
    return this.issueSlackSetupLinkUsecase.execute(
      IssueSlackSetupLinkCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationId,
      })
    );
  }
}
