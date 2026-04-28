import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CalculateLimitNovuIntegration,
  CalculateLimitNovuIntegrationCommand,
  FeatureFlagsService,
  GetActiveIntegrations,
  GetActiveIntegrationsCommand,
  GetDecryptedIntegrations,
  IntegrationResponseDto,
  OtelSpan,
  RequirePermissions,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  PermissionsEnum,
  UserSessionData,
} from '@novu/shared';
import { Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import {
  ApiCommonResponses,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { AutoConfigureIntegrationResponseDto } from './dtos/auto-configure-integration-response.dto';
import { CreateIntegrationRequestDto } from './dtos/create-integration-request.dto';
import { GenerateChatOauthUrlRequestDto } from './dtos/generate-chat-oauth-url.dto';
import { GenerateChatOAuthUrlResponseDto } from './dtos/generate-chat-oauth-url-response.dto';
import { GenerateConnectOauthUrlRequestDto } from './dtos/generate-connect-oauth-url-request.dto';
import { GenerateLinkUserOauthUrlRequestDto } from './dtos/generate-link-user-oauth-url-request.dto';
import { ChannelTypeLimitDto } from './dtos/get-channel-type-limit.sto';
import { UpdateIntegrationRequestDto } from './dtos/update-integration.dto';
import { AutoConfigureIntegrationCommand } from './usecases/auto-configure-integration/auto-configure-integration.command';
import { AutoConfigureIntegration } from './usecases/auto-configure-integration/auto-configure-integration.usecase';
import { ChatOauthCallbackCommand } from './usecases/chat-oauth-callback/chat-oauth-callback.command';
import { ResponseTypeEnum } from './usecases/chat-oauth-callback/chat-oauth-callback.response';
import { ChatOauthCallback } from './usecases/chat-oauth-callback/chat-oauth-callback.usecase';
import { CreateIntegrationCommand } from './usecases/create-integration/create-integration.command';
import { CreateIntegration } from './usecases/create-integration/create-integration.usecase';
import { GenerateChatOauthUrlCommand } from './usecases/generate-chat-oath-url/generate-chat-oauth-url.command';
import { GenerateChatOauthUrl } from './usecases/generate-chat-oath-url/generate-chat-oauth-url.usecase';
import { GenerateConnectOauthUrlCommand } from './usecases/generate-chat-oath-url/generate-connect-oauth-url.command';
import { GenerateConnectOauthUrl } from './usecases/generate-chat-oath-url/generate-connect-oauth-url.usecase';
import { GenerateLinkUserOauthUrlCommand } from './usecases/generate-chat-oath-url/generate-link-user-oauth-url.command';
import { GenerateLinkUserOauthUrl } from './usecases/generate-chat-oath-url/generate-link-user-oauth-url.usecase';
import { GetInAppActivatedCommand } from './usecases/get-in-app-activated/get-in-app-activated.command';
import { GetInAppActivated } from './usecases/get-in-app-activated/get-in-app-activated.usecase';
import { GetIntegrationsCommand } from './usecases/get-integrations/get-integrations.command';
import { GetIntegrations } from './usecases/get-integrations/get-integrations.usecase';
import { GetWebhookSupportStatusCommand } from './usecases/get-webhook-support-status/get-webhook-support-status.command';
import { GetWebhookSupportStatus } from './usecases/get-webhook-support-status/get-webhook-support-status.usecase';
import { RemoveIntegrationCommand } from './usecases/remove-integration/remove-integration.command';
import { RemoveIntegration } from './usecases/remove-integration/remove-integration.usecase';
import { SetIntegrationAsPrimaryCommand } from './usecases/set-integration-as-primary/set-integration-as-primary.command';
import { SetIntegrationAsPrimary } from './usecases/set-integration-as-primary/set-integration-as-primary.usecase';
import { UpdateIntegrationCommand } from './usecases/update-integration/update-integration.command';
import { UpdateIntegration } from './usecases/update-integration/update-integration.usecase';

@ApiCommonResponses()
@Controller('/integrations')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Integrations')
export class IntegrationsController {
  constructor(
    private getInAppActivatedUsecase: GetInAppActivated,
    private getIntegrationsUsecase: GetIntegrations,
    private getActiveIntegrationsUsecase: GetActiveIntegrations,
    private getWebhookSupportStatusUsecase: GetWebhookSupportStatus,
    private createIntegrationUsecase: CreateIntegration,
    private updateIntegrationUsecase: UpdateIntegration,
    private autoConfigureIntegrationUsecase: AutoConfigureIntegration,
    private setIntegrationAsPrimaryUsecase: SetIntegrationAsPrimary,
    private removeIntegrationUsecase: RemoveIntegration,
    private calculateLimitNovuIntegration: CalculateLimitNovuIntegration,
    private organizationRepository: CommunityOrganizationRepository,
    private generateChatOauthUrlUsecase: GenerateChatOauthUrl,
    private generateConnectOauthUrlUsecase: GenerateConnectOauthUrl,
    private generateLinkUserOauthUrlUsecase: GenerateLinkUserOauthUrl,
    private chatOauthCallbackUsecase: ChatOauthCallback,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @Get('/')
  @ApiOkResponse({
    type: [IntegrationResponseDto],
    description: 'The list of integrations belonging to the organization that are successfully returned.',
  })
  @ApiOperation({
    summary: 'List all integrations',
    description: 'List all the channels integrations created in the organization',
  })
  @ExternalApiAccessible()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async listIntegrations(@UserSession() user: UserSessionData): Promise<IntegrationResponseDto[]> {
    const canAccessCredentials = await this.canUserAccessCredentials(user);

    return await this.getIntegrationsUsecase.execute(
      GetIntegrationsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        returnCredentials: canAccessCredentials,
      })
    );
  }

  @Get('/active')
  @ApiOkResponse({
    type: [IntegrationResponseDto],
    description: 'The list of active integrations belonging to the organization that are successfully returned.',
  })
  @ApiOperation({
    summary: 'List active integrations',
    description: 'List all the active integrations created in the organization',
  })
  @ExternalApiAccessible()
  @SdkMethodName('listActive')
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async getActiveIntegrations(@UserSession() user: UserSessionData): Promise<IntegrationResponseDto[]> {
    const canAccessCredentials = await this.canUserAccessCredentials(user);

    return await this.getActiveIntegrationsUsecase.execute(
      GetActiveIntegrationsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        returnCredentials: canAccessCredentials,
      })
    );
  }

  @Get('/webhook/provider/:providerOrIntegrationId/status')
  @ApiOkResponse({
    type: Boolean,
    description: 'The status of the webhook for the provider requested',
  })
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Retrieve webhook status',
    description: `Retrieve the status of the webhook for integration specified in query param **providerOrIntegrationId**. 
    This API returns a boolean value.`,
  })
  @SdkGroupName('Integrations.Webhooks')
  @ExternalApiAccessible()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async getWebhookSupportStatus(
    @UserSession() user: UserSessionData,
    @Param('providerOrIntegrationId') providerOrIntegrationId: string
  ): Promise<boolean> {
    return await this.getWebhookSupportStatusUsecase.execute(
      GetWebhookSupportStatusCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        providerOrIntegrationId,
        userId: user._id,
      })
    );
  }

  @Post('/')
  @ApiResponse(IntegrationResponseDto, 201)
  @ApiOperation({
    summary: 'Create an integration',
    description: `Create an integration for the current environment the user is based on the API key provided. 
    Each provider supports different credentials, check the provider documentation for more details.`,
  })
  @ExternalApiAccessible()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async createIntegration(
    @UserSession() user: UserSessionData,
    @Body() body: CreateIntegrationRequestDto
  ): Promise<IntegrationResponseDto> {
    try {
      const canAccessCredentials = await this.canUserAccessCredentials(user);
      const integration = await this.createIntegrationUsecase.execute(
        CreateIntegrationCommand.create({
          userId: user._id,
          name: body.name,
          identifier: body.identifier,
          environmentId: body._environmentId ?? user.environmentId,
          organizationId: user.organizationId,
          providerId: body.providerId,
          channel: body.channel,
          credentials: body.credentials,
          active: body.active ?? false,
          check: body.check ?? false,
          conditions: body.conditions,
          configurations: body.configurations,
        })
      );

      if (canAccessCredentials) {
        return GetDecryptedIntegrations.getDecryptedCredentials(integration);
      }

      const { credentials: _credentials, ...integrationWithoutCredentials } = integration;

      return integrationWithoutCredentials as unknown as IntegrationResponseDto;
    } catch (e) {
      if (e.message.includes('Integration validation failed') || e.message.includes('Cast to embedded')) {
        throw new BadRequestException(e.message);
      }

      throw e;
    }
  }

  @Put('/:integrationId')
  @ApiResponse(IntegrationResponseDto)
  @ApiNotFoundResponse({
    description: 'The integration with the integrationId provided does not exist in the database.',
  })
  @ApiOperation({
    summary: 'Update an integration',
    description: `Update an integration by its unique key identifier **integrationId**. 
    Each provider supports different credentials, check the provider documentation for more details.`,
  })
  @ExternalApiAccessible()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async updateIntegrationById(
    @UserSession() user: UserSessionData,
    @Param('integrationId') integrationId: string,
    @Body() body: UpdateIntegrationRequestDto
  ): Promise<IntegrationResponseDto> {
    try {
      const canAccessCredentials = await this.canUserAccessCredentials(user);
      const integration = await this.updateIntegrationUsecase.execute(
        UpdateIntegrationCommand.create({
          userId: user._id,
          name: body.name,
          identifier: body.identifier,
          environmentId: body._environmentId,
          userEnvironmentId: user.environmentId,
          organizationId: user.organizationId,
          integrationId,
          credentials: body.credentials,
          active: body.active,
          check: body.check ?? false,
          conditions: body.conditions,
          configurations: body.configurations,
        })
      );

      if (canAccessCredentials) {
        return GetDecryptedIntegrations.getDecryptedCredentials(integration);
      }

      const { credentials: _credentials, ...integrationWithoutCredentials } = integration;

      return integrationWithoutCredentials as unknown as IntegrationResponseDto;
    } catch (e) {
      if (e.message.includes('Integration validation failed') || e.message.includes('Cast to embedded')) {
        throw new BadRequestException(e.message);
      }

      throw e;
    }
  }

  @Post('/:integrationId/auto-configure')
  @ApiResponse(AutoConfigureIntegrationResponseDto, 200)
  @ApiNotFoundResponse({
    description: 'The integration with the integrationId provided does not exist in the database.',
  })
  @ApiOperation({
    summary: 'Auto-configure an integration for inbound webhooks',
    description: `Auto-configure an integration by its unique key identifier **integrationId** for inbound webhook support. 
    This will automatically generate required webhook signing keys and configure webhook endpoints.`,
  })
  @ExternalApiAccessible()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async autoConfigureIntegration(
    @UserSession() user: UserSessionData,
    @Param('integrationId') integrationId: string
  ): Promise<AutoConfigureIntegrationResponseDto> {
    const result = await this.autoConfigureIntegrationUsecase.execute(
      AutoConfigureIntegrationCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        integrationId,
      })
    );

    return result;
  }

  @Post('/:integrationId/set-primary')
  @ApiResponse(IntegrationResponseDto)
  @ApiNotFoundResponse({
    description: 'The integration with the integrationId provided does not exist in the database.',
  })
  @ApiOperation({
    summary: 'Update integration as primary',
    description: `Update an integration as **primary** by its unique key identifier **integrationId**. 
    This API will set the integration as primary for that channel in the current environment. 
    Primary integration is used to deliver notification for sms and email channels in the workflow.`,
  })
  @ExternalApiAccessible()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @SdkMethodName('setAsPrimary')
  async setIntegrationAsPrimary(
    @UserSession() user: UserSessionData,
    @Param('integrationId') integrationId: string
  ): Promise<IntegrationResponseDto> {
    const canAccessCredentials = await this.canUserAccessCredentials(user);
    const integration = await this.setIntegrationAsPrimaryUsecase.execute(
      SetIntegrationAsPrimaryCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        integrationId,
      })
    );

    if (canAccessCredentials) {
      return GetDecryptedIntegrations.getDecryptedCredentials(integration);
    }

    const { credentials: _credentials, ...integrationWithoutCredentials } = integration;

    return integrationWithoutCredentials as unknown as IntegrationResponseDto;
  }

  @Delete('/:integrationId')
  @ApiResponse(IntegrationResponseDto, 200, true)
  @ApiOperation({
    summary: 'Delete an integration',
    description: `Delete an integration by its unique key identifier **integrationId**. 
    This action is irreversible.`,
  })
  @ExternalApiAccessible()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async removeIntegration(
    @UserSession() user: UserSessionData,
    @Param('integrationId') integrationId: string
  ): Promise<IntegrationResponseDto[]> {
    return await this.removeIntegrationUsecase.execute(
      RemoveIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        integrationId,
      })
    );
  }

  @Get('/:channelType/limit')
  @ApiExcludeEndpoint()
  @OtelSpan()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async getProviderLimit(
    @UserSession() user: UserSessionData,
    @Param('channelType') channelType: ChannelTypeEnum
  ): Promise<ChannelTypeLimitDto> {
    const result = await this.calculateLimitNovuIntegration.execute(
      CalculateLimitNovuIntegrationCommand.create({
        channelType,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );

    if (!result) {
      return { limit: 0, count: 0 };
    }

    return result;
  }

  @Get('/in-app/status')
  @ApiExcludeEndpoint()
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async getInAppActivated(@UserSession() user: UserSessionData) {
    return await this.getInAppActivatedUsecase.execute(
      GetInAppActivatedCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );
  }

  /**
   * @deprecated Use POST /integrations/channel-connections/oauth or POST /integrations/channel-endpoints/oauth instead.
   */
  @Post('/chat/oauth')
  @ApiResponse(GenerateChatOAuthUrlResponseDto, 201)
  @ApiOperation({
    summary: 'Generate chat OAuth URL',
    description: `**Deprecated** — use \`POST /integrations/channel-connections/oauth\` (connect) or \`POST /integrations/channel-endpoints/oauth\` (link_user) instead.
    Generate an OAuth URL for chat integrations like Slack and MS Teams. 
    This URL allows subscribers to authorize the integration, enabling the system to send messages 
    through their chat workspace. The generated URL expires after 5 minutes.`,
    deprecated: true,
  })
  @SdkMethodName('generateChatOAuthUrl')
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @ExternalApiAccessible()
  @RequireAuthentication()
  async getChatOAuthUrl(
    @UserSession() user: UserSessionData,
    @Body() body: GenerateChatOauthUrlRequestDto
  ): Promise<GenerateChatOAuthUrlResponseDto> {
    await this.checkFeatureEnabled(user);

    const url = await this.generateChatOauthUrlUsecase.execute(
      GenerateChatOauthUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        integrationIdentifier: body.integrationIdentifier,
        connectionIdentifier: body.connectionIdentifier,
        context: body.context,
        scope: body.scope,
        userScope: body.userScope,
        mode: body.mode,
        connectionMode: body.connectionMode,
        autoLinkUser: body.autoLinkUser,
      })
    );

    return { url };
  }

  @Post('/channel-connections/oauth')
  @ApiResponse(GenerateChatOAuthUrlResponseDto, 201)
  @ApiOperation({
    summary: 'Generate OAuth URL for a workspace/tenant connection',
    description: `Generate an OAuth URL that creates a workspace or tenant-level channel connection (Slack workspace install or MS Teams admin consent). 
    The generated URL expires after 5 minutes.`,
  })
  @SdkMethodName('generateConnectOAuthUrl')
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @ExternalApiAccessible()
  @RequireAuthentication()
  async generateConnectOAuthUrl(
    @UserSession() user: UserSessionData,
    @Body() body: GenerateConnectOauthUrlRequestDto
  ): Promise<GenerateChatOAuthUrlResponseDto> {
    await this.checkFeatureEnabled(user);

    const url = await this.generateConnectOauthUrlUsecase.execute(
      GenerateConnectOauthUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        integrationIdentifier: body.integrationIdentifier,
        connectionIdentifier: body.connectionIdentifier,
        context: body.context,
        scope: body.scope,
        connectionMode: body.connectionMode,
        autoLinkUser: body.autoLinkUser,
      })
    );

    return { url };
  }

  @Post('/channel-endpoints/oauth')
  @ApiResponse(GenerateChatOAuthUrlResponseDto, 201)
  @ApiOperation({
    summary: 'Generate OAuth URL to link a subscriber user identity',
    description: `Generate an OAuth URL that links a specific subscriber to their chat identity (Slack user ID or MS Teams user OID). 
    The generated URL expires after 5 minutes.`,
  })
  @SdkMethodName('generateLinkUserOAuthUrl')
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @ExternalApiAccessible()
  @RequireAuthentication()
  async generateLinkUserOAuthUrl(
    @UserSession() user: UserSessionData,
    @Body() body: GenerateLinkUserOauthUrlRequestDto
  ): Promise<GenerateChatOAuthUrlResponseDto> {
    await this.checkFeatureEnabled(user);

    const url = await this.generateLinkUserOauthUrlUsecase.execute(
      GenerateLinkUserOauthUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        integrationIdentifier: body.integrationIdentifier,
        connectionIdentifier: body.connectionIdentifier,
        context: body.context,
        userScope: body.userScope,
      })
    );

    return { url };
  }

  @Get('/chat/oauth/callback')
  @ApiOperation({
    summary: 'Handle chat OAuth callback',
    description: `Generic OAuth callback handler for all chat integrations (Slack, Teams, Discord, etc.). 
    This endpoint processes the authorization code and stores the connection for any supported chat provider.`,
  })
  @ApiExcludeEndpoint()
  async handleChatOAuthCallback(
    @Res() res: Response,
    @Query('code') providerCode?: string,
    @Query('tenant') tenant?: string,
    @Query('admin_consent') adminConsent?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string
  ): Promise<void> {
    if (error) {
      throw new BadRequestException(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
    }

    if (!state) {
      throw new BadRequestException('Missing required OAuth parameter: state');
    }

    if (!providerCode && !tenant) {
      throw new BadRequestException('Missing required OAuth parameters: code or tenant');
    }

    const result = await this.chatOauthCallbackUsecase.execute(
      ChatOauthCallbackCommand.create({
        providerCode,
        tenant,
        adminConsent,
        state,
      })
    );

    if (result.type === ResponseTypeEnum.HTML) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
      res.send(result.result);

      return;
    }

    res.redirect(result.result);
  }

  private async checkFeatureEnabled(user: UserSessionData) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_SLACK_TEAMS_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });

    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }
  }

  private async canUserAccessCredentials(user: UserSessionData): Promise<boolean> {
    const organization = await this.organizationRepository.findOne({
      _id: user.organizationId,
    });

    const [isRbacFlagEnabled, isRbacFeatureEnabled] = await Promise.all([
      this.featureFlagsService.getFlag({
        organization: { _id: user.organizationId },
        user: { _id: user._id },
        key: FeatureFlagsKeysEnum.IS_RBAC_ENABLED,
        defaultValue: false,
      }),
      getFeatureForTierAsBoolean(
        FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
        organization?.apiServiceLevel || ApiServiceLevelEnum.FREE
      ),
    ]);

    const isRbacEnabled = isRbacFlagEnabled && isRbacFeatureEnabled;

    if (!isRbacEnabled) {
      return true;
    }

    return user.permissions.includes(PermissionsEnum.INTEGRATION_WRITE);
  }
}
