import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CalculateLimitNovuIntegration,
  CalculateLimitNovuIntegrationCommand,
  FeatureFlagsService,
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
import { CreateIntegrationRequestDto } from './dtos/create-integration-request.dto';
import { ChannelTypeLimitDto } from './dtos/get-channel-type-limit.sto';
import { IntegrationResponseDto } from './dtos/integration-response.dto';
import { UpdateIntegrationRequestDto } from './dtos/update-integration.dto';
import { CreateIntegrationCommand } from './usecases/create-integration/create-integration.command';
import { CreateIntegration } from './usecases/create-integration/create-integration.usecase';
import { GetActiveIntegrationsCommand } from './usecases/get-active-integration/get-active-integration.command';
import { GetActiveIntegrations } from './usecases/get-active-integration/get-active-integration.usecase';
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
@RequireAuthentication()
@ApiTags('Integrations')
export class IntegrationsController {
  constructor(
    private getInAppActivatedUsecase: GetInAppActivated,
    private getIntegrationsUsecase: GetIntegrations,
    private getActiveIntegrationsUsecase: GetActiveIntegrations,
    private getWebhookSupportStatusUsecase: GetWebhookSupportStatus,
    private createIntegrationUsecase: CreateIntegration,
    private updateIntegrationUsecase: UpdateIntegration,
    private setIntegrationAsPrimaryUsecase: SetIntegrationAsPrimary,
    private removeIntegrationUsecase: RemoveIntegration,
    private calculateLimitNovuIntegration: CalculateLimitNovuIntegration,
    private organizationRepository: CommunityOrganizationRepository,
    private featureFlagService: FeatureFlagsService
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
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async createIntegration(
    @UserSession() user: UserSessionData,
    @Body() body: CreateIntegrationRequestDto
  ): Promise<IntegrationResponseDto> {
    try {
      return await this.createIntegrationUsecase.execute(
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
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async updateIntegrationById(
    @UserSession() user: UserSessionData,
    @Param('integrationId') integrationId: string,
    @Body() body: UpdateIntegrationRequestDto
  ): Promise<IntegrationResponseDto> {
    try {
      return await this.updateIntegrationUsecase.execute(
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
    } catch (e) {
      if (e.message.includes('Integration validation failed') || e.message.includes('Cast to embedded')) {
        throw new BadRequestException(e.message);
      }

      throw e;
    }
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
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @SdkMethodName('setAsPrimary')
  setIntegrationAsPrimary(
    @UserSession() user: UserSessionData,
    @Param('integrationId') integrationId: string
  ): Promise<IntegrationResponseDto> {
    return this.setIntegrationAsPrimaryUsecase.execute(
      SetIntegrationAsPrimaryCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        integrationId,
      })
    );
  }

  @Delete('/:integrationId')
  @ApiResponse(IntegrationResponseDto, 200, true)
  @ApiOperation({
    summary: 'Delete an integration',
    description: `Delete an integration by its unique key identifier **integrationId**. 
    This action is irreversible.`,
  })
  @ExternalApiAccessible()
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
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async getInAppActivated(@UserSession() user: UserSessionData) {
    return await this.getInAppActivatedUsecase.execute(
      GetInAppActivatedCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );
  }

  private async canUserAccessCredentials(user: UserSessionData): Promise<boolean> {
    const organization = await this.organizationRepository.findOne({
      _id: user.organizationId,
    });

    const [isRbacFlagEnabled, isRbacFeatureEnabled] = await Promise.all([
      this.featureFlagService.getFlag({
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
