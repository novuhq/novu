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
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { SdkGroupName, SdkMethodName } from '../../../shared/framework/swagger/sdk.decorators';
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
import { ConfigurePhotonWebhookResponseDto } from '../../shared/dtos/configure-photon-webhook-response.dto';
import {
  PollPhotonDeviceAuthRequestDto,
  PollPhotonDeviceAuthResponseDto,
  StartPhotonDeviceAuthResponseDto,
} from '../../shared/dtos/photon-device-auth.dto';
import { ConfigureSendblueWebhookResponseDto } from '../../shared/dtos/configure-sendblue-webhook-response.dto';
import { ConfigureWhatsAppWebhookResponseDto } from '../../shared/dtos/configure-whatsapp-webhook-response.dto';
import { IssueSlackSetupLinkResponseDto } from '../../shared/dtos/issue-slack-setup-link-response.dto';
import {
  RegisterPhotonRecipientRequestDto,
  RegisterPhotonRecipientResponseDto,
} from '../../shared/dtos/register-photon-recipient.dto';
import {
  RemovePhotonWebhooksRequestDto,
  RemovePhotonWebhooksResponseDto,
} from '../../shared/dtos/remove-photon-webhooks.dto';
import {
  RemoveSendblueWebhooksRequestDto,
  RemoveSendblueWebhooksResponseDto,
} from '../../shared/dtos/remove-sendblue-webhooks.dto';
import { SendAgentTestEmailRequestDto } from '../../shared/dtos/send-agent-test-email-request.dto';
import { SendAgentWelcomeMessageRequestDto } from '../../shared/dtos/send-agent-welcome-message-request.dto';
import {
  SendPhotonTestMessageRequestDto,
  SendPhotonTestMessageResponseDto,
} from '../../shared/dtos/send-photon-test-message.dto';
import {
  SendSendblueTestMessageRequestDto,
  SendSendblueTestMessageResponseDto,
} from '../../shared/dtos/send-sendblue-test-message.dto';
import {
  SendWhatsAppTestTemplateRequestDto,
  SendWhatsAppTestTemplateResponseDto,
} from '../../shared/dtos/send-whatsapp-test-template.dto';
import { ConfigurePhotonWebhookCommand } from '../photon-imessage/configure-photon-webhook/configure-photon-webhook.command';
import { ConfigurePhotonWebhook } from '../photon-imessage/configure-photon-webhook/configure-photon-webhook.usecase';
import { PollPhotonDeviceAuthCommand } from '../photon-imessage/poll-photon-device-auth/poll-photon-device-auth.command';
import { PollPhotonDeviceAuth } from '../photon-imessage/poll-photon-device-auth/poll-photon-device-auth.usecase';
import { RegisterPhotonRecipientCommand } from '../photon-imessage/register-photon-recipient/register-photon-recipient.command';
import { RegisterPhotonRecipient } from '../photon-imessage/register-photon-recipient/register-photon-recipient.usecase';
import { StartPhotonDeviceAuthCommand } from '../photon-imessage/start-photon-device-auth/start-photon-device-auth.command';
import { StartPhotonDeviceAuth } from '../photon-imessage/start-photon-device-auth/start-photon-device-auth.usecase';
import { RemovePhotonWebhooksCommand } from '../photon-imessage/remove-photon-webhooks/remove-photon-webhooks.command';
import { RemovePhotonWebhooks } from '../photon-imessage/remove-photon-webhooks/remove-photon-webhooks.usecase';
import { SendPhotonTestMessageCommand } from '../photon-imessage/send-photon-test-message/send-photon-test-message.command';
import { SendAgentPhotonTestMessage } from '../photon-imessage/send-photon-test-message/send-photon-test-message.usecase';
import { ConfigureSendblueWebhookCommand } from '../sendblue/configure-sendblue-webhook/configure-sendblue-webhook.command';
import { ConfigureSendblueWebhook } from '../sendblue/configure-sendblue-webhook/configure-sendblue-webhook.usecase';
import { RemoveSendblueWebhooksCommand } from '../sendblue/remove-sendblue-webhooks/remove-sendblue-webhooks.command';
import { RemoveSendblueWebhooks } from '../sendblue/remove-sendblue-webhooks/remove-sendblue-webhooks.usecase';
import { SendSendblueTestMessageCommand } from '../sendblue/send-sendblue-test-message/send-sendblue-test-message.command';
import { SendAgentSendblueTestMessage } from '../sendblue/send-sendblue-test-message/send-sendblue-test-message.usecase';
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
@ApiTags('Agents')
@SdkGroupName('Agents.Integrations')
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
    private readonly configureSendblueWebhookUsecase: ConfigureSendblueWebhook,
    private readonly removeSendblueWebhooksUsecase: RemoveSendblueWebhooks,
    private readonly sendWhatsAppTestTemplateUsecase: SendWhatsAppTestTemplate,
    private readonly sendAgentSendblueTestMessageUsecase: SendAgentSendblueTestMessage,
    private readonly configurePhotonWebhookUsecase: ConfigurePhotonWebhook,
    private readonly removePhotonWebhooksUsecase: RemovePhotonWebhooks,
    private readonly sendAgentPhotonTestMessageUsecase: SendAgentPhotonTestMessage,
    private readonly startPhotonDeviceAuthUsecase: StartPhotonDeviceAuth,
    private readonly pollPhotonDeviceAuthUsecase: PollPhotonDeviceAuth,
    private readonly registerPhotonRecipientUsecase: RegisterPhotonRecipient,
    private readonly issueSlackSetupLinkUsecase: IssueSlackSetupLink,
    private readonly updateAgentInboxSharedUsecase: UpdateAgentInboxShared
  ) {}

  @Post('/:identifier/integrations')
  @ExternalApiAccessible()
  @KeylessAccessible()
  @SdkGroupName('Agents.Integrations')
  @SdkMethodName('create')
  @ApiResponse(AgentIntegrationResponseDto, 201)
  @ApiOperation({
    summary: 'Create an agent integration',
    description:
      'Create a link between an agent (by identifier) and an integration (by integration **identifier**, not the internal _id).',
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
  @SdkGroupName('Agents.Integrations')
  @SdkMethodName('list')
  @ApiResponse(ListAgentIntegrationsResponseDto)
  @ApiOperation({
    summary: 'List agent integrations',
    description:
      'Retrieve integration links for an agent identified by its external identifier. Supports cursor pagination via **after**, **before**, **limit**, **orderBy**, and **orderDirection**.',
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
  @ExternalApiAccessible()
  @SdkGroupName('Agents.Integrations')
  @SdkMethodName('update')
  @ApiResponse(AgentIntegrationResponseDto)
  @ApiOperation({
    summary: 'Update an agent integration',
    description: 'Update which integration a link points to (by integration **identifier**, not the internal _id).',
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
  @ExternalApiAccessible()
  @SdkGroupName('Agents.Integrations')
  @SdkMethodName('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an agent integration',
    description: 'Delete a specific agent-integration link by its document id.',
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

  @Post('/:identifier/integrations/:integrationIdentifier/sendblue/configure-webhook')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configure the Sendblue receive webhook for an agent integration',
    description:
      'Provisions a webhook signing secret and registers the agent inbound URL as a `receive` webhook on the Sendblue account, so inbound iMessage/SMS messages are delivered to the agent. Falls back to manual configuration when the Sendblue API rejects the registration.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  configureAgentSendblueWebhook(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string
  ): Promise<ConfigureSendblueWebhookResponseDto> {
    return this.configureSendblueWebhookUsecase.execute(
      ConfigureSendblueWebhookCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/sendblue/remove-webhooks')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove stale Novu webhooks from a Sendblue account',
    description:
      "Deletes the supplied webhook URLs from the Sendblue account's `receive` webhook list. Only URLs " +
      'matching the Novu agent webhook shape are removed, regardless of what is supplied — Sendblue webhooks ' +
      'are account-level, so this lets the dashboard clean up duplicate Novu registrations left behind by ' +
      'other agents, integrations, or environments sharing the same Sendblue credentials.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  removeAgentSendblueWebhooks(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Body() body: RemoveSendblueWebhooksRequestDto
  ): Promise<RemoveSendblueWebhooksResponseDto> {
    return this.removeSendblueWebhooksUsecase.execute(
      RemoveSendblueWebhooksCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
        webhookUrls: body.webhookUrls,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/whatsapp/test-template')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a WhatsApp test template from the agent integration',
    description:
      'Sends the `hello_world` template via the configured WhatsApp Business phone number to verify outbound delivery.',
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

  @Post('/:identifier/integrations/:integrationIdentifier/sendblue/test-message')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a test message from the agent Sendblue integration',
    description:
      'Sends a plain-text welcome message via the configured Sendblue number to a recipient supplied by the ' +
      'user, used at the end of the onboarding flow to verify outbound delivery without asking the user to ' +
      'send an inbound message themselves.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  sendAgentSendblueTestMessage(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Body() body: SendSendblueTestMessageRequestDto
  ): Promise<SendSendblueTestMessageResponseDto> {
    return this.sendAgentSendblueTestMessageUsecase.execute(
      SendSendblueTestMessageCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
        subscriberId: body.subscriberId,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/photon/device-auth/start')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start the Photon device-code connect flow for an agent integration',
    description:
      'Proxies the OAuth 2.0 device authorization request to Photon and returns the user code + verification URL. ' +
      'Returns available:false (manual-credentials fallback) when connect is disabled or Photon is unreachable.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  startAgentPhotonDeviceAuth(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string
  ): Promise<StartPhotonDeviceAuthResponseDto> {
    return this.startPhotonDeviceAuthUsecase.execute(
      StartPhotonDeviceAuthCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/photon/device-auth/poll')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Poll the Photon device-code connect flow',
    description:
      'Forwards one poll to Photon’s device token endpoint. On authorization it provisions a Photon project ' +
      '(iMessage platform enabled), stores the project credentials on the integration, registers the inbound ' +
      'webhook, and discards the user access token — secrets never reach the browser.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  pollAgentPhotonDeviceAuth(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Body() body: PollPhotonDeviceAuthRequestDto
  ): Promise<PollPhotonDeviceAuthResponseDto> {
    return this.pollPhotonDeviceAuthUsecase.execute(
      PollPhotonDeviceAuthCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
        deviceCode: body.deviceCode,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/photon/register-recipient')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register a recipient on the Photon shared iMessage line',
    description:
      'Registers a phone number as a shared user on the Photon project (idempotent per phone; plan caps apply) ' +
      'and optionally triggers an opt-in invite email. Returns the assigned Photon number the recipient can text ' +
      'to opt in. Outbound sends only work toward registered, opted-in recipients on the shared line.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  registerAgentPhotonRecipient(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Body() body: RegisterPhotonRecipientRequestDto
  ): Promise<RegisterPhotonRecipientResponseDto> {
    return this.registerPhotonRecipientUsecase.execute(
      RegisterPhotonRecipientCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
        phoneNumber: body.phoneNumber,
        email: body.email,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/photon/configure-webhook')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configure the Photon inbound webhook for an agent integration',
    description:
      'Enables the iMessage platform on the Photon project and registers the agent inbound URL as a webhook, so inbound iMessage messages are delivered to the agent. The Photon-issued signing secret is stored on the integration credentials. Falls back to manual configuration when the Photon API rejects the registration.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  configureAgentPhotonWebhook(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string
  ): Promise<ConfigurePhotonWebhookResponseDto> {
    return this.configurePhotonWebhookUsecase.execute(
      ConfigurePhotonWebhookCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/photon/remove-webhooks')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove stale Novu webhooks from a Photon project',
    description:
      "Deletes the supplied webhook URLs from the Photon project's webhook list. Only URLs matching the Novu " +
      'agent webhook shape are removed, regardless of what is supplied — this lets the dashboard clean up ' +
      'duplicate Novu registrations left behind by other agents, integrations, or environments sharing the ' +
      'same Photon project credentials.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  removeAgentPhotonWebhooks(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Body() body: RemovePhotonWebhooksRequestDto
  ): Promise<RemovePhotonWebhooksResponseDto> {
    return this.removePhotonWebhooksUsecase.execute(
      RemovePhotonWebhooksCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier,
        webhookUrls: body.webhookUrls,
      })
    );
  }

  @Post('/:identifier/integrations/:integrationIdentifier/photon/test-message')
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a test message from the agent Photon integration',
    description:
      'Sends a plain-text welcome message via the Photon shared iMessage line to a recipient supplied by the ' +
      'user, used at the end of the onboarding flow to verify outbound delivery. On the shared line the ' +
      'recipient must have opted in (texted the assigned number) before Photon accepts the send.',
  })
  @ApiNotFoundResponse({ description: 'The agent or integration was not found.' })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  sendAgentPhotonTestMessage(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Body() body: SendPhotonTestMessageRequestDto
  ): Promise<SendPhotonTestMessageResponseDto> {
    return this.sendAgentPhotonTestMessageUsecase.execute(
      SendPhotonTestMessageCommand.create({
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
  @ApiExcludeEndpoint()
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
  @ApiExcludeEndpoint()
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
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send an agent welcome message',
    description:
      'Send a proactive DM to the agent installer after Slack OAuth, a welcome email after email ' +
      'connection, or post a bridge-connected follow-up message into an existing conversation thread ' +
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
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @KeylessAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiResponse(IssueSlackSetupLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Create a Slack setup link',
    description:
      'Issue a signed, single-use link (TTL = 5 minutes) that can be opened to paste a Slack App ' +
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
