import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible, FeatureFlagsService, RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, FeatureFlagsKeysEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateChannelEndpointRequestDto } from './dtos/create-channel-endpoint-request.dto';
import { GetChannelEndpointResponseDto } from './dtos/get-channel-endpoint-response.dto';
import { GetChannelEndpointsQueryDto } from './dtos/get-channel-endpoints-query.dto';
import { UpdateChannelEndpointRequestDto } from './dtos/update-channel-endpoint-request.dto';
import { CreateChannelEndpointCommand } from './usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from './usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { DeleteChannelEndpointCommand } from './usecases/delete-channel-endpoint/delete-channel-endpoint.command';
import { DeleteChannelEndpoint } from './usecases/delete-channel-endpoint/delete-channel-endpoint.usecase';
import { GetChannelEndpointCommand } from './usecases/get-channel-endpoint/get-channel-endpoint.command';
import { GetChannelEndpoint } from './usecases/get-channel-endpoint/get-channel-endpoint.usecase';
import { GetChannelEndpointsCommand } from './usecases/get-channel-endpoints/get-channel-endpoints.command';
import { GetChannelEndpoints } from './usecases/get-channel-endpoints/get-channel-endpoints.usecase';
import { UpdateChannelEndpointCommand } from './usecases/update-channel-endpoint/update-channel-endpoint.command';
import { UpdateChannelEndpoint } from './usecases/update-channel-endpoint/update-channel-endpoint.usecase';

/**
 * Channel endpoints are conceptually part of subscribers, but since they form
 * a distinct entity with their own CRUD operations, they have a dedicated
 * controller for better separation of concerns and maintainability.
 * This controller merges with the subscribers controller.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/subscribers', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@ExternalApiAccessible()
@ApiTags('Subscribers')
@ApiCommonResponses()
export class ChannelEndpointsController {
  constructor(
    private readonly getChannelEndpointsUsecase: GetChannelEndpoints,
    private readonly getChannelEndpointUsecase: GetChannelEndpoint,
    private readonly createChannelEndpointUsecase: CreateChannelEndpoint,
    private readonly updateChannelEndpointUsecase: UpdateChannelEndpoint,
    private readonly deleteChannelEndpointUsecase: DeleteChannelEndpoint,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

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

  @Get('/:subscriberId/channel-endpoints')
  @ApiOperation({
    summary: 'Retrieve subscriber channel endpoints',
    description: `Retrieve all channel endpoints for a subscriber by its unique key identifier **subscriberId**.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 200, true)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelEndpoints(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetChannelEndpointsQueryDto
  ): Promise<GetChannelEndpointResponseDto[]> {
    await this.checkFeatureEnabled(user);

    return await this.getChannelEndpointsUsecase.execute(
      GetChannelEndpointsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        channel: query.channel,
        provider: query.provider,
        endpoint: query.endpoint,
      })
    );
  }

  @Get('/:subscriberId/channel-endpoints/:identifier')
  @ApiOperation({
    summary: 'Retrieve subscriber channel endpoint by identifier',
    description: `Retrieve a specific channel endpoint for a subscriber by its unique identifier.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('identifier') identifier: string
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    return await this.getChannelEndpointUsecase.execute(
      GetChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        identifier,
      })
    );
  }

  @Post('/:subscriberId/channel-endpoints')
  @ApiOperation({
    summary: 'Create subscriber channel endpoint',
    description: `Create a new channel endpoint for a subscriber.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 201)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async createChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: CreateChannelEndpointRequestDto
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    return await this.createChannelEndpointUsecase.execute(
      CreateChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        identifier: body.identifier,
        integrationIdentifier: body.integrationIdentifier,
        endpoint: body.endpoint,
        routing: body.routing,
      })
    );
  }

  @Patch('/:subscriberId/channel-endpoints/:identifier')
  @ApiOperation({
    summary: 'Update subscriber channel endpoint',
    description: `Update an existing channel endpoint for a subscriber by its unique identifier.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async updateChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('identifier') identifier: string,
    @Body() body: UpdateChannelEndpointRequestDto
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    return await this.updateChannelEndpointUsecase.execute(
      UpdateChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        identifier,
        endpoint: body.endpoint,
        routing: body.routing,
      })
    );
  }

  @Delete('/:subscriberId/channel-endpoints/:identifier')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete subscriber channel endpoint',
    description: `Delete a specific channel endpoint for a subscriber by its unique identifier.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async deleteChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('identifier') identifier: string
  ): Promise<void> {
    await this.checkFeatureEnabled(user);

    await this.deleteChannelEndpointUsecase.execute(
      DeleteChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        identifier,
      })
    );
  }
}
