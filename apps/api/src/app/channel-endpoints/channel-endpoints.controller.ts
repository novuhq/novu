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

import { ApiBody, ApiExtraModels, ApiOperation, ApiParam, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { ExternalApiAccessible, FeatureFlagsService, RequirePermissions } from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  ENDPOINT_TYPES,
  FeatureFlagsKeysEnum,
  PermissionsEnum,
  UserSessionData,
} from '@novu/shared';

import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateChannelEndpointRequest } from './dtos/create-channel-endpoint-request.dto';
import {
  CreateMsTeamsChannelEndpointDto,
  CreateMsTeamsUserEndpointDto,
  CreatePhoneEndpointDto,
  CreateSlackChannelEndpointDto,
  CreateSlackUserEndpointDto,
  CreateWebhookEndpointDto,
} from './dtos/create-channel-endpoint-variants.dto';
import { mapChannelEndpointEntityToDto } from './dtos/dto.mapper';
import {
  MsTeamsChannelEndpointDto,
  MsTeamsUserEndpointDto,
  PhoneEndpointDto,
  SlackChannelEndpointDto,
  SlackUserEndpointDto,
  WebhookEndpointDto,
} from './dtos/endpoint-types.dto';
import { GetChannelEndpointResponseDto } from './dtos/get-channel-endpoint-response.dto';
import { ListChannelEndpointsQueryDto } from './dtos/list-channel-endpoints-query.dto';
import { ListChannelEndpointsResponseDto } from './dtos/list-channel-endpoints-response.dto';
import { UpdateChannelEndpointRequestDto } from './dtos/update-channel-endpoint-request.dto';
import { CreateChannelEndpointCommand } from './usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from './usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { DeleteChannelEndpointCommand } from './usecases/delete-channel-endpoint/delete-channel-endpoint.command';
import { DeleteChannelEndpoint } from './usecases/delete-channel-endpoint/delete-channel-endpoint.usecase';
import { GetChannelEndpointCommand } from './usecases/get-channel-endpoint/get-channel-endpoint.command';
import { GetChannelEndpoint } from './usecases/get-channel-endpoint/get-channel-endpoint.usecase';
import { ListChannelEndpointsCommand } from './usecases/list-channel-endpoints/list-channel-endpoints.command';
import { ListChannelEndpoints } from './usecases/list-channel-endpoints/list-channel-endpoints.usecase';
import { UpdateChannelEndpointCommand } from './usecases/update-channel-endpoint/update-channel-endpoint.command';
import { UpdateChannelEndpoint } from './usecases/update-channel-endpoint/update-channel-endpoint.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/channel-endpoints', version: '1' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiExtraModels(
  CreateSlackChannelEndpointDto,
  CreateSlackUserEndpointDto,
  CreateWebhookEndpointDto,
  CreatePhoneEndpointDto,
  CreateMsTeamsChannelEndpointDto,
  CreateMsTeamsUserEndpointDto,
  SlackChannelEndpointDto,
  SlackUserEndpointDto,
  WebhookEndpointDto,
  PhoneEndpointDto,
  MsTeamsChannelEndpointDto,
  MsTeamsUserEndpointDto
)
@ExternalApiAccessible()
@RequireAuthentication()
@ApiTags('Channel Endpoints')
@SdkGroupName('ChannelEndpoints')
@ApiCommonResponses()
export class ChannelEndpointsController {
  constructor(
    private readonly listChannelEndpointsUsecase: ListChannelEndpoints,
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

  @Get()
  @ApiOperation({
    summary: 'List all channel endpoints',
    description: `List all channel endpoints for a resource based on query filters.`,
  })
  @ApiResponse(ListChannelEndpointsResponseDto, 200)
  @ExternalApiAccessible()
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async listChannelEndpoints(
    @UserSession() user: UserSessionData,
    @Query() query: ListChannelEndpointsQueryDto
  ): Promise<ListChannelEndpointsResponseDto> {
    await this.checkFeatureEnabled(user);

    const result = await this.listChannelEndpointsUsecase.execute(
      ListChannelEndpointsCommand.create({
        user,
        limit: query.limit || 10,
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection,
        orderBy: query.orderBy || 'createdAt',
        includeCursor: query.includeCursor,
        subscriberId: query.subscriberId,
        contextKeys: query.contextKeys,
        channel: query.channel,
        providerId: query.providerId,
        integrationIdentifier: query.integrationIdentifier,
        connectionIdentifier: query.connectionIdentifier,
      })
    );

    return {
      data: result.data.map(mapChannelEndpointEntityToDto),
      next: result.next,
      previous: result.previous,
      totalCount: result.totalCount!,
      totalCountCapped: result.totalCountCapped!,
    };
  }

  @Get('/:identifier')
  @ApiOperation({
    summary: 'Retrieve a channel endpoint',
    description: `Retrieve a specific channel endpoint by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 200)
  @ExternalApiAccessible()
  @SdkMethodName('retrieve')
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  async getChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelEndpoint = await this.getChannelEndpointUsecase.execute(
      GetChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );

    return mapChannelEndpointEntityToDto(channelEndpoint);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a channel endpoint',
    description: `Create a new channel endpoint for a resource.`,
  })
  @ApiBody({
    description: 'Channel endpoint creation request. The structure varies based on the type field.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateSlackChannelEndpointDto) },
        { $ref: getSchemaPath(CreateSlackUserEndpointDto) },
        { $ref: getSchemaPath(CreateWebhookEndpointDto) },
        { $ref: getSchemaPath(CreatePhoneEndpointDto) },
        { $ref: getSchemaPath(CreateMsTeamsChannelEndpointDto) },
        { $ref: getSchemaPath(CreateMsTeamsUserEndpointDto) },
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          [ENDPOINT_TYPES.SLACK_CHANNEL]: getSchemaPath(CreateSlackChannelEndpointDto),
          [ENDPOINT_TYPES.SLACK_USER]: getSchemaPath(CreateSlackUserEndpointDto),
          [ENDPOINT_TYPES.WEBHOOK]: getSchemaPath(CreateWebhookEndpointDto),
          [ENDPOINT_TYPES.PHONE]: getSchemaPath(CreatePhoneEndpointDto),
          [ENDPOINT_TYPES.MS_TEAMS_CHANNEL]: getSchemaPath(CreateMsTeamsChannelEndpointDto),
          [ENDPOINT_TYPES.MS_TEAMS_USER]: getSchemaPath(CreateMsTeamsUserEndpointDto),
        },
      },
    },
  })
  @ApiResponse(GetChannelEndpointResponseDto, 201)
  @SdkMethodName('create')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async createChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Body() body: CreateChannelEndpointRequest
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelEndpoint = await this.createChannelEndpointUsecase.execute(
      CreateChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        integrationIdentifier: body.integrationIdentifier,
        connectionIdentifier: body.connectionIdentifier,
        subscriberId: body.subscriberId,
        context: body.context,
        type: body.type,
        endpoint: body.endpoint,
      })
    );

    return mapChannelEndpointEntityToDto(channelEndpoint);
  }

  @Patch('/:identifier')
  @ApiOperation({
    summary: 'Update a channel endpoint',
    description: `Update an existing channel endpoint by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 200)
  @SdkMethodName('update')
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @ExternalApiAccessible()
  async updateChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateChannelEndpointRequestDto
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelEndpoint = await this.updateChannelEndpointUsecase.execute(
      UpdateChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        endpoint: body.endpoint,
      })
    );

    return mapChannelEndpointEntityToDto(channelEndpoint);
  }

  @Delete('/:identifier')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a channel endpoint',
    description: `Delete a specific channel endpoint by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @SdkMethodName('delete')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async deleteChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<void> {
    await this.checkFeatureEnabled(user);

    await this.deleteChannelEndpointUsecase.execute(
      DeleteChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }
}
